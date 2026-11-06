import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildHouse } from './model/house';
import type { ModelPhase } from './model/house';
import { partInfo, uiText } from './model/parts';
import type { Lang, PartId } from './model/parts';
import './style.css';

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const params = new URLSearchParams(location.search);
if (params.has('capture')) document.body.classList.add('capture');

const viewport = el('viewport');
let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  });
} catch {
  el('loading').textContent =
    'WebGL tidak tersedia. Aktifkan akselerasi grafis pada peramban, lalu muat ulang halaman.';
  throw new Error('WebGL unavailable');
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.domElement.setAttribute(
  'aria-label',
  'Model 3D Rumah Gadang PDIKM. Geser untuk memutar dan klik untuk memilih bagian.'
);
renderer.domElement.setAttribute('role', 'img');
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#e8e2d5');
scene.fog = new THREE.Fog('#e8e2d5', 65, 160);

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 250);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 12;
controls.maxDistance = 95;
controls.maxPolarAngle = Math.PI / 2 - 0.035;
controls.minPolarAngle = 0.12;
controls.touches.ONE = THREE.TOUCH.ROTATE;
controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
controls.autoRotateSpeed = 1.0;

const hemi = new THREE.HemisphereLight('#fcf1dc', '#777b63', 2.1);
scene.add(hemi);
const ambient = new THREE.AmbientLight('#d9e2df', 0.35);
scene.add(ambient);

const sun = new THREE.DirectionalLight('#fff0d0', 3.2);
sun.position.set(-18, 26, 22);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -25,
  right: 25,
  top: 23,
  bottom: -22,
  near: 1,
  far: 90,
});
sun.shadow.normalBias = 0.035;
sun.shadow.bias = -0.0002;
sun.shadow.radius = 3;
scene.add(sun);
sun.target.position.set(0, 3, 0);
scene.add(sun.target);

const doorwayLight = new THREE.PointLight('#ffb66d', 0, 18, 1.5);
doorwayLight.position.set(0, 4.1, 5.9);
scene.add(doorwayLight);

const phase = (params.get('phase') || 'interaction') as ModelPhase;
const house = buildHouse(phase);
scene.add(house.root);

const groundMaterial = new THREE.MeshStandardMaterial({ color: '#b4b8a0', roughness: 1 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(350, 350), groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
ground.position.y = -0.03;
scene.add(ground);

const platform = new THREE.Mesh(
  new THREE.BoxGeometry(31, 0.18, 19),
  new THREE.MeshStandardMaterial({ color: '#c2beaa', roughness: 0.94 })
);
platform.position.set(0, -0.02, 0.7);
platform.receiveShadow = true;
scene.add(platform);

const path = new THREE.Mesh(
  new THREE.BoxGeometry(2.6, 0.035, 12),
  new THREE.MeshStandardMaterial({ color: '#8f9686', roughness: 1 })
);
path.position.set(0, 0.085, 12);
path.receiveShadow = true;
scene.add(path);

const bushMat = new THREE.MeshStandardMaterial({ color: '#5c7148', roughness: 0.96 });
const shrubs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.45, 1), bushMat, 28);
const dummy = new THREE.Object3D();
for (let i = 0; i < 28; i++) {
  const side = i < 14 ? -1 : 1;
  const j = i % 14;
  dummy.position.set(side * (14.2 + 0.16 * Math.sin(j)), 0.36, -7.4 + j * 1.08);
  dummy.scale.set(1, 0.8 + Math.sin(j * 2) * 0.1, 1);
  dummy.rotation.y = j * 1.9;
  dummy.updateMatrix();
  shrubs.setMatrixAt(i, dummy.matrix);
}
shrubs.castShadow = true;
shrubs.receiveShadow = true;
scene.add(shrubs);

