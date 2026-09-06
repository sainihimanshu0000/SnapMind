import Foundation
import Photos
import UserNotifications
import BackgroundTasks
import UIKit

@objc(ScreenshotWatch)
final class ScreenshotWatch: NSObject {
  @objc static let shared = ScreenshotWatch()

  static let taskId = "com.snapmint.app.screenshot-refresh"
  private static let enabledKey = "snapmind.watchEnabled"
  private static let lastScanKey = "snapmind.lastScanMs"
  private static let lastAssetKey = "snapmind.lastNotifiedAssetId"

  private var backgroundTask = UIBackgroundTaskIdentifier.invalid
  private var pollTimer: Timer?

  @objc var isEnabled: Bool {
    get { UserDefaults.standard.bool(forKey: Self.enabledKey) }
    set { UserDefaults.standard.set(newValue, forKey: Self.enabledKey) }
  }

  @objc func setEnabled(_ enabled: Bool) {
    isEnabled = enabled
    if enabled {
      scheduleRefresh()
      requestNotificationAccess()
    } else {
      pollTimer?.invalidate()
      pollTimer = nil
    }
  }

  @objc func setLastScanMs(_ ms: Double) {
    UserDefaults.standard.set(ms, forKey: Self.lastScanKey)
  }

  @objc func registerTasks() {
    BGTaskScheduler.shared.register(forTaskWithIdentifier: Self.taskId, using: nil) { task in
      self.handleRefresh(task as? BGAppRefreshTask)
    }
  }

  @objc func handleEnterBackground() {
    guard isEnabled else { return }
    scheduleRefresh()
    startShortBackgroundPoll()
    scanAndNotifyIfNeeded()
  }

  @objc func handleEnterForeground() {
    stopShortBackgroundPoll()
  }

  @objc func scanAndNotifyIfNeeded() {
    guard isEnabled else { return }
    let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
    guard status == .authorized || status == .limited else { return }

    let lastMs = UserDefaults.standard.double(forKey: Self.lastScanKey)
    let since = lastMs > 0 ? Date(timeIntervalSince1970: lastMs / 1000.0) : Date().addingTimeInterval(-30)
    let lastAsset = UserDefaults.standard.string(forKey: Self.lastAssetKey)

    let collections = PHAssetCollection.fetchAssetCollections(
      with: .smartAlbum,
      subtype: .smartAlbumScreenshots,
      options: nil
    )
    let options = PHFetchOptions()
    options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
    options.fetchLimit = 5

    var newest: PHAsset?
    if let album = collections.firstObject {
      let assets = PHAsset.fetchAssets(in: album, options: options)
      newest = assets.firstObject
    }

    guard let asset = newest, let created = asset.creationDate else { return }
    if created < since { return }
    if asset.localIdentifier == lastAsset { return }

    UserDefaults.standard.set(Date().timeIntervalSince1970 * 1000.0, forKey: Self.lastScanKey)
    UserDefaults.standard.set(asset.localIdentifier, forKey: Self.lastAssetKey)
    postNotification(assetId: asset.localIdentifier, createdAt: created)
  }

  func scheduleRefresh() {
    guard isEnabled else { return }
    let request = BGAppRefreshTaskRequest(identifier: Self.taskId)
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
    try? BGTaskScheduler.shared.submit(request)
  }

  private func handleRefresh(_ task: BGAppRefreshTask?) {
    guard let task else { return }
    scheduleRefresh()
    task.expirationHandler = {
      task.setTaskCompleted(success: false)
    }
    scanAndNotifyIfNeeded()
    task.setTaskCompleted(success: true)
  }

  private func startShortBackgroundPoll() {
    stopShortBackgroundPoll()
    backgroundTask = UIApplication.shared.beginBackgroundTask(withName: "SnapMindScreenshotPoll") { [weak self] in
      self?.stopShortBackgroundPoll()
    }
    var ticks = 0
    pollTimer = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { [weak self] timer in
      ticks += 1
      self?.scanAndNotifyIfNeeded()
      if ticks >= 8 {
        self?.stopShortBackgroundPoll()
        timer.invalidate()
      }
    }
    if let pollTimer {
      RunLoop.main.add(pollTimer, forMode: .common)
    }
  }

  private func stopShortBackgroundPoll() {
    pollTimer?.invalidate()
    pollTimer = nil
    if backgroundTask != .invalid {
      UIApplication.shared.endBackgroundTask(backgroundTask)
      backgroundTask = .invalid
    }
  }

  private func requestNotificationAccess() {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in }
  }

  private func postNotification(assetId: String, createdAt: Date) {
    let content = UNMutableNotificationContent()
    content.title = "New screenshot"
    content.body = "Save, remind, or organize it in SnapMind."
    content.sound = .default
    content.userInfo = [
      "assetId": assetId,
      "createdAt": createdAt.timeIntervalSince1970 * 1000.0,
    ]
    content.interruptionLevel = .active

    let request = UNNotificationRequest(
      identifier: "quick-\(assetId)",
      content: content,
      trigger: nil
    )
    UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
  }
}
