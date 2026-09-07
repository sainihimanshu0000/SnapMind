package com.snapmind

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

object ScreenshotNotifier {
  const val EVENT_CHANNEL = "snapmind-quick-actions"
  const val WATCH_CHANNEL = "snapmind-screenshot-watch"
  const val WATCH_ID = 7101

  fun ensureChannels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    val manager = context.getSystemService(NotificationManager::class.java)
    manager.createNotificationChannel(
      NotificationChannel(
        EVENT_CHANNEL,
        "Screenshot quick actions",
        NotificationManager.IMPORTANCE_HIGH
      )
    )
    val watch = NotificationChannel(
      WATCH_CHANNEL,
      "Screenshot watcher",
      NotificationManager.IMPORTANCE_LOW
    )
    watch.setShowBadge(false)
    manager.createNotificationChannel(watch)
  }

  fun watchNotification(context: Context): android.app.Notification {
    ensureChannels(context)
    val launch = Intent(context, MainActivity::class.java)
    val pending = PendingIntent.getActivity(
      context,
      0,
      launch,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    return NotificationCompat.Builder(context, WATCH_CHANNEL)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle("SnapMind")
      .setContentText("Watching for new screenshots")
      .setOngoing(true)
      .setContentIntent(pending)
      .build()
  }

  fun notifyNewScreenshot(context: Context, assetId: String) {
    ensureChannels(context)
    val launch = Intent(context, MainActivity::class.java)
    val pending = PendingIntent.getActivity(
      context,
      assetId.hashCode(),
      launch,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val notification = NotificationCompat.Builder(context, EVENT_CHANNEL)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle("New screenshot")
      .setContentText("Save, remind, or organize it in SnapMind.")
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setContentIntent(pending)
      .build()
    NotificationManagerCompat.from(context).notify(assetId.hashCode(), notification)
  }
}