type View = 'perspective' | 'front' | 'side' | 'back' | 'interior';
let lang: Lang = params.get('lang') === 'min' ? 'min' : 'id';
let activeView: View = 'perspective';
let selected: PartId | null = null;
let doorOpen = false;
let cutaway = false;
let night = false;
let nightMix = 0;
let touring = false;
let doorAngle = 0;

const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
const highlightMaterials: THREE.Material[] = [];

const references = [
  {
    file: 'pdikm-official.jpg',
    titleId: 'Fasad Utama · Kemdikbud RI',
    titleMin: 'Fasad Utamo · Kemdikbud RI',
    license: 'Domain publik (Commons)',
    page: 'Rumah_Gadang_Minangkabau_PDIKM,_Padang_Panjang.jpg',
  },
  {
    file: 'pdikm-center.jpg',
    titleId: 'Siluet Gonjong & Fasad · Detlef Langer',
    titleMin: 'Siluet Gonjong & Muko · Detlef Langer',
    license: 'CC BY-SA 3.0',
    page: 'Minangkabau_Center.JPG',
  },
  {
    file: 'pdikm-view-2.jpg',
    titleId: 'Sudut Tiga Perempat · Pemkot Padang Panjang',
    titleMin: 'Suduik Tigo Parampat · Pemkot Padang Panjang',
    license: 'Domain publik (Commons)',
    page: 'Pdikm_padangpanjang_2.jpg',
  },
  {
    file: 'pdikm-view-3.jpg',
    titleId: 'Serambi & Sayap Anjuang · Pemkot Padang Panjang',
    titleMin: 'Surambi & Anjuang · Pemkot Padang Panjang',
    license: 'Domain publik (Commons)',
    page: 'Pdikm_padangpanjang_3.jpg',
  },
  {
    file: 'pdikm-carving.jpg',
    titleId: 'Detail Ukiran Dinding · Pemkot Padang Panjang',
    titleMin: 'Ragam Ukiran Dindiang · Pemkot Padang Panjang',
    license: 'Domain publik (Commons)',
    page: 'Rumitnya_Ukiran_Minang.jpg',
  },
  {
    file: 'pdikm-interior.jpg',
    titleId: 'Ruang Pamer Dalam · SpartacksCompatriot',
    titleMin: 'Ruang Pamer Dalam · SpartacksCompatriot',
    license: 'CC BY-SA 3.0',
    page: 'Inside_the_PDIKM.JPG',
  },
];

function renderReferenceGallery() {
  const gallery = el('reference-gallery');
  gallery.innerHTML = '';
  const t = uiText[lang];
  for (const item of references) {
    const title = lang === 'min' ? item.titleMin : item.titleId;
    const figure = document.createElement('figure');
    figure.innerHTML = `<img src="${import.meta.env.BASE_URL}references/photos/${item.file}" alt="${title}" loading="lazy"/><figcaption><strong>${title}</strong><span>${item.license}</span><a href="https://commons.wikimedia.org/wiki/File:${item.page}" target="_blank" rel="noopener">${t.refSourceLink}</a></figcaption>`;
    gallery.appendChild(figure);
  }
}

function renderPartButtons() {
  const container = el('parts-list');
  container.innerHTML = '';
  for (const [id, entry] of Object.entries(partInfo)) {
    const tr = entry[lang];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'part-button';
    b.dataset.part = id;
    const isSelected = selected === id;
    b.classList.toggle('active', isSelected);
    b.setAttribute('aria-pressed', String(isSelected));
    b.innerHTML = `<span class="part-meta"><span class="part-tag">${entry.tag}</span><span class="part-name">${tr.title}</span></span><svg class="part-arrow" viewBox="0 0 14 14" aria-hidden="true"><path d="M4 10l6-6M5 4h5v5"/></svg>`;
    b.addEventListener('click', () => selectPart(selected === id ? null : (id as PartId)));
    container.appendChild(b);
  }
}

