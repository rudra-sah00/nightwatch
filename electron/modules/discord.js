const DiscordRPC = require('discord-rpc');
// Application ID from discord developer portal - Make sure you replace this with your actual Discord App ID eventually!
const clientId = '1234567890123456789'; // Please swap with your real Client ID

DiscordRPC.register(clientId);

class DiscordIntegration {
  constructor() {
    this.clientId = clientId;
    this.rpc = null;
    this.startTimestamp = new Date();
    this.connected = false;
    this.isConnecting = false;
    this.lastReconnectAttempt = 0;
    // 5-minute cooldown before trying to reconnect again (only triggered when an activity updates)
    this.RECONNECT_COOLDOWN = 5 * 60 * 1000;
  }

  async init() {
    // Initial silent attempt on boot
    this.connect();
  }

  async connect() {
    if (this.connected || this.isConnecting) return;

    this.isConnecting = true;
    this.lastReconnectAttempt = Date.now();

    try {
      this.rpc = new DiscordRPC.Client({ transport: 'ipc' });

      this.rpc.on('ready', () => {
        this.connected = true;
        this.isConnecting = false;
      });

      this.rpc.on('disconnected', () => {
        this.connected = false;
        this.isConnecting = false;
        this.rpc = null;
      });

      // Catch login promise reject silently without throwing stack traces
      await this.rpc.login({ clientId: this.clientId }).catch(() => {
        this.connected = false;
        this.isConnecting = false;
        this.rpc = null;
      });
    } catch (_err) {
      this.connected = false;
      this.isConnecting = false;
      this.rpc = null;
    }
  }

  async setActivity(presence) {
    // Lazy Reconnection Strategy:
    // If not connected, we don't start a background timer. Instead, we wait for the
    // React UI to ask us to update the rich presence (e.g., opening a player).
    // When that user-driven event happens, we check if 5 minutes have passed since
    // our last crash/failure. If so, we quietly try to connect again.
    if (!this.connected) {
      if (Date.now() - this.lastReconnectAttempt > this.RECONNECT_COOLDOWN) {
        await this.connect();
      }
    }

    if (!this.connected || !this.rpc) return;

    const defaultPresence = {
      largeImageKey: 'watchrudra_logo', // Upload in Discord Dev Portal
      largeImageText: 'Watch Rudra App',
      startTimestamp: this.startTimestamp,
      instance: false,
    };

    this.rpc
      .setActivity({
        ...defaultPresence,
        ...presence,
      })
      .catch(() => {
        // Suppress API pipeline errors (e.g., if discord dies mid-update)
      });
  }

  destroy() {
    if (this.rpc) {
      this.rpc.destroy().catch(() => {});
      this.rpc = null;
    }
    this.connected = false;
    this.isConnecting = false;
  }
}

module.exports = new DiscordIntegration();
