package com.vibestream.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * BluetoothResumePackage
 *
 * Registers [BluetoothResumeModule] with the React Native module registry so
 * that the JS layer can access it via NativeModules.RNBluetoothStateModule.
 */
class BluetoothResumePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(BluetoothResumeModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}

