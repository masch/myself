package org.masch.myself.meditationsession

import android.content.Context
import android.content.Intent
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class StartSessionOptionsRecord : Record {
  @Field
  var targetEpochMs: Double = 0.0

  @Field
  var targetTimeFormatted: String = ""
}

class MeditationSessionModule : Module() {
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
  }
}
