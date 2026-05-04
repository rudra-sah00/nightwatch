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

    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return call.reject("Plugin deallocated") }
            guard AVPictureInPictureController.isPictureInPictureSupported() else {
                return call.reject("PiP not supported on this device")
            }

            if let pip = self.pipController, pip.isPictureInPictureActive {
                return call.resolve()
            }

            guard let webView = self.bridge?.webView else {
                return call.reject("No webView found")
            }

            // Try AVPlayerLayer first (native AVPlayer)
            if let playerLayer = self.findAVPlayerLayer(in: webView.layer) {
                self.startPipWith(playerLayer: playerLayer, call: call)
                return
            }

            // Try AVSampleBufferDisplayLayer (WKWebView HTML5 video)
            if #available(iOS 15.0, *) {
                if let sampleLayer = self.findSampleBufferLayer(in: webView.layer) {
                    self.startPipWithSampleBuffer(layer: sampleLayer, call: call)
                    return
                }
            }

            call.reject("No active video layer found")
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            if let pip = self?.pipController, pip.isPictureInPictureActive {
                pip.stopPictureInPicture()
            }
            self?.pipController = nil
            call.resolve()
        }
    }

    private func startPipWith(playerLayer: AVPlayerLayer, call: CAPPluginCall) {
        guard let pip = AVPictureInPictureController(playerLayer: playerLayer) else {
            return call.reject("Failed to create PiP controller")
        }
        pip.delegate = self
        self.pipController = pip
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

    @available(iOS 15.0, *)
    private func startPipWithSampleBuffer(layer: AVSampleBufferDisplayLayer, call: CAPPluginCall) {
        let contentSource = AVPictureInPictureController.ContentSource(sampleBufferDisplayLayer: layer, playbackDelegate: self)
        let pip = AVPictureInPictureController(contentSource: contentSource)
        pip.delegate = self
        self.pipController = pip
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

    // MARK: - AVPictureInPictureControllerDelegate

    public func pictureInPictureControllerDidStartPictureInPicture(_ c: AVPictureInPictureController) {
        pendingCall?.resolve()
        pendingCall = nil
    }

    public func pictureInPictureController(_ c: AVPictureInPictureController, failedToStartPictureInPictureWithError error: Error) {
        pendingCall?.reject("PiP failed: \(error.localizedDescription)")
        pendingCall = nil
    }

    public func pictureInPictureControllerDidStopPictureInPicture(_ c: AVPictureInPictureController) {
        pipController = nil
    }

    // MARK: - Layer search

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

    private func findSampleBufferLayer(in layer: CALayer) -> AVSampleBufferDisplayLayer? {
        if let sbl = layer as? AVSampleBufferDisplayLayer {
            return sbl
        }
        for sublayer in layer.sublayers ?? [] {
            if let found = findSampleBufferLayer(in: sublayer) {
                return found
            }
        }
        return nil
    }
}

// MARK: - AVPictureinPictureSampleBufferPlaybackDelegate

@available(iOS 15.0, *)
extension NWPipPlugin: AVPictureInPictureSampleBufferPlaybackDelegate {
    public func pictureInPictureController(_ c: AVPictureInPictureController, setPlaying playing: Bool) {
        // WKWebView manages playback — no-op
    }

    public func pictureInPictureControllerTimeRangeForPlayback(_ c: AVPictureInPictureController) -> CMTimeRange {
        return CMTimeRange(start: .negativeInfinity, duration: .positiveInfinity)
    }

    public func pictureInPictureControllerIsPlaybackPaused(_ c: AVPictureInPictureController) -> Bool {
        return false
    }

    public func pictureInPictureController(_ c: AVPictureInPictureController, didTransitionToRenderSize newRenderSize: CMVideoDimensions) {
        // No-op
    }

    public func pictureInPictureController(_ c: AVPictureInPictureController, skipByInterval skipInterval: CMTime, completion completionHandler: @escaping () -> Void) {
        completionHandler()
    }
}
