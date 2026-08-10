import { useEffect, useMemo, useRef } from "react";
import { Group, Vector3 } from "three";
import { useFrame } from "@react-three/fiber";
import { XROrigin, useXR, useXRControllerLocomotion } from "@react-three/xr";
import type { Poi } from "../spots";

/**
 * The VR player. Places the visitor standing in the scene and drives them with
 * the controller thumbsticks — left stick to walk, right stick to snap-turn —
 * so a headset user moves entirely with the controller, without walking their
 * real body. Selecting a point of interest (with the controller ray) glides
 * them there. Harmless outside a VR session (the hooks simply do nothing).
 */
export function VRRig({
  position,
  yaw = 0,
  speed = 2.6,
  poi,
}: {
  position: [number, number, number];
  /** Which way the visitor faces on arrival (radians, 0 = looking down −Z). */
  yaw?: number;
  /** Walk speed in m/s. A big outdoor site wants more than an indoor room. */
  speed?: number;
  poi?: Poi | null;
}) {
  const ref = useRef<Group>(null);
  // Left stick walks, right stick snap-turns 30° — the standard comfort scheme.
  useXRControllerLocomotion(ref, { speed }, { type: "snap", degrees: 30 });
  const presenting = useXR((s) => s.session != null);

  // Face the requested direction on arrival. Set imperatively once so the
  // snap-turns the player then makes aren't reset by a parent re-render.
  const facedFor = useRef<number | null>(null);
  useEffect(() => {
    if (ref.current && facedFor.current !== yaw) {
      ref.current.rotation.set(0, yaw, 0);
      facedFor.current = yaw;
    }
  }, [yaw]);

  // Glide the origin to the POI's vantage (at floor level) when one is picked.
  const target = useMemo(() => (poi ? new Vector3(poi.camera[0], 0, poi.camera[2]) : null), [poi]);
  const done = useRef(false);
  useEffect(() => {
    done.current = false;
  }, [poi]);
  useFrame(() => {
    const g = ref.current;
    if (!presenting || !poi || !target || done.current || !g) return;
    g.position.lerp(target, 0.12);
    if (g.position.distanceTo(target) < 0.08) done.current = true;
  });

  // Stable position reference so re-renders don't snap the walker back to spawn.
  const start = useMemo<[number, number, number]>(
    () => position,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [position[0], position[1], position[2]],
  );

  return <XROrigin ref={ref} position={start} />;
}
