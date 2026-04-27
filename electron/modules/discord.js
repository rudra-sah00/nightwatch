const DiscordRPC = require('discord-rpc');
// Application ID from Discord Developer Portal.
// In CI, electron-builder injects DISCORD_CLIENT_ID as a build-time env var.
// At runtime (packaged app), the env var no longer exists, so we fall back to
// the hardcoded value. The client ID is public (visible to every Discord user
// who sees the Rich Presence), so embedding it is safe.
const clientId = process.env.DISCORD_CLIENT_ID || '1496756820331593798';

console.log(
  `[Discord] clientId=${clientId ? `${clientId.slice(0, 6)}…` : '(empty)'}`,
);

if (clientId) DiscordRPC.register(clientId);

class DiscordIntegration {
  constructor() {
    this.clientId = clientId;
    this.rpc = null;
    this.startTimestamp = new Date();
    this.connected = false;
    this.isConnecting = false;
    this.lastReconnectAttempt = 0;
    // 30-second cooldown before trying to reconnect again
    this.RECONNECT_COOLDOWN = 30 * 1000;
  }

  async init() {
    // Initial silent attempt on boot
    this.connect();
  }

  async connect() {
    if (!this.clientId || this.connected || this.isConnecting) {
      console.log(
        `[Discord] connect() skipped — clientId=${!!this.clientId} connected=${this.connected} isConnecting=${this.isConnecting}`,
      );
      return;
    }

    this.isConnecting = true;
    this.lastReconnectAttempt = Date.now();
    console.log('[Discord] connect() attempting IPC login…');

    try {
      this.rpc = new DiscordRPC.Client({ transport: 'ipc' });

      this.rpc.on('ready', () => {
        this.connected = true;
        this.isConnecting = false;
        console.log('[Discord] RPC ready — connected successfully');
      });

      this.rpc.on('disconnected', () => {
        this.connected = false;
        this.isConnecting = false;
        this.rpc = null;
        console.log('[Discord] RPC disconnected');
      });

      // Catch login promise reject silently without throwing stack traces
      await this.rpc.login({ clientId: this.clientId }).catch((err) => {
        this.connected = false;
        this.isConnecting = false;
        this.rpc = null;
        console.log('[Discord] login() failed:', err?.message || err);
      });
    } catch (err) {
      this.connected = false;
      this.isConnecting = false;
      this.rpc = null;
      console.log('[Discord] connect() threw:', err?.message || err);
    }
  }

  async setActivity(presence) {
    console.log('[Discord] setActivity() called —', JSON.stringify(presence));
    console.log(`[Discord]   connected=${this.connected} rpc=${!!this.rpc}`);

    // Lazy Reconnection Strategy:
    // If not connected, we don't start a background timer. Instead, we wait for the
    // React UI to ask us to update the rich presence (e.g., opening a player).
    // When that user-driven event happens, we check if 5 minutes have passed since
    // our last crash/failure. If so, we quietly try to connect again.
    if (!this.connected) {
      const elapsed = Date.now() - this.lastReconnectAttempt;
      console.log(
        `[Discord]   not connected — elapsed since last attempt: ${elapsed}ms (cooldown: ${this.RECONNECT_COOLDOWN}ms)`,
      );
      if (elapsed > this.RECONNECT_COOLDOWN) {
        console.log('[Discord]   cooldown passed, attempting reconnect…');
        await this.connect();
      } else {
        console.log('[Discord]   still in cooldown, skipping reconnect');
      }
    }

    if (!this.connected || !this.rpc) {
      console.log('[Discord]   DROPPING setActivity — not connected');
      return;
    }

    const defaultPresence = {
      largeImageKey: 'nightwatch_logo', // Upload in Discord Dev Portal
      largeImageText: 'Nightwatch App',
      startTimestamp: this.startTimestamp,
      instance: false,
    };

    const merged = { ...defaultPresence, ...presence };
    console.log(
      '[Discord]   calling rpc.setActivity() with:',
      JSON.stringify(merged),
    );

    this.rpc
      .setActivity(merged)
      .then(() => console.log('[Discord]   rpc.setActivity() succeeded'))
      .catch((err) => {
        console.log(
          '[Discord]   rpc.setActivity() FAILED:',
          err?.message || err,
        );
      });
  }

  async clearActivity() {
    console.log('[Discord] clearActivity() called');
    if (!this.connected || !this.rpc) {
      console.log('[Discord]   DROPPING clearActivity — not connected');
      return;
    }
    this.rpc.clearActivity().catch((err) => {
      console.log('[Discord]   clearActivity() FAILED:', err?.message || err);
    });
  }

  destroy() {
    console.log('[Discord] destroy() called');
    if (this.rpc) {
      this.rpc.clearActivity().catch(() => {});
      this.rpc.destroy().catch(() => {});
      this.rpc = null;
    }
    this.connected = false;
    this.isConnecting = false;
  }
}

module.exports = new DiscordIntegration();
