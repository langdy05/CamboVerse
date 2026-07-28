import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sky } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { ACESFilmicToneMapping } from "three";
import { FirstPersonControls, type WalkInput } from "./FirstPersonControls";
import { WalkControls } from "./WalkControls";
import {
  GreatHall, TeachingBlock, EntranceMonument, Shrine, ParkingCanopy, SportsField,
  ConstructionBlock, SimpleBlock, Props,
} from "./CampusBuildings";
import { grassTexture, metresRepeat } from "../lib/groundTexture";
import { paveTexture, roadTexture } from "../lib/campusTexture";
import { buildingsOfSite, NUM_SITE, type Site } from "../buildings";

/**
 * A **walkable site** — a group of buildings you can move between. Opened from
 * the 🏛 Buildings directory (`BuildingsHome`), never straight off the map.
 *
 * The first site is the National University of Management's international
 * campus: the entrance monument, the great hall under its deep red roof, the
 * teaching block, the Khmer shrine, the parking canopies and the sports field.
 *
 * Overview it from above or walk it in first person; **tap a building** to open
 * its own page. Built procedurally from primitives and canvas-drawn textures —
 * nothing is downloaded — and it follows CamboVerse's three view modes
 * (AGENTS.md): Normal, Ultra, and VR (which always presents Ultra).
 */
type ViewMode = "normal" | "ultra";
type Nav = "orbit" | "walk";

function detectViewMode(): ViewMode {
  if (typeof navigator === "undefined") return "ultra";
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const small = typeof window !== "undefined" && Math.min(window.screen.width, window.screen.height) < 500;
  return cores <= 4 || mem <= 3 || small ? "normal" : "ultra";
}

/* --------------------------------------------------------------- layout --- */

/**
 * The buildings standing on this site, in the order they're listed (which is
 * the order you meet them walking it).
 *
 * The ground plan below is the NUM campus specifically — the roads, lawns and
 * tree rows are its layout, not a generic one — so this reads NUM_SITE rather
 * than the `site` prop. A second walkable site needs its own scene component;
 * what it shares with this one is the directory, not the geometry.
 */
const SITE_BUILDINGS = buildingsOfSite(NUM_SITE);

/**
 * The ground is a stack of flat surfaces that overlap in plan — lawn, roads, car
 * park apron, plazas. To a depth buffer they are effectively coplanar, and the
 * winner flips from triangle to triangle as the camera moves: the jagged grey
 * tears that made the concrete flicker.
 *
 * Two things stop it, and both are needed. Each layer sits a few centimetres
 * above the last (invisible underfoot, plenty for the depth buffer at range),
 * **and** each carries a distinct polygon offset, so the draw order is strictly
 * decided rather than left to floating-point luck where two layers cross.
 */
const GROUND = { lawn: -0.08, road: 0.04, apron: 0.08, plaza: 0.12 };
const LIFT = {
  road: { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 },
  apron: { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 },
  plaza: { polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 },
};

/** One paving tile-set per 8 m of ground → roughly 1 m slabs. */
const PAVER_M = 8;

/* ----------------------------------------------------------------- view --- */

