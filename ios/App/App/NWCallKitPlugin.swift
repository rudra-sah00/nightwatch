import Capacitor
import CallKit

@objc(NWCallKitPlugin)
public class NWCallKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NWCallKitPlugin"
    public let jsName = "NWCallKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startOutgoingCall", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reportOutgoingCallConnected", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endCall", returnType: CAPPluginReturnPromise),
    ]

    private let callController = CXCallController()
    private var activeCallUUID: UUID?

    @objc func startOutgoingCall(_ call: CAPPluginCall) {
        guard let handle = call.getString("handle") else {
            call.reject("Missing handle")
            return
        }

        let uuid = UUID()
        activeCallUUID = uuid
        let displayName = call.getString("displayName") ?? handle

        let cxHandle = CXHandle(type: .generic, value: handle)
        let startAction = CXStartCallAction(call: uuid, handle: cxHandle)
        startAction.isVideo = false
        startAction.contactIdentifier = displayName

        callController.request(CXTransaction(action: startAction)) { [weak self] error in
            if let error = error {
                self?.activeCallUUID = nil
                call.reject("Failed: \(error.localizedDescription)")
                return
            }
            call.resolve(["callId": uuid.uuidString])
        }
    }

    @objc func reportOutgoingCallConnected(_ call: CAPPluginCall) {
        // No-op: without our own CXProvider we can't call reportOutgoingCall.
        // The system handles the connected state via CXCallController.
        call.resolve()
    }

    @objc func endCall(_ call: CAPPluginCall) {
        guard let uuid = activeCallUUID else {
            call.resolve()
            return
        }
        let endAction = CXEndCallAction(call: uuid)
        callController.request(CXTransaction(action: endAction)) { [weak self] _ in
            self?.activeCallUUID = nil
            call.resolve()
        }
    }
}
