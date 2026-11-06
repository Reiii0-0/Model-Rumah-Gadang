import * as THREE from 'three';
import { createArchivalPhotoMaterial, createPlaqueMaterial } from './materials';

export interface InteriorBuild {
  group: THREE.Group;
  ceilingGroup: THREE.Group;
}

export function buildInterior(
  surfaces: {
    wood: THREE.MeshStandardMaterial;
    ornament: THREE.MeshStandardMaterial;
    bambooWeave: THREE.MeshStandardMaterial;
    rattanMat: THREE.MeshStandardMaterial;
    mahogany: THREE.MeshStandardMaterial;
  } | null
): InteriorBuild {
  const group = new THREE.Group();
  group.name = 'interior';
  group.userData.partId = 'interior';

  const ceilingGroup = new THREE.Group();
  ceilingGroup.name = 'interior-ceiling-vault';
  ceilingGroup.userData.partId = 'interior';
  ceilingGroup.userData.keepSeparateGroup = true;
  group.add(ceilingGroup);

  const mat = (color: string, roughness = 0.78, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });

  const timber = surfaces?.wood || mat('#312821', 0.84);
  const mahogany = surfaces?.mahogany || mat('#6d2e1b', 0.42);
  const bamboo = surfaces?.bambooWeave || mat('#d8ceb8', 0.9);
  const rattan = surfaces?.rattanMat || mat('#c8b289', 0.76);
  const ornament = surfaces?.ornament || mat('#6e352b', 0.82);
  const brass = mat('#c8a951', 0.32, 0.68);
  const darkBronze = mat('#3b3024', 0.45, 0.55);
  const greenStand = mat('#2e6b47', 0.65);
  const redStand = mat('#8a2c24', 0.6);
  const creamShelf = mat('#efeae0', 0.85);
  const lampGlass = new THREE.MeshStandardMaterial({
    color: '#fff3d6',
    emissive: '#ffbe6b',
    emissiveIntensity: 0.65,
    roughness: 0.25,
  });
  const vitrineGlass = new THREE.MeshStandardMaterial({
    color: '#dce8e6',
    transparent: true,
    opacity: 0.28,
    roughness: 0.15,
    metalness: 0.08,
    depthWrite: false,
  });
  const plaqueMat = createPlaqueMaterial();
  const photoMat0 = createArchivalPhotoMaterial(0);
  const photoMat1 = createArchivalPhotoMaterial(1);

  const geoCache = new Map<string, THREE.BoxGeometry>();
  function box(
    parent: THREE.Object3D,
    name: string,
    size: [number, number, number],
    pos: [number, number, number],
    material: THREE.Material,
    rotY = 0
  ) {
    const key = size.join(',');
    let g = geoCache.get(key);
    if (!g) {
      g = new THREE.BoxGeometry(...size);
      geoCache.set(key, g);
    }
    const m = new THREE.Mesh(g, material);
    m.name = name;
    m.position.set(...pos);
    if (rotY !== 0) m.rotation.y = rotY;
    m.castShadow = false;
    m.receiveShadow = material !== vitrineGlass;
    parent.add(m);
    return m;
  }

  // 1. Woven rattan floor mat (tikar rotan) & stepped-up Anjuang platforms
  box(group, 'main-hall-rattan-floor', [16.6, 0.03, 7.68], [0, 2.055, 0], rattan);
  for (const x of [-8, -6, -4, -2, 0, 2, 4, 6, 8]) {
    box(group, `floor-batten-x-${x}`, [0.08, 0.036, 7.7], [x, 2.058, 0], timber);
  }
  for (const z of [-3.65, 0, 3.65]) {
    box(group, `floor-batten-z-${z}`, [16.6, 0.036, 0.08], [0, 2.058, z], timber);
  }
  for (const sign of [-1, 1]) {
    const ax = sign * 9.7;
    box(group, `anjuang-rattan-floor-${sign}`, [2.7, 0.03, 7.68], [ax, 2.565, 0], rattan);
    box(group, `anjuang-step-riser-${sign}`, [0.28, 0.52, 7.68], [sign * 8.32, 2.3, 0], timber);
    box(group, `anjuang-step-mid-${sign}`, [0.26, 0.26, 2.4], [sign * 8.12, 2.17, 0], mahogany);
    // Low wooden balustrade on the anjuang edge with central opening
    for (const zRange of [
      [-3.5, -1.2],
      [1.2, 3.5],
    ]) {
      const zCenter = (zRange[0] + zRange[1]) / 2;
      const zLen = zRange[1] - zRange[0];
      box(group, `anjuang-rail-top-${sign}-${zCenter}`, [0.09, 0.07, zLen], [sign * 8.35, 3.25, zCenter], mahogany);
      box(group, `anjuang-rail-bot-${sign}-${zCenter}`, [0.07, 0.06, zLen], [sign * 8.35, 2.68, zCenter], timber);
      for (let p = 0; p <= 5; p++) {
        const zp = zRange[0] + (zLen * p) / 5;
        box(group, `anjuang-baluster-${sign}-${zCenter}-${p}`, [0.05, 0.55, 0.05], [sign * 8.35, 2.96, zp], timber);
      }
    }
  }

  // 2. Column plinth bases (umpak dalam), carved neck bands (cincin ukir tiang), and tie-beams (balok tarik)
  for (const x of [-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10]) {
    const floorY = Math.abs(x) === 10 ? 2.56 : 2.05;
    for (const z of [-3.65, 0, 3.65]) {
      box(group, `pillar-plinth-${x}-${z}`, [0.42, 0.14, 0.42], [x, floorY + 0.07, z], darkBronze);
      box(group, `pillar-carved-band-${x}-${z}`, [0.33, 0.14, 0.33], [x, floorY + 1.05, z], ornament);
      box(group, `pillar-capital-${x}-${z}`, [0.36, 0.12, 0.36], [x, 5.06, z], timber);
    }
    // Transverse tie beam (balok tarik melintang) connecting front, center, and back columns
    box(group, `tie-beam-transverse-${x}`, [0.22, 0.22, 7.75], [x, 5.22, 0], timber);
    // King post rising to ceiling ridge
    box(ceilingGroup, `king-post-${x}`, [0.16, 1.05, 0.16], [x, 5.82, 0], timber);
  }
  for (const z of [-3.65, 0, 3.65]) {
    box(group, `tie-beam-longitudinal-${z}`, [21.8, 0.2, 0.22], [0, 5.22, z], timber);
  }

  // 3. Pitched woven-bamboo ceiling (plafon anyaman bilik bambu miring) + rafters (kasau) inside ceilingGroup
  for (const side of [-1, 1]) {
    const slopeAngle = side * 0.285;
    const slopePanel = box(
      ceilingGroup,
      `bamboo-ceiling-slope-${side}`,
      [22.1, 0.04, 4.18],
      [0, 5.78, side * 1.98],
      bamboo
    );
    slopePanel.rotation.x = slopeAngle;
    for (let x = -10; x <= 10; x += 2) {
      const rafter = box(
        ceilingGroup,
        `ceiling-rafter-${side}-${x}`,
        [0.11, 0.1, 4.22],
        [x, 5.73, side * 1.98],
        timber
      );
      rafter.rotation.x = slopeAngle;
    }
    for (const r of [0.7, 1.95, 3.2]) {
      const purlinY = 6.32 - (r / 3.95) * 1.08;
      box(ceilingGroup, `ceiling-purlin-${side}-${r}`, [22.1, 0.08, 0.09], [0, purlinY, side * r], timber);
    }
  }
  box(ceilingGroup, 'ceiling-ridge-beam', [22.1, 0.14, 0.18], [0, 6.32, 0], timber);

  // 4. Interior woven-bamboo wall lining (panel bilik bambu dinding dalam) with window & door cutouts
  for (const z of [-3.84, 3.84]) {
    const isFront = z > 0;
    for (let i = 0; i < 11; i++) {
      const x = -10 + i * 2;
      if (isFront && i === 5) continue;
      const dy = i === 0 || i === 10 ? 0.26 : 0;
      // Left and right bamboo wall strips flanking each window bay
      box(group, `inner-wall-left-${z}-${i}`, [0.68, 2.95, 0.03], [x - 0.62, 3.58 + dy * 0.3, z], bamboo);
      box(group, `inner-wall-right-${z}-${i}`, [0.26, 2.95, 0.03], [x + 0.85, 3.58 + dy * 0.3, z], bamboo);
      // Lower wainscot and upper header above window
      box(group, `inner-wall-low-${z}-${i}`, [1.05, 0.42 + dy * 0.4, 0.03], [x + 0.23, 2.24 + dy * 0.2, z], bamboo);
      box(group, `inner-wall-high-${z}-${i}`, [1.05, 1.02 - dy * 0.3, 0.03], [x + 0.23, 4.54 + dy * 0.35, z], bamboo);
      // Vertical dark wood battens seen in pdikm-interior.jpg
      box(group, `inner-batten-${z}-${i}`, [0.06, 3.05, 0.045], [x - 0.28, 3.6, z], timber);
    }
    // Central rear bay (i === 5 on back wall) has a rear window and upper bamboo panel
    if (!isFront) {
      // Archival photo gallery along the rear woven-bamboo wall
      for (const px of [-7.6, -5.6, -3.6, -1.6, 1.6, 3.6, 5.6, 7.6]) {
        const frame = box(group, `wall-photo-frame-${px}`, [0.58, 0.72, 0.04], [px, 3.65, -3.79], timber);
        frame.rotation.x = 0.08;
        const pic = box(
          group,
          `wall-photo-pic-${px}`,
          [0.48, 0.62, 0.045],
          [px, 3.65, -3.785],
          Math.abs(px) > 4 ? photoMat0 : photoMat1
        );
        pic.rotation.x = 0.08;
      }
    }
  }
  // End walls interior bamboo lining
  for (const sign of [-1, 1]) {
    const x = sign * 10.94;
    for (let j = 0; j < 4; j++) {
      const z = -2.7 + j * 1.8;
      box(group, `inner-end-bamboo-${sign}-${j}`, [0.03, 2.65, 1.68], [x, 3.9, z], bamboo);
      box(group, `inner-end-batten-${sign}-${j}`, [0.045, 2.68, 0.07], [x, 3.9, z + 0.86], timber);
    }
    // Large historical frame on each end wall
    box(group, `end-wall-frame-${sign}`, [0.04, 0.96, 0.78], [sign * 10.89, 3.95, 0], timber);
    box(group, `end-wall-pic-${sign}`, [0.045, 0.84, 0.66], [sign * 10.885, 3.95, 0], photoMat0);
  }

  // Garuda Pancasila wall emblem & presidential portraits on the upper wall (seen in pdikm-interior.jpg)
  const garudaGroup = new THREE.Group();
  garudaGroup.name = 'garuda-emblem';
  garudaGroup.position.set(1.38, 4.55, -3.77);
  group.add(garudaGroup);
  box(garudaGroup, 'garuda-wing-left', [0.34, 0.42, 0.04], [-0.2, 0.04, 0], brass, 0.15);
  box(garudaGroup, 'garuda-wing-right', [0.34, 0.42, 0.04], [0.2, 0.04, 0], brass, -0.15);
  box(garudaGroup, 'garuda-shield', [0.18, 0.22, 0.06], [0, 0.02, 0.02], redStand);
  box(garudaGroup, 'garuda-scroll', [0.36, 0.06, 0.05], [0, -0.2, 0.02], creamShelf);

  // Pillar-mounted archival frames & lantern sconces (seen on foreground pillars in pdikm-interior.jpg)
  for (const x of [-4, -2, 0, 2, 4]) {
    box(group, `pillar-notice-frame-${x}`, [0.34, 0.44, 0.03], [x, 3.38, 0.16], timber);
    box(group, `pillar-notice-pic-${x}`, [0.28, 0.38, 0.035], [x, 3.38, 0.165], photoMat1);
  }
  for (const x of [-2, 2]) {
    box(group, `pillar-sconce-bracket-${x}`, [0.06, 0.14, 0.18], [x, 3.58, 0.22], brass);
    const sconceGlobe = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.22, 6), lampGlass);
    sconceGlobe.position.set(x, 3.72, 0.28);
    sconceGlobe.name = `pillar-sconce-lamp-${x}`;
    group.add(sconceGlobe);
  }

  // 5. Three antique multi-arm chandeliers along the central hall axis (seen in pdikm-interior.jpg)
  for (const cx of [-5.2, 0, 5.2]) {
    const ch = new THREE.Group();
    ch.name = `chandelier-${cx}`;
    ch.position.set(cx, 4.78, 0);
    group.add(ch);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.95, 8), darkBronze);
    rod.position.y = 0.48;
    ch.add(rod);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), brass);
    ch.add(hub);
    for (let a = 0; a < 6; a++) {
      const ang = (a * Math.PI) / 3;
      const rx = Math.cos(ang) * 0.42;
      const rz = Math.sin(ang) * 0.42;
      box(ch, `ch-arm-${cx}-${a}`, [0.42, 0.025, 0.025], [rx * 0.5, -0.04, rz * 0.5], darkBronze, -ang);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.055, 0.14, 8), lampGlass);
      cup.position.set(rx, 0.05, rz);
      cup.name = `ch-shade-${cx}-${a}`;
      ch.add(cup);
    }
  }

  // 6. Inauguration Plaque on Carved Green-and-Red Minang Stand (prasasti peresmian PDIKM in foreground)
  const plaqueGroup = new THREE.Group();
  plaqueGroup.name = 'inauguration-plaque-stand';
  plaqueGroup.position.set(-1.05, 2.05, 1.55);
  plaqueGroup.rotation.y = 0.38;
  group.add(plaqueGroup);
  box(plaqueGroup, 'plaque-base-tier1', [0.68, 0.1, 0.54], [0, 0.05, 0], redStand);
  box(plaqueGroup, 'plaque-base-tier2', [0.56, 0.12, 0.42], [0, 0.16, 0], greenStand);
  const easel = new THREE.Group();
  easel.position.set(0, 0.78, 0);
  easel.rotation.x = -0.18;
  plaqueGroup.add(easel);
  box(easel, 'plaque-frame-green', [0.62, 1.08, 0.07], [0, 0, -0.02], greenStand);
  box(easel, 'plaque-frame-red', [0.56, 1.0, 0.08], [0, 0, 0], redStand);
  const slab = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.88), plaqueMat);
  slab.position.set(0, 0, 0.045);
  slab.name = 'plaque-inscription-face';
  easel.add(slab);
  // Twin miniature gonjong horns crowning the plaque stand
  for (const s of [-1, 1]) {
    box(easel, `plaque-gonjong-horn-${s}`, [0.08, 0.24, 0.06], [s * 0.22, 0.6, 0], brass, s * 0.2);
  }

  // 7. Polished Mahogany Reception & Guestbook Desk (meja penerima tamu di kanan depan)
  const deskGroup = new THREE.Group();
  deskGroup.name = 'reception-desk-assembly';
  deskGroup.position.set(2.35, 2.05, 1.85);
  group.add(deskGroup);
  // Front counter & side return counter
  box(deskGroup, 'reception-front-body', [2.35, 0.82, 0.68], [0, 0.41, 0], mahogany);
  box(deskGroup, 'reception-front-top', [2.46, 0.06, 0.76], [0, 0.85, 0], timber);
  box(deskGroup, 'reception-side-body', [0.68, 0.96, 1.65], [-1.35, 0.48, -0.48], mahogany);
  box(deskGroup, 'reception-side-top', [0.76, 0.06, 1.74], [-1.35, 0.99, -0.48], timber);
  // Guestbook on counter
  box(deskGroup, 'guestbook-cover', [0.36, 0.03, 0.26], [0.35, 0.895, 0], redStand, 0.12);
  box(deskGroup, 'guestbook-pages', [0.33, 0.035, 0.23], [0.35, 0.9, 0], creamShelf, 0.12);
  // Two reception chairs behind the counter
  for (const cx of [-0.45, 0.55]) {
    box(deskGroup, `reception-chair-seat-${cx}`, [0.46, 0.06, 0.44], [cx, 0.46, -0.62], mahogany);
    box(deskGroup, `reception-chair-back-${cx}`, [0.44, 0.48, 0.06], [cx, 0.72, -0.82], creamShelf);
    for (const lx of [-0.19, 0.19])
      for (const lz of [-0.18, 0.18])
        box(deskGroup, `reception-chair-leg-${cx}-${lx}-${lz}`, [0.05, 0.45, 0.05], [cx + lx, 0.225, -0.62 + lz], timber);
  }

  // 8. Glass-and-Timber Museum Display Vitrines (etalase kaca koleksi naskah & adat)
  function addVitrine(id: string, x: number, z: number, w: number, d: number, h = 1.62) {
    const v = new THREE.Group();
    v.name = `vitrine-${id}`;
    v.position.set(x, 2.05, z);
    group.add(v);
    // Base cabinet, mid shelf, top cap
    box(v, `${id}-base`, [w, 0.38, d], [0, 0.19, 0], mahogany);
    box(v, `${id}-shelf-1`, [w - 0.08, 0.035, d - 0.08], [0, 0.82, 0], creamShelf);
    box(v, `${id}-shelf-2`, [w - 0.08, 0.035, d - 0.08], [0, 1.22, 0], creamShelf);
    box(v, `${id}-top-frame`, [w + 0.04, 0.06, d + 0.04], [0, h, 0], timber);
    // Corner posts
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        box(v, `${id}-post-${sx}-${sz}`, [0.06, h, 0.06], [sx * (w / 2 - 0.03), h / 2, sz * (d / 2 - 0.03)], timber);
      }
    // Exhibited archival manuscripts & artifacts on the shelves
    for (const sx of [-0.28 * w, 0, 0.28 * w]) {
      box(v, `${id}-manuscript-top-${sx}`, [0.26, 0.04, 0.2], [sx, 1.26, 0], creamShelf, 0.08);
      box(v, `${id}-artifact-mid-${sx}`, [0.22, 0.12, 0.18], [sx, 0.9, 0], sx < 0 ? redStand : brass);
    }
    // Transparent glass enclosure
    box(v, `${id}-glass`, [w - 0.04, h - 0.42, d - 0.04], [0, 0.38 + (h - 0.42) / 2, 0], vitrineGlass);
  }
  addVitrine('center-right-1', 2.65, -0.35, 2.1, 0.82, 1.65);
  addVitrine('center-right-2', 5.25, -0.35, 2.1, 0.82, 1.65);
  addVitrine('rear-left-1', -5.8, -3.15, 1.85, 0.68, 1.72);
  addVitrine('rear-left-2', -3.2, -3.15, 1.85, 0.68, 1.72);
  addVitrine('rear-right-1', 3.2, -3.15, 1.85, 0.68, 1.72);
  addVitrine('rear-right-2', 5.8, -3.15, 1.85, 0.68, 1.72);

  // 9. Library Reading Table & 8 Wooden Chairs on the left side of the hall (meja baca perpustakaan)
  const tableGroup = new THREE.Group();
  tableGroup.name = 'reading-table-assembly';
  tableGroup.position.set(-4.65, 2.05, 1.25);
  group.add(tableGroup);
  box(tableGroup, 'reading-table-top', [3.6, 0.07, 1.08], [0, 0.76, 0], mahogany);
  box(tableGroup, 'reading-table-apron', [3.4, 0.1, 0.92], [0, 0.68, 0], timber);
  for (const lx of [-1.62, 0, 1.62])
    for (const lz of [-0.42, 0.42]) {
      box(tableGroup, `reading-table-leg-${lx}-${lz}`, [0.08, 0.74, 0.08], [lx, 0.37, lz], timber);
    }
  // Open archival books on the reading table
  for (const bx of [-1.1, 0, 1.1]) {
    box(tableGroup, `reading-book-${bx}`, [0.34, 0.03, 0.24], [bx, 0.81, 0.18], creamShelf, 0.05);
  }
  // 8 wooden chairs around the reading table
  for (const cx of [-1.25, -0.42, 0.42, 1.25]) {
    for (const side of [-1, 1]) {
      const cz = side * 0.76;
      box(tableGroup, `lib-chair-seat-${cx}-${side}`, [0.44, 0.05, 0.42], [cx, 0.45, cz], mahogany);
      box(
        tableGroup,
        `lib-chair-back-${cx}-${side}`,
        [0.44, 0.46, 0.05],
        [cx, 0.7, cz + side * 0.19],
        mahogany
      );
      for (const sx of [-0.18, 0.18])
        for (const sz of [-0.17, 0.17]) {
          box(
            tableGroup,
            `lib-chair-leg-${cx}-${side}-${sx}-${sz}`,
            [0.045, 0.44, 0.045],
            [cx + sx, 0.22, cz + sz],
            timber
          );
        }
    }
  }

  return { group, ceilingGroup };
}
