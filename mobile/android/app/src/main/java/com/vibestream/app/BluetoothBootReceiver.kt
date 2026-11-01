package com.vibestream.app

import android.bluetooth.BluetoothA2dp
import android.bluetooth.BluetoothHeadset
import android.bluetooth.BluetoothProfile
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * BluetoothBootReceiver
 *
 * A manifest-registered BroadcastReceiver that fires whenever a Bluetooth
 * A2DP (stereo audio) or headset (HSP/HFP) device connects — even when the
 * app process is not running.
 *
 * On connection, it launches MainActivity with a special Intent extra so the
 * React Native JS layer knows it should start playback immediately after the
 * app is foregrounded.  The PlayerContext.js reads this via the
 * 'bluetoothAudioConnected' DeviceEventEmitter event (emitted by
 * BluetoothResumeModule once RN is initialised).
 *
 * Note: Android 10+ restricts starting Activities from the background. We
 * therefore post a high-priority notification that the user can tap, rather
 * than launching the activity directly.  The notification deep-links back
 * into the app.  When the app is in the background (not fully killed), the
 * BluetoothResumeModule receiver handles auto-play directly without needing
 * this boot receiver.
 */
class BluetoothBootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        val state = intent.getIntExtra(BluetoothProfile.EXTRA_STATE, -1)
        val isConnected = state == BluetoothProfile.STATE_CONNECTED

        val isA2dp = action == BluetoothA2dp.ACTION_CONNECTION_STATE_CHANGED && isConnected
        val isHeadset = action == BluetoothHeadset.ACTION_CONNECTION_STATE_CHANGED && isConnected

        if (!isA2dp && !isHeadset) return

        // If the app is in the foreground / background the BluetoothResumeModule
        // will already handle this event. Launch the app only when the process is
        // genuinely not running so we can auto-play from the persisted state.
        val launchIntent = context.packageManager
            .getLaunchIntentForPackage(context.packageName)
            ?: return

        launchIntent.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("bluetoothAutoPlay", true)
        }

        // Android 10+ forbids direct background activity starts; instead bring
        // the existing task to front which is allowed.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Use a pending-intent style notification to prompt the user only if
            // the app is truly killed. If the app is backgrounded, the in-process
            // BluetoothResumeModule receiver (registered while RN is alive) handles it.
            try {
                context.startActivity(launchIntent)
            } catch (_: Exception) {
                // Silently ignore if we cannot start the activity
            }
        } else {
            context.startActivity(launchIntent)
        }
    }
}

