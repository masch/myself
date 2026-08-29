package org.masch.myself.meditationsession

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class MeditationForegroundService : Service() {
  private val serviceScope = CoroutineScope(Dispatchers.Default + Job())
  private var timerJob: Job? = null
  private var wakeLock: PowerManager.WakeLock? = null

  companion object {
    const val CHANNEL_ID = "meditation_session_foreground_channel"
    const val NOTIFICATION_ID = 44210
    const val EXTRA_TARGET_EPOCH_MS = "target_epoch_ms"
    const val EXTRA_TARGET_TIME_FORMATTED = "target_time_formatted"
    const val ACTION_STOP = "org.masch.myself.meditationsession.ACTION_STOP"

    var onSessionCompletedListener: (() -> Unit)? = null
    var isServiceActive: Boolean = false
      private set
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
    acquireWakeLock()
    isServiceActive = true
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopSelf()
      return START_NOT_STICKY
    }

    val targetEpochMs = intent?.getLongExtra(EXTRA_TARGET_EPOCH_MS, 0L) ?: 0L
    val targetTimeFormatted = intent?.getStringExtra(EXTRA_TARGET_TIME_FORMATTED) ?: ""

    val notification = buildOngoingNotification(targetTimeFormatted)
    startForeground(NOTIFICATION_ID, notification)

    val remainingMs = (targetEpochMs - System.currentTimeMillis()).coerceAtLeast(0L)

    timerJob?.cancel()
    timerJob = serviceScope.launch {
      delay(remainingMs)
      onSessionCompletedListener?.invoke()
      stopSelf()
    }

    return START_NOT_STICKY
  }

  override fun onDestroy() {
    timerJob?.cancel()
    releaseWakeLock()
    isServiceActive = false
    super.onDestroy()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Sesión de Meditación en Curso",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Muestra la sesión de meditación activa en la pantalla de bloqueo"
        setShowBadge(false)
        enableVibration(false)
        enableLights(false)
      }
      notificationManager.createNotificationChannel(channel)
    }
  }

  private fun buildOngoingNotification(targetTimeFormatted: String) =
    NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Meditación en curso")
      .setContentText(
        if (targetTimeFormatted.isNotEmpty()) "Momento 2 · Finaliza a las $targetTimeFormatted"
        else "Momento 2 · En progreso"
      )
      .setSmallIcon(applicationInfo.icon)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .build()

  private fun acquireWakeLock() {
    try {
      val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
      wakeLock = powerManager.newWakeLock(
        PowerManager.PARTIAL_WAKE_LOCK,
        "Myself:MeditationForegroundServiceWakeLock"
      ).apply {
        setReferenceCounted(false)
        acquire(4 * 60 * 60 * 1000L)
      }
    } catch (e: Exception) {
      // Best-effort lock
    }
  }

  private fun releaseWakeLock() {
    try {
      wakeLock?.let {
        if (it.isHeld) it.release()
      }
      wakeLock = null
    } catch (e: Exception) {
      // Best-effort release
    }
  }
}
