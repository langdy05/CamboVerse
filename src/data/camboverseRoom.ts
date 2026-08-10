/**
 * The CamboVerse Center room, as laid out in the Teaching Building / Room
 * Editor and exported to JSON. This file is the single source of truth for the
 * room: `CampusBuildings.tsx` renders the room from this array, so the live
 * campus and the editor stay in sync.
 *
 * Positions are LOCAL to the CamboVerse wing group (the room is centred on the
 * origin), in metres, Y up. `size` is the base box/cylinder/sphere geometry;
 * `scale` multiplies it; `rotationDeg` is XYZ Euler in degrees.
 *
 * To update: rearrange the room in the editor, Export JSON, and replace the
 * `objects` list below with the exported `objects`.
 */

export type RoomObject = {
  name: string;
  type: "box" | "cylinder" | "sphere";
  position: [number, number, number];
  rotationDeg: [number, number, number];
  scale: [number, number, number];
  size: number[];
  color: string;
  note?: string;
};

export const CAMBOVERSE_ROOM: RoomObject[] = [
  { name: "floor",               type: "box", position: [0, 0.27, 0],        rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [19.8, 0.5, 14.8], color: "#c2b092" },
  { name: "ceiling",             type: "box", position: [0, 3.5, 0],         rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [19.8, 0.2, 14.8], color: "#3a3a3a" },
  { name: "back-wall",           type: "box", position: [0, 2.25, -7.2],     rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [19.8, 3.5, 0.4],  color: "#f5f5f5" },
  { name: "front-glass-wall",    type: "box", position: [0, 2.25, 7.3],      rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [19.6, 3.5, 0.2],  color: "#a9cbe0" },
  { name: "right-glass-wall",    type: "box", position: [9.7, 2.25, 0],      rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [0.4, 3.5, 14.8],  color: "#a9cbe0" },
  { name: "left-wall-front",     type: "box", position: [-9.7, 2.25, 4.3],   rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [0.4, 3.5, 6.2],   color: "#a9cbe0" },
  { name: "left-wall-back",      type: "box", position: [-9.7, 2.25, -4.3],  rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [0.4, 3.5, 6.2],   color: "#a9cbe0" },
  { name: "left-doorway-lintel", type: "box", position: [-9.7, 3.1, 0],      rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [0.4, 0.8, 2.4],   color: "#a9cbe0" },
  { name: "presentation-screen", type: "box", position: [9.293, 2, -0.097],  rotationDeg: [180, -88.444, 180],  scale: [1, 1, 1],     size: [8, 2, 0.1],       color: "#111111" },
  { name: "sign",                type: "box", position: [-10.82, 3.115, 0.344], rotationDeg: [180, -85.653, 180], scale: [1, 1, 1],  size: [4.8, 0.8, 0.1],   color: "#2d5236", note: "CamboVerse Center sign" },
  { name: "cabinet",             type: "box", position: [0.622, 0.7, 6.047], rotationDeg: [180, -89.415, 180],  scale: [1, 1, 2.024], size: [1, 0.6, 8],       color: "#d4b88a" },
  { name: "u-table-right",       type: "box", position: [4.385, 0.8, -0.055], rotationDeg: [0, 0, 0],           scale: [1, 1, 1],     size: [1, 0.6, 6],       color: "#ffffff" },
  { name: "u-table-back",        type: "box", position: [0.893, 0.8, -2.368], rotationDeg: [0, 3.87, 0],        scale: [1, 1, 1],     size: [6, 0.6, 1],       color: "#ffffff" },
  { name: "chair-left-1",        type: "box", position: [-3.5, 0.7, -1],     rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [0.5, 0.5, 0.5],   color: "#3a3a3a" },
  { name: "chair-left-2",        type: "box", position: [-3.5, 0.7, 1],      rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [0.5, 0.5, 0.5],   color: "#3a3a3a" },
  { name: "chair-left-3",        type: "box", position: [-3.5, 0.7, 3],      rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [0.5, 0.5, 0.5],   color: "#3a3a3a" },
  { name: "chair-right-1",       type: "box", position: [3.5, 0.7, -1],      rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [0.5, 0.5, 0.5],   color: "#3a3a3a" },
  { name: "chair-right-2",       type: "box", position: [3.242, 0.755, 3.303], rotationDeg: [0, 0, 0],         scale: [1, 1, 1],     size: [0.5, 0.5, 0.5],   color: "#3a3a3a" },
  { name: "chair-right-3",       type: "box", position: [4.335, 0.7, 3],     rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [0.5, 0.5, 0.5],   color: "#3a3a3a" },
  { name: "chair-top-1",         type: "box", position: [-1.5, 0.7, -1.6],   rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [0.5, 0.5, 0.5],   color: "#3a3a3a" },
  { name: "chair-top-2",         type: "box", position: [0, 0.7, -1.6],      rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [0.5, 0.5, 0.5],   color: "#3a3a3a" },
  { name: "chair-top-3",         type: "box", position: [1.5, 0.7, -1.6],    rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [0.5, 0.5, 0.5],   color: "#3a3a3a" },
  { name: "light-1",             type: "box", position: [-5, 3.3, -3],       rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [1.8, 0.1, 0.4],   color: "#fffbe6" },
  { name: "light-2",             type: "box", position: [-5, 3.3, 3],        rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [1.8, 0.1, 0.4],   color: "#fffbe6" },
  { name: "light-3",             type: "box", position: [0, 3.3, -3],        rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [1.8, 0.1, 0.4],   color: "#fffbe6" },
  { name: "light-4",             type: "box", position: [0, 3.3, 3],         rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [1.8, 0.1, 0.4],   color: "#fffbe6" },
  { name: "light-5",             type: "box", position: [5, 3.3, -3],        rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [1.8, 0.1, 0.4],   color: "#fffbe6" },
  { name: "light-6",             type: "box", position: [5, 3.3, 3],         rotationDeg: [0, 0, 0],            scale: [1, 1, 1],     size: [1.8, 0.1, 0.4],   color: "#fffbe6" },
  { name: "cabinet-copy",        type: "box", position: [1.622, 0.7, -5.94], rotationDeg: [180, -89.415, 180],  scale: [1, 1, 2.024], size: [1, 0.6, 8],       color: "#d4b88a" },
  { name: "u-table-back-copy",   type: "box", position: [1.114, 0.8, 2.593], rotationDeg: [0, 3.87, 0],         scale: [1, 1, 1],     size: [6, 0.6, 1],       color: "#ffffff" },
];
