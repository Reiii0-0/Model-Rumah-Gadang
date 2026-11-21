import type { Box3 } from 'three';
import type { Collidable } from './types';

/**
 * Tabrakan pemain vs AABB.
 *
 * Pemain = silinder tegak: lingkaran berjari-jari PLAYER_RADIUS di bidang XZ, setinggi
 * PLAYER_HEIGHT dari kaki. Dunia = kumpulan kotak sejajar sumbu (AABB).
 *
 * Sliding didapat dengan memproses gerak PER SUMBU: geser X dulu lalu koreksi, baru geser Z
 * lalu koreksi. Kalau menabrak dinding secara miring, komponen yang menembus dinding
 * dipotong, sedangkan komponen yang sejajar dinding tetap jalan, jadi pemain menyusur
 * dinding alih-alih berhenti kaku.
 */

export const PLAYER_RADIUS = 0.3;
/** Tinggi mata (kamera) dari kaki. */
export const EYE_HEIGHT = 1.6;
/**
 * Tinggi badan dari kaki = mata + 0.2 m (ruang untuk dahi dan ubun-ubun).
 * Diturunkan dari EYE_HEIGHT supaya keduanya tidak bisa berselisih: mengubah tinggi mata
 * otomatis mengubah kotak mana yang dianggap 'kena kepala' (mis. ambang atas pintu).
 */
export const PLAYER_HEIGHT = EYE_HEIGHT + 0.2;
/**
 * Kotak yang puncaknya tidak lebih dari ini di atas kaki tidak menghalangi (bisa dilangkahi),
 * mis. tikar atau ambang pintu. Tangga TIDAK memakai ini: tangga ditangani getGroundHeight.
 */
export const STEP_HEIGHT = 0.35;

const EPS = 1e-6;

export interface Vec2 {
  x: number;
  z: number;
}

/** Apakah kotak berada pada rentang tinggi badan pemain (kaki+STEP .. kepala)? */
function blocksVertically(box: Box3, feet: number): boolean {
  return box.max.y > feet + STEP_HEIGHT && box.min.y < feet + PLAYER_HEIGHT;
}

/**
 * Geser posisi sejauh `delta` pada satu sumbu, lalu kembalikan koordinat baru sumbu itu
 * setelah dikoreksi agar lingkaran pemain tidak menembus collider mana pun.
 *
 * Kenapa pakai sqrt(r² - d²) dan bukan sekadar r?
 * d = jarak lingkaran ke kotak pada sumbu LAIN. Di dekat sudut kotak, lingkaran hanya
 * 'menjangkau' sqrt(r² - d²) ke arah sumbu ini. Hasilnya sudut terasa membulat dan pemain
 * bisa berbelok mengitari sudut dengan mulus, sesuai bentuk lingkaran (bukan persegi).
 */
export function sweepAxis(
  pos: Vec2,
  axis: 'x' | 'z',
  delta: number,
  colliders: readonly Collidable[],
  feet: number,
  r = PLAYER_RADIUS,
): number {
  const other = axis === 'x' ? 'z' : 'x';
  const start = pos[axis];
  const o = pos[other];
  let v = start + delta;

  for (const c of colliders) {
    if (!c.enabled || !blocksVertically(c.box, feet)) continue;

    const oMin = c.box.min[other];
    const oMax = c.box.max[other];
    const d = o < oMin ? oMin - o : o > oMax ? o - oMax : 0;
    // Lewat di samping kotak. EPS penting: setelah dikoreksi, pemain berada TEPAT di d = r.
    // Tanpa toleransi, galat floating point membuat d sedikit < r, lalu sumbu ini ikut
    // 'menabrak' dan pemain terlempar ke ujung kotak.
    if (d >= r - EPS) continue;

    const reach = Math.sqrt(r * r - d * d);
    const min = c.box.min[axis];
    const max = c.box.max[axis];
    if (v + reach <= min + EPS || v - reach >= max - EPS) continue; // tidak tumpang tindih

    // Sisi dorongan ditentukan dari posisi SEBELUM langkah. Kalau dari posisi baru, langkah
    // besar melewati tengah dinding tipis akan mendorong pemain ke sisi seberang (tembus).
    if (start <= (min + max) / 2) v = Math.min(v, min - reach);
    else v = Math.max(v, max + reach);
  }
  return v;
}

/** Apakah silinder pemain di `pos` (kaki di `feet`) bertumpang tindih dengan kotak? */
export function playerOverlapsBox(pos: Vec2, feet: number, box: Box3, r = PLAYER_RADIUS): boolean {
  if (!blocksVertically(box, feet)) return false;
  const dx = Math.max(box.min.x - pos.x, 0, pos.x - box.max.x);
  const dz = Math.max(box.min.z - pos.z, 0, pos.z - box.max.z);
  return dx * dx + dz * dz < r * r;
}