function updateDetailCard() {
  const t = uiText[lang];
  el('clear-selection').hidden = !selected;
  if (!selected) {
    el('detail-index').textContent = t.defaultCategory;
    el('detail-title').textContent = t.defaultTitle;
    el('detail-description').textContent = t.defaultDescription;
    el('detail-evidence').textContent = t.defaultEvidence;
    return;
  }
  const entry = partInfo[selected];
  const tr = entry[lang];
  el('detail-index').textContent = `${entry.tag} · ${tr.category}`;
  el('detail-title').textContent = tr.title;
  el('detail-description').textContent = tr.description;
  el('detail-evidence').textContent = tr.evidence;
}

function updateViewLabels() {
  const t = uiText[lang];
  el('view-label').textContent = t.views[activeView];
  el('assumption-label').textContent =
    activeView === 'back'
      ? t.assumptions.back
      : activeView === 'interior'
        ? t.assumptions.interior
        : t.assumptions.default;
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => {
    const v = b.dataset.view as View;
    b.textContent = t.viewButtons[v];
  });
}

function updateToolbarLabels() {
  const t = uiText[lang];
  el('light-label').textContent = night ? t.nightLabel : t.dayLabel;
  el('door-label').textContent = doorOpen ? t.doorCloseLabel : t.doorOpenLabel;
  el('cutaway-label').textContent = cutaway ? t.cutawayCloseLabel : t.cutawayOpenLabel;
  el('tour-label').textContent = touring ? t.tourStopLabel : t.tourStartLabel;
  el('reset-label').textContent = t.resetLabel;
  el('exposure-label').textContent = t.exposureLabel;
}

function setLanguage(nextLang: Lang) {
  lang = nextLang;
  const t = uiText[lang];
  document.documentElement.lang = lang === 'min' ? 'min' : 'id';
  const isMin = lang === 'min';
  el('lang-toggle').setAttribute('aria-pressed', String(isMin));
  el('lang-pill-id').classList.toggle('active', !isMin);
  el('lang-pill-min').classList.toggle('active', isMin);
  el('lang-label').textContent = t.langLabel;

  el('brand-sub').textContent = t.brandSub;
  el('references-label').textContent = t.referencesBtn;
  el('help-label').textContent = t.helpBtn;
  el('intro-kicker').textContent = t.kickerSub;
  el('location-label').textContent = t.location;
  el('intro-copy').textContent = t.introCopy;
  el('parts-heading').textContent = t.partsHeading;
  el('parts-count').textContent = t.partsCount;
  el('clear-label').textContent = t.clearSelection;
  el('proverb-title').textContent = `“${t.proverbTitle}”`;
  el('proverb-sub').textContent = t.proverbSub;
  el('scene-status').textContent = t.sceneStatusReady;
  el('caption-left').textContent = t.captionLeft;
  el('gesture-hint').textContent = t.gestureHint;

  el('help-category').textContent = t.helpCategory;
  el('help-title').textContent = t.helpTitle;
  const helpList = el('help-list');
  helpList.innerHTML = t.helpItems
    .map(([dt, dd]) => `<dt>${dt}</dt><dd>${dd}</dd>`)
    .join('');
  el('help-footer').textContent = t.helpFooter;

  el('ref-category').textContent = t.refCategory;
  el('ref-title').textContent = t.refTitle;
  el('ref-intro').textContent = t.refIntro;
  el('ref-disclosure').textContent = t.refDisclosure;
  el('ref-link').textContent = t.refLink;

  renderPartButtons();
  updateDetailCard();
  updateViewLabels();
  updateToolbarLabels();
  renderReferenceGallery();
}

function toggleLanguage() {
  setLanguage(lang === 'id' ? 'min' : 'id');
}

function stopTour() {
  touring = false;
  controls.autoRotate = false;
  el('tour-button').setAttribute('aria-pressed', 'false');
  el('tour-label').textContent = uiText[lang].tourStartLabel;
}

