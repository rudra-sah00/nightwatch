import type common from './i18n/messages/en/common.json';
import type auth from './i18n/messages/en/auth.json';
import type profile from './i18n/messages/en/profile.json';
import type search from './i18n/messages/en/search.json';
import type watch from './i18n/messages/en/watch.json';
import type live from './i18n/messages/en/live.json';
import type party from './i18n/messages/en/party.json';

type Messages = {
  common: typeof common;
  auth: typeof auth;
  profile: typeof profile;
  search: typeof search;
  watch: typeof watch;
  live: typeof live;
  party: typeof party;
};

declare global {
  interface IntlMessages extends Messages {}
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
  }
}
