import type { Box3, Object3D } from 'three';

/**
 * KONTRAK antar modul walk mode. Modul gerak (controller, collision) hanya tahu tipe-tipe
 * ini, bukan bagaimana dunia dibangun. Dunia Rumah Gadang dibangun di houseWorld.ts.
 * Satuan: meter.
 */

/** Objek yang menghalangi pemain (dinding, tiang, perabot, daun pintu). */
export interface Collidable {
  /** Kotak sejajar sumbu dunia (AABB). */
  box: Box3;
  /** false = diabaikan saat tabrakan (mis. pintu yang sedang terbuka). */
  enabled: boolean;
  /** Nama untuk debug overlay dan pesan simulasi. */
  name?: string;
}

/** Objek yang bisa diklik di walk mode (pintu). */
export interface Interactable {
  /** Akar objek; klik pada objek ini atau turunannya dianggap mengenai interactable. */
  object: Object3D;
  /** Jarak maksimum mata pemain ke titik klik agar klik berlaku. */
  maxDistance: number;
  /** Boleh mengembalikan pesan singkat untuk HUD. */
  onInteract(): string | void;
}

export interface WalkWorld {
  collidables: Collidable[];
  interactables: Interactable[];
  /**
   * Tinggi permukaan pijakan di (x, z). Pengganti gravitasi: pemain tidak jatuh,
   * tinggi matanya mengejar permukaan ini secara halus. Asumsi: satu permukaan per (x, z).
   */
  getGroundHeight(x: number, z: number): number;
}

/**
 * Sumber arah gerak. Controller hanya butuh ini, bukan kelas Input utuh, sehingga
 * simulasi headless bisa memakai objek tiruan.
 */
export interface MoveInput {
  /** x = kanan(+)/kiri(-), z = maju(+)/mundur(-). Belum dinormalisasi. */
  readonly moveAxis: { x: number; z: number };
  readonly running: boolean;
}
