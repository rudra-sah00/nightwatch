import UIKit
import Capacitor

class NightwatchViewController: CAPBridgeViewController {
    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let config = super.webViewConfiguration(for: instanceConfiguration)
        config.allowsPictureInPictureMediaPlayback = true
        return config
    }

    // Register local plugins with the Capacitor bridge
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(NWVolumePlugin())
    }
}