function setCutaway(open: boolean) {
  cutaway = open;
  house.parts.roof.visible = !cutaway;
  house.ceilingGroup.visible = !cutaway;
  if (cutaway && activeView !== 'interior') {
    const prevDamping = controls.enableDamping;
    controls.enableDamping = false;
    controls.target.set(0, 3.1, 0);
    camera.position.set(12.5, 27.5, 21.5);
    controls.update();
    controls.enableDamping = prevDamping;
    camera.updateMatrixWorld();
  }
  el('cutaway-button').setAttribute('aria-pressed', String(cutaway));
  el('cutaway-label').textContent = cutaway
    ? uiText[lang].cutawayCloseLabel
    : uiText[lang].cutawayOpenLabel;
}

function toggleCutaway() {
  setCutaway(!cutaway);
}

function setView(view: View) {
  stopTour();
  activeView = view;
  if (window.scrollY > 0) window.scrollTo(0, 0);
  const prevDamping = controls.enableDamping;
  controls.enableDamping = false;
  if (view === 'interior') {
    if (cutaway) setCutaway(false);
    camera.fov = 52;
    camera.updateProjectionMatrix();
    controls.minDistance = 0.5;
    controls.maxDistance = 16;
    controls.target.set(1.55, 3.22, -0.45);
    camera.position.set(-2.25, 3.36, 2.62);
    controls.update();
  } else {
    camera.fov = 34;
    camera.updateProjectionMatrix();
    controls.minDistance = 12;
    controls.maxDistance = 95;
    const aspect = camera.aspect;
    const distance = Math.min(
      89,
      Math.max(35, 17 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect))
    );
    const direction =
      view === 'front'
        ? new THREE.Vector3(0.0001, 0.1, 1)
        : view === 'back'
          ? new THREE.Vector3(0.0001, 0.16, -1)
          : view === 'side'
            ? new THREE.Vector3(1, 0.2, 0.0001)
            : new THREE.Vector3(1, 0.38, 1.85);
    const d =
      view === 'side' ? Math.max(32, distance * 0.8) : view === 'perspective' ? distance * 1.16 : distance;
    controls.target.set(0, 4.7, 0);
    camera.position.copy(direction.normalize().multiplyScalar(d).add(controls.target));
    controls.update();
  }
  controls.enableDamping = prevDamping;
  camera.updateMatrixWorld();
  updateViewLabels();
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => {
    const on = b.dataset.view === view;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

function resize() {
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  camera.updateMatrixWorld();
}

function selectPart(id: PartId | null) {
  originalMaterials.forEach((m, obj) => {
    obj.material = m;
  });
  originalMaterials.clear();
  highlightMaterials.splice(0).forEach((m) => m.dispose());
  selected = id;
  document.querySelectorAll<HTMLButtonElement>('.part-button').forEach((b) => {
    const on = b.dataset.part === id;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });
  updateDetailCard();
  if (!id) return;
  const clones = new Map<THREE.Material, THREE.Material>();
  house.parts[id].traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    originalMaterials.set(obj, obj.material);
    const transform = (m: THREE.Material) => {
      if (!clones.has(m)) {
        const c = m.clone();
        if (c instanceof THREE.MeshStandardMaterial) {
          c.emissive.set('#b8892e');
          c.emissiveIntensity = 0.34;
        }
        clones.set(m, c);
        highlightMaterials.push(c);
      }
      return clones.get(m)!;
    };
    obj.material = Array.isArray(obj.material) ? obj.material.map(transform) : transform(obj.material);
  });
}

setLanguage(lang);
new ResizeObserver(resize).observe(viewport);
resize();
setView((params.get('view') as View) || 'perspective');
if (params.get('cutaway') === '1') setCutaway(true);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerStart: { x: number; y: number; id: number } | null = null;
const activePointers = new Set<number>();
let gestureWasMulti = false;

renderer.domElement.addEventListener('pointerdown', (event) => {
  activePointers.add(event.pointerId);
  if (activePointers.size > 1) {
    gestureWasMulti = true;
  } else {
    gestureWasMulti = false;
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }
});

