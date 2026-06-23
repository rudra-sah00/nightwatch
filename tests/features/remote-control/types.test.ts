import { describe, expect, it } from 'vitest';
import {
  type CastContentPayload,
  REMOTE_EVENTS,
  type RemoteCommandPayload,
  type RemoteCommandType,
  type RemoteStateUpdate,
  type RemoteStreamAdvertise,
  type RemoteStreamEnded,
  type TvAvailablePayload,
} from '@/features/remote-control/types';

describe('REMOTE_EVENTS', () => {
  it('contains all expected event keys', () => {
    expect(REMOTE_EVENTS.STREAM_ADVERTISE).toBe('remote:stream_advertise');
    expect(REMOTE_EVENTS.STREAM_ENDED).toBe('remote:stream_ended');
    expect(REMOTE_EVENTS.COMMAND).toBe('remote:command');
    expect(REMOTE_EVENTS.STATE_UPDATE).toBe('remote:state_update');
    expect(REMOTE_EVENTS.REQUEST_ADVERTISE).toBe('remote:request_advertise');
    expect(REMOTE_EVENTS.TV_AVAILABLE).toBe('remote:tv_available');
    expect(REMOTE_EVENTS.CAST_CONTENT).toBe('remote:cast_content');
  });

  it('has exactly 7 event types', () => {
    expect(Object.keys(REMOTE_EVENTS)).toHaveLength(7);
  });
});

describe('Remote control types', () => {
  it('RemoteStreamAdvertise shape is valid', () => {
    const advertise: RemoteStreamAdvertise = {
      socketId: 'abc123',
      deviceName: 'MacBook Pro',
      type: 'movie',
      title: 'Test Movie',
      posterUrl: null,
      movieId: 'movie-1',
      isPlaying: true,
      currentTime: 120,
      duration: 7200,
    };
    expect(advertise.socketId).toBe('abc123');
    expect(advertise.type).toBe('movie');
  });

  it('RemoteStreamEnded shape is valid', () => {
    const ended: RemoteStreamEnded = { socketId: 'abc123' };
    expect(ended.socketId).toBe('abc123');
  });

  it('RemoteStateUpdate shape is valid', () => {
    const update: RemoteStateUpdate = {
      socketId: 'abc123',
      isPlaying: false,
      currentTime: 300,
      duration: 7200,
    };
    expect(update.isPlaying).toBe(false);
  });

  it('RemoteCommandPayload accepts all command types', () => {
    const commands: RemoteCommandType[] = [
      'play',
      'pause',
      'toggle_play',
      'seek_forward',
      'seek_backward',
      'seek_to',
      'next_episode',
    ];
    for (const cmd of commands) {
      const payload: RemoteCommandPayload = {
        targetSocketId: 'sock1',
        command: cmd,
      };
      expect(payload.command).toBe(cmd);
    }
  });

  it('TvAvailablePayload shape is valid', () => {
    const payload: TvAvailablePayload = {
      socketId: 'tv-socket-1',
      deviceName: 'Android TV',
    };
    expect(payload.deviceName).toBe('Android TV');
  });

  it('CastContentPayload shape is valid', () => {
    const payload: CastContentPayload = {
      movieId: 'movie-123',
      title: 'Test Movie',
    };
    expect(payload.movieId).toBe('movie-123');
    expect(payload.streamUrl).toBeUndefined();
  });

  it('CastContentPayload with optional streamUrl', () => {
    const payload: CastContentPayload = {
      movieId: 'movie-123',
      title: 'Test Movie',
      streamUrl: 'https://stream.example.com/hls/master.m3u8',
    };
    expect(payload.streamUrl).toBe(
      'https://stream.example.com/hls/master.m3u8',
    );
  });
});
