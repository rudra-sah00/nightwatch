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
        print("[NWVolume] Plugin loading...")

        // Activate audio session so we can read/write volume
        do {
            try AVAudioSession.sharedInstance().setActive(true)
            print("[NWVolume] AVAudioSession activated")
        } catch {
            print("[NWVolume] AVAudioSession error: \(error)")
        }

        DispatchQueue.main.async { [weak self] in
            let mpView = MPVolumeView(frame: CGRect(x: -1000, y: -1000, width: 1, height: 1))
            mpView.alpha = 0.01
            self?.bridge?.viewController?.view.addSubview(mpView)

            // Find the UISlider inside MPVolumeView
            for subview in mpView.subviews {
                print("[NWVolume] Found subview: \(type(of: subview))")
                if let slider = subview as? UISlider {
                    self?.volumeSlider = slider
                    print("[NWVolume] Found volume slider, current value: \(slider.value)")
                }
            }

            if self?.volumeSlider == nil {
                print("[NWVolume] WARNING: Could not find UISlider in MPVolumeView")
            }

            print("[NWVolume] Plugin loaded successfully")
        }
    }

    @objc func getVolume(_ call: CAPPluginCall) {
        let vol = AVAudioSession.sharedInstance().outputVolume
        print("[NWVolume] getVolume: \(vol)")
        call.resolve(["value": vol])
    }

    @objc func setVolume(_ call: CAPPluginCall) {
        guard let value = call.getFloat("value") else {
            print("[NWVolume] setVolume: missing value")
            call.reject("Missing value")
            return
        }

        print("[NWVolume] setVolume called with: \(value)")

        DispatchQueue.main.async { [weak self] in
            if let slider = self?.volumeSlider {
                print("[NWVolume] Setting slider from \(slider.value) to \(value)")
                slider.setValue(value, animated: false)
                slider.sendActions(for: .valueChanged)
                print("[NWVolume] Slider set. System volume now: \(AVAudioSession.sharedInstance().outputVolume)")
                call.resolve(["value": value])
            } else {
                print("[NWVolume] ERROR: No slider available")
                call.reject("Volume slider not available")
            }
        }
    }
}
