import type { MoveInput } from './types';

/**
 * Input walk mode: keyboard (WASD) + pointer (tahan-lalu-seret untuk kamera, klik untuk interaksi).
 *
 * Kenapa satu tombol (kiri) dipakai untuk dua hal?
 * Tidak memakai pointer lock supaya kursor tetap terlihat dan komponen rumah bisa diklik.
 * Konsekuensinya "klik" dan "seret" harus dibedakan: kalau kursor bergeser lebih dari
 * DRAG_THRESHOLD_PX sejak tombol ditekan, itu seret; kalau tidak, itu klik.
 *
 * Dibuat saat masuk walk mode dan dilepas (dispose) saat keluar, supaya tidak berebut
 * event dengan OrbitControls dan handler pilih-komponen di main.ts.
 */

const DRAG_THRESHOLD_PX = 4;

export interface InputCallbacks {
  /** Dipanggil saat seret berlangsung. dx/dy dalam piksel sejak event sebelumnya. */
  onLook(dx: number, dy: number): void;
  /** Dipanggil saat tombol dilepas dan gerakan tidak melewati ambang (= klik). */
  onClick(clientX: number, clientY: number): void;
  /** Dipanggil saat kursor bergerak tanpa tombol ditekan (untuk umpan balik hover). */
  onHover?(clientX: number, clientY: number): void;
  /** Dipanggil sekali per tekanan tombol (auto-repeat diabaikan). */
  onKeyDown?(code: string): void;
  /** false = abaikan tombol ini (mis. sedang mengetik di input atau dialog terbuka). */
  acceptKey?(e: KeyboardEvent): boolean;
}

export class Input implements MoveInput {
  private keys = new Set<string>();
  private pressing = false; // tombol kiri sedang ditahan
  private dragging = false; // sudah melewati ambang -> ini seret, bukan klik
  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private lastY = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private cb: InputCallbacks,
  ) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    // Jika jendela kehilangan fokus saat tombol ditahan, keyup tidak pernah datang.
    // Tanpa ini pemain akan "jalan sendiri" terus. Maka semua tombol direset.
    window.addEventListener('blur', this.clearKeys);

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerCancel);
  }

  /** Lepas semua listener. Objek ini tidak boleh dipakai lagi sesudahnya. */
  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.clearKeys);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.canvas.classList.remove('dragging', 'can-interact');
    this.clearKeys();
  }

  /** Sumbu gerak: x = kanan(+)/kiri(-), z = maju(+)/mundur(-). Belum dinormalisasi. */
  get moveAxis(): { x: number; z: number } {
    const x = (this.isDown('KeyD') ? 1 : 0) - (this.isDown('KeyA') ? 1 : 0);
    const z = (this.isDown('KeyW') ? 1 : 0) - (this.isDown('KeyS') ? 1 : 0);
    return { x, z };
  }

  get running(): boolean {
    return this.isDown('ShiftLeft') || this.isDown('ShiftRight');
  }

  clearKeys = (): void => {
    this.keys.clear();
  };

  private isDown(code: string): boolean {
    return this.keys.has(code);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.cb.acceptKey && !this.cb.acceptKey(e)) return;
    // event.code (bukan event.key) -> posisi fisik tombol, tetap benar di layout non-QWERTY.
    this.keys.add(e.code);
    if (!e.repeat) this.cb.onKeyDown?.(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return; // hanya tombol kiri / satu jari
    this.pressing = true;
    this.dragging = false;
    this.startX = this.lastX = e.clientX;
    this.startY = this.lastY = e.clientY;
    // Capture: pointermove/up tetap sampai ke canvas walau kursor keluar jendela saat seret.
    this.canvas.setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.pressing) {
      this.cb.onHover?.(e.clientX, e.clientY);
      return;
    }

    if (!this.dragging) {
      const moved = Math.hypot(e.clientX - this.startX, e.clientY - this.startY);
      if (moved < DRAG_THRESHOLD_PX) return; // masih dianggap calon klik
      this.dragging = true;
      this.canvas.classList.add('dragging');
    }

    this.cb.onLook(e.clientX - this.lastX, e.clientY - this.lastY);
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.button !== 0 || !this.pressing) return;
    const wasDragging = this.dragging;
    this.endPress(e.pointerId);
    if (!wasDragging) this.cb.onClick(e.clientX, e.clientY);
  };

  private onPointerCancel = (e: PointerEvent): void => {
    // Dibatalkan sistem (mis. gestur OS): jangan dianggap klik.
    this.endPress(e.pointerId);
  };

  private endPress(pointerId: number): void {
    this.pressing = false;
    this.dragging = false;
    this.canvas.classList.remove('dragging');
    if (this.canvas.hasPointerCapture(pointerId)) this.canvas.releasePointerCapture(pointerId);
  }
}
