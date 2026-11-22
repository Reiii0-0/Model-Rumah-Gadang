import { DOOR } from './model/layout';

/** Exponential approach rate of the swing (1/s); ~0.4 s to settle. */
const SWING_RATE = 8;
/** Snap to the target once this close (rad), so `angle` reaches it exactly. */
const SNAP = 0.002;

/**
 * Open/closed state of the twin porch doors, shared by the toolbar button, the D
 * shortcut (orbit mode) and clicks in walk mode. Pure state: main.ts applies `angle`
 * to the hinge groups, walk/doorColliders.ts derives collision boxes from it.
 */
export class DoorState {
  open = false;
  /** Current swing of each leaf, 0 (closed) .. DOOR.openAngle. */
  angle = 0;
  /**
   * Optional veto on closing, e.g. while the walking visitor stands in the doorway.
   * Returns a reason, or null when closing is allowed.
   */
  closeBlocker: (() => string | null) | null = null;

  get target(): number {
    return this.open ? DOOR.openAngle : 0;
  }

  /** True once the leaves have stopped at the current target. */
  get settled(): boolean {
    return this.angle === this.target;
  }

  /** Flip open/closed. Returns the veto reason when closing is refused, otherwise null. */
  toggle(): string | null {
    if (this.open) {
      const reason = this.closeBlocker?.() ?? null;
      if (reason) return reason;
    }
    this.open = !this.open;
    return null;
  }

  update(dt: number): void {
    const target = this.target;
    this.angle += (target - this.angle) * (1 - Math.exp(-SWING_RATE * dt));
    if (Math.abs(this.angle - target) < SNAP) this.angle = target;
  }
}
