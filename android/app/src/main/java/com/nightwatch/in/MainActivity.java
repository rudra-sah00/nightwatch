package com.nightwatch.in;

import android.app.PictureInPictureParams;
import android.app.UiModeManager;
import android.content.Context;
import android.content.res.Configuration;
import android.os.Build;
import android.util.Rational;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private boolean isTV = false;

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(NWAudioSessionPlugin.class);
        super.onCreate(savedInstanceState);

        UiModeManager uiModeManager = (UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
        isTV = uiModeManager != null
                && uiModeManager.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION;

        if (isTV) {
            // Inject TV flag into WebView once the bridge is ready
            getBridge().getWebView().post(() -> {
                WebView wv = getBridge().getWebView();
                wv.evaluateJavascript("window.__ANDROID_TV__=true;", null);
            });
        }
    }

    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        // Skip PiP on TV — TV already is the big screen
        if (isTV) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            PictureInPictureParams params = new PictureInPictureParams.Builder()
                    .setAspectRatio(new Rational(16, 9))
                    .build();
            enterPictureInPictureMode(params);
        }
    }
}
