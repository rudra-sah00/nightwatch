import Capacitor
import AVFoundation

@objc(NWAudioSessionPlugin)
public class NWAudioSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NWAudioSessionPlugin"
    public let jsName = "NWAudioSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setVoiceCallMode", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setMediaMode", returnType: CAPPluginReturnPromise),
    ]

    /// Switch audio session to voice call mode.
    /// Uses .playAndRecord with .voiceChat so iOS treats it as a phone call
    /// (enables earpiece, echo cancellation, green pill indicator).
    @objc func setVoiceCallMode(_ call: CAPPluginCall) {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(
                .playAndRecord,
                mode: .voiceChat,
                options: [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP]
            )
            try session.setActive(true)
            call.resolve()
        } catch {
            call.reject("Failed to set voice call mode: \(error.localizedDescription)")
        }
    }

    /// Switch audio session back to media playback mode.
    /// Used when the call ends to restore normal music/video playback.
    @objc func setMediaMode(_ call: CAPPluginCall) {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(
                .playback,
                mode: .default,
                options: [.allowBluetooth, .allowAirPlay]
            )
            try session.setActive(true)
            call.resolve()
        } catch {
            call.reject("Failed to set media mode: \(error.localizedDescription)")
        }
    }
}
