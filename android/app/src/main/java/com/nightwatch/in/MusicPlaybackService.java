package com.nightwatch.in;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;

import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Foreground service for music playback that provides:
 * - MediaSession integration (lock screen, Bluetooth, Android Auto, wearables)
 * - MediaStyle notification with play/pause, prev, next controls
 * - Album art loading from URL
 * - Playback state sync with WebView via Capacitor plugin events
 *
 * Works across all Android versions (API 24+), Samsung, Xiaomi, OnePlus, Pixel, etc.
 * Uses MediaSessionCompat for maximum backward compatibility.
 */
public class MusicPlaybackService extends Service {
    private static final String CHANNEL_ID = "music_playback";
    private static final int NOTIFICATION_ID = 1001;

    public static final String ACTION_PLAY = "com.nightwatch.in.ACTION_PLAY";
    public static final String ACTION_PAUSE = "com.nightwatch.in.ACTION_PAUSE";
    public static final String ACTION_NEXT = "com.nightwatch.in.ACTION_NEXT";
    public static final String ACTION_PREV = "com.nightwatch.in.ACTION_PREV";
    public static final String ACTION_STOP = "com.nightwatch.in.ACTION_STOP";
    public static final String ACTION_UPDATE = "com.nightwatch.in.ACTION_UPDATE";

    private MediaSessionCompat mediaSession;
    private String currentTitle = "Nightwatch";
    private String currentArtist = "Playing music";
    private String currentImageUrl = null;
    private boolean isPlaying = true;
    private Bitmap currentArt = null;
    private final ExecutorService artLoader = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        initMediaSession();
    }

    private void initMediaSession() {
        mediaSession = new MediaSessionCompat(this, "NightwatchMusic");
        mediaSession.setActive(true);
        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                broadcastCommand("toggle_play");
            }

            @Override
            public void onPause() {
                broadcastCommand("toggle_play");
            }

            @Override
            public void onSkipToNext() {
                broadcastCommand("next");
            }

            @Override
            public void onSkipToPrevious() {
                broadcastCommand("prev");
            }

            @Override
            public void onStop() {
                broadcastCommand("stop");
                stopForeground(true);
                stopSelf();
            }

            @Override
            public void onSeekTo(long pos) {
                // Not used — seek is handled in WebView
            }
        });
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_STICKY;

        String action = intent.getAction();
        if (action == null) action = "";

        switch (action) {
            case ACTION_PLAY:
                broadcastCommand("toggle_play");
                return START_STICKY;
            case ACTION_PAUSE:
                broadcastCommand("toggle_play");
                return START_STICKY;
            case ACTION_NEXT:
                broadcastCommand("next");
                return START_STICKY;
            case ACTION_PREV:
                broadcastCommand("prev");
                return START_STICKY;
            case ACTION_STOP:
            case "stop":
                stopForeground(true);
                stopSelf();
                return START_NOT_STICKY;
            case ACTION_UPDATE:
                // State update only — no command broadcast
                break;
            default:
                break;
        }

        // Extract metadata from intent
        String title = intent.getStringExtra("title");
        String artist = intent.getStringExtra("artist");
        String imageUrl = intent.getStringExtra("imageUrl");
        boolean playing = intent.getBooleanExtra("isPlaying", true);

        if (title != null) currentTitle = title;
        if (artist != null) currentArtist = artist;
        isPlaying = playing;

        // Load art if URL changed
        if (imageUrl != null && !imageUrl.equals(currentImageUrl)) {
            currentImageUrl = imageUrl;
            loadArtwork(imageUrl);
        } else {
            updateNotification();
        }

        return START_STICKY;
    }

    private void loadArtwork(String url) {
        artLoader.execute(() -> {
            try {
                HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);
                InputStream in = conn.getInputStream();
                Bitmap bitmap = BitmapFactory.decodeStream(in);
                in.close();
                conn.disconnect();
                // Scale down for notification (max 512x512 to save memory on low-end)
                if (bitmap != null && (bitmap.getWidth() > 512 || bitmap.getHeight() > 512)) {
                    bitmap = Bitmap.createScaledBitmap(bitmap, 512, 512, true);
                }
                final Bitmap art = bitmap;
                mainHandler.post(() -> {
                    currentArt = art;
                    updateNotification();
                });
            } catch (Exception e) {
                mainHandler.post(this::updateNotification);
            }
        });
    }

    private void updateNotification() {
        updateMediaSessionMetadata();
        updatePlaybackState();

        // Build media notification
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
                this, 0, launchIntent, PendingIntent.FLAG_IMMUTABLE);

        // Action: Previous
        PendingIntent prevPI = buildActionIntent(ACTION_PREV, 1);
        // Action: Play/Pause
        PendingIntent playPausePI = buildActionIntent(
                isPlaying ? ACTION_PAUSE : ACTION_PLAY, 2);
        // Action: Next
        PendingIntent nextPI = buildActionIntent(ACTION_NEXT, 3);
        // Action: Stop
        PendingIntent stopPI = buildActionIntent(ACTION_STOP, 4);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(currentTitle)
                .setContentText(currentArtist)
                .setSmallIcon(R.mipmap.ic_launcher_foreground)
                .setContentIntent(contentIntent)
                .setDeleteIntent(stopPI)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(isPlaying)
                .setOnlyAlertOnce(true)
                .addAction(R.drawable.ic_skip_previous, "Previous", prevPI)
                .addAction(isPlaying ? R.drawable.ic_pause : R.drawable.ic_play,
                        isPlaying ? "Pause" : "Play", playPausePI)
                .addAction(R.drawable.ic_skip_next, "Next", nextPI)
                .setStyle(new MediaStyle()
                        .setMediaSession(mediaSession.getSessionToken())
                        .setShowActionsInCompactView(0, 1, 2)
                        .setShowCancelButton(true)
                        .setCancelButtonIntent(stopPI));

        if (currentArt != null) {
            builder.setLargeIcon(currentArt);
        }

        Notification notification = builder.build();
        startForeground(NOTIFICATION_ID, notification);
    }

    private PendingIntent buildActionIntent(String action, int requestCode) {
        Intent intent = new Intent(this, MusicPlaybackService.class);
        intent.setAction(action);
        return PendingIntent.getService(
                this, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void updateMediaSessionMetadata() {
        MediaMetadataCompat.Builder meta = new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
                .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, currentArtist);
        if (currentArt != null) {
            meta.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, currentArt);
        }
        mediaSession.setMetadata(meta.build());
    }

    private void updatePlaybackState() {
        int state = isPlaying
                ? PlaybackStateCompat.STATE_PLAYING
                : PlaybackStateCompat.STATE_PAUSED;
        PlaybackStateCompat playbackState = new PlaybackStateCompat.Builder()
                .setActions(
                        PlaybackStateCompat.ACTION_PLAY |
                        PlaybackStateCompat.ACTION_PAUSE |
                        PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                        PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                        PlaybackStateCompat.ACTION_STOP |
                        PlaybackStateCompat.ACTION_PLAY_PAUSE)
                .setState(state, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1.0f)
                .build();
        mediaSession.setPlaybackState(playbackState);
    }

    private void broadcastCommand(String command) {
        Intent intent = new Intent("com.nightwatch.in.MUSIC_COMMAND");
        intent.putExtra("command", command);
        intent.setPackage(getPackageName());
        sendBroadcast(intent);
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
        }
        artLoader.shutdownNow();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Music Playback",
                    NotificationManager.IMPORTANCE_LOW // LOW = no sound, shows in shade
            );
            channel.setDescription("Controls for music playback");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
