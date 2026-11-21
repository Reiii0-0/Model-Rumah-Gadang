/**
 * Shared dimensions of the PDIKM reconstruction. One unit is nominally one meter;
 * values are visual estimates from the reference photos, not a survey.
 *
 * The renderer (house.ts, interior.ts, main.ts) and the walk-mode collision world
 * read the same numbers, so collider boxes cannot drift away from the visible geometry.
 * Only dimensions that affect where a visitor can stand or walk live here; purely
 * decorative offsets stay as literals next to the geometry they describe.
 */

type Vec3 = readonly [number, number, number];

/** Top face of a box given its center height and full height. */
export const topOf = (centerY: number, height: number) => centerY + height / 2;

// --- Structure -----------------------------------------------------------------------

/** Column grid: 11 bays along X, three rows along Z (front, center, back). */
export const COLUMN_X = [-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10] as const;
export const COLUMN_Z = [-3.65, 0, 3.65] as const;
export const COLUMN = { size: 0.28, height: 5.25, centerY: 2.7 } as const;

/** Raised timber floor slab that carries the whole house. */
export const FLOOR = { length: 22.4, depth: 8, thickness: 0.28, centerY: 1.9 } as const;
export const FLOOR_TOP = topOf(FLOOR.centerY, FLOOR.thickness);

/** Long facade walls sit at z = ±WALL.z; gable end walls at x = ±WALL.endX. */
export const WALL = { z: 4, endX: 11.1, thickness: 0.22 } as const;

/** Per-bay wall pieces, offset from the bay's column x. */
export const WALL_BAY = {
  pier: { offset: -0.62, width: 0.76 },
  ret: { offset: 0.85, width: 0.3 },
} as const;

/** The front facade leaves this bay open as the entrance into the hall. */
export const FRONT_DOOR_BAY = 5;
/** Clear opening in the front wall, between the neighbouring bays' return and pier. */
export const FRONT_OPENING = {
  xMin: COLUMN_X[FRONT_DOOR_BAY - 1] + WALL_BAY.ret.offset + WALL_BAY.ret.width / 2,
  xMax: COLUMN_X[FRONT_DOOR_BAY + 1] + WALL_BAY.pier.offset - WALL_BAY.pier.width / 2,
} as const;

/**
 * Red sill band along the facade. It also runs across the entrance, forming the
 * traditional raised threshold that visitors step over.
 */
export const SILL = { centerY: 2.25, height: 0.48 } as const;
export const SILL_TOP = topOf(SILL.centerY, SILL.height);

// --- Interior ------------------------------------------------------------------------

/** Woven bamboo lining just inside the facade (z) and end walls (x). */
export const INNER_LINING = { z: 3.84, endX: 10.94 } as const;

/** Rattan mat covering the main hall floor. */
export const HALL_FLOOR = { length: 16.6, depth: 7.68, thickness: 0.03, centerY: 2.055 } as const;
export const HALL_FLOOR_TOP = topOf(HALL_FLOOR.centerY, HALL_FLOOR.thickness);

/** Raised anjuang platforms at both ends of the hall (mirrored at ±x). */
export const ANJUANG = {
  floor: { x: 9.7, width: 2.7, thickness: 0.03, centerY: 2.565 },
  riser: { x: 8.32, width: 0.28, height: 0.52, centerY: 2.3 },
  /** Intermediate step in the balustrade opening. */
  step: { x: 8.12, size: [0.26, 0.26, 2.4] as Vec3, centerY: 2.17 },
  rail: {
    x: 8.35,
    /** Z spans of the balustrade; the gap between them is the way up. */
    spans: [
      [-3.5, -1.2],
      [1.2, 3.5],
    ] as ReadonlyArray<readonly [number, number]>,
    topY: 3.25,
    topHeight: 0.07,
  },
} as const;
export const ANJUANG_FLOOR_TOP = topOf(ANJUANG.floor.centerY, ANJUANG.floor.thickness);
export const ANJUANG_STEP_TOP = topOf(ANJUANG.step.centerY, ANJUANG.step.size[1]);

// --- Entrance ------------------------------------------------------------------------

/** Porch (surambi) in front of the entrance, under the seventh gonjong. */
export const PORCH = {
  landing: { size: [2.75, 0.23, 1.8] as Vec3, center: [0, 1.93, 4.8] as Vec3 },
  pillar: { x: 1.33, z: 5.58, size: [0.25, 3.55, 0.3] as Vec3, centerY: 3.64 },
  sidePanel: { x: 1.08, z: 5.58, size: [0.45, 3.1, 0.22] as Vec3, centerY: 3.57 },
} as const;
export const PORCH_TOP = topOf(PORCH.landing.center[1], PORCH.landing.size[1]);

/** Twin hinged door leaves at the porch front; they swing outward (+z). */
export const DOOR = {
  hingeX: 0.82,
  hingeY: 2.04,
  hingeZ: 5.26,
  leaf: [0.81, 2.68, 0.12] as Vec3,
  openAngle: Math.PI * 0.48,
} as const;

/** Stone entry stair rising from the path (+z) to the porch (-z). */
export const STAIRS = {
  steps: 10,
  rise: 0.2,
  /** Center-to-center distance between steps along z. */
  pitch: 0.36,
  /** Depth of each step block along z. */
  depth: 0.37,
  width: 2.45,
  /** Center z of the lowest step. */
  firstZ: 9.1,
  cheek: { x: 1.29, width: 0.14, extra: 0.12 },
} as const;
export const stepCenterZ = (i: number) => STAIRS.firstZ - i * STAIRS.pitch;
export const stepTop = (i: number) => (i + 1) * STAIRS.rise;

// --- Site ----------------------------------------------------------------------------

export const SITE = {
  groundY: -0.03,
  platform: { size: [31, 0.18, 19] as Vec3, center: [0, -0.02, 0.7] as Vec3 },
  path: { size: [2.6, 0.035, 12] as Vec3, center: [0, 0.085, 12] as Vec3 },
  /** Two hedge rows flanking the house (mirrored at ±x). */
  shrubs: { x: 14.2, zStart: -7.4, zStep: 1.08, perSide: 14, radius: 0.45 },
} as const;
