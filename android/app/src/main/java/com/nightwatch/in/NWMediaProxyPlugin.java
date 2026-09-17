package com.nightwatch.in;

import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.PushbackInputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * On-device loopback forwarder for media that requires custom request headers.
 *
 * WHY THIS EXISTS
 * ---------------
 * The VOD CDN only serves media to requests carrying an allow-listed `Referer`.
 * A WebView cannot supply one for a <video> element:
 *   - Android's WebViewClient.shouldInterceptRequest is not invoked for the video
 *     file itself (only the page and poster image), and returning a synthetic
 *     WebResourceResponse breaks Range requests, which kills seeking.
 *   - iOS/WKWebView exposes no header API for media at all.
 *
 * A native player (ExoPlayer) could set headers, but it renders outside the WebView,
 * so the existing player UI — overlays, D-pad navigation, watch-party sync — would
 * have to be rebuilt. Instead this runs a minimal HTTP server bound to loopback and
 * points <video> at it, keeping playback inside the WebView. Traffic still goes
 * device -> CDN; only the request headers are rewritten on the way out, so no
 * server bandwidth is consumed.
 *
 * SECURITY
 * --------
 * A loopback server that fetches arbitrary URLs would be an open proxy usable by any
 * other app on the device. Three constraints prevent that:
 *   1. Bound to 127.0.0.1 only, never 0.0.0.0, so it is unreachable off-device.
 *   2. Every request must carry a 256-bit token minted at start() and known only to
 *      our WebView.
 *   3. The target host must match ALLOWED_HOSTS, so it cannot be aimed at internal
 *      addresses or arbitrary third parties.
 * Redirects are followed manually so each hop is re-validated against the allowlist,
 * which stops an upstream 302 from escaping it.
 */
@CapacitorPlugin(name = "NWMediaProxy")
public class NWMediaProxyPlugin extends Plugin {

    private static final String TAG = "NWMediaProxy";

    /** Only these hosts (or their subdomains) may be fetched. */
    private static final String[] ALLOWED_HOSTS = {
        "hakunaymatata.com",
        "aoneroom.com",
    };

