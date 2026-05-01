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

    private var volumeSlider: UISlider?

    override public func load() {
        do {
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {}

        DispatchQueue.main.async { [weak self] in
            let mpView = MPVolumeView(frame: CGRect(x: -1000, y: -1000, width: 1, height: 1))
            mpView.alpha = 0.01
            self?.bridge?.viewController?.view.addSubview(mpView)
            for subview in mpView.subviews {
                if let slider = subview as? UISlider {
                    self?.volumeSlider = slider
                }
            }
        }
    }

    @objc func getVolume(_ call: CAPPluginCall) {
        call.resolve(["value": AVAudioSession.sharedInstance().outputVolume])
    }

    @objc func setVolume(_ call: CAPPluginCall) {
        guard let value = call.getFloat("value") else {
            call.reject("Missing value")
            return
        }
        DispatchQueue.main.async { [weak self] in
            if let slider = self?.volumeSlider {
                slider.setValue(value, animated: false)
                slider.sendActions(for: .valueChanged)
                call.resolve(["value": value])
            } else {
                call.reject("Volume slider not available")
            }
        }
    }
}
