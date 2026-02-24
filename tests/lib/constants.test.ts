import { describe, expect, it } from 'vitest';
import { API_ROUTES, STORAGE_KEYS, WS_EVENTS } from '@/lib/constants';

describe('Constants', () => {
  describe('API_ROUTES', () => {
    it('should have AUTH routes defined', () => {
      expect(API_ROUTES.AUTH).toBeDefined();
      expect(API_ROUTES.AUTH.LOGIN).toBe('/api/auth/login');
      expect(API_ROUTES.AUTH.LOGOUT).toBe('/api/auth/logout');
      expect(API_ROUTES.AUTH.REGISTER).toBe('/api/auth/register');
      expect(API_ROUTES.AUTH.REFRESH).toBe('/api/auth/refresh');
    });

    it('should have all expected AUTH routes', () => {
      expect(typeof API_ROUTES.AUTH).toBe('object');
      expect(Object.keys(API_ROUTES.AUTH)).toEqual(
        expect.arrayContaining(['LOGIN', 'LOGOUT', 'REGISTER', 'REFRESH']),
      );
    });
  });

  describe('STORAGE_KEYS', () => {
    it('should have storage keys defined', () => {
      expect(STORAGE_KEYS.USER).toBe('user');
      expect(STORAGE_KEYS.SESSION_ID).toBe('sessionId');
    });

    it('should have all expected keys', () => {
      expect(typeof STORAGE_KEYS).toBe('object');
      expect(Object.keys(STORAGE_KEYS)).toEqual(
        expect.arrayContaining(['USER', 'SESSION_ID']),
      );
    });
  });

  describe('WS_EVENTS', () => {
    it('should have Socket.IO events defined', () => {
      expect(WS_EVENTS.FORCE_LOGOUT).toBe('force_logout');
      expect(WS_EVENTS.WATCH_RECORD_TIME).toBe('watch:record_time');
      expect(WS_EVENTS.WATCH_UPDATE_PROGRESS).toBe('watch:update_progress');
      expect(WS_EVENTS.WATCH_GET_CONTINUE).toBe('watch:get_continue_watching');
    });

    it('should have all expected events', () => {
      expect(typeof WS_EVENTS).toBe('object');
      expect(Object.keys(WS_EVENTS)).toEqual(
        expect.arrayContaining([
          'FORCE_LOGOUT',
          'WATCH_RECORD_TIME',
          'WATCH_UPDATE_PROGRESS',
          'WATCH_GET_CONTINUE',
        ]),
      );
    });
  });
});
