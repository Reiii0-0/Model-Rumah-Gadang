// Simulasi headless walk mode: membangun model asli (buildHouse), dunia jalan
// (buildHouseWalkWorld), PlayerController, DoorState, dan DoorColliders tanpa browser,
// lalu memeriksa posisi akhir pemain terhadap nilai yang diharapkan.
//
//   npm run sim:walk
//
// Modul TypeScript di src/ dimuat lewat Vite (ssrLoadModule), jadi yang diuji adalah kode
// yang sama dengan aplikasi. Input keyboard diganti objek tiruan; waktu maju 60 frame per
// detik. Setiap skenario memakai dunia dan pintu baru. Kode keluar 1 bila ada yang gagal.
import { createServer } from 'vite';

// buildHouse() menggambar tekstur prosedural di <canvas>. Di Node tidak ada DOM, jadi
// dipasang tiruan minimal: setiap panggilan konteks 2D tidak melakukan apa-apa.
// Tekstur tidak dipakai simulasi; geometri dan ukuran perabot tetap asli.
const noop = new Proxy(function () {}, {
  get: (_t, key) => (key === Symbol.toPrimitive ? () => 0 : noop),
  apply: () => noop,
  set: () => true,
});
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => noop, style: {} }),
};

const FPS = 60;
const TOL = 0.01; // toleransi posisi (m)

const server = await createServer({
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
});

