import { Mesh, Raycaster, Vector2 } from 'three';
import type { Camera, Intersection, Object3D } from 'three';
import type { Interactable } from './types';

export interface PickResult {
  /** Hit pertama yang terlihat di bawah kursor (bisa dinding, tanah, perabot). */
  hit: Intersection;
  /** Interactable pemilik hit bila ada DAN dalam jangkauan, selain itu null. */
  target: Interactable | null;
}

/**
 * Mencari objek di bawah kursor.
 *
 * Raycast dilakukan ke SELURUH mesh di scene, bukan hanya ke interactable. Kalau hanya ke
 * interactable, pintu di balik dinding tetap bisa diklik. Dengan raycast ke semua mesh, hit
 * pertama yang menentukan. Garis (wireframe debug) diabaikan karena bukan Mesh.
 */
export class Picker {
  private raycaster = new Raycaster();
  private ndc = new Vector2();

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: Camera,
    private scene: Object3D,
    private interactables: readonly Interactable[],
  ) {}

  pick(clientX: number, clientY: number): PickResult | null {
    const rect = this.canvas.getBoundingClientRect();
    // Koordinat layar -> NDC (-1..1), sumbu Y dibalik (layar ke bawah, NDC ke atas).
    this.ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(this.ndc, this.camera);

    const hit = this.raycaster
      .intersectObject(this.scene, true)
      .find((h) => h.object instanceof Mesh && isShown(h.object));
    if (!hit) return null;

    const owner = this.owner(hit.object);
    return { hit, target: owner && hit.distance <= owner.maxDistance ? owner : null };
  }

  /** Naik ke parent sampai ketemu objek yang terdaftar sebagai interactable. */
  private owner(obj: Object3D | null): Interactable | null {
    for (; obj; obj = obj.parent) {
      const found = this.interactables.find((i) => i.object === obj);
      if (found) return found;
    }
    return null;
  }
}

/** Terlihat bila objek dan semua leluhurnya visible (mis. atap yang disembunyikan cutaway). */
function isShown(obj: Object3D | null): boolean {
  for (; obj; obj = obj.parent) if (!obj.visible) return false;
  return true;
}
