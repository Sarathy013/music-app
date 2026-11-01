package com.vibestream.app

import android.bluetooth.BluetoothA2dp
import android.bluetooth.BluetoothHeadset
import android.bluetooth.BluetoothProfile
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * BluetoothResumeModule
 *
 * Registers a BroadcastReceiver for Bluetooth A2DP and HSP/HFP connection
 * events and forwards a JS event ("bluetoothAudioConnected") to React Native
 * whenever an audio output device connects.
 *
 * The JS layer (PlayerContext.js) listens for this event via DeviceEventEmitter
 * and automatically resumes/starts playback of the last played song.
 */
class BluetoothResumeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var listenerCount = 0
    private var receiver: BroadcastReceiver? = null

    override fun getName(): String = "RNBluetoothStateModule"

    // Called from JS: addListener / removeListeners are required by NativeEventEmitter
    @ReactMethod
    fun addListener(eventName: String) {
        if (listenerCount == 0) registerReceiver()
        listenerCount++
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        listenerCount = maxOf(0, listenerCount - count)
        if (listenerCount == 0) unregisterReceiver()
    }

    private fun registerReceiver() {
        if (receiver != null) return

        receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val action = intent.action ?: return
                val state = intent.getIntExtra(BluetoothProfile.EXTRA_STATE, -1)

                val isConnected = state == BluetoothProfile.STATE_CONNECTED
                val isA2dpConnected = action == BluetoothA2dp.ACTION_CONNECTION_STATE_CHANGED && isConnected
                val isHeadsetConnected = action == BluetoothHeadset.ACTION_CONNECTION_STATE_CHANGED && isConnected

                if (isA2dpConnected || isHeadsetConnected) {
                    sendEvent("bluetoothAudioConnected", null)
                }
            }
        }

        val filter = IntentFilter().apply {
            addAction(BluetoothA2dp.ACTION_CONNECTION_STATE_CHANGED)
            addAction(BluetoothHeadset.ACTION_CONNECTION_STATE_CHANGED)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            reactContext.registerReceiver(receiver, filter)
        }
    }

    private fun unregisterReceiver() {
        receiver?.let {
            try { reactContext.unregisterReceiver(it) } catch (_: Exception) {}
            receiver = null
        }
    }

    private fun sendEvent(eventName: String, params: Any?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    override fun invalidate() {
        unregisterReceiver()
        super.invalidate()
    }
}

