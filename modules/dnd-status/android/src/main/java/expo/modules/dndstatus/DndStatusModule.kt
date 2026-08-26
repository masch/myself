package expo.modules.dndstatus

import android.app.NotificationManager
import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DndStatusModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DndStatus")

    Function("isDndActive") {
      try {
        val context = appContext.reactContext ?: return@Function false
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
          ?: return@Function false

        val filter = notificationManager.currentInterruptionFilter
        // INTERRUPTION_FILTER_ALL = 1 (Normal / Not in DND)
        // INTERRUPTION_FILTER_PRIORITY = 2 (Priority DND)
        // INTERRUPTION_FILTER_NONE = 3 (Total silence DND)
        // INTERRUPTION_FILTER_ALARMS = 4 (Alarms only DND)
        // INTERRUPTION_FILTER_UNKNOWN = 0
        return@Function filter == NotificationManager.INTERRUPTION_FILTER_PRIORITY ||
          filter == NotificationManager.INTERRUPTION_FILTER_NONE ||
          filter == NotificationManager.INTERRUPTION_FILTER_ALARMS
      } catch (e: Exception) {
        return@Function false
      }
    }

    Function("isSupported") {
      return@Function true
    }
  }
}
