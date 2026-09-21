import { describe, expect, it } from 'vitest';
import { THEATRE_NET } from '@/features/watch-party/theatre/lib/interpolation';
import {
  createStats,
  PacketRateMeter,
  packetHealth,
} from '@/features/watch-party/theatre/lib/theatre-stats';

describe('createStats', () => {
  it('starts with no packet seen, so the readout shows a dash not a zero', () => {
    // 0 ms would read as "perfectly live" before anything has arrived
    expect(createStats().lastPacketAt).toBeNull();
  });

  it('reports the interpolation delay we add on purpose', () => {
    expect(createStats().interpDelayMs).toBe(THEATRE_NET.INTERP_DELAY_MS);
  });
});

describe('PacketRateMeter', () => {
  it('reports no age before any packet arrives', () => {
    expect(new PacketRateMeter().ageMs(1000)).toBeNull();
    expect(new PacketRateMeter().lastAt()).toBeNull();
  });

  it('measures age from the newest packet', () => {
    const m = new PacketRateMeter();
    m.mark(1000);
    expect(m.ageMs(1250)).toBe(250);
    m.mark(1400);
    expect(m.ageMs(1500)).toBe(100);
  });

  it('never reports a negative age even if time appears to go backwards', () => {
    const m = new PacketRateMeter();
    m.mark(5000);
    expect(m.ageMs(4000)).toBe(0);
  });

  it('counts packets in the trailing second', () => {
    const m = new PacketRateMeter();
    for (let i = 0; i < 8; i += 1) m.mark(1000 + i * 100);
    // all 8 land within [1000, 1700], sampled at 1700
    expect(m.hz(1700)).toBe(8);
  });

  it('drops packets older than a second from the rate', () => {
    const m = new PacketRateMeter();
    m.mark(1000);
    m.mark(1100);
    m.mark(3000);
    // at 3000 only the 3000 mark is inside the window
    expect(m.hz(3000)).toBe(1);
  });

  it('reads zero rate once traffic stops, while age keeps climbing', () => {
    const m = new PacketRateMeter();
    m.mark(1000);
    expect(m.hz(9000)).toBe(0);
    expect(m.ageMs(9000)).toBe(8000);
  });

  it('forgets everything on reset', () => {
    const m = new PacketRateMeter();
    m.mark(1000);
    m.reset();
    expect(m.lastAt()).toBeNull();
    expect(m.hz(1000)).toBe(0);
  });
});

describe('packetHealth', () => {
  it('is idle before any packet', () => {
    expect(packetHealth(null)).toBe('idle');
  });

  it('treats anything inside one heartbeat as healthy', () => {
    // a motionless player still sends a heartbeat, so silence under that is fine
    expect(packetHealth(0)).toBe('good');
    expect(packetHealth(THEATRE_NET.HEARTBEAT_MS)).toBe('good');
  });

  it('flags late past one heartbeat', () => {
    expect(packetHealth(THEATRE_NET.HEARTBEAT_MS + 1)).toBe('late');
  });

  it('flags stalled past two heartbeats', () => {
    expect(packetHealth(THEATRE_NET.HEARTBEAT_MS * 2 + 1)).toBe('stalled');
  });

  it('is stalled well before the staleness cull removes the peer', () => {
    // the readout must warn before the peer silently disappears
    expect(packetHealth(THEATRE_NET.STALE_MS)).toBe('stalled');
    expect(THEATRE_NET.STALE_MS).toBeGreaterThan(THEATRE_NET.HEARTBEAT_MS * 2);
  });
});
