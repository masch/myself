package org.masch.myself.dndstatus

import android.app.NotificationManager
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DndStatusModuleTest {

    private fun isInterruptionFilterDnd(filter: Int): Boolean {
        return filter == NotificationManager.INTERRUPTION_FILTER_PRIORITY ||
                filter == NotificationManager.INTERRUPTION_FILTER_NONE ||
                filter == NotificationManager.INTERRUPTION_FILTER_ALARMS
    }

    @Test
    fun testInterruptionFilterDndEvaluation() {
        // Normal / All notifications should NOT be considered DND
        assertFalse(isInterruptionFilterDnd(NotificationManager.INTERRUPTION_FILTER_ALL))
        assertFalse(isInterruptionFilterDnd(NotificationManager.INTERRUPTION_FILTER_UNKNOWN))

        // Priority, None (Total Silence), and Alarms only MUST be evaluated as DND active
        assertTrue(isInterruptionFilterDnd(NotificationManager.INTERRUPTION_FILTER_PRIORITY))
        assertTrue(isInterruptionFilterDnd(NotificationManager.INTERRUPTION_FILTER_NONE))
        assertTrue(isInterruptionFilterDnd(NotificationManager.INTERRUPTION_FILTER_ALARMS))
    }
}