let failed = 0;
try {
  const load = (p) => server.ssrLoadModule(p);
  const { PerspectiveCamera } = await import('three');
  const { buildHouse } = await load('/src/model/house.ts');
  const { buildHouseWalkWorld } = await load('/src/walk/houseWorld.ts');
  const { DoorColliders } = await load('/src/walk/doorColliders.ts');
  const { PlayerController } = await load('/src/walk/controller.ts');
  const { DoorState } = await load('/src/doors.ts');
  const L = await load('/src/model/layout.ts');

  const { furniture } = buildHouse('interaction');

  /** Input tiruan: arah gerak dan Shift diatur langsung oleh skenario. */
  const input = { moveAxis: { x: 0, z: 0 }, running: false };

  /** Dunia + pintu baru, pemain di (x, z) menghadap -Z (ke dalam rumah). */
  function setup(x, z, { doorOpen = false } = {}) {
    const door = new DoorState();
    let player;
    const colliders = new DoorColliders(door, (box) => player.overlaps(box));
    const world = buildHouseWalkWorld({ furniture, extra: colliders.all });
    player = new PlayerController(new PerspectiveCamera(), input, world, { x, z, yaw: 0 });
    door.closeBlocker = () => (colliders.doorwayOccupied() ? 'ambang ditempati' : null);
    const tick = () => {
      player.update(1 / FPS);
      door.update(1 / FPS);
      colliders.update();
    };
    const wait = (seconds) => {
      for (let i = 0; i < Math.round(seconds * FPS); i++) tick();
    };
    /** Jalan dengan sumbu (ax, az) selama `seconds`; mencatat kaki tertinggi yang dilewati. */
    const run = (ax, az, seconds) => {
      input.moveAxis = { x: ax, z: az };
      let maxFeet = -Infinity;
      for (let i = 0; i < Math.round(seconds * FPS); i++) {
        tick();
        maxFeet = Math.max(maxFeet, player.feet);
      }
      input.moveAxis = { x: 0, z: 0 };
      return { maxFeet };
    };
    if (doorOpen) {
      door.toggle();
      wait(1.5);
    }
    return { player, door, colliders, world, run, wait };
  }

  const near = (label, actual, expected, tol = TOL) => ({
    label,
    ok: Math.abs(actual - expected) <= tol,
    got: actual.toFixed(3),
    want: `${expected}`,
  });
  const is = (label, ok, got, want) => ({ label, ok, got: String(got), want });

  const R = 0.3; // PLAYER_RADIUS
  const columnBand = 0.33 / 2;

  // Arah: (0, 1) = W (maju ke -Z), (0, -1) = S, (1, 0) = D (kanan = +X), (-1, 0) = A.
  const scenarios = [
    {
      name: 'Dari setapak naik tangga, tertahan pintu tertutup',
      run() {
        const { player, colliders, run } = setup(0, 14);
        run(0, 1, 6);
        const doorFront = colliders.closed.box.max.z;
        return [
          near('z (berhenti di depan daun pintu)', player.z, doorFront + R),
          near('kaki di atas lantai serambi', player.feet, L.PORCH_TOP),
          near('x (tidak tergeser)', player.x, 0),
        ];
      },
    },
    {
      name: 'Tiang depan di balik pintu menahan jalur lurus di x = 0',
      run() {
        const { player, run } = setup(0, 14, { doorOpen: true });
        run(0, 1, 5);
        return [near('z (tertahan tiang 0,3.65)', player.z, L.COLUMN_Z[2] + columnBand + R)];
      },
    },
    {
      name: 'Pintu terbuka: naik, mengitari tiang, melangkahi ambang, tertahan meja tamu',
      run() {
        const { player, world, run } = setup(0, 14, { doorOpen: true });
        run(0, 1, 4); // sampai di depan tiang, di antara daun pintu yang terbuka
        run(1, 0, 0.2); // geser 0.6 m ke kanan, ke celah antara tiang dan kusen
        const { maxFeet } = run(0, 1, 3);
        const desk = furniture.find((f) => f.name === 'reception-desk-assembly');
        return [
          near('x (di celah kanan tiang)', player.x, 0.6),
          near('z (tertahan meja tamu)', player.z, desk.box.max.z + R),
          near('kaki di lantai aula', player.feet, L.HALL_FLOOR_TOP),
          near('ambang dilangkahi (kaki tertinggi = puncak ambang)', maxFeet, L.SILL_TOP),
          is('di dalam rumah', world.isIndoors(player.x, player.z), world.isIndoors(player.x, player.z), 'true'),
        ];
      },
    },
    {
      name: 'Keluar rumah: lewat celah tiang, turun tangga kembali ke setapak',
      run() {
        const { player, world, run } = setup(0.6, 3.0, { doorOpen: true });
        run(0, -1, 0.5); // ke serambi
        run(-1, 0, 0.2); // kembali ke sumbu, di antara daun pintu
        run(0, -1, 4);
        return [
          near('x', player.x, 0),
          near('z (1.5 m + 3 m/s x 4 s)', player.z, 16.5),
          near('kaki di setapak', player.feet, L.topOf(L.SITE.path.center[1], L.SITE.path.size[1])),
          is('di luar rumah', !world.isIndoors(player.x, player.z), !world.isIndoors(player.x, player.z), 'true'),
        ];
      },
    },
    {
      name: 'Kolong tidak bisa dimasuki (panggung padat dari tanah)',
      run() {
        const { player, run } = setup(5, 8);
        run(0, 1, 3);
        return [near('z (berhenti di muka panggung)', player.z, 4.25 + R), near('kaki di platform', player.feet, 0.07)];
      },
    },
    {
      name: 'Sisi serambi berpagar tak terlihat (tidak jatuh 2 m)',
      run() {
        const { player, run } = setup(0.5, 4.8);
        run(1, 0, 2);
        return [
          near('x (tertahan pagar sisi)', player.x, L.PORCH.landing.size[0] / 2 - R),
          near('kaki tetap di serambi', player.feet, L.PORCH_TOP),
        ];
      },
    },
    {
      name: 'Pipi tangga menahan ke samping',
      run() {
        const { player, run } = setup(0, 7.5);
        run(1, 0, 2);
        const cheekInner = L.STAIRS.cheek.x - L.STAIRS.cheek.width / 2;
        return [near('x (tertahan pipi tangga)', player.x, cheekInner - R)];
      },
    },
    {
      name: 'Naik ke anjuang lewat celah pagar, sampai dinding ujung',
      run() {
        const { player, run } = setup(6.8, 0.6);
        const { maxFeet } = run(1, 0, 3);
        return [
          near('x (tertahan lapisan dinding ujung)', player.x, L.INNER_LINING.endX - 0.015 - R),
          near('kaki di lantai anjuang', player.feet, L.ANJUANG_FLOOR_TOP),
          is('melewati undakan tengah', maxFeet >= L.ANJUANG_STEP_TOP, maxFeet.toFixed(3), `>= ${L.ANJUANG_STEP_TOP}`),
        ];
      },
    },
    {
      name: 'Pagar anjuang menahan dari aula',
      run() {
        const { player, run } = setup(6.8, 2.5);
        run(1, 0, 2);
        const riserMin = L.ANJUANG.riser.x - L.ANJUANG.riser.width / 2;
        return [near('x (tertahan riser/pagar)', player.x, riserMin - R), near('kaki tetap di aula', player.feet, L.HALL_FLOOR_TOP)];
      },
    },
    {
      name: 'Pagar anjuang menahan dari atas anjuang',
      run() {
        const { player, run } = setup(9.5, 2.5);
        run(-1, 0, 2);
        const riserMax = L.ANJUANG.riser.x + L.ANJUANG.riser.width / 2;
        return [near('x (tertahan pagar)', player.x, riserMax + R), near('kaki tetap di anjuang', player.feet, L.ANJUANG_FLOOR_TOP)];
      },
    },
    {
      name: 'Etalase belakang menghalangi (kotak dari furniture bounds)',
      run() {
        const { player, run } = setup(3.2, -1.8);
        run(0, 1, 2);
        const vitrine = furniture.find((f) => f.name === 'vitrine-rear-right-1');
        return [near('z (berhenti di muka etalase)', player.z, vitrine.box.max.z + R)];
      },
    },
    {
      name: 'Batas dunia',
      run() {
        const { player, run } = setup(0, 20);
        run(-1, 0, 12);
        return [near('x (tertahan batas kiri)', player.x, -25 + R)];
      },
    },
    {
      name: 'Daun pintu terbuka menghalangi di anak tangga teratas',
      run() {
        const { player, colliders, run } = setup(-0.8, 7, { doorOpen: true });
        run(0, 1, 2);
        return [
          is('collider daun kiri aktif', colliders.openLeft.enabled, colliders.openLeft.enabled, 'true'),
          is('collider tertutup mati', !colliders.closed.enabled, colliders.closed.enabled, 'false'),
          near('z (tertahan daun kiri, berayun ke +Z)', player.z, colliders.openLeft.box.max.z + R),
        ];
      },
    },
    {
      name: 'Menutup pintu ditolak saat pemain di ambang',
      run() {
        const { player, door, colliders, wait } = setup(0, 5.26, { doorOpen: true });
        const reason = door.toggle();
        wait(1);
        return [
          is('alasan penolakan', reason !== null, reason, 'teks'),
          is('pintu tetap terbuka', door.open, door.open, 'true'),
          is('collider tertutup tetap mati', !colliders.closed.enabled, colliders.closed.enabled, 'false'),
          near('pemain tidak bergeser', player.z, 5.26),
        ];
      },
    },
    {
      name: 'Membuka pintu saat pemain di jalur daun: collider menunggu pemain menyingkir',
      run() {
        const { player, door, colliders, run, wait } = setup(-0.8, 5.8);
        door.toggle();
        wait(1.5);
        const whileStanding = colliders.openLeft.enabled;
        run(1, 0, 1); // geser ke kanan, keluar dari jalur daun kiri
        return [
          is('daun belum padat selama ditempati', !whileStanding, whileStanding, 'false'),
          is('daun padat setelah pemain pergi', colliders.openLeft.enabled, colliders.openLeft.enabled, 'true'),
          is('pemain di luar kotak daun kiri (x, tertahan daun kanan)', !player.overlaps(colliders.openLeft.box), player.x.toFixed(3), 'di luar'),
        ];
      },
    },
    {
      name: 'Menutup pintu menghidupkan collider tertutup seketika',
      run() {
        const { door, colliders, wait } = setup(0, 14, { doorOpen: true });
        const reason = door.toggle();
        wait(1 / FPS);
        return [
          is('penutupan diterima', reason === null, reason, 'null'),
          is('collider tertutup langsung aktif', colliders.closed.enabled, colliders.closed.enabled, 'true'),
          is('collider daun langsung mati', !colliders.openLeft.enabled && !colliders.openRight.enabled, `${colliders.openLeft.enabled}/${colliders.openRight.enabled}`, 'false/false'),
        ];
      },
    },
  ];

  for (const s of scenarios) {
    let checks;
    try {
      checks = s.run();
    } catch (e) {
      checks = [{ label: 'exception', ok: false, got: e.message, want: 'tanpa error' }];
    }
    const ok = checks.every((c) => c.ok);
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${s.name}`);
    for (const c of checks) {
      console.log(`      ${c.ok ? 'ok ' : 'XX '} ${c.label}: ${c.got} (harap ${c.want})`);
    }
  }
  console.log(`\n${scenarios.length - failed}/${scenarios.length} skenario lolos`);
} finally {
  await server.close();
}
process.exit(failed ? 1 : 0);
