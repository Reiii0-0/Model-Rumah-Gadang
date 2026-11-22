import { Box3, Vector3 } from 'three';
import type { FurnitureBounds } from '../model/interior';
import {
  ANJUANG,
  ANJUANG_FLOOR_TOP,
  ANJUANG_STEP_TOP,
  COLUMN,
  COLUMN_X,
  COLUMN_Z,
  FLOOR_TOP,
  FRONT_OPENING,
  HALL_FLOOR_TOP,
  INNER_LINING,
  PORCH,
  PORCH_TOP,
  SILL_TOP,
  SITE,
  STAIRS,
  WALL,
  stepCenterZ,
  topOf,
} from '../model/layout';
import type { Pose } from './controller';
import type { Collidable, WalkWorld } from './types';

/**
 * Dunia jalan Rumah Gadang PDIKM: collider AABB + fungsi tinggi pijakan.
 *
 *   tampak atas (+Z = depan rumah, ke arah jalan setapak)
 *
 *   z=-4.25 +--------------------------------------------------+  dinding belakang
 *           |anjuang|  aula (tiang 11x3, etalase, meja)  |anjuang|  lantai 2.07 / 2.58
 *           |  2.58 |=celah pagar |z|<1.2 di x=±8.35=  |  2.58 |
 *   z=+3.89 +----------------------|ambang|-----------------------+  dinding depan, ambang 2.49
 *                                  |serambi| x ±1.375, lantai 2.045
 *   z=+5.26                        |=pintu=| dua daun, membuka ke luar (+Z)
 *                                  |tangga | landai 2.0 -> 0, z 5.675..9.285
 *   z=+18                          |setapak|
 *
 * Murni data (Box3 + fungsi), tanpa mesh dan WebGL, supaya bisa diuji headless.
 * Semua ukuran arsitektur dibaca dari layout.ts, yang juga dipakai house.ts untuk menggambar.
 */

/** Batas dunia: dinding tak terlihat. Kabut mulai di 65 m, jadi tepinya tidak terlihat. */
const WORLD_HALF = 25;
/** Tepi luar badan rumah, termasuk tiang sudut fasad dan ukiran kolong. */
const HOUSE_OUTER = { x: 11.25, z: 4.25 } as const;
/** Puncak dinding (bawah frieze atas). Cukup di atas kepala dari lantai mana pun. */
const WALL_TOP = 5.4;
/** Tiang di dalam rumah dibungkus cincin ukir selebar ini, setinggi dada. */
const COLUMN_BAND = 0.33;
/** Pegangan tangga tertinggi (ujung atas pipa pegangan). */
const STAIR_RAIL_TOP = 2.95;
/** Pagar tak terlihat di sisi serambi yang terbuka (jatuh 2 m ke tanah). */
const PORCH_GUARD = { height: 1.0, thickness: 0.1 } as const;

// --- Tangga --------------------------------------------------------------------------
// Pijakan tangga = bidang miring halus yang melewati TENGAH tiap anak tangga, setengah
// undakan di bawah puncaknya. Galat kaki terhadap anak tangga visual paling besar ±0.1 m,
// dan landai bertemu tanah (0) di tepi depan anak tangga pertama serta lantai serambi
// (2.0) di tepi belakang anak tangga teratas. Anak tangga sendiri bukan collider.
const stairFootEdge = stepCenterZ(0) + STAIRS.depth / 2;
const stairTopEdge = stepCenterZ(STAIRS.steps - 1) - STAIRS.depth / 2;

export interface HouseWalkWorld extends WalkWorld {
  /** Titik muncul: di jalan setapak, menghadap rumah. */
  spawn: Required<Pose>;
  /** Apakah (x, z) berada di dalam ruang aula/anjuang (untuk mode lampu interior). */
  isIndoors(x: number, z: number): boolean;
}

export interface HouseWalkWorldOptions {
  furniture: readonly FurnitureBounds[];
  /** Collider tambahan yang dikelola di luar, mis. daun pintu (doorColliders.ts). */
  extra?: readonly Collidable[];
}

