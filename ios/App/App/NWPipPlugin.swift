import Capacitor
import AVKit
import WebKit

@objc(NWPipPlugin)
public class NWPipPlugin: CAPPlugin, CAPBridgedPlugin, AVPictureInPictureControllerDelegate {
    public let identifier = "NWPipPlugin"
    public let jsName = "NWPip"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
    ]

    private var pipController: AVPictureInPictureController?
    private var pendingCall: CAPPluginCall?

    /// Attempt to start system PiP by finding the active video layer in the WKWebView.
    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return call.reject("Plugin deallocated") }
            guard AVPictureInPictureController.isPictureInPictureSupported() else {
                return call.reject("PiP not supported on this device")
            }

            // If we already have an active PiP, resolve immediately
            if let pip = self.pipController, pip.isPictureInPictureActive {
                return call.resolve()
            }

            guard let webView = self.bridge?.webView else {
                return call.reject("No webView found")
            }

            // Find the AVPlayerLayer inside the WKWebView's layer tree
            guard let playerLayer = self.findAVPlayerLayer(in: webView.layer) else {
                return call.reject("No active video layer found")
            }

            guard let pip = AVPictureInPictureController(playerLayer: playerLayer) else {
                return call.reject("Failed to create PiP controller")
            }
            pip.delegate = self
            self.pipController = pip

            // AVPictureInPictureController needs a runloop tick before it can start
            self.pendingCall = call
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                if pip.isPictureInPicturePossible {
                    pip.startPictureInPicture()
                } else {
                    self.pendingCall = nil
                    call.reject("PiP not possible for current video")
                }
            }
        }
    }

    /// Stop system PiP.
    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            if let pip = self?.pipController, pip.isPictureInPictureActive {
                pip.stopPictureInPicture()
            }
            self?.pipController = nil
            call.resolve()
        }
    }

    // MARK: - AVPictureInPictureControllerDelegate

    public func pictureInPictureControllerDidStartPictureInPicture(_ pictureInPictureController: AVPictureInPictureController) {
        pendingCall?.resolve()
        pendingCall = nil
    }

    public func pictureInPictureController(_ pictureInPictureController: AVPictureInPictureController, failedToStartPictureInPictureWithError error: Error) {
        pendingCall?.reject("PiP failed: \(error.localizedDescription)")
        pendingCall = nil
    }

    public func pictureInPictureControllerDidStopPictureInPicture(_ pictureInPictureController: AVPictureInPictureController) {
        pipController = nil
    }

    // MARK: - Layer search

    /// Recursively search the layer tree for an AVPlayerLayer with an active player.
    private func findAVPlayerLayer(in layer: CALayer) -> AVPlayerLayer? {
        if let playerLayer = layer as? AVPlayerLayer,
           playerLayer.player?.currentItem != nil {
            return playerLayer
        }
        for sublayer in layer.sublayers ?? [] {
            if let found = findAVPlayerLayer(in: sublayer) {
                return found
            }
        }
        return nil
    }
}
