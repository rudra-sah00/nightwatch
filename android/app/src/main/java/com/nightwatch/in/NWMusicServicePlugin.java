package com.nightwatch.in;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor plugin bridging WebView music state to the native MusicPlaybackService.
 *
 * - start(): Start foreground service with track metadata → shows MediaStyle notification
 * - update(): Update metadata/state without restarting service (e.g. play/pause toggle)
 * - stop(): Stop service and dismiss notification
 *
 * Listens for MUSIC_COMMAND broadcasts from notification actions and fires
 * "musicCommand" events back to the WebView for handling.
 */
@CapacitorPlugin(name = "NWMusicService")
public class NWMusicServicePlugin extends Plugin {

    private BroadcastReceiver commandReceiver;

    @Override
    public void load() {
        // Register receiver for notification button actions
        commandReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String command = intent.getStringExtra("command");
                if (command != null) {
                    JSObject data = new JSObject();
                    data.put("command", command);
                    notifyListeners("musicCommand", data);
                }
            }
        };
        IntentFilter filter = new IntentFilter("com.nightwatch.in.MUSIC_COMMAND");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(commandReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(commandReceiver, filter);
        }
    }

    @PluginMethod
    public void start(PluginCall call) {
        String title = call.getString("title");
        String artist = call.getString("artist");
        String imageUrl = call.getString("imageUrl");
        Boolean isPlaying = call.getBoolean("isPlaying", true);

        getActivity().runOnUiThread(() -> {
            try {
                Intent intent = new Intent(getContext(), MusicPlaybackService.class);
                if (title != null) intent.putExtra("title", title);
                if (artist != null) intent.putExtra("artist", artist);
                if (imageUrl != null) intent.putExtra("imageUrl", imageUrl);
                intent.putExtra("isPlaying", isPlaying);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    getContext().startForegroundService(intent);
                } else {
                    getContext().startService(intent);
                }
            } catch (Exception e) {
                // silent fail — e.g. background start restrictions on some OEMs
            }
        });
        call.resolve();
    }

    @PluginMethod
    public void update(PluginCall call) {
        String title = call.getString("title");
        String artist = call.getString("artist");
        String imageUrl = call.getString("imageUrl");
        Boolean isPlaying = call.getBoolean("isPlaying", true);

        getActivity().runOnUiThread(() -> {
            try {
                Intent intent = new Intent(getContext(), MusicPlaybackService.class);
                intent.setAction(MusicPlaybackService.ACTION_UPDATE);
                if (title != null) intent.putExtra("title", title);
                if (artist != null) intent.putExtra("artist", artist);
                if (imageUrl != null) intent.putExtra("imageUrl", imageUrl);
                intent.putExtra("isPlaying", isPlaying);
                getContext().startService(intent);
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

    @Override
    protected void handleOnDestroy() {
        if (commandReceiver != null) {
            try {
                getContext().unregisterReceiver(commandReceiver);
            } catch (Exception e) {
                // already unregistered
            }
        }
    }
}
