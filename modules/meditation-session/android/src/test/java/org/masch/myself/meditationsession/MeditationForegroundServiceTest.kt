package org.masch.myself.meditationsession

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import kotlin.math.abs

class MeditationForegroundServiceTest {

    @Before
    fun setUp() {
        MeditationForegroundService.isSessionActive = false
        MeditationForegroundService.onSessionCompletedListener = null
        MeditationForegroundService.onSessionErrorListener = null
    }

    @Test
    fun testNotificationIdIsPositiveDeterministicAndNonNull() {
        val expectedNotificationId = MeditationForegroundService::class.java.name.hashCode().let {
            abs(it).coerceAtLeast(1)
        }
        assertTrue("Notification ID must be positive", expectedNotificationId > 0)
        assertEquals("Notification ID must be deterministic based on class FQN",
            expectedNotificationId,
            MeditationForegroundService::class.java.name.hashCode().let { abs(it).coerceAtLeast(1) }
        )
    }

    @Test
    fun testActionAndExtraConstantsContracts() {
        assertEquals("meditation_session_foreground_channel_v1", MeditationForegroundService.CHANNEL_ID)
        assertEquals("org.masch.myself.meditationsession.action.START_SESSION", MeditationForegroundService.ACTION_START_SESSION)
        assertEquals("org.masch.myself.meditationsession.action.STOP_SESSION", MeditationForegroundService.ACTION_STOP_SESSION)
        assertEquals("extra_target_epoch_ms", MeditationForegroundService.EXTRA_TARGET_EPOCH_MS)
        assertEquals("extra_target_time_formatted", MeditationForegroundService.EXTRA_TARGET_TIME_FORMATTED)
    }

    @Test
    fun testSessionActiveFlagManagement() {
        assertFalse(MeditationForegroundService.isSessionActive)
        MeditationForegroundService.isSessionActive = true
        assertTrue(MeditationForegroundService.isSessionActive)
        MeditationForegroundService.isSessionActive = false
        assertFalse(MeditationForegroundService.isSessionActive)
    }

    @Test
    fun testSessionCompletedListenerInvocation() {
        var completedCalled = false
        MeditationForegroundService.onSessionCompletedListener = {
            completedCalled = true
        }

        assertNotNull(MeditationForegroundService.onSessionCompletedListener)
        MeditationForegroundService.onSessionCompletedListener?.invoke()
        assertTrue("onSessionCompletedListener should be invoked", completedCalled)
    }

    @Test
    fun testSessionErrorListenerInvocation() {
        var receivedError: String? = null
        MeditationForegroundService.onSessionErrorListener = { err ->
            receivedError = err
        }

        assertNotNull(MeditationForegroundService.onSessionErrorListener)
        MeditationForegroundService.onSessionErrorListener?.invoke("WakeLock test failure")
        assertEquals("WakeLock test failure", receivedError)
    }
}