    private static final String DEFAULT_REFERER = "https://123movienow.cc/";
    private static final String DEFAULT_USER_AGENT =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:135.0) Gecko/20100101 Firefox/135.0";

    /** Response headers worth relaying to the player; anything else is dropped. */
    private static final String[] FORWARD_RESPONSE_HEADERS = {
        "Content-Type",
        "Content-Length",
        "Content-Range",
        "Accept-Ranges",
        "Last-Modified",
        "ETag",
    };

    private static final int MAX_REDIRECTS = 5;

    private ServerSocket serverSocket;
    private ExecutorService pool;
    private Thread acceptThread;
    private String token;
    private int port;

    @PluginMethod
    public void start(PluginCall call) {
        try {
            if (serverSocket != null && !serverSocket.isClosed()) {
                call.resolve(info());
                return;
            }
            byte[] raw = new byte[32];
            new SecureRandom().nextBytes(raw);
            token = Base64.encodeToString(raw, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);

            // Port 0 => OS picks a free ephemeral port. Loopback only.
            serverSocket = new ServerSocket(0, 8, InetAddress.getByName("127.0.0.1"));
            port = serverSocket.getLocalPort();
            pool = Executors.newCachedThreadPool();

            acceptThread = new Thread(this::acceptLoop, "nw-media-proxy");
            acceptThread.setDaemon(true);
            acceptThread.start();

            Log.i(TAG, "loopback media forwarder listening on 127.0.0.1:" + port);
            call.resolve(info());
        } catch (Exception e) {
            Log.e(TAG, "failed to start", e);
            call.reject("Failed to start media proxy: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        shutdown();
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        shutdown();
        super.handleOnDestroy();
    }

    private JSObject info() {
        JSObject res = new JSObject();
        res.put("origin", "http://127.0.0.1:" + port);
        res.put("token", token);
        return res;
    }

    private void shutdown() {
        try {
            if (serverSocket != null) serverSocket.close();
        } catch (IOException ignored) {
        }
        serverSocket = null;
        if (pool != null) {
            pool.shutdownNow();
            pool = null;
        }
        token = null;
    }

    private void acceptLoop() {
        while (serverSocket != null && !serverSocket.isClosed()) {
            try {
                Socket client = serverSocket.accept();
                ExecutorService p = pool;
                if (p != null) p.execute(() -> handle(client));
            } catch (IOException e) {
                if (serverSocket != null && !serverSocket.isClosed()) {
                    Log.w(TAG, "accept failed", e);
                }
                return;
            }
        }
    }

    private void handle(Socket client) {
        try {
            client.setTcpNoDelay(true);
            PushbackInputStream in = new PushbackInputStream(client.getInputStream(), 8192);
            OutputStream rawOut = client.getOutputStream();
            BufferedOutputStream out = new BufferedOutputStream(rawOut, 64 * 1024);

            String requestLine = readLine(in);
            if (requestLine == null) {
                client.close();
                return;
            }
            String[] parts = requestLine.split(" ");
            if (parts.length < 2) {
                writeStatusOnly(out, 400, "Bad Request");
                client.close();
                return;
            }
            String method = parts[0].toUpperCase(Locale.ROOT);
            String path = parts[1];

            String range = null;
            String line;
            while ((line = readLine(in)) != null && !line.isEmpty()) {
                int colon = line.indexOf(':');
                if (colon > 0) {
                    String name = line.substring(0, colon).trim().toLowerCase(Locale.ROOT);
                    if ("range".equals(name)) {
                        range = line.substring(colon + 1).trim();
                    }
                }
            }

            if (!"GET".equals(method) && !"HEAD".equals(method)) {
                writeStatusOnly(out, 405, "Method Not Allowed");
                client.close();
                return;
            }

            // Expected: /m/<token>/<base64url(targetUrl)>
            String[] seg = path.startsWith("/") ? path.substring(1).split("/", 3) : new String[0];
            if (seg.length < 3 || !"m".equals(seg[0])) {
                writeStatusOnly(out, 404, "Not Found");
                client.close();
                return;
            }
            if (token == null || !constantTimeEquals(token, seg[1])) {
                writeStatusOnly(out, 403, "Forbidden");
                client.close();
                return;
            }

            String target;
            try {
                String q = seg[2];
                int qm = q.indexOf('?');
                if (qm >= 0) q = q.substring(0, qm);
                target = new String(Base64.decode(q, Base64.URL_SAFE), StandardCharsets.UTF_8);
            } catch (Exception e) {
                writeStatusOnly(out, 400, "Bad Request");
                client.close();
                return;
            }

            proxy(target, range, "HEAD".equals(method), out);
            out.flush();
            client.close();
        } catch (IOException e) {
            // Client hanging up mid-stream is normal when the user seeks or exits.
            Log.d(TAG, "connection closed: " + e.getMessage());
            try {
                client.close();
            } catch (IOException ignored) {
            }
        }
    }

    private void proxy(String target, String range, boolean headOnly, BufferedOutputStream out)
            throws IOException {
        String current = target;

        for (int hop = 0; hop <= MAX_REDIRECTS; hop++) {
            URL url = new URL(current);
            if (!isAllowedHost(url.getHost())) {
                Log.w(TAG, "blocked host: " + url.getHost());
                writeStatusOnly(out, 403, "Forbidden");
                return;
            }
            String scheme = url.getProtocol();
            if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
                writeStatusOnly(out, 403, "Forbidden");
                return;
            }

            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setInstanceFollowRedirects(false); // re-validate each hop ourselves
            conn.setRequestMethod(headOnly ? "HEAD" : "GET");
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(30000);
            conn.setRequestProperty("Referer", DEFAULT_REFERER);
            conn.setRequestProperty("User-Agent", DEFAULT_USER_AGENT);
            conn.setRequestProperty("Accept", "*/*");
            if (range != null) conn.setRequestProperty("Range", range);

            int status = conn.getResponseCode();

            if (status == 301 || status == 302 || status == 303 || status == 307 || status == 308) {
                String location = conn.getHeaderField("Location");
                conn.disconnect();
                if (location == null) {
                    writeStatusOnly(out, 502, "Bad Gateway");
                    return;
                }
                current = new URL(url, location).toString();
                continue;
            }

            StringBuilder head = new StringBuilder();
            head.append("HTTP/1.1 ").append(status).append(' ')
                .append(status == 206 ? "Partial Content" : status == 200 ? "OK" : "Status")
                .append("\r\n");
            for (String name : FORWARD_RESPONSE_HEADERS) {
                String value = conn.getHeaderField(name);
                if (value != null) head.append(name).append(": ").append(value).append("\r\n");
            }
            // Loopback origin differs from the page origin, so the player needs CORS.
            head.append("Access-Control-Allow-Origin: *\r\n");
            head.append("Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges\r\n");
            head.append("Cache-Control: no-store\r\n");
            head.append("Connection: close\r\n\r\n");
            out.write(head.toString().getBytes(StandardCharsets.US_ASCII));

            if (!headOnly) {
                InputStream body = status >= 400 ? conn.getErrorStream() : conn.getInputStream();
                if (body != null) {
                    byte[] buf = new byte[64 * 1024];
                    int n;
                    try {
                        while ((n = body.read(buf)) != -1) {
                            out.write(buf, 0, n);
                        }
                    } finally {
                        try {
                            body.close();
                        } catch (IOException ignored) {
                        }
                    }
                }
            }
            conn.disconnect();
            return;
        }

        writeStatusOnly(out, 508, "Loop Detected");
    }

    private static boolean isAllowedHost(String host) {
        if (host == null) return false;
        String h = host.toLowerCase(Locale.ROOT);
        for (String allowed : ALLOWED_HOSTS) {
            if (h.equals(allowed) || h.endsWith("." + allowed)) return true;
        }
        return false;
    }

    /** Comparison whose timing does not depend on how many characters match. */
    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) return false;
        int diff = 0;
        for (int i = 0; i < a.length(); i++) diff |= a.charAt(i) ^ b.charAt(i);
        return diff == 0;
    }

    private static void writeStatusOnly(OutputStream out, int status, String reason)
            throws IOException {
        String res = "HTTP/1.1 " + status + " " + reason + "\r\n"
            + "Content-Length: 0\r\n"
            + "Access-Control-Allow-Origin: *\r\n"
            + "Connection: close\r\n\r\n";
        out.write(res.getBytes(StandardCharsets.US_ASCII));
        out.flush();
    }

    private static String readLine(PushbackInputStream in) throws IOException {
        List<Byte> bytes = new ArrayList<>();
        int c;
        while ((c = in.read()) != -1) {
            if (c == '\n') break;
            if (c != '\r') bytes.add((byte) c);
            if (bytes.size() > 8192) return null; // refuse absurd header lines
        }
        if (c == -1 && bytes.isEmpty()) return null;
        byte[] arr = new byte[bytes.size()];
        for (int i = 0; i < arr.length; i++) arr[i] = bytes.get(i);
        return new String(arr, StandardCharsets.US_ASCII);
    }
}
