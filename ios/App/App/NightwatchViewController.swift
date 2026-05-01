import UIKit
import Capacitor

class NightwatchViewController: CAPBridgeViewController {
    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let config = super.webViewConfiguration(for: instanceConfiguration)
        config.allowsPictureInPictureMediaPlayback = true
        return config
    }

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(NWVolumePlugin())
        bridge?.registerPluginInstance(NWAudioSessionPlugin())
        bridge?.registerPluginInstance(NWPipPlugin())
    }
}
