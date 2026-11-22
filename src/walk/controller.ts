import type { Box3, PerspectiveCamera } from 'three';
import { EYE_HEIGHT, playerOverlapsBox, sweepAxis } from './collision';
import type { MoveInput, WalkWorld } from './types';

/** Satuan dunia: 1 unit = 1 meter. Tinggi mata/badan ada di collision.ts. */
const WALK_SPEED = 3.0; // m/s
const RUN_MULTIPLIER = 1.8;
const LOOK_SENSITIVITY = 0.0035; // radian per piksel seret
const MAX_PITCH = (85 * Math.PI) / 180; // batas tilt, mencegah kamera terbalik
/** Seberapa cepat tinggi mata mengejar tinggi permukaan (makin besar = makin tajam). */
const HEIGHT_SMOOTHING = 12;

export interface Pose {
  x: number;
  z: number;
  /** 0 = menghadap -Z (konvensi kamera Three.js). */
  yaw?: number;
}

/**
 * Pemain orang-pertama. Menyimpan posisi kaki (x, z) dan arah hadap (yaw, pitch);
 * kamera hanyalah "mata" yang diletakkan EYE_HEIGHT di atas permukaan pijakan.
 *
 * Arah seret bergaya "pegang dan tarik dunia": seret ke kanan = pandangan berputar ke kiri,
 * seret ke bawah = pandangan menengadah. Kalau mau gaya FPS, balik tanda di look().
 */
export class PlayerController {
  /** Pan kiri/kanan (rotasi sumbu Y). */
  yaw = 0;
  /** Tilt atas/bawah (rotasi sumbu X). Positif = menengadah. */
  pitch = 0;
  x = 0;
  z = 0;
  /** Tinggi mata saat ini; dikejar halus menuju groundHeight + EYE_HEIGHT. */
  eyeY = 0;

  constructor(
    private camera: PerspectiveCamera,
    private input: MoveInput,
    private world: WalkWorld,
    spawn: Pose,
  ) {
    this.teleport(spawn);
  }

  /** Tinggi permukaan di bawah kaki (nilai sebenarnya, bukan nilai halus). */
  get feet(): number {
    return this.world.getGroundHeight(this.x, this.z);
  }

  /**
   * Pindah langsung ke pose baru tanpa animasi tinggi mata, mis. saat masuk walk mode.
   * Pitch direset supaya pandangan selalu mulai mendatar.
   */
  teleport(pose: Pose): void {
    this.x = pose.x;
    this.z = pose.z;
    this.yaw = pose.yaw ?? this.yaw;
    this.pitch = 0;
    this.eyeY = this.feet + EYE_HEIGHT;
    this.apply();
  }

  /** Dipanggil dari Input saat seret. */
  look(dx: number, dy: number): void {
    this.yaw += dx * LOOK_SENSITIVITY;
    this.pitch += dy * LOOK_SENSITIVITY;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch));
  }

  /** Dipakai pintu: jangan menutup atau memadatkan daun pintu menembus pemain. */
  overlaps(box: Box3): boolean {
    return playerOverlapsBox(this, this.feet, box);
  }

  /** Dipanggil tiap frame. dt dalam detik. */
  update(dt: number): void {
    this.move(dt);
    this.followGround(dt);
    this.apply();
  }

  private move(dt: number): void {
    const { x: ax, z: az } = this.input.moveAxis;
    if (ax === 0 && az === 0) return;

    // Normalisasi: tanpa ini, W+D bergerak sejauh sqrt(2) ~ 1.41x lebih cepat.
    const len = Math.hypot(ax, az);
    const nx = ax / len;
    const nz = az / len;

    // Vektor arah di bidang datar (pitch diabaikan: menengadah tidak membuat terbang).
    // Kamera menghadap -Z saat yaw=0: maju = (-sin yaw, -cos yaw), kanan = (cos yaw, -sin yaw).
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const dirX = nx * cos + nz * -sin;
    const dirZ = nx * -sin + nz * -cos;

    const speed = WALK_SPEED * (this.input.running ? RUN_MULTIPLIER : 1);
    const cols = this.world.collidables;
    // Tinggi kaki diambil SEBELUM melangkah, untuk menyaring collider mana yang setinggi badan.
    const feet = this.feet;

    // Per sumbu: X dulu, lalu Z memakai X yang sudah dikoreksi. Inilah yang memberi sliding.
    this.x = sweepAxis(this, 'x', dirX * speed * dt, cols, feet);
    this.z = sweepAxis(this, 'z', dirZ * speed * dt, cols, feet);
  }

  /**
   * Pengganti gravitasi: tinggi mata dikejar menuju tinggi permukaan di bawah kaki.
   * Peluruhan eksponensial (1 - e^(-k*dt)) memberi hasil sama di 30 maupun 144 FPS.
   */
  private followGround(dt: number): void {
    const target = this.feet + EYE_HEIGHT;
    this.eyeY += (target - this.eyeY) * (1 - Math.exp(-HEIGHT_SMOOTHING * dt));
  }

  private apply(): void {
    // Urutan 'YXZ': yaw dulu, lalu pitch pada sumbu lokal, jadi kamera tidak pernah miring (roll).
    this.camera.rotation.order = 'YXZ';
    this.camera.position.set(this.x, this.eyeY, this.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}
