package com.nightwatch.in;

import android.content.Intent;
import android.os.Build;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NWMusicService")
public class NWMusicServicePlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        String title = call.getString("title");
        String artist = call.getString("artist");

        getActivity().runOnUiThread(() -> {
            try {
                Intent intent = new Intent(getContext(), MusicPlaybackService.class);
                if (title != null) intent.putExtra("title", title);
                if (artist != null) intent.putExtra("artist", artist);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    getContext().startForegroundService(intent);
                } else {
                    getContext().startService(intent);
                }
            } catch (Exception e) {
                // silent fail
            }
        });
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                Intent intent = new Intent(getContext(), MusicPlaybackService.class);
                intent.setAction("stop");
                getContext().startService(intent);
            } catch (Exception e) {
                // silent fail
            }
        });
        call.resolve();
    }
}
