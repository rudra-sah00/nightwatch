const DiscordRPC = require('discord-rpc');
// Application ID from discord developer portal - Make sure you replace this with your actual Discord App ID eventually!
const clientId = '1234567890123456789'; // Please swap with your real Client ID

DiscordRPC.register(clientId);

class DiscordIntegration {
  constructor() {
    this.rpc = new DiscordRPC.Client({ transport: 'ipc' });
    this.startTimestamp = new Date();
    this.connected = false;
  }

  async init() {
    this.rpc.on('ready', () => {
      this.connected = true;
      this.setActivity({
        details: 'Browsing Homepage',
        state: 'Looking for Live Streams',
      });
      console.log('Discord RPC Successfully Active!');
    });

    try {
      await this.rpc.login({ clientId }).catch(console.error);
    } catch (_e) {
      console.warn('Discord not active on this machine.');
    }
  }

  setActivity(presence) {
    if (!this.connected) return;

    // Default presence values
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
      .catch(console.error);
  }
}

module.exports = new DiscordIntegration();
