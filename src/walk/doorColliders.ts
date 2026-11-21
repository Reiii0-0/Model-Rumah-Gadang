import { Box3, Vector3 } from 'three';
import type { DoorState } from '../doors';
import { DOOR } from '../model/layout';
import type { Collidable } from './types';

/** Tambahan tebal collider di depan/belakang daun, supaya pemain tidak menempel ke kayu. */
const MARGIN = 0.02;

/**
 * Collider untuk dua daun pintu serambi, diturunkan dari DoorState.
 *
 * Disederhanakan menjadi kotak STATIS, bukan daun yang ikut berayun:
 *  - `closed`: menutup lubang pintu selebar kedua daun. Mati begitu pintu mulai membuka,
 *    hidup lagi begitu pintu mulai menutup (tidak bisa menyelinap saat menutup).
 *  - `openLeft` / `openRight`: posisi tiap daun saat terbuka penuh (di atas anak tangga
 *    teratas, karena pintu membuka ke luar). Hidup setelah ayunan selesai dan pemain
 *    tidak sedang berdiri di sana; kalau tidak, pemain terjebak di dalam kotak.
 * Selama berayun, daun di posisi antara tidak punya collider (batasan yang disengaja).
 */
export class DoorColliders {
  readonly closed: Collidable;
  readonly openLeft: Collidable;
  readonly openRight: Collidable;
  readonly all: readonly Collidable[];

  constructor(
    private door: DoorState,
    /** Apakah silinder pemain bertumpang tindih dengan kotak ini? */
    private occupied: (box: Box3) => boolean,
  ) {
    const [, height, thickness] = DOOR.leaf;
    const y0 = DOOR.hingeY;
    const half = thickness / 2 + MARGIN;
    this.closed = {
      name: 'pintu (tertutup)',
      enabled: !door.open,
      box: new Box3(
        new Vector3(-DOOR.hingeX, y0, DOOR.hingeZ - half),
        new Vector3(DOOR.hingeX, y0 + height, DOOR.hingeZ + half),
      ),
    };
    this.openLeft = { name: 'daun kiri (terbuka)', enabled: false, box: openLeafBox(-1) };
    this.openRight = { name: 'daun kanan (terbuka)', enabled: false, box: openLeafBox(1) };
    this.all = [this.closed, this.openLeft, this.openRight];
  }

  /**
   * Apakah pemain berdiri di lubang pintu? Dipakai walk mode untuk menolak menutup pintu
   * (lewat DoorState.closeBlocker); collider tertutup akan menjepit pemain.
   */
  doorwayOccupied(): boolean {
    return this.occupied(this.closed.box);
  }

  /** Dipanggil tiap frame setelah DoorState.update(). */
  update(): void {
    const { door } = this;
    this.closed.enabled = !door.open;
    for (const leaf of [this.openLeft, this.openRight]) {
      if (!door.open) leaf.enabled = false;
      // Dicek ulang tiap frame sampai pemain menyingkir dari posisi daun.
      else if (door.settled && !leaf.enabled && !this.occupied(leaf.box)) leaf.enabled = true;
    }
  }
}

/**
 * AABB daun yang terbuka penuh. side = -1 untuk daun kiri (engsel di -hingeX, daun
 * terbentang ke +X saat tertutup), +1 untuk kanan. main.ts memutar engsel kiri sebesar
 * -angle dan kanan +angle di sumbu Y, sehingga keduanya berayun ke +Z.
 */
function openLeafBox(side: -1 | 1): Box3 {
  const [width, height, thickness] = DOOR.leaf;
  const rotY = side * DOOR.openAngle; // kiri: -angle, kanan: +angle
  const cos = Math.cos(rotY);
  const sin = Math.sin(rotY);
  const hinge = new Vector3(side * DOOR.hingeX, DOOR.hingeY, DOOR.hingeZ);
  const box = new Box3();
  const half = thickness / 2 + MARGIN;
  // Empat sudut daun di ruang lokal engsel (daun terbentang ke arah -side di X).
  for (const lx of [0, -side * width]) {
    for (const lz of [-half, half]) {
      // Rotasi Y: x' = x cos + z sin, z' = -x sin + z cos.
      const x = lx * cos + lz * sin;
      const z = -lx * sin + lz * cos;
      box.expandByPoint(new Vector3(hinge.x + x, hinge.y, hinge.z + z));
      box.expandByPoint(new Vector3(hinge.x + x, hinge.y + height, hinge.z + z));
    }
  }
  return box;
}