renderer.domElement.addEventListener('pointercancel', (e) => {
  activePointers.delete(e.pointerId);
  pointerStart = null;
});

renderer.domElement.addEventListener('pointerup', (event) => {
  activePointers.delete(event.pointerId);
  const start = pointerStart;
  if (
    !start ||
    start.id !== event.pointerId ||
    gestureWasMulti ||
    Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7 ||
    event.button > 0
  )
    return;
  pointerStart = null;
  camera.updateMatrixWorld();
  house.root.updateMatrixWorld(true);
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(
    ((event.clientX - r.left) / r.width) * 2 - 1,
    -((event.clientY - r.top) / r.height) * 2 + 1
  );
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(house.root, true)[0];
  let obj: THREE.Object3D | null = hit?.object || null;
  while (obj && !obj.userData.partId) obj = obj.parent;
  selectPart(obj ? (obj.userData.partId as PartId) : null);
});

controls.addEventListener('start', stopTour);

function toggleDoor() {
  doorOpen = !doorOpen;
  el('door-button').setAttribute('aria-pressed', String(doorOpen));
  el('door-label').textContent = doorOpen
    ? uiText[lang].doorCloseLabel
    : uiText[lang].doorOpenLabel;
}

function toggleNight() {
  night = !night;
  document.body.classList.toggle('night', night);
  el('day-night').setAttribute('aria-pressed', String(night));
  el('light-label').textContent = night ? uiText[lang].nightLabel : uiText[lang].dayLabel;
}

function toggleTour() {
  touring = !touring;
  controls.autoRotate = touring;
  el('tour-button').setAttribute('aria-pressed', String(touring));
  el('tour-label').textContent = touring
    ? uiText[lang].tourStopLabel
    : uiText[lang].tourStartLabel;
}

function zoom(factor: number) {
  stopTour();
  const prevDamping = controls.enableDamping;
  controls.enableDamping = false;
  const offset = camera.position.clone().sub(controls.target);
  offset.setLength(
    THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance)
  );
  camera.position.copy(controls.target).add(offset);
  controls.update();
  controls.enableDamping = prevDamping;
  camera.updateMatrixWorld();
}

document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) =>
  b.addEventListener('click', () => setView(b.dataset.view as View))
);
el('lang-toggle').addEventListener('click', toggleLanguage);
el('reset-camera').addEventListener('click', () => setView('perspective'));
el('day-night').addEventListener('click', toggleNight);
el('door-button').addEventListener('click', toggleDoor);
el('cutaway-button').addEventListener('click', toggleCutaway);
el('tour-button').addEventListener('click', toggleTour);
el('clear-selection').addEventListener('click', () => selectPart(null));
el('zoom-in').addEventListener('click', () => zoom(0.82));
el('zoom-out').addEventListener('click', () => zoom(1.22));

el<HTMLInputElement>('exposure').addEventListener('input', (event) => {
  const value = Number((event.target as HTMLInputElement).value);
  renderer.toneMappingExposure = value;
  el('exposure-value').textContent = value.toFixed(2);
});

for (const name of ['help', 'references']) {
  const dialog = el<HTMLDialogElement>(`${name}-dialog`);
  el(`${name}-button`).addEventListener('click', () => {
    stopTour();
    dialog.showModal();
  });
  dialog.querySelector('.dialog-close')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        dialog.close();
    }
  });
}

window.addEventListener('keydown', (e) => {
  if (
    e.target instanceof HTMLInputElement ||
    document.querySelector('dialog[open]') ||
    e.ctrlKey ||
    e.metaKey ||
    e.altKey
  )
    return;
  switch (e.key.toLowerCase()) {
    case 'r':
      setView('perspective');
      break;
    case 'd':
      toggleDoor();
      break;
    case 'c':
      toggleCutaway();
      break;
    case 'i':
      setView('interior');
      break;
    case 'n':
      toggleNight();
      break;
    case 't':
      toggleTour();
      break;
    case 'l':
      toggleLanguage();
      break;
    case 'escape':
      selectPart(null);
      break;
  }
});

