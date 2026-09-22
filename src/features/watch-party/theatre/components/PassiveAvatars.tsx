'use client';

import { useEffect, useMemo } from 'react';
import { MathUtils } from 'three';
import { useAvatarAnimation } from '../hooks/use-avatar-animation';
import { useTheatreGltf } from '../hooks/use-theatre-gltf';
import { applyIdentityColour, instantiateAvatar } from '../lib/avatar-instance';
import {
  assignPassiveSeats,
  type SeatId,
  seatedAvatarPose,
} from '../lib/layout';
import { AvatarLabel } from './AvatarLabel';

/**
 * Avatars for party members who are NOT in 3D.
 *
 * Most of a watch party will never switch the theatre on. Until now those people
 * simply did not exist in the room: `TheatreScene` is only mounted when the view
 * mode is 3D, so a 2D member never runs the network hook, never broadcasts a
 * pose, and was therefore invisible. Someone in 3D saw an empty auditorium even
 * with four other people in the party, which makes the room feel abandoned and
 * pointless.
 *
 * So they are seated instead. A 2D member is, functionally, someone watching the
 * film from a chair — parking them in a seat is both the honest representation
 * and the cheapest one: no pose traffic, no interpolation, no physics. They sit
 * still and watch, and the moment they enable 3D their live pose takes over and
 * this layer drops them.
 *
 * Seat assignment must agree across clients without anyone coordinating it, so
 * it is derived from sorted user ids filling the seats in a fixed order. Two
 * people looking at the same room see the same person in the same chair.
 */

interface PassiveAvatarsProps {
  /** Everyone in the party, including this user. */
  memberIds: readonly string[];
  /** Ids we are receiving live poses for — these are drawn by RemoteAvatars. */
  livePeerIds: readonly string[];
  /** This user, who is drawn by LocalPlayer and must not be duplicated. */
  selfId: string;
  /** seatId -> userId, for seats already claimed by someone in 3D. */
  seatMap: Record<string, string | null>;
  /** Model to draw them with. */
  url: string | null;
  names?: Record<string, string>;
  bubbles?: Record<string, string>;
}

export function PassiveAvatars({
  memberIds,
  livePeerIds,
  selfId,
  seatMap,
  url,
  names,
  bubbles,
}: PassiveAvatarsProps) {
  const placements = useMemo(
    () => assignPassiveSeats(memberIds, livePeerIds, selfId, seatMap),
    [memberIds, livePeerIds, selfId, seatMap],
  );

  if (!url || placements.length === 0) return null;

  return (
    <group name="passive-avatars">
      {placements.map(({ id, seatId }) => (
        <PassiveAvatar
          key={id}
          userId={id}
          seatId={seatId}
          url={url}
          name={names?.[id]}
          message={bubbles?.[id] ?? null}
        />
      ))}
    </group>
  );
}

function PassiveAvatar({
  userId,
  seatId,
  url,
  name,
  message,
}: {
  userId: string;
  seatId: SeatId;
  url: string;
  name?: string;
  message?: string | null;
}) {
  const { scene, animations } = useTheatreGltf(url);

  // Same SkeletonUtils clone as RemoteAvatar: a plain clone would share the
  // skeleton and make every passive avatar animate in lockstep with the others.
  const instance = useMemo(() => {
    const obj = instantiateAvatar(scene);
    applyIdentityColour(obj, userId);
    return obj;
  }, [scene, userId]);

  const { force } = useAvatarAnimation({
    root: instance,
    clips: animations,
    initial: 'sitIdle',
  });

  // They never move, so this is set once rather than per frame.
  useEffect(() => {
    instance.name = `passive-avatar-${userId}`;
    force('sitIdle');
  }, [instance, userId, force]);

  const pose = seatedAvatarPose(seatId);

  return (
    <group
      position={[pose.x, pose.y, pose.z]}
      rotation={[0, MathUtils.degToRad(pose.r), 0]}
    >
      <primitive object={instance} />
      <AvatarLabel userId={userId} name={name} message={message} />
    </group>
  );
}
