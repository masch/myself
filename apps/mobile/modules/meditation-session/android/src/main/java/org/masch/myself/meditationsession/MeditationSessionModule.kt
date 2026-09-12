package org.masch.myself.meditationsession

import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File
import java.io.FileInputStream

class StartSessionOptionsRecord : Record {
  @Field
  var targetEpochMs: Double = 0.0

  @Field
  var targetTimeFormatted: String = ""
}

class MeditationSessionModule : Module() {
  private var activeMediaPlayer: MediaPlayer? = null

  override fun definition() = ModuleDefinition {
    Name("MeditationSession")

    Events("onSessionCompleted", "onSessionError")

    OnCreate {
      MeditationForegroundService.onSessionCompletedListener = {
        sendEvent("onSessionCompleted")
      }
      MeditationForegroundService.onSessionErrorListener = { errorMsg ->
        sendEvent("onSessionError", mapOf("error" to errorMsg))
      }
    }

    OnDestroy {
      MeditationForegroundService.onSessionCompletedListener = null
      MeditationForegroundService.onSessionErrorListener = null
      stopAlarmSoundInternal()
    }

    Function("startSession") { options: StartSessionOptionsRecord ->
      val context = appContext.reactContext ?: return@Function false
      val intent = Intent(context, MeditationForegroundService::class.java).apply {
        putExtra(
          MeditationForegroundService.EXTRA_TARGET_EPOCH_MS,
          options.targetEpochMs.toLong()
        )
        putExtra(
          MeditationForegroundService.EXTRA_TARGET_TIME_FORMATTED,
          options.targetTimeFormatted
        )
      }

      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(intent)
        } else {
          context.startService(intent)
        }
        true
      } catch (e: Exception) {
        false
      }
    }

    Function("stopSession") {
      val context = appContext.reactContext ?: return@Function false
      val intent = Intent(context, MeditationForegroundService::class.java)
      context.stopService(intent)
      true
    }

    Function("isSessionActive") {
      MeditationForegroundService.isServiceActive
    }

    Function("playAlarmSound") { uriString: String, volume: Double ->
      val context = appContext.reactContext ?: return@Function false
      var createdPlayer: MediaPlayer? = null
      try {
        stopAlarmSoundInternal()

        val mediaPlayer = MediaPlayer()
        createdPlayer = mediaPlayer

        mediaPlayer.setOnCompletionListener { mp ->
          mp.release()
          if (activeMediaPlayer == mp) {
            activeMediaPlayer = null
          }
        }

        val audioAttributes = AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()

        mediaPlayer.setAudioAttributes(audioAttributes)

        if (uriString.startsWith("file://")) {
          val filePath = Uri.parse(uriString).path ?: uriString.removePrefix("file://")
          val file = File(filePath)
          if (file.exists()) {
            FileInputStream(file).use { fis ->
              mediaPlayer.setDataSource(fis.fd)
            }
          } else {
            mediaPlayer.setDataSource(context, Uri.parse(uriString))
          }
        } else {
          mediaPlayer.setDataSource(context, Uri.parse(uriString))
        }

        val vol = volume.toFloat().coerceIn(0f, 1f)
        mediaPlayer.setVolume(vol, vol)
        mediaPlayer.prepare()

        activeMediaPlayer = mediaPlayer
        mediaPlayer.start()
        true
      } catch (_: Exception) {
        if (activeMediaPlayer == createdPlayer) {
          activeMediaPlayer = null
        }
        runCatching { createdPlayer?.release() }
        false
      }
    }

    Function("stopAlarmSound") {
      stopAlarmSoundInternal()
      true
    }
  }

  private fun stopAlarmSoundInternal() {
    try {
      activeMediaPlayer?.let { mp ->
        if (mp.isPlaying) {
          mp.stop()
        }
        mp.release()
      }
    } catch (_: Exception) {
    } finally {
      activeMediaPlayer = null
    }
  }
}