export function BuildingsView({
  site, onBack, onOpenBuilding,
}: {
  site: Site;
  /** Back to the Buildings directory, which is where the map exit lives. */
  onBack: () => void;
  onOpenBuilding: (id: string) => void;
}) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [mode, setMode] = useState<ViewMode>(detectViewMode);
  const [nav, setNav] = useState<Nav>("orbit");
  const [place, setPlace] = useState<string | null>(null);
  const input = useRef<WalkInput>({ move: { x: 0, y: 0 }, look: { dx: 0, dy: 0 } });
  const [start, setStart] = useState<[number, number, number]>(SITE_BUILDINGS[0].view.at);
  const [startYaw, setStartYaw] = useState(SITE_BUILDINGS[0].view.yaw);

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
  }, []);

  const selected = SITE_BUILDINGS.find((p) => p.id === place) ?? null;
  const goTo = (id: string) => {
    const p = SITE_BUILDINGS.find((x) => x.id === id);
    if (!p) return;
    setPlace(id);
    setStart(p.view.at);
    setStartYaw(p.view.yaw);
    setNav("walk"); // arrive standing on the ground, already facing it
  };

  return (
    <div className="campus">
      <Canvas
        dpr={mode === "normal" ? [1, 1.5] : [1, 2]}
        camera={{ position: [10, 190, 360], fov: 45, near: 0.5, far: 1600 }}
        gl={{ antialias: mode === "ultra", powerPreference: "high-performance" }}
        shadows={mode === "ultra"}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;
        }}
      >
        <XR store={store}>
          <CampusWorld mode={mode} onOpenBuilding={onOpenBuilding} />
          <XROrigin position={[-18, 0, 190]} />
          <VrImpliesUltra onEnter={() => setMode("ultra")} />
          {nav === "walk" ? (
            <FirstPersonControls input={input} start={start} startYaw={startYaw} />
          ) : (
            <OrbitControls
              enablePan
              minDistance={20}
              maxDistance={500}
              maxPolarAngle={Math.PI / 2.12}
              enableDamping
              target={[0, 6, 40]}
            />
          )}
        </XR>
      </Canvas>

      <div className="cls-top">
        <button className="backbtn" onClick={onBack}>← Buildings</button>
        <span className="cls-title">🏛 {site.name}</span>
        <button
          className="grove-quality"
          onClick={() => setMode((m) => (m === "ultra" ? "normal" : "ultra"))}
          title="View mode — Normal is the low-end baseline, Ultra is the full 3D scene"
        >
          {mode === "ultra" ? "✨ Ultra" : "🍃 Normal"}
        </button>
        {vrSupported && (
          <button className="vr-btn cls-vr" onClick={() => { setMode("ultra"); store.enterVR(); }}>🥽 VR</button>
        )}
      </div>

      {/* orbit ⇄ walk */}
      <div className="campus-nav">
        <button className={nav === "orbit" ? "campus-mode on" : "campus-mode"} onClick={() => setNav("orbit")}>
          🛰️ Overview
        </button>
        <button className={nav === "walk" ? "campus-mode on" : "campus-mode"} onClick={() => setNav("walk")}>
          🚶 Walk
        </button>
      </div>

      {/* jump to a landmark */}
      <div className="campus-places">
        {SITE_BUILDINGS.map((p) => (
          <button
            key={p.id}
            className={place === p.id ? "campus-place on" : "campus-place"}
            onClick={() => goTo(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>

      {selected && (
        <div className="campus-card">
          <div className="campus-card-head">
            <b>{selected.name}</b> <span className="khmer">{selected.khmer}</span>
            <button className="grove-x" onClick={() => setPlace(null)}>✕</button>
          </div>
          <p>{selected.english}</p>
          <button className="campus-open" onClick={() => onOpenBuilding(selected.id)}>
            Open building page →
          </button>
        </div>
      )}

      {nav === "walk" && <WalkControls input={input} />}
      {nav === "walk" && (
        <div className="campus-hint">Drag to look · use the stick to walk</div>
      )}
    </div>
  );
}

/**
 * Makes a building tappable: a click anywhere on it opens that building's page,
 * and hovering shows a pointer so it's discoverable on desktop. (Taps reach the
 * canvas in Overview; in Walk mode the look-drag layer owns the screen, so the
 * landmark list is the way in.)
 */
function Tappable({
  id, onOpen, children,
}: {
  id: string; onOpen: (id: string) => void; children: React.ReactNode;
}) {
  return (
    <group
      onClick={(e) => { e.stopPropagation(); onOpen(id); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = ""; }}
    >
      {children}
    </group>
  );
}

/** VR always presents the Ultra scene. */
function VrImpliesUltra({ onEnter }: { onEnter: () => void }) {
  const inXR = useXR((s) => s.session != null);
  useEffect(() => { if (inXR) onEnter(); }, [inXR, onEnter]);
  return null;
}

/* ---------------------------------------------------------------- world --- */

/**
 * The ground plan follows the campus **master-plan board** (the rendered
 * aerial the Center photographed on site), read with north at the top and
 * mapped at roughly 0.45 m per board pixel, +x east and +z south:
 *
 * - a perimeter road ringing the block, a main north–south spine right of
 *   centre, and one east–west cross road — all tree-lined;
 * - the academic complex as three parallel slabs west of the spine, with the
 *   tree-planted forecourt grove and the annex/construction blocks north of it
 *   and a residence slab on the west boundary;
 * - the Great Hall top-right with its oval pond behind it, forecourt parking
 *   in front, and two smaller blocks on the east boundary;
 * - the football pitch lower-left, the two solar-roofed parking canopies in
 *   the centre, the dormitory court bottom-right, the cottage cluster
 *   bottom-left, and the circular shrine plaza on the avenue axis;
 * - the tree-lined entrance avenue running south out of the block to the
 *   public highway, which crosses the bottom of the board with its planted
 *   median and a gateway at the junction.
 */

/** Straight road strips, one plane each. Spans in metres, centre + size. */
const ROADS: { x: number; z: number; w: number; d: number }[] = [
  { x: -65, z: -135, w: 206, d: 10 },  // north service road, along the grove
  { x: 0, z: 140, w: 336, d: 10 },     // south perimeter road
  { x: -160, z: 0, w: 10, d: 270 },    // west perimeter road
  { x: 160, z: 41, w: 10, d: 202 },    // east perimeter road (the boundary slants, so it runs the lower half)
  { x: 23, z: 2.5, w: 12, d: 275 },    // main north–south spine
  { x: 0, z: 25, w: 336, d: 12 },      // east–west cross road
];

/** Car-park aprons (asphalt, a step above the roads in the ground stack). */
const APRONS: { x: number; z: number; w: number; d: number }[] = [
  { x: 62, z: -12, w: 64, d: 48 },     // Great Hall forecourt parking
  { x: 52, z: 79, w: 48, d: 96 },      // under and around the solar canopies
];

function CampusWorld({ mode, onOpenBuilding }: { mode: ViewMode; onOpenBuilding: (id: string) => void }) {
  const grass = useMemo(() => grassTexture(46), []);
  const pave = useMemo(() => paveTexture(metresRepeat(104, 104, PAVER_M)[0]), []);
  const road = useMemo(() => roadTexture(metresRepeat(120, 120, PAVER_M)[0]), []);
  const ultra = mode === "ultra";

  /**
   * Every tree on the board, as straight rows: the perimeter, both sides of the
   * spine and the cross road, the avenue, the highway (both verges and the
   * median), the forecourt grove's grid, and the ring around the shrine plaza.
   * All of them render as TWO instanced draws (trunks + crowns).
   */
  const trees = useMemo(() => {
    let s = 13;
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const pts: { x: number; z: number; s: number }[] = [];
    const row = (
      x0: number, z0: number, x1: number, z1: number, step: number,
      skip?: (x: number, z: number) => boolean,
    ) => {
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / step));
      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n;
        const z = z0 + ((z1 - z0) * i) / n;
        if (skip?.(x, z)) continue;
        pts.push({ x: x + (rnd() - 0.5) * 1.2, z: z + (rnd() - 0.5) * 1.2, s: 0.8 + rnd() * 0.5 });
      }
    };

    // site boundary, just inside the wall
    row(-168, -145, 168, -145, 12);
    row(-168, 146.5, 168, 146.5, 12, (x) => Math.abs(x + 18) < 11); // leave the avenue gap open
    row(-170, -138, -170, 138, 12);
    row(169, -138, 169, 138, 12);
    // the spine and the cross road
    row(15, -128, 15, 132, 12, (_, z) => Math.abs(z - 25) < 8);
    row(30, -128, 30, 132, 12, (_, z) => Math.abs(z - 25) < 8 || (z > 29 && z < 129));
    row(-155, 17, 155, 17, 12, (x) => Math.abs(x - 23) < 9);
    row(-155, 33, 155, 33, 12, (x) => Math.abs(x - 23) < 9 || (x > -140 && x < 0) || (x > 26 && x < 80));
    // the entrance avenue, both sides
    row(-25.5, 152, -25.5, 246, 9);
    row(-10.5, 152, -10.5, 246, 9);
    // the highway: both verges and the planted median
    row(-330, 251.5, 330, 251.5, 15, (x) => Math.abs(x + 18) < 10);
    row(-330, 278.5, 330, 278.5, 15);
    row(-330, 265, 330, 265, 18, (x) => Math.abs(x + 18) < 12);
    // the forecourt grove's grid, parting around the two blocks that stand in it
    for (const zz of [-126, -112, -98, -84]) {
      row(-150, zz, -45, zz, 13, (x, z) =>
        (x > -112 && x < -58 && z > -116 && z < -94) || (x > -54 && z > -112 && z < -96));
    }
    // west of the pitch, and along the east buildings
    row(-148, 35, -148, 110, 12);
    row(142, -55, 142, 15, 13);
    // the dormitory's garden row
    row(96, 60, 160, 60, 14);
    // the ring of palms around the shrine plaza
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      pts.push({ x: -38 + Math.cos(a) * 11, z: 120 + Math.sin(a) * 11, s: 0.9 + rnd() * 0.3 });
    }
    return pts;
  }, []);
  const trunks = useMemo(
    () => trees.map((t) => ({ pos: [t.x, 1.6 * t.s, t.z] as [number, number, number], scale: t.s })),
    [trees],
  );
  const crowns = useMemo(
    () => trees.map((t) => ({ pos: [t.x, 4.4 * t.s, t.z] as [number, number, number], scale: t.s })),
    [trees],
  );

  // Street furniture, instanced.
  const bollards = useMemo(() => {
    const out: { pos: [number, number, number] }[] = [];
    for (let x = 34; x <= 90; x += 4) out.push({ pos: [x, 0.55, 13] }); // hall forecourt edge
    return out;
  }, []);
  const lamps = useMemo(() => {
    const out: { pos: [number, number, number] }[] = [];
    for (let z = -120; z <= 130; z += 25) {
      out.push({ pos: [13, 2.6, z] });
      out.push({ pos: [33, 2.6, z + 12] });
    }
    return out;
  }, []);

  // The neighbourhood beyond the wall: rings of pitched-roof houses, thinned
  // out where they would land on the campus, the avenue, or the highway.
  const houses = useMemo(() => {
    const out: { pos: [number, number, number]; rot: number; scale: number }[] = [];
    let s = 7;
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let ring = 0; ring < 3; ring++) {
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2 + ring * 0.12;
        const r = 300 + ring * 34 + rnd() * 16;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r + 40;
        if (Math.abs(x) < 190 && z > -170 && z < 160) continue;   // the campus block
        if (z > 238 && z < 292) continue;                          // the highway
        if (Math.abs(x + 18) < 18 && z > 140 && z < 260) continue; // the avenue
        out.push({ pos: [x, 0, z], rot: a + Math.PI / 2, scale: 0.85 + rnd() * 0.5 });
      }
    }
    return out;
  }, []);

  return (
    <>
      <Sky sunPosition={[120, 70, 60]} turbidity={5} rayleigh={1.0} mieCoefficient={0.005} mieDirectionalG={0.92} />
      <fog attach="fog" args={["#cfe0e8", 240, 1000]} />
      <ambientLight intensity={0.52} />
      <hemisphereLight args={["#cfe2ff", "#6b8a45", 0.8]} />
      <directionalLight
        position={[120, 90, 60]}
        intensity={2.4}
        color="#fff1d6"
        castShadow={ultra}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-camera-near={1}
        shadow-camera-far={420}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={150}
        shadow-camera-bottom={-150}
      />

      {/* ground: lawn everywhere, then the road grid and plazas laid over it */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.lawn, 0]} receiveShadow>
        <planeGeometry args={[1400, 1400]} />
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>

      {/* the road grid */}
      {ROADS.map((r, i) => (
        <mesh key={`road-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[r.x, GROUND.road, r.z]} receiveShadow>
          <planeGeometry args={[r.w, r.d]} />
          <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
        </mesh>
      ))}
      {APRONS.map((a, i) => (
        <mesh key={`apron-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[a.x, GROUND.apron, a.z]} receiveShadow>
          <planeGeometry args={[a.w, a.d]} />
          <meshStandardMaterial map={road} roughness={1} {...LIFT.apron} />
        </mesh>
      ))}

      {/* the entrance avenue: road between planted strips and outer walkways */}
      <group position={[-18, 0, 200]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.road, 0]} receiveShadow>
          <planeGeometry args={[9, 104]} />
          <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
        </mesh>
        {[-5.6, 5.6].map((x) => (
          <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, GROUND.lawn + 0.01, 0]} receiveShadow>
            <planeGeometry args={[2.2, 104]} />
            <meshStandardMaterial map={grass} roughness={1} />
          </mesh>
        ))}
        {[-7.9, 7.9].map((x) => (
          <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, GROUND.plaza, 0]} receiveShadow>
            <planeGeometry args={[2.6, 104]} />
            <meshStandardMaterial map={pave} roughness={1} {...LIFT.plaza} />
          </mesh>
        ))}
      </group>

      {/* the public highway across the bottom of the board */}
      <group position={[0, 0, 265]}>
        {[-6, 6].map((z) => (
          <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.road, z]} receiveShadow>
            <planeGeometry args={[700, 9]} />
            <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
          </mesh>
        ))}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.lawn + 0.02, 0]} receiveShadow>
          <planeGeometry args={[700, 4]} />
          <meshStandardMaterial map={grass} roughness={1} />
        </mesh>
      </group>
      {/* the gateway splay where the avenue meets the highway */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-18, GROUND.apron, 248]} receiveShadow>
        <planeGeometry args={[34, 16]} />
        <meshStandardMaterial map={road} roughness={1} {...LIFT.apron} />
      </mesh>

      {/* the academic complex's forecourt strip, facing the cross road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-58, GROUND.plaza, 14]} receiveShadow>
        <planeGeometry args={[100, 14]} />
        <meshStandardMaterial map={pave} roughness={1} {...LIFT.plaza} />
      </mesh>

      {/* the Great Hall's plaza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[67, GROUND.plaza, -72]} receiveShadow>
        <planeGeometry args={[62, 82]} />
        <meshStandardMaterial map={pave} roughness={1} {...LIFT.plaza} />
      </mesh>

      {/* the oval pond behind the Great Hall, at the top of the board */}
      <group position={[70, 0, -133]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.plaza, 0]} scale={[21, 12, 1]} receiveShadow>
          <circleGeometry args={[1, 44]} />
          <meshStandardMaterial color="#c2c3c0" roughness={0.9} {...LIFT.plaza} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.plaza + 0.01, 0]} scale={[19, 10.4, 1]}>
          <circleGeometry args={[1, 44]} />
          <meshStandardMaterial color="#1f4b66" roughness={0.12} metalness={0.75} />
        </mesh>
      </group>

      {/* the circular shrine plaza on the avenue axis, ringed by a pond */}
      <group position={[-38, 0, 120]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.plaza, 0]} receiveShadow>
          <circleGeometry args={[13, 40]} />
          <meshStandardMaterial map={pave} roughness={1} {...LIFT.plaza} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.plaza + 0.01, 0]}>
          <ringGeometry args={[6.5, 9.5, 40]} />
          <meshStandardMaterial color="#1f4b66" roughness={0.12} metalness={0.75} />
        </mesh>
        {/* short paved link south to the perimeter road */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.plaza - 0.01, 14]} receiveShadow>
          <planeGeometry args={[8, 16]} />
          <meshStandardMaterial map={pave} roughness={1} {...LIFT.plaza} />
        </mesh>
      </group>

      {/* --- the buildings: tapping one opens its own page --- */}

      {/* the gateway monument where the avenue meets the highway */}
      <Tappable id="gate" onOpen={onOpenBuilding}>
        <EntranceMonument position={[-18, 0, 247]} rotation={0} />
      </Tappable>

      {/* the academic complex: three parallel slabs, the centre one taller,
          joined by a two-storey link block across the courtyards */}
      <Tappable id="teaching" onOpen={onOpenBuilding}>
        <TeachingBlock position={[-94, 0, -29]} rotation={Math.PI / 2} w={64} d={16} floors={4} tower={false} />
        <TeachingBlock position={[-58, 0, -29]} rotation={Math.PI / 2} w={70} d={18} floors={5} />
        <TeachingBlock position={[-22, 0, -29]} rotation={Math.PI / 2} w={64} d={16} floors={4} tower={false} />
        <mesh position={[-58, 4.1, -29]} castShadow receiveShadow>
          <boxGeometry args={[76, 7.4, 11]} />
          <meshStandardMaterial color="#f2f0ea" roughness={0.85} />
        </mesh>
      </Tappable>

      {/* the block still being built, standing in the forecourt grove */}
      <Tappable id="construction" onOpen={onOpenBuilding}>
        <ConstructionBlock position={[-85, 0, -105]} w={46} d={16} floors={5} />
      </Tappable>
      {/* the finished annex beside it, and the residence slab on the west boundary */}
      <SimpleBlock position={[-21, 0, -104]} w={62} d={13} floors={2} />
      <SimpleBlock position={[-141, 0, -55]} w={50} d={15} floors={4} rotation={Math.PI / 2} />

      {/* the Great Hall, facing its forecourt across the plaza */}
      <Tappable id="hall" onOpen={onOpenBuilding}>
        <GreatHall position={[67, 0, -73]} w={36} d={58} />
      </Tappable>
      {/* the two smaller blocks on the east boundary */}
      <SimpleBlock position={[118, 0, -44]} w={34} d={14} floors={2} />
      <SimpleBlock position={[116, 0, -13]} w={26} d={13} floors={2} rotation={Math.PI / 2} />

      {/* the two long solar-roofed parking canopies in the centre */}
      <Tappable id="parking" onOpen={onOpenBuilding}>
        <ParkingCanopy position={[40, 0, 79]} rotation={Math.PI / 2} length={92} width={10} solar />
        <ParkingCanopy position={[64, 0, 79]} rotation={Math.PI / 2} length={92} width={10} solar />
      </Tappable>

      {/* the football pitch lower-left */}
      <Tappable id="field" onOpen={onOpenBuilding}>
        <SportsField position={[-70, 0, 70]} w={120} d={75} />
      </Tappable>

      {/* the shrine on its circular plaza */}
      <Tappable id="shrine" onOpen={onOpenBuilding}>
        <Shrine position={[-38, 0, 120]} />
      </Tappable>

      {/* the dormitory court bottom-right: a long block with two south wings */}
      <SimpleBlock position={[124, 0, 88]} w={52} d={16} floors={3} />
      <SimpleBlock position={[102, 0, 117]} w={42} d={14} floors={3} rotation={Math.PI / 2} />
      <SimpleBlock position={[146, 0, 117]} w={42} d={14} floors={3} rotation={Math.PI / 2} />

      {/* the cottage cluster bottom-left */}
      <SimpleBlock position={[-146, 0, 121]} w={14} d={9} floors={1} />
      <SimpleBlock position={[-125, 0, 130]} w={14} d={9} floors={1} />
      <SimpleBlock position={[-104, 0, 121]} w={14} d={9} floors={1} />
      <SimpleBlock position={[-87, 0, 130]} w={14} d={9} floors={1} />

      {/* --- planting: every tree on the board, in two instanced draws --- */}
      <Props items={trunks}>
        <cylinderGeometry args={[0.22, 0.32, 3.2, 5]} />
        <meshStandardMaterial color="#6b4a2b" roughness={1} />
      </Props>
      <Props items={crowns}>
        <sphereGeometry args={[2.6, 7, 5]} />
        <meshStandardMaterial color="#3f7a33" roughness={0.95} />
      </Props>

      {/* --- site furniture --- */}
      <Props items={bollards}>
        <cylinderGeometry args={[0.11, 0.13, 1.1, 6]} />
        <meshStandardMaterial color="#6f7275" roughness={0.7} metalness={0.25} />
      </Props>
      <Props items={lamps}>
        <cylinderGeometry args={[0.09, 0.12, 5.2, 6]} />
        <meshStandardMaterial color="#dcdad4" roughness={0.6} />
      </Props>

      {/* --- the neighbourhood beyond the wall --- */}
      <Props items={houses}>
        <boxGeometry args={[9, 7, 11]} />
        <meshStandardMaterial color="#d8cfc4" roughness={0.9} />
      </Props>
      <Props items={houses.map((h) => ({ ...h, pos: [h.pos[0], 7 * (h.scale ?? 1), h.pos[2]] as [number, number, number] }))}>
        <coneGeometry args={[8.4, 3.4, 4]} />
        <meshStandardMaterial color="#9d4038" roughness={0.8} />
      </Props>

      {/* perimeter wall, with the gate gap on the avenue */}
      {[
        { p: [0, 1.2, -150] as [number, number, number], w: 350 },
        { p: [-104.5, 1.2, 148] as [number, number, number], w: 141 },
        { p: [86.5, 1.2, 148] as [number, number, number], w: 177 },
      ].map((seg, i) => (
        <mesh key={i} position={seg.p} castShadow receiveShadow>
          <boxGeometry args={[seg.w, 2.4, 0.5]} />
          <meshStandardMaterial color="#cdbfae" roughness={0.95} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 175, 1.2, -1]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 2.4, 298]} />
          <meshStandardMaterial color="#cdbfae" roughness={0.95} />
        </mesh>
      ))}
    </>
  );
}
