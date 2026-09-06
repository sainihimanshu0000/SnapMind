package com.snapmind

import android.Manifest
import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ContentUris
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.database.ContentObserver
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.FileOutputStream

class ScreenshotDetectorModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  private var watching = false
  private var observer: ContentObserver? = null
  private var pendingDeletePromise: Promise? = null

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName(): String = "ScreenshotDetector"

  @ReactMethod
  fun addListener(eventName: String?) {
    // Required for NativeEventEmitter.
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required for NativeEventEmitter.
  }

  @ReactMethod
  fun getCapabilities(promise: Promise) {
    val map = Arguments.createMap()
    map.putBoolean("supported", true)
    map.putString("platform", "android")
    map.putBoolean("automaticForeground", true)
    map.putBoolean("automaticBackground", true)
    map.putBoolean("canDeleteFromLibrary", true)
    map.putBoolean("canRunOnDeviceOcr", false)
    map.putString(
      "summary",
      "Android can watch the Screenshots folder in the background using a visible watcher notification. If you force-stop SnapMind, watching stops until you open the app again."
    )
    promise.resolve(map)
  }

  @ReactMethod
  fun getPermissionStatus(promise: Promise) {
    val map = Arguments.createMap()
    map.putString("status", permissionStatus())
    promise.resolve(map)
  }

  @ReactMethod
  fun requestPermission(promise: Promise) {
    val activity = reactContext.currentActivity
    if (activity == null) {
      val map = Arguments.createMap()
      map.putString("status", permissionStatus())
      promise.resolve(map)
      return
    }
    val permission = imagePermission()
    if (ContextCompat.checkSelfPermission(reactContext, permission) ==
        PackageManager.PERMISSION_GRANTED
    ) {
      val map = Arguments.createMap()
      map.putString("status", "authorized")
      promise.resolve(map)
      return
    }
    activity.requestPermissions(arrayOf(permission), PERMISSION_REQUEST)
    val map = Arguments.createMap()
    map.putString("status", permissionStatus())
    promise.resolve(map)
  }

  @ReactMethod
  fun startWatching(promise: Promise) {
    if (!watching) {
      val obs = object : ContentObserver(Handler(Looper.getMainLooper())) {
        override fun onChange(selfChange: Boolean, uri: Uri?) {
          emitChanged()
        }
      }
      reactContext.contentResolver.registerContentObserver(
        MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
        true,
        obs
      )
      observer = obs
      watching = true
    }
    reactContext
      .getSharedPreferences(ScreenshotWatchService.PREFS, android.content.Context.MODE_PRIVATE)
      .edit()
      .putBoolean(ScreenshotWatchService.ENABLED, true)
      .putLong(ScreenshotWatchService.LAST_SCAN, System.currentTimeMillis())
      .apply()
    val service = Intent(reactContext, ScreenshotWatchService::class.java)
    androidx.core.content.ContextCompat.startForegroundService(reactContext, service)
    val map = Arguments.createMap()
    map.putBoolean("ok", true)
    promise.resolve(map)
  }

  @ReactMethod
  fun stopWatching(promise: Promise) {
    observer?.let { reactContext.contentResolver.unregisterContentObserver(it) }
    observer = null
    watching = false
    reactContext
      .getSharedPreferences(ScreenshotWatchService.PREFS, android.content.Context.MODE_PRIVATE)
      .edit()
      .putBoolean(ScreenshotWatchService.ENABLED, false)
      .apply()
    reactContext.stopService(Intent(reactContext, ScreenshotWatchService::class.java))
    val map = Arguments.createMap()
    map.putBoolean("ok", true)
    promise.resolve(map)
  }

  @ReactMethod
  fun getNewScreenshots(sinceMs: Double, limit: Double, promise: Promise) {
    if (permissionStatus() != "authorized") {
      promise.resolve(Arguments.createArray())
      return
    }

    val since = sinceMs.toLong()
    val max = limit.toInt().coerceAtLeast(1)
    val projection = arrayOf(
      MediaStore.Images.Media._ID,
      MediaStore.Images.Media.DATE_ADDED,
      MediaStore.Images.Media.DATE_TAKEN,
      MediaStore.Images.Media.WIDTH,
      MediaStore.Images.Media.HEIGHT,
      MediaStore.Images.Media.DISPLAY_NAME,
      MediaStore.Images.Media.RELATIVE_PATH,
      MediaStore.Images.Media.BUCKET_DISPLAY_NAME,
    )
    val useRelative = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
    val selection = if (useRelative) {
      "(${MediaStore.Images.Media.RELATIVE_PATH} LIKE ? OR ${MediaStore.Images.Media.BUCKET_DISPLAY_NAME} = ?)"
    } else {
      "${MediaStore.Images.Media.BUCKET_DISPLAY_NAME} LIKE ?"
    }
    val args = if (useRelative) {
      arrayOf("%Screenshot%", "Screenshots")
    } else {
      arrayOf("%Screenshot%")
    }
    val sort = "${MediaStore.Images.Media.DATE_ADDED} DESC"

    val output = Arguments.createArray()
    reactContext.contentResolver.query(
      MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
      projection,
      selection,
      args,
      sort
    )?.use { cursor ->
      val idCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
      val addedCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED)
      val takenCol = cursor.getColumnIndex(MediaStore.Images.Media.DATE_TAKEN)
      val widthCol = cursor.getColumnIndex(MediaStore.Images.Media.WIDTH)
      val heightCol = cursor.getColumnIndex(MediaStore.Images.Media.HEIGHT)
      val nameCol = cursor.getColumnIndex(MediaStore.Images.Media.DISPLAY_NAME)
      var count = 0
      while (cursor.moveToNext() && count < max) {
        val addedSec = cursor.getLong(addedCol)
        val taken = if (takenCol >= 0) cursor.getLong(takenCol) else 0L
        val createdAt = when {
          taken > 0L -> taken
          else -> addedSec * 1000L
        }
        if (createdAt < since) {
          continue
        }
        val map = Arguments.createMap()
        map.putString("id", cursor.getLong(idCol).toString())
        map.putDouble("createdAt", createdAt.toDouble())
        map.putInt("width", if (widthCol >= 0) cursor.getInt(widthCol) else 0)
        map.putInt("height", if (heightCol >= 0) cursor.getInt(heightCol) else 0)
        map.putString("filename", if (nameCol >= 0) cursor.getString(nameCol) else "screenshot.jpg")
        map.putString("mediaType", "screenshot")
        output.pushMap(map)
        count += 1
      }
    }
    promise.resolve(output)
  }

  @ReactMethod
  fun copyAsset(assetId: String, toPath: String, promise: Promise) {
    try {
      val uri = contentUri(assetId)
      val dest = File(toPath)
      dest.parentFile?.mkdirs()
      reactContext.contentResolver.openInputStream(uri)?.use { input ->
        FileOutputStream(dest).use { output -> input.copyTo(output) }
      } ?: run {
        promise.reject("copy_failed", "Could not read the screenshot.")
        return
      }
      val map = Arguments.createMap()
      map.putString("uri", Uri.fromFile(dest).toString())
      map.putString("path", dest.absolutePath)
      promise.resolve(map)
    } catch (error: Exception) {
      promise.reject("copy_failed", error.message, error)
    }
  }

  @ReactMethod
  fun deleteAsset(assetId: String, promise: Promise) {
    val uri = contentUri(assetId)
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        val request = MediaStore.createDeleteRequest(
          reactContext.contentResolver,
          listOf(uri)
        )
        val activity = reactContext.currentActivity
        if (activity == null) {
          val map = Arguments.createMap()
          map.putBoolean("ok", false)
          map.putBoolean("cancelled", false)
          map.putString("message", "Open SnapMind to confirm deleting this screenshot.")
          promise.resolve(map)
          return
        }
        pendingDeletePromise = promise
        activity.startIntentSenderForResult(
          request.intentSender,
          DELETE_REQUEST,
          null,
          0,
          0,
          0
        )
        return
      }
      val deleted = reactContext.contentResolver.delete(uri, null, null)
      val map = Arguments.createMap()
      map.putBoolean("ok", deleted > 0)
      map.putBoolean("cancelled", false)
      if (deleted <= 0) {
        map.putString("message", "Android did not delete the screenshot.")
      }
      promise.resolve(map)
    } catch (error: SecurityException) {
      val map = Arguments.createMap()
      map.putBoolean("ok", false)
      map.putBoolean("cancelled", false)
      map.putString(
        "message",
        "Android requires you to confirm deletion in the system prompt. Nothing was deleted."
      )
      promise.resolve(map)
    } catch (error: Exception) {
      val map = Arguments.createMap()
      map.putBoolean("ok", false)
      map.putBoolean("cancelled", false)
      map.putString("message", error.message ?: "Could not delete the screenshot.")
      promise.resolve(map)
    }
  }

  @ReactMethod
  fun recognizeText(filePath: String, promise: Promise) {
    val map = Arguments.createMap()
    map.putBoolean("ok", false)
    map.putString("text", "")
    map.putString(
      "message",
      "On-device OCR is available on iOS. This Android build does not include a local text recognizer."
    )
    promise.resolve(map)
  }

  @ReactMethod
  fun shareFile(path: String, mimeType: String, title: String, promise: Promise) {
    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "No activity available to share")
      return
    }
    val file = File(path.replaceFirst("^file://".toRegex(), ""))
    if (!file.exists()) {
      promise.reject("NO_FILE", "Export file was not found")
      return
    }
    try {
      val uri = FileProvider.getUriForFile(
        reactContext,
        reactContext.packageName + ".fileprovider",
        file
      )
      val intent = Intent(Intent.ACTION_SEND).apply {
        type = mimeType.ifBlank { "application/json" }
        putExtra(Intent.EXTRA_STREAM, uri)
        putExtra(Intent.EXTRA_SUBJECT, title)
        clipData = ClipData.newRawUri(title, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      val chooser = Intent.createChooser(intent, title)
      chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      activity.startActivity(chooser)
      promise.resolve(Arguments.createMap().apply { putBoolean("ok", true) })
    } catch (error: Exception) {
      promise.reject("SHARE_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun setClipboard(text: String, promise: Promise) {
    val clipboard = reactContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText("SnapMind", text))
    val map = Arguments.createMap()
    map.putBoolean("ok", true)
    promise.resolve(map)
  }

  @ReactMethod
  fun scanAndNotify(promise: Promise) {
    val service = Intent(reactContext, ScreenshotWatchService::class.java)
    service.action = ScreenshotWatchService.ACTION_SCAN
    androidx.core.content.ContextCompat.startForegroundService(reactContext, service)
    promise.resolve(Arguments.createMap().apply { putBoolean("ok", true) })
  }

  @ReactMethod
  fun setLastScanMs(ms: Double, promise: Promise) {
    reactContext
      .getSharedPreferences(ScreenshotWatchService.PREFS, android.content.Context.MODE_PRIVATE)
      .edit()
      .putLong(ScreenshotWatchService.LAST_SCAN, ms.toLong())
      .apply()
    promise.resolve(Arguments.createMap().apply { putBoolean("ok", true) })
  }

  override fun onActivityResult(
    activity: Activity,
    requestCode: Int,
    resultCode: Int,
    data: Intent?
  ) {
    if (requestCode != DELETE_REQUEST) {
      return
    }
    val promise = pendingDeletePromise ?: return
    pendingDeletePromise = null
    val map = Arguments.createMap()
    map.putBoolean("ok", resultCode == Activity.RESULT_OK)
    map.putBoolean("cancelled", resultCode != Activity.RESULT_OK)
    if (resultCode != Activity.RESULT_OK) {
      map.putString("message", "Deletion was cancelled. The screenshot was not removed.")
    }
    promise.resolve(map)
  }

  override fun onNewIntent(intent: Intent) = Unit

  private fun emitChanged() {
    if (!watching) {
      return
    }
    val body = Arguments.createMap()
    body.putString("reason", "library")
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("onScreenshotsChanged", body)
  }

  private fun imagePermission(): String {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      Manifest.permission.READ_MEDIA_IMAGES
    } else {
      Manifest.permission.READ_EXTERNAL_STORAGE
    }
  }

  private fun permissionStatus(): String {
    return if (
      ContextCompat.checkSelfPermission(reactContext, imagePermission()) ==
      PackageManager.PERMISSION_GRANTED
    ) {
      "authorized"
    } else {
      "denied"
    }
  }

  private fun contentUri(assetId: String): Uri {
    return ContentUris.withAppendedId(
      MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
      assetId.toLong()
    )
  }

  companion object {
    private const val DELETE_REQUEST = 7133
    private const val PERMISSION_REQUEST = 7134
  }
}
