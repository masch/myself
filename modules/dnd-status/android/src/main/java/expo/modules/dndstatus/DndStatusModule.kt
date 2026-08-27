package expo.modules.dndstatus

import android.app.NotificationManager
import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DndStatusModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DndStatus")

    Function("isDndActive") {
      val context = appContext.reactContext ?: return@Function false
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        ?: return@Function false

      return@Function try {
        val filter = notificationManager.currentInterruptionFilter
        // INTERRUPTION_FILTER_ALL = 1 (Normal / Not in DND)
        // INTERRUPTION_FILTER_PRIORITY = 2 (Priority DND)
        // INTERRUPTION_FILTER_NONE = 3 (Total silence DND)
        // INTERRUPTION_FILTER_ALARMS = 4 (Alarms only DND)
        // INTERRUPTION_FILTER_UNKNOWN = 0
        filter == NotificationManager.INTERRUPTION_FILTER_PRIORITY ||
          filter == NotificationManager.INTERRUPTION_FILTER_NONE ||
          filter == NotificationManager.INTERRUPTION_FILTER_ALARMS
      } catch (e: Exception) {
        false
      }
    }

    Function("isSupported") {
      return@Function true
    }

    Function("isNotificationPolicyAccessGranted") {
      val context = appContext.reactContext ?: return@Function false
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        ?: return@Function false
      return@Function try {
        notificationManager.isNotificationPolicyAccessGranted
      } catch (e: Exception) {
        false
      }
    }

    Function("setDndActive") { active: Boolean ->
      val context = appContext.reactContext ?: return@Function false
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        ?: return@Function false

      return@Function try {
        if (notificationManager.isNotificationPolicyAccessGranted) {
          if (active) {
            notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
          } else {
            notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
          }
          true
        } else {
          false
        }
      } catch (e: Exception) {
        false
      }
    }

    Function("openDndSettings") {
      val context = appContext.reactContext
      if (context != null) {
        try {
          val intent = android.content.Intent(android.provider.Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).apply {
            addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
          }
          context.startActivity(intent)
        } catch (e: Exception) {
          try {
            val fallbackIntent = android.content.Intent(android.provider.Settings.ACTION_SOUND_SETTINGS).apply {
              addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(fallbackIntent)
          } catch (_: Exception) {}
        }
      }
      return@Function Unit
    }
  }
}
