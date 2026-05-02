package com.nightwatch.in;

import android.content.Context;
import android.media.AudioManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NWAudioSession")
public class NWAudioSessionPlugin extends Plugin {

    private AudioManager getAudioManager() {
        return (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
    }

    @PluginMethod
    public void setVoiceCallMode(PluginCall call) {
        AudioManager am = getAudioManager();
        am.setMode(AudioManager.MODE_IN_COMMUNICATION);
        am.setSpeakerphoneOn(true);
        call.resolve();
    }

    @PluginMethod
    public void setMediaMode(PluginCall call) {
        AudioManager am = getAudioManager();
        am.setMode(AudioManager.MODE_NORMAL);
        am.setSpeakerphoneOn(false);
        call.resolve();
    }

    @PluginMethod
    public void setOutputToSpeaker(PluginCall call) {
        AudioManager am = getAudioManager();
        am.setSpeakerphoneOn(true);
        call.resolve();
    }

    @PluginMethod
    public void setOutputToEarpiece(PluginCall call) {
        AudioManager am = getAudioManager();
        am.setSpeakerphoneOn(false);
        call.resolve();
    }
}
