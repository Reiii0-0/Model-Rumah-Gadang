import { Vector3 } from 'three';
import type { Object3D, PerspectiveCamera, Scene } from 'three';
import type { DoorState } from '../doors';
import type { House } from '../model/house';
import { playerOverlapsBox } from './collision';
import { PlayerController } from './controller';
import type { Pose } from './controller';
import { DoorColliders } from './doorColliders';
import { buildHouseWalkWorld } from './houseWorld';
import type { HouseWalkWorld } from './houseWorld';
import { Input } from './input';
import { DebugOverlay } from './overlay';
import { Picker } from './picker';
import type { MoveInput } from './types';

const WALK_FOV = 70;
/** Dekat dinding mata bisa hanya 0.3 m dari permukaan; near orbit (0.1) masih aman tapi lebih kecil lebih lega. */
const WALK_NEAR = 0.05;
/** Jarak maksimum mata ke daun pintu agar klik berlaku (m). */
const DOOR_REACH = 2.5;
const MESSAGE_SECONDS = 2.5;
const DEBUG_KEY = 'Backquote'; // tombol ` (di bawah Esc)
const NO_MOVE = { x: 0, z: 0 } as const;

export interface WalkModeText {
  doorBlocked: string;
}

export interface WalkModeOptions {
  canvas: HTMLCanvasElement;
  camera: PerspectiveCamera;
  scene: Scene;
  house: House;
  door: DoorState;
  /** HUD untuk pesan singkat dan info debug. */
  hud: HTMLElement;
  /** Teks sesuai bahasa aktif (dibaca saat dibutuhkan, jadi ikut berganti ID/MIN). */
  text(): WalkModeText;
  /** Buka/tutup pintu lewat main.ts supaya label toolbar ikut. Mengembalikan alasan penolakan atau null. */
  toggleDoor(): string | null;
  /** Klik yang tidak mengenai pintu: serahkan objek yang kena ke logika pilih-komponen. */
  selectFromObject(obj: Object3D | null): void;
  /** false = tombol ini bukan untuk walk mode (dialog terbuka, mengetik di input, dll.). */
  acceptKey(e: KeyboardEvent): boolean;
}

/**
 * Walk mode: pengunjung berjalan orang-pertama di dalam dan sekitar Rumah Gadang.
 *
 * main.ts hanya memanggil enter(), exit(), update(dt), dan isIndoors(). Selama aktif, modul
 * ini memiliki kamera dan input canvas; OrbitControls dimatikan oleh main.ts. Dunia jalan
 * (collider + pijakan) dibangun sekali saja dan dipakai ulang setiap kali masuk.
 */
export class WalkMode {
  readonly world: HouseWalkWorld;
  private readonly colliders: DoorColliders;
  private readonly picker: Picker;
  private readonly debug: DebugOverlay;
  private player: PlayerController | null = null;
  private input: Input | null = null;
  private saved: { fov: number; near: number } | null = null;
  private hover: { x: number; y: number } | null = null;
  private message = '';
  private messageTimer = 0;
  private fps = 0;
  private lastFrameTime = 0;

  /** Input tetap untuk controller; meneruskan ke Input yang hanya hidup selama walk mode aktif. */
  private readonly moveSource: MoveInput;

  constructor(private o: WalkModeOptions) {
    const self = this;
    this.moveSource = {
      get moveAxis() {
        return self.input?.moveAxis ?? NO_MOVE;
      },
      get running() {
        return self.input?.running ?? false;
      },
    };

    this.colliders = new DoorColliders(o.door, (box) => this.player?.overlaps(box) ?? false);
    this.world = buildHouseWalkWorld({ furniture: o.house.furniture, extra: this.colliders.all });
    // Daun pintu saja yang bisa diklik, bukan seluruh grup 'doors' (yang juga memuat lantai serambi).
    for (const leaf of [o.house.doorLeft, o.house.doorRight]) {
      this.world.interactables.push({
        object: leaf,
        maxDistance: DOOR_REACH,
        onInteract: () => o.toggleDoor() ?? undefined,
      });
    }
    this.picker = new Picker(o.canvas, o.camera, o.scene, this.world.interactables);
    this.debug = new DebugOverlay(o.scene, this.world.collidables);
  }

  get active(): boolean {
    return this.input !== null;
  }

  /** True bila pemain sedang berada di dalam aula/anjuang (untuk lampu interior). */
  isIndoors(): boolean {
    return this.active && !!this.player && this.world.isIndoors(this.player.x, this.player.z);
  }

  /**
   * Masuk walk mode. Bila kamera orbit sedang berada di dalam rumah pada titik yang bebas
   * collider (mis. dari tombol "Dalam"), pemain mulai di situ dengan arah pandang yang sama;
   * selain itu di jalan setapak menghadap rumah.
   */
  enter(): void {
    if (this.active) return;
    const { camera } = this.o;
    const start = this.poseFromCamera() ?? this.world.spawn;

    this.saved = { fov: camera.fov, near: camera.near };
    camera.fov = WALK_FOV;
    camera.near = WALK_NEAR;
    camera.updateProjectionMatrix();

    this.input = new Input(this.o.canvas, {
      onLook: (dx, dy) => this.player?.look(dx, dy),
      onClick: (x, y) => this.click(x, y),
      onHover: (x, y) => (this.hover = { x, y }),
      onKeyDown: (code) => {
        if (code === DEBUG_KEY) this.debug.toggle();
      },
      acceptKey: this.o.acceptKey,
    });

    if (this.player) this.player.teleport(start);
    else this.player = new PlayerController(camera, this.moveSource, this.world, start);

    this.o.door.closeBlocker = () => (this.colliders.doorwayOccupied() ? this.o.text().doorBlocked : null);
    this.colliders.update();
    this.o.hud.hidden = false;
  }

