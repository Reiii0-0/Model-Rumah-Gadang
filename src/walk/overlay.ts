import { Box3Helper, Color, Group, LineBasicMaterial, Scene } from 'three';
import type { Collidable } from './types';

const ON = new Color(0x00ff66);
const OFF = new Color(0xff3333);

/**
 * Wireframe semua collider. Hijau = aktif, merah = nonaktif (mis. pintu yang terbuka).
 * Box3Helper membaca Box3 yang sama dengan logika tabrakan, jadi yang terlihat persis
 * yang dipakai, bukan salinan.
 */
export class DebugOverlay {
  private group = new Group();
  private helpers: Array<{ c: Collidable; h: Box3Helper }> = [];

  constructor(scene: Scene, collidables: readonly Collidable[]) {
    for (const c of collidables) {
      const h = new Box3Helper(c.box);
      // Selalu terlihat walau tertutup dinding, supaya collider tersembunyi ikut tampak.
      const m = h.material as LineBasicMaterial;
      m.depthTest = false;
      m.transparent = true;
      h.renderOrder = 999;
      this.helpers.push({ c, h });
      this.group.add(h);
    }
    this.group.visible = false;
    scene.add(this.group);
  }

  get visible(): boolean {
    return this.group.visible;
  }

  toggle(): void {
    this.group.visible = !this.group.visible;
  }

  hide(): void {
    this.group.visible = false;
  }

  update(): void {
    if (!this.group.visible) return;
    for (const { c, h } of this.helpers) {
      (h.material as LineBasicMaterial).color.copy(c.enabled ? ON : OFF);
    }
  }
}