const dayBg = new THREE.Color('#e8e2d5');
const nightBg = new THREE.Color('#141f26');
const daySun = new THREE.Color('#fff0d0');
const nightSun = new THREE.Color('#9ebfff');

let previousTime = performance.now();
let frameCount = 0;

function frame(time: number) {
  const rawDt = Math.max(0, (time - previousTime) / 1000);
  const dt = Math.min(rawDt, 0.5);
  previousTime = time;
  frameCount++;

  const targetDoor = doorOpen ? Math.PI * 0.48 : 0;
  doorAngle = THREE.MathUtils.lerp(doorAngle, targetDoor, 1 - Math.exp(-8 * dt));
  if (Math.abs(doorAngle - targetDoor) < 0.002) doorAngle = targetDoor;
  house.doorLeft.rotation.y = -doorAngle;
  house.doorRight.rotation.y = doorAngle;

  const targetNight = night ? 1 : 0;
  nightMix = THREE.MathUtils.lerp(nightMix, targetNight, 1 - Math.exp(-5 * dt));
  if (Math.abs(nightMix - targetNight) < 0.002) nightMix = targetNight;

  (scene.background as THREE.Color).copy(dayBg).lerp(nightBg, nightMix);
  (scene.fog as THREE.Fog).color.copy(scene.background as THREE.Color);

  const indoor = activeView === 'interior' || cutaway;
  hemi.intensity = THREE.MathUtils.lerp(indoor ? 3.1 : 2.1, indoor ? 1.3 : 0.65, nightMix);
  ambient.intensity = THREE.MathUtils.lerp(indoor ? 0.95 : 0.35, indoor ? 0.45 : 0.22, nightMix);
  sun.intensity = THREE.MathUtils.lerp(3.2, 1.1, nightMix);
  sun.color.copy(daySun).lerp(nightSun, nightMix);

  doorwayLight.position.set(indoor ? -0.9 : 0, indoor ? 4.35 : 4.1, indoor ? 1.4 : 5.9);
  doorwayLight.intensity = indoor ? THREE.MathUtils.lerp(18, 32, nightMix) : nightMix * 35;

  controls.update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

el('loading').remove();
el('scene-status').textContent = uiText[lang].sceneStatusReady;
requestAnimationFrame(frame);

const diagnostics = {
  snapshot: () => ({
    ready: true,
    phase,
    lang,
    selected,
    night,
    nightMix,
    doorOpen,
    doorAngle,
    cutaway,
    roofVisible: house.parts.roof.visible,
    ceilingVisible: house.ceilingGroup.visible,
    touring,
    view: activeView,
    camera: camera.position.toArray(),
    target: controls.target.toArray(),
    exposure: renderer.toneMappingExposure,
    hemi: hemi.intensity,
    sun: sun.intensity,
    sunColor: sun.color.getHexString(),
    shadowEnabled: renderer.shadowMap.enabled,
    shadowMap: sun.shadow.mapSize.toArray(),
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    frameCount,
    canvas: [renderer.domElement.width, renderer.domElement.height],
    parts: Object.keys(house.parts),
    antialias: renderer.getContext().getContextAttributes()?.antialias,
  }),
  project: (part: PartId) => {
    camera.updateMatrixWorld();
    house.root.updateMatrixWorld(true);
    const p = new THREE.Box3()
      .setFromObject(house.parts[part])
      .getCenter(new THREE.Vector3())
      .project(camera);
    const r = renderer.domElement.getBoundingClientRect();
    return {
      x: r.left + ((p.x + 1) * r.width) / 2,
      y: r.top + ((1 - p.y) * r.height) / 2,
    };
  },
  screenshotView: (view: View) => setView(view),
  setCutaway: (open: boolean) => setCutaway(open),
  setLanguage: (nextLang: Lang) => setLanguage(nextLang),
};
Object.assign(window, { __app: diagnostics });