  exit(): void {
    if (!this.active) return;
    this.input?.dispose();
    this.input = null;
    this.hover = null;
    this.o.door.closeBlocker = null;
    this.debug.hide();
    this.message = '';
    this.messageTimer = 0;
    this.o.hud.hidden = true;
    this.o.hud.textContent = '';

    const { camera } = this.o;
    if (this.saved) {
      camera.fov = this.saved.fov;
      camera.near = this.saved.near;
      this.saved = null;
    }
    camera.rotation.order = 'XYZ'; // urutan bawaan Three.js, dipakai lagi oleh OrbitControls
    camera.updateProjectionMatrix();
  }

  /** dt dalam detik, sudah dibatasi pemanggil. */
  update(dt: number): void {
    if (!this.active || !this.player) return;
    this.player.update(dt);
    this.colliders.update();

    // Hover diproses sekali per frame, bukan per pointermove: raycast ke seluruh scene.
    if (this.hover) {
      const target = this.picker.pick(this.hover.x, this.hover.y)?.target ?? null;
      this.o.canvas.classList.toggle('can-interact', target !== null);
      this.hover = null;
    }

    this.debug.update();
    // FPS dari waktu nyata: dt dari main.ts sudah dibatasi 50 ms, jadi tidak jujur saat lambat.
    const now = performance.now();
    if (this.lastFrameTime && now > this.lastFrameTime) this.fps += (1000 / (now - this.lastFrameTime) - this.fps) * 0.1;
    this.lastFrameTime = now;
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    this.renderHud();
  }

  /** Untuk diagnostik/E2E: pindahkan pemain langsung. */
  teleport(pose: Pose): void {
    this.player?.teleport(pose);
  }

  /** Untuk diagnostik/E2E. */
  snapshot() {
    const p = this.player;
    return {
      active: this.active,
      x: p?.x ?? null,
      z: p?.z ?? null,
      feet: p?.feet ?? null,
      eyeY: p?.eyeY ?? null,
      yaw: p?.yaw ?? null,
      pitch: p?.pitch ?? null,
      indoors: this.isIndoors(),
      debug: this.debug.visible,
      message: this.messageTimer > 0 ? this.message : '',
      collidersActive: this.world.collidables.filter((c) => c.enabled).length,
    };
  }

  private click(x: number, y: number): void {
    const result = this.picker.pick(x, y);
    if (result?.target) {
      const msg = result.target.onInteract();
      if (msg) this.showMessage(msg);
      return;
    }
    this.o.selectFromObject(result?.hit.object ?? null);
  }

  /** Pesan singkat di HUD, mis. penolakan menutup pintu dari tombol toolbar. */
  showMessage(text: string): void {
    this.message = text;
    this.messageTimer = MESSAGE_SECONDS;
  }

  private renderHud(): void {
    const p = this.player!;
    const lines: string[] = [];
    if (this.debug.visible) {
      const deg = (r: number) => ((r * 180) / Math.PI).toFixed(0);
      const active = this.world.collidables.filter((c) => c.enabled).length;
      lines.push(
        `pos   x=${p.x.toFixed(2)}  z=${p.z.toFixed(2)}`,
        `kaki  ${p.feet.toFixed(2)} m   mata ${p.eyeY.toFixed(2)} m`,
        `yaw ${deg(p.yaw)}°  pitch ${deg(p.pitch)}°`,
        `collider aktif ${active}/${this.world.collidables.length}   ${this.fps.toFixed(0)} fps`,
      );
    }
    if (this.messageTimer > 0) {
      if (lines.length) lines.push('');
      lines.push(`» ${this.message}`);
    }
    const text = lines.join('\n');
    if (this.o.hud.textContent !== text) this.o.hud.textContent = text;
  }

  /** Pose dari kamera orbit saat ini, bila kamera ada di dalam rumah dan titiknya bebas collider. */
  private poseFromCamera(): Pose | null {
    const cam = this.o.camera.position;
    if (!this.world.isIndoors(cam.x, cam.z)) return null;
    const feet = this.world.getGroundHeight(cam.x, cam.z);
    const pos = { x: cam.x, z: cam.z };
    const blocked = this.world.collidables.some((c) => c.enabled && playerOverlapsBox(pos, feet, c.box));
    if (blocked) return null;
    const dir = this.o.camera.getWorldDirection(new Vector3());
    // Kamera menghadap -Z saat yaw = 0, jadi arah (dx, dz) = (-sin yaw, -cos yaw).
    return { x: cam.x, z: cam.z, yaw: Math.atan2(-dir.x, -dir.z) };
  }
}
