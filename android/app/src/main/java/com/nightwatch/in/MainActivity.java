package com.nightwatch.in;

import android.app.UiModeManager;
import android.content.Context;
import android.content.res.Configuration;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(NWAudioSessionPlugin.class);
        super.onCreate(savedInstanceState);

        UiModeManager uiModeManager = (UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
        boolean isTV = uiModeManager != null
                && uiModeManager.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION;

        if (isTV) {
            getBridge().getWebView().post(() -> {
                WebView wv = getBridge().getWebView();
                wv.evaluateJavascript("window.__ANDROID_TV__=true;", null);
            });
        }
    }
}
