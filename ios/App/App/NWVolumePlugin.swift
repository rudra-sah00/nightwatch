import Capacitor
import MediaPlayer
import AVFoundation

@objc(NWVolumePlugin)
public class NWVolumePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NWVolumePlugin"
    public let jsName = "NWVolume"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getVolume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setVolume", returnType: CAPPluginReturnPromise),
    ]

    private var volumeView: MPVolumeView?

    override public func load() {
        DispatchQueue.main.async {
            let view = MPVolumeView(frame: .zero)
            view.isHidden = true
            self.bridge?.viewController?.view.addSubview(view)
            self.volumeView = view
        }
    }

    @objc func getVolume(_ call: CAPPluginCall) {
        let volume = AVAudioSession.sharedInstance().outputVolume
        call.resolve(["value": volume])
    }

    @objc func setVolume(_ call: CAPPluginCall) {
        guard let value = call.getFloat("value") else {
            call.reject("Missing value")
            return
        }
        DispatchQueue.main.async {
            if let slider = self.volumeView?.subviews.first(where: { $0 is UISlider }) as? UISlider {
                slider.value = value
            }
            call.resolve(["value": value])
        }
    }
}
