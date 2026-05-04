const DiscordRPC = require('discord-rpc');
const log = require('electron-log');
// Application ID from Discord Developer Portal.
// In CI, electron-builder injects DISCORD_CLIENT_ID as a build-time env var.
// At runtime (packaged app), the env var no longer exists, so we fall back to
// the hardcoded value. The client ID is public (visible to every Discord user
// who sees the Rich Presence), so embedding it is safe.
const clientId = process.env.DISCORD_CLIENT_ID || '1496756820331593798';

log.info(
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
    this.RECONNECT_COOLDOWN = 30 * 1000;
  }

  async init() {
    this.connect();
  }

  async connect() {
    if (!this.clientId || this.connected || this.isConnecting) return;

    this.isConnecting = true;
    this.lastReconnectAttempt = Date.now();
    log.info('[Discord] Attempting IPC login…');

    try {
      this.rpc = new DiscordRPC.Client({ transport: 'ipc' });

      this.rpc.on('ready', () => {
        this.connected = true;
        this.isConnecting = false;
        log.info('[Discord] RPC ready — connected');
      });

      this.rpc.on('disconnected', () => {
        this.connected = false;
        this.isConnecting = false;
        this.rpc = null;
        log.info('[Discord] RPC disconnected');
      });

      await this.rpc.login({ clientId: this.clientId }).catch((err) => {
        this.connected = false;
        this.isConnecting = false;
        this.rpc = null;
        log.warn('[Discord] Login failed:', err?.message || err);
      });
    } catch (err) {
      this.connected = false;
      this.isConnecting = false;
      this.rpc = null;
      log.warn('[Discord] Connect failed:', err?.message || err);
    }
  }

  async setActivity(presence) {
    if (!this.connected) {
      const elapsed = Date.now() - this.lastReconnectAttempt;
      if (elapsed > this.RECONNECT_COOLDOWN) {
        await this.connect();
      }
    }

    if (!this.connected || !this.rpc) return;

    const merged = {
      largeImageKey: 'nightwatch_logo',
      largeImageText: 'Nightwatch App',
      startTimestamp: this.startTimestamp,
      instance: false,
      ...presence,
    };

    this.rpc.setActivity(merged).catch((err) => {
      log.warn('[Discord] setActivity failed:', err?.message || err);
    });
  }

  async clearActivity() {
    if (!this.connected || !this.rpc) return;
    this.rpc.clearActivity().catch((err) => {
      log.warn('[Discord] clearActivity failed:', err?.message || err);
    });
  }

  destroy() {
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