export function buildHouseWalkWorld(opts: HouseWalkWorldOptions): HouseWalkWorld {
  const collidables: Collidable[] = [];
  const add = (name: string, min: [number, number, number], max: [number, number, number]) => {
    collidables.push({ name, enabled: true, box: new Box3(new Vector3(...min), new Vector3(...max)) });
  };
  /** Tambah kotak dan cerminannya di sumbu X (xMin, xMax di sisi +X). */
  const addMirrored = (name: string, xMin: number, xMax: number, y: [number, number], z: [number, number]) => {
    add(`${name} kanan`, [xMin, y[0], z[0]], [xMax, y[1], z[1]]);
    add(`${name} kiri`, [-xMax, y[0], z[0]], [-xMin, y[1], z[1]]);
  };

  // --- Batas dunia -------------------------------------------------------------------
  const w = WORLD_HALF;
  add('batas belakang', [-w, -1, -w - 1], [w, 4, -w]);
  add('batas depan', [-w, -1, w], [w, 4, w + 1]);
  add('batas kiri', [-w - 1, -1, -w], [-w, 4, w]);
  add('batas kanan', [w, -1, -w], [w + 1, 4, w]);

  // --- Halaman -----------------------------------------------------------------------
  const hedge = SITE.shrubs;
  const hedgeZ: [number, number] = [hedge.zStart - hedge.radius, hedge.zStart + (hedge.perSide - 1) * hedge.zStep + hedge.radius];
  // Semak digambar dengan goyangan x ±0.16 m; kotaknya mencakup goyangan itu.
  addMirrored('semak', hedge.x - 0.16 - hedge.radius, hedge.x + 0.16 + hedge.radius, [-1, 0.8], hedgeZ);

  // --- Badan rumah -------------------------------------------------------------------
  // Panggung: satu AABB padat dari tanah sampai lantai. Dari tanah ia menghalangi (kolong
  // tidak bisa dimasuki); dari lantai atas puncaknya = kaki pemain, jadi diabaikan.
  add('panggung', [-HOUSE_OUTER.x, -1, -HOUSE_OUTER.z], [HOUSE_OUTER.x, FLOOR_TOP, HOUSE_OUTER.z]);
  // Lantai serambi juga padat dari tanah, menyambung ke panggung.
  const [landW, , landD] = PORCH.landing.size;
  const [, , landZ] = PORCH.landing.center;
  const porchX = landW / 2;
  const porchZ: [number, number] = [landZ - landD / 2, landZ + landD / 2];
  add('lantai serambi', [-porchX, -1, porchZ[0]], [porchX, PORCH_TOP, porchZ[1]]);

  // Dinding fasad: dari lapisan bambu dalam sampai muka luar dinding. Dinding depan
  // berlubang selebar FRONT_OPENING; ambang (sill) di lubang itu ditangani tinggi pijakan.
  const wallOuterZ = WALL.z + WALL.thickness / 2;
  const liningZ = INNER_LINING.z - 0.015;
  const wallY: [number, number] = [FLOOR_TOP, WALL_TOP];
  add('dinding belakang', [-HOUSE_OUTER.x, wallY[0], -wallOuterZ], [HOUSE_OUTER.x, wallY[1], -liningZ]);
  add('dinding depan kiri', [-HOUSE_OUTER.x, wallY[0], liningZ], [FRONT_OPENING.xMin, wallY[1], wallOuterZ]);
  add('dinding depan kanan', [FRONT_OPENING.xMax, wallY[0], liningZ], [HOUSE_OUTER.x, wallY[1], wallOuterZ]);
  const endInnerX = INNER_LINING.endX - 0.015;
  addMirrored('dinding ujung', endInnerX, HOUSE_OUTER.x, wallY, [-wallOuterZ, wallOuterZ]);

  // Tiang: hanya bagian di atas lantai; di bawahnya sudah tertutup panggung.
  const columnTop = topOf(COLUMN.centerY, COLUMN.height);
  const h = COLUMN_BAND / 2;
  for (const x of COLUMN_X) {
    for (const z of COLUMN_Z) {
      add(`tiang ${x},${z}`, [x - h, FLOOR_TOP, z - h], [x + h, columnTop, z + h]);
    }
  }

  // Anjuang: riser + pagar digabung menjadi satu kotak per bentang pagar. Dari aula ia
  // menghalangi (riser 0.51 m > STEP_HEIGHT); dari anjuang pagarnya yang menghalangi.
  // Di celah pagar tidak ada collider: undakan tengah ditangani tinggi pijakan.
  const { riser, rail, step } = ANJUANG;
  const riserX: [number, number] = [riser.x - riser.width / 2, riser.x + riser.width / 2];
  const railTop = rail.topY + rail.topHeight / 2;
  const [spanBack, spanFront] = rail.spans;
  addMirrored('pagar anjuang belakang', riserX[0], riserX[1], [FLOOR_TOP, railTop], [-liningZ, spanBack[1]]);
  addMirrored('pagar anjuang depan', riserX[0], riserX[1], [FLOOR_TOP, railTop], [spanFront[0], liningZ]);

  // --- Serambi dan tangga ------------------------------------------------------------
  // Sisi serambi terbuka di model; pagar tak terlihat mencegah pemain jatuh 2 m.
  addMirrored(
    'pagar sisi serambi',
    porchX,
    porchX + PORCH_GUARD.thickness,
    [FLOOR_TOP, FLOOR_TOP + PORCH_GUARD.height],
    [wallOuterZ, porchZ[1]],
  );
  // Tiang dan panel ukir serambi mengapit pintu.
  const pillar = PORCH.pillar;
  const panel = PORCH.sidePanel;
  addMirrored(
    'tiang serambi',
    panel.x - panel.size[0] / 2,
    pillar.x + pillar.size[0] / 2,
    [FLOOR_TOP, topOf(pillar.centerY, pillar.size[1])],
    [pillar.z - pillar.size[2] / 2, pillar.z + pillar.size[2] / 2],
  );
  // Pipi dan pegangan tangga: satu kotak tegak setinggi pegangan (pegangan aslinya miring).
  const cheekX: [number, number] = [STAIRS.cheek.x - STAIRS.cheek.width / 2, STAIRS.cheek.x + STAIRS.cheek.width / 2];
  addMirrored('pipi tangga', cheekX[0], cheekX[1], [-1, STAIR_RAIL_TOP], [stairTopEdge, stairFootEdge]);

  // --- Interior ----------------------------------------------------------------------
  for (const f of opts.furniture) collidables.push({ name: f.name, enabled: true, box: f.box.clone() });

  if (opts.extra) collidables.push(...opts.extra);

  // --- Tinggi pijakan ----------------------------------------------------------------
  const insideX = endInnerX;
  const insideZ = WALL.z - WALL.thickness / 2;
  const anjuangX = step.x + step.size[0] / 2;
  const stepXMin = step.x - step.size[0] / 2;
  const stepZ = step.size[2] / 2;

  function getGroundHeight(x: number, z: number): number {
    const ax = Math.abs(x);
    // Asumsi: SATU permukaan per (x, z). Kolong di bawah panggung tidak bisa dimasuki.
    if (ax < insideX && Math.abs(z) < insideZ) {
      if (ax >= anjuangX) return ANJUANG_FLOOR_TOP;
      if (ax >= stepXMin && Math.abs(z) < stepZ) return ANJUANG_STEP_TOP;
      return HALL_FLOOR_TOP;
    }
    // Ambang pintu: dilangkahi, mata naik sedikit lalu turun lagi.
    if (x > FRONT_OPENING.xMin && x < FRONT_OPENING.xMax && z >= insideZ && z <= wallOuterZ) return SILL_TOP;
    if (ax <= porchX && z > wallOuterZ && z <= porchZ[1]) return Math.max(PORCH_TOP, stairHeight(x, z));
    return Math.max(siteHeight(x, z), stairHeight(x, z));
  }

  function isIndoors(x: number, z: number): boolean {
    return Math.abs(x) < insideX && Math.abs(z) < insideZ;
  }

  return {
    collidables,
    interactables: [],
    getGroundHeight,
    isIndoors,
    spawn: { x: 0, z: 14, yaw: 0 },
  };
}

function stairHeight(x: number, z: number): number {
  if (Math.abs(x) > STAIRS.width / 2 || z < stairTopEdge || z > stairFootEdge) return -Infinity;
  const stepsFromFirst = (STAIRS.firstZ - z) / STAIRS.pitch;
  return Math.max(0, STAIRS.rise * (stepsFromFirst + 0.5));
}

/** Tanah, platform batu, dan jalan setapak (lihat main.ts). */
function siteHeight(x: number, z: number): number {
  const inBox = (b: { size: readonly number[]; center: readonly number[] }) =>
    Math.abs(x - b.center[0]) <= b.size[0] / 2 && Math.abs(z - b.center[2]) <= b.size[2] / 2;
  if (inBox(SITE.path)) return topOf(SITE.path.center[1], SITE.path.size[1]);
  if (inBox(SITE.platform)) return topOf(SITE.platform.center[1], SITE.platform.size[1]);
  return SITE.groundY;
}
