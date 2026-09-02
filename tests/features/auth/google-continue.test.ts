import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPendingGoogleSignup,
  GOOGLE_SIGNUP_TICKET_KEY,
  type GoogleProfileRequired,
  getGoogleOAuthUrl,
  googleComplete,
  googleContinue,
  isProfileRequired,
  readPendingGoogleSignup,
  storePendingGoogleSignup,
} from '@/features/auth/google-api';
import * as fetchModule from '@/lib/fetch';

vi.mock('@/lib/fetch', () => import('./__mocks__/lib-fetch'));

const ORIGIN = 'http://localhost:3000';

const pending: GoogleProfileRequired = {
  needsProfile: true,
  ticket: 'tkt-abc',
  profile: {
    name: 'Walter Gropius',
    email: 'walter@bauhaus.de',
    picture: 'p.jpg',
  },
  suggestedUsername: 'walter',
};

describe('googleContinue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('posts a web authorization code with the callback redirect uri', async () => {
    vi.mocked(fetchModule.apiFetch).mockResolvedValue({ user: { id: 'u1' } });

    await googleContinue({ code: 'auth-code' });

    expect(fetchModule.apiFetch).toHaveBeenCalledWith(
      '/api/auth/google/continue',
      {
        method: 'POST',
        body: JSON.stringify({
          code: 'auth-code',
          redirectUri: `${ORIGIN}/auth/google/callback`,
        }),
      },
    );
  });

  it('posts a native idToken on its own', async () => {
    vi.mocked(fetchModule.apiFetch).mockResolvedValue({ user: { id: 'u1' } });

    await googleContinue({ idToken: 'id-token' });

    expect(fetchModule.apiFetch).toHaveBeenCalledWith(
      '/api/auth/google/continue',
      {
        method: 'POST',
        body: JSON.stringify({ idToken: 'id-token' }),
      },
    );
  });
});

describe('isProfileRequired', () => {
  it('recognises the signup branch', () => {
    expect(isProfileRequired(pending)).toBe(true);
  });

  it('treats a session response as an existing user', () => {
    expect(isProfileRequired({ user: { id: 'u1' } } as never)).toBe(false);
  });
});

describe('googleComplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the ticket, username, name and password', async () => {
    vi.mocked(fetchModule.apiFetch).mockResolvedValue({ user: { id: 'u1' } });

    await googleComplete({
      ticket: 'tkt-abc',
      username: 'walter',
      name: 'Walter Gropius',
      password: 'Bauhaus!1919',
    });

    expect(fetchModule.apiFetch).toHaveBeenCalledWith(
      '/api/auth/google/complete',
      {
        method: 'POST',
        body: JSON.stringify({
          ticket: 'tkt-abc',
          username: 'walter',
          name: 'Walter Gropius',
          password: 'Bauhaus!1919',
        }),
      },
    );
  });

  it('never resends the Google credential — the ticket stands in for it', async () => {
    vi.mocked(fetchModule.apiFetch).mockResolvedValue({ user: { id: 'u1' } });

    await googleComplete({
      ticket: 'tkt-abc',
      username: 'walter',
      name: 'Walter',
      password: 'Bauhaus!1919',
    });

    const body = vi.mocked(fetchModule.apiFetch).mock.calls[0]?.[1]
      ?.body as string;
    expect(body).not.toContain('idToken');
    expect(body).not.toContain('code');
    // Email comes from the ticket server-side, so it is not in the payload.
    expect(body).not.toContain('email');
  });
});

describe('pending signup storage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('round-trips a pending signup through sessionStorage', () => {
    storePendingGoogleSignup(pending);
    expect(readPendingGoogleSignup()).toEqual(pending);
  });

  it('keeps the ticket out of the URL by storing it session-scoped', () => {
    storePendingGoogleSignup(pending);
    expect(sessionStorage.getItem(GOOGLE_SIGNUP_TICKET_KEY)).toContain(
      'tkt-abc',
    );
    expect(window.location.search).not.toContain('tkt-abc');
  });

  it('returns null when nothing is stored', () => {
    expect(readPendingGoogleSignup()).toBeNull();
  });

  it('returns null rather than throwing on corrupt json', () => {
    sessionStorage.setItem(GOOGLE_SIGNUP_TICKET_KEY, '{not json');
    expect(readPendingGoogleSignup()).toBeNull();
  });

  it('returns null when the stored blob has no ticket', () => {
    sessionStorage.setItem(
      GOOGLE_SIGNUP_TICKET_KEY,
      JSON.stringify({ profile: {} }),
    );
    expect(readPendingGoogleSignup()).toBeNull();
  });

  it('clears the pending signup', () => {
    storePendingGoogleSignup(pending);
    clearPendingGoogleSignup();
    expect(readPendingGoogleSignup()).toBeNull();
  });
});

describe('getGoogleOAuthUrl', () => {
  // The desktop build tags state with a `desktop_` prefix so the callback knows
  // to bounce through the nightwatch:// deep link. The shared test setup defines
  // electronAPI, so each case sets the platform it actually means to assert.
  const hadElectron = 'electronAPI' in window;
  const savedElectron = (window as { electronAPI?: unknown }).electronAPI;

  afterEach(() => {
    if (hadElectron) {
      (window as { electronAPI?: unknown }).electronAPI = savedElectron;
    } else {
      delete (window as { electronAPI?: unknown }).electronAPI;
    }
  });

  it('requests the openid email profile scopes for the login flow', () => {
    delete (window as { electronAPI?: unknown }).electronAPI;

    const url = new URL(getGoogleOAuthUrl('login'));

    expect(url.origin + url.pathname).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('state')).toBe('login');
    expect(url.searchParams.get('redirect_uri')).toBe(
      `${ORIGIN}/auth/google/callback`,
    );
  });

  it('distinguishes the profile-page connect flow by state', () => {
    delete (window as { electronAPI?: unknown }).electronAPI;

    expect(
      new URL(getGoogleOAuthUrl('connect')).searchParams.get('state'),
    ).toBe('connect');
  });

  it('tags state for the desktop deep-link bounce inside Electron', () => {
    (window as { electronAPI?: unknown }).electronAPI = {};

    expect(new URL(getGoogleOAuthUrl('login')).searchParams.get('state')).toBe(
      'desktop_login',
    );
    expect(
      new URL(getGoogleOAuthUrl('connect')).searchParams.get('state'),
    ).toBe('desktop_connect');
  });
});
