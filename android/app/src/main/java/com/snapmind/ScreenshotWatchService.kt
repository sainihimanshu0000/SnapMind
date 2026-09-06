package com.snapmind

import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.database.ContentObserver
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.MediaStore
import androidx.core.app.ServiceCompat

class ScreenshotWatchService : Service() {
  private var observer: ContentObserver? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    ScreenshotNotifier.ensureChannels(this)
    val notification = ScreenshotNotifier.watchNotification(this)
    if (Build.VERSION.SDK_INT >= 34) {
      ServiceCompat.startForeground(
        this,
        ScreenshotNotifier.WATCH_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
      )
    } else {
      startForeground(ScreenshotNotifier.WATCH_ID, notification)
    }
    startObserving()
    if (intent?.action == ACTION_SCAN) {
      checkForNewScreenshot()
    }
    return START_STICKY
  }

  override fun onDestroy() {
    observer?.let { contentResolver.unregisterContentObserver(it) }
    observer = null
    super.onDestroy()
  }

  private fun startObserving() {
    if (observer != null) {
      return
    }
    val obs = object : ContentObserver(Handler(Looper.getMainLooper())) {
      override fun onChange(selfChange: Boolean, uri: Uri?) {
        checkForNewScreenshot()
      }
    }
    contentResolver.registerContentObserver(
      MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
      true,
      obs
    )
    observer = obs
  }

  private fun checkForNewScreenshot() {
    val prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
    val lastMs = prefs.getLong(LAST_SCAN, 0L)
    val lastId = prefs.getString(LAST_ASSET, null)
    val projection = arrayOf(
      MediaStore.Images.Media._ID,
      MediaStore.Images.Media.DATE_ADDED,
      MediaStore.Images.Media.DATE_TAKEN,
      MediaStore.Images.Media.RELATIVE_PATH,
      MediaStore.Images.Media.BUCKET_DISPLAY_NAME,
    )
    val selection =
      "(${MediaStore.Images.Media.RELATIVE_PATH} LIKE ? OR ${MediaStore.Images.Media.BUCKET_DISPLAY_NAME} = ?)"
    contentResolver.query(
      MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
      projection,
      selection,
      arrayOf("%Screenshot%", "Screenshots"),
      "${MediaStore.Images.Media.DATE_ADDED} DESC"
    )?.use { cursor ->
      if (!cursor.moveToFirst()) {
        return
      }
      val id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID))
      val added = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED)) * 1000L
      val takenCol = cursor.getColumnIndex(MediaStore.Images.Media.DATE_TAKEN)
      val taken = if (takenCol >= 0) cursor.getLong(takenCol) else 0L
      val created = if (taken > 0L) taken else added
      if (created < lastMs && lastMs > 0L) {
        return
      }
      val idString = id.toString()
      if (idString == lastId) {
        return
      }
      prefs.edit()
        .putLong(LAST_SCAN, System.currentTimeMillis())
        .putString(LAST_ASSET, idString)
        .apply()
      ScreenshotNotifier.notifyNewScreenshot(this, idString)
    }
  }

  companion object {
    const val PREFS = "snapmind_watch"
    const val LAST_SCAN = "lastScanMs"
    const val LAST_ASSET = "lastAssetId"
    const val ENABLED = "enabled"
    const val ACTION_SCAN = "com.snapmind.SCAN_SCREENSHOTS"
  }
}
