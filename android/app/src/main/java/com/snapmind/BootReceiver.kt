package com.snapmind

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != Intent.ACTION_BOOT_COMPLETED &&
        intent?.action != Intent.ACTION_MY_PACKAGE_REPLACED
    ) {
      return
    }
    val enabled = context.getSharedPreferences(
      ScreenshotWatchService.PREFS,
      Context.MODE_PRIVATE
    ).getBoolean(ScreenshotWatchService.ENABLED, false)
    if (!enabled) {
      return
    }
    ContextCompat.startForegroundService(
      context,
      Intent(context, ScreenshotWatchService::class.java)
    )
  }
}
