import * as THREE from 'three';
import type { PartId } from './parts';
import {createSurfaceMaterials,createSignMaterial} from './materials';
import {buildInterior} from './interior';
import {mergeStaticPart} from './merge-static';

export type ModelPhase = 'blockout' | 'form' | 'lookdev' | 'interaction';
export interface House { root: THREE.Group; parts: Record<PartId, THREE.Group>; doorLeft: THREE.Group; doorRight: THREE.Group; ceilingGroup: THREE.Group; }

export function buildHouse(phase: ModelPhase = 'interaction'): House {
  const root = new THREE.Group(); root.name = 'pdikm-house';
  const parts = {} as Record<PartId, THREE.Group>;
  for (const key of ['roof','body','pillars','stairs','doors','windows','ornaments','interior'] as PartId[]) {
    const group = new THREE.Group(); group.name = key; group.userData.partId = key; parts[key] = group; root.add(group);
  }
  const detailed = phase !== 'blockout';
  const surfaces=detailed?createSurfaceMaterials():null;
  const mat = (color: string, roughness = .82, metalness = 0) => new THREE.MeshStandardMaterial({color, roughness, metalness});
  const timber = surfaces?.wood||mat('#312821'), red = mat('#6e352b'), trim = mat('#c4bca5'), roofMat = surfaces?.roof||mat('#363c39', .88), stone = mat('#777b72'), wall = mat('#5b3229'), under = mat('#89977e');
  const glass = mat('#1d2725', .3), silver = mat('#b5ad93', .45, .32);
  roofMat.side = THREE.DoubleSide;
  const cache = new Map<string, THREE.BoxGeometry>();
  function box(parent: THREE.Object3D, name: string, size: [number,number,number], p: [number,number,number], material: THREE.Material) {
    const key = size.join(','); let geometry = cache.get(key);
    if (!geometry) { geometry = new THREE.BoxGeometry(...size); cache.set(key,geometry); }
    const mesh = new THREE.Mesh(geometry,material); mesh.name=name; mesh.position.set(...p); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
  }
  function tube(parent: THREE.Object3D, name: string, points: THREE.Vector3[], radius: number, material: THREE.Material) {
    const curve = new THREE.CatmullRomCurve3(points);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(12,points.length*2), radius, 5, false), material);
    mesh.name=name; mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
  }
  // One unit is nominally one meter; dimensions are visual estimates, not a survey.
  box(parts.body,'raised-floor',[22.4,.28,8],[0,1.9,0],timber);
  const interiorBuild = buildInterior(surfaces);
  while (interiorBuild.group.children.length > 0) {
    parts.interior.add(interiorBuild.group.children[0]);
  }
  const ceilingGroup = interiorBuild.ceilingGroup;
  for (const x of [-10,-8,-6,-4,-2,0,2,4,6,8,10]) for (const z of [-3.65,0,3.65]) {
    box(parts.pillars,`column-${x}-${z}`,[.28,5.25,.28],[x,2.7,z],timber);
    box(parts.pillars,`stone-foot-${x}-${z}`,[.52,.24,.52],[x,.12,z],stone);
  }
  for (const z of [-4,4]) {
    const isFront=z>0;
    box(parts.body,`sill-band-${z}`,[22.4,.48,.22],[0,2.25,z],red);
    box(parts.body,`upper-frieze-${z}`,[22.4,.4,.22],[0,5.2,z],red);
    for (let i=0;i<11;i++) {
      const x=-10+i*2;
      if(isFront&&i===5) continue;
      const dy=(i===0||i===10)?.26:0;
      box(parts.body,`wall-pier-${z}-${i}`,[.76,2.65-dy*.4,.22],[x-.62,3.72+dy*.5,z],wall);
      box(parts.body,`wall-return-${z}-${i}`,[.3,2.65-dy*.4,.22],[x+.85,3.72+dy*.5,z],wall);
      box(parts.body,`wall-spandrel-${z}-${i}`,[1.45,1.0-dy*.35,.22],[x+.25,4.55+dy*.45,z],red);
      const w=box(parts.windows,`window-recess-${z}-${i}`,[.94,1.42,.07],[x+.23,3.2+dy,z+(isFront?-.07:.07)],glass);
      w.userData.observed=isFront;
      for(const dx of [-.51,.51]) box(parts.windows,`window-jamb-${z}-${i}-${dx}`,[.1,1.58,.16],[x+.23+dx,3.2+dy,z+(isFront?.07:-.07)],trim);
      for(const y of [2.43+dy,3.97+dy]) box(parts.windows,`window-lintel-${z}-${i}-${y}`,[1.12,.09,.16],[x+.23,y,z+(isFront?.07:-.07)],trim);
      box(parts.windows,`window-mullion-${z}-${i}`,[.045,1.42,.08],[x+.23,3.2+dy,z+(isFront?.02:-.02)],timber);
    }
    for(const x of [-11.1,11.1]) box(parts.body,`facade-corner-${z}-${x}`,[.3,3.55,.3],[x,3.7,z],timber);
  }
  for(const x of [-11.1,11.1]) {
    box(parts.body,`end-wall-${x}`,[.22,3.65,8],[x,3.75,0],red);
    box(parts.body,`raised-end-floor-${x}`,[2.8,.3,8],[x>0?9.8:-9.8,2.4,0],timber);
    box(parts.body,`raised-end-facade-${x}`,[2.6,.48,.22],[x>0?9.8:-9.8,5.32,4],red);
  }
  // Three overlapping saddle roofs: six main gonjong tips, continuously curved surfaces.
  const roofSpecs = [
    { id:'outer',half:12.15,depth:4.85,ridge:7.6,eave:5.9,tip:12.05,start:0 },
    { id:'middle',half:8.7,depth:5.0,ridge:7.75,eave:5.1,tip:11.35,start:0 },
    { id:'inner',half:5.0,depth:5.12,ridge:8.0,eave:5.7,tip:10.55,start:0 },
  ];
  for(const spec of roofSpecs) {
    const nx=96,nz=24; const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
    function point(u:number,v:number,side:number) {
      const a=Math.abs(u);
      const ridge=spec.ridge+(spec.tip-spec.ridge)*Math.pow(a,3.4);
      const eave=spec.eave+.42*Math.pow(a,3);
      return new THREE.Vector3(u*spec.half,ridge-(ridge-eave)*Math.pow(v,.56),side*v*spec.depth);
    }
    for(const side of [-1,1]) {
      const offset=positions.length/3;
      for(let i=0;i<=nx;i++) for(let j=0;j<=nz;j++) {
        const u=i/nx*2-1,v=j/nz,p=point(u,v,side);positions.push(p.x,p.y,p.z);uvs.push(i/nx*spec.half*.18,v*1.7);
      }
      for(let i=0;i<nx;i++) for(let j=0;j<nz;j++) {
        if(Math.abs(((i+.5)/nx*2-1)*spec.half)<spec.start)continue;
        const a=offset+i*(nz+1)+j,b=a+nz+1;
        if(side===1) indices.push(a,a+1,b,b,a+1,b+1);else indices.push(a,b,a+1,b,b+1,a+1);
      }
      const ranges=spec.start===0?[[-1,1]]:[[-1,-spec.start/spec.half],[spec.start/spec.half,1]];
      ranges.forEach(([lo,hi],k)=>tube(parts.roof,`${spec.id}-eave-${side}-${k}`,Array.from({length:33},(_,i)=>point(lo+(hi-lo)*i/32,1,side)),.045,silver));
      for(const end of [-1,1]) tube(parts.roof,`${spec.id}-verge-${side}-${end}`,Array.from({length:33},(_,i)=>point(end,i/32,side)),.052,silver);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,roofMat);mesh.name=`gonjong-${spec.id}-shell`;mesh.castShadow=true;mesh.receiveShadow=true;parts.roof.add(mesh);
    for(const sign of [-1,1]) {
      tube(parts.roof,`${spec.id}-finial-${sign}`,[new THREE.Vector3(sign*spec.half,spec.tip,0),new THREE.Vector3(sign*spec.half,spec.tip+.8,0)],.022,silver);
      for(let b=0;b<3;b++){const bead=new THREE.Mesh(new THREE.SphereGeometry(.07-b*.012,8,6),silver);bead.position.set(sign*spec.half,spec.tip+.15+b*.18,0);parts.roof.add(bead);}
    }
  }
  // Close the outer gables against the underside of the roof with symmetric clearance so no seam bleeds through.
  for(const sign of [-1,1]) {
    const x=sign*11.12,a=Math.abs(x)/12.15;
    const ridge=7.6+(12.05-7.6)*Math.pow(a,3.4),eave=5.9+.42*Math.pow(a,3);
    const end=new THREE.Shape();end.moveTo(-4,5.35);
    for(let i=0;i<=48;i++){const z=-4+8*i/48;end.lineTo(z,ridge-(ridge-eave)*Math.pow(Math.abs(z)/4.85,.56)-.18);}
    end.lineTo(4,5.35);end.closePath();
    const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(end,{depth:.12,bevelEnabled:false}),red);mesh.rotation.y=Math.PI/2;mesh.position.x=x-.06;mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=`end-gable-${sign}`;parts.body.add(mesh);
  }
  // Central porch gable, whose two concave verges meet at a seventh peak with finial.
  const gable = new THREE.Shape();gable.moveTo(-1.65,5.05);gable.bezierCurveTo(-.65,5.7,-.28,6.75,0,9.1);gable.bezierCurveTo(.28,6.75,.65,5.7,1.65,5.05);gable.closePath();
  const gableGeo=new THREE.ExtrudeGeometry(gable,{depth:.13,bevelEnabled:false,curveSegments:30});
  const guv=gableGeo.getAttribute('uv');for(let i=0;i<guv.count;i++)guv.setXY(i,(guv.getX(i)+1.65)/3.3,(guv.getY(i)-5.05)/4.05);
  const gableMesh=new THREE.Mesh(gableGeo,surfaces?.ornament||red);gableMesh.position.z=5.6;gableMesh.name='porch-gable';gableMesh.castShadow=true;parts.doors.add(gableMesh);
  tube(parts.roof,'porch-finial',[new THREE.Vector3(0,9.1,5.7),new THREE.Vector3(0,9.85,5.7)],.024,silver);
  for(let b=0;b<3;b++){const bead=new THREE.Mesh(new THREE.SphereGeometry(.068-b*.012,8,6),silver);bead.position.set(0,9.24+b*.17,5.7);parts.roof.add(bead);}
  for(const side of [-1,1]) {
    const curve=new THREE.CubicBezierCurve3(new THREE.Vector3(side*1.65,5.05,5.7),new THREE.Vector3(side*.65,5.7,5.7),new THREE.Vector3(side*.28,6.75,5.7),new THREE.Vector3(0,9.1,5.7));
    const pts=curve.getPoints(40);tube(parts.roof,`porch-verge-${side}`,pts,.10,silver);
    const p:number[]=[],idx:number[]=[];
    pts.forEach(v=>{const a=Math.abs(v.x)/5;const ridge=8+(10.55-8)*Math.pow(a,3.4),eave=5.7+.42*Math.pow(a,3);const rear=ridge-(ridge-eave)*Math.pow(2.8/5.12,.56)+.025;p.push(v.x,v.y,v.z,v.x,rear,2.8);});
    for(let i=0;i<40;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(pts.flatMap((_,i)=>[i/40,0,i/40,1]),2));geo.setIndex(idx);geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,roofMat);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=`porch-roof-${side}`;parts.roof.add(mesh);
    box(parts.doors,`porch-pillar-${side}`,[.25,3.55,.3],[side*1.33,3.64,5.58],timber);
    box(parts.doors,`porch-side-panel-${side}`,[.45,3.1,.22],[side*1.08,3.57,5.58],red);
  }
  box(parts.doors,'porch-landing',[2.75,.23,1.8],[0,1.93,4.8],timber);
  box(parts.doors,'porch-lintel',[2.6,.26,.3],[0,5.04,5.58],trim);
  const porchArch=new THREE.Shape();porchArch.moveTo(-.9,4.92);porchArch.lineTo(.9,4.92);porchArch.lineTo(.9,3.88);porchArch.bezierCurveTo(.75,4.02,.76,4.42,.48,4.58);porchArch.quadraticCurveTo(.22,4.74,0,4.74);porchArch.quadraticCurveTo(-.22,4.74,-.48,4.58);porchArch.bezierCurveTo(-.76,4.42,-.75,4.02,-.9,3.88);porchArch.closePath();
  const porchArchGeo=new THREE.ExtrudeGeometry(porchArch,{depth:.08,bevelEnabled:false,curveSegments:14});
  const pauv=porchArchGeo.getAttribute('uv');for(let i=0;i<pauv.count;i++)pauv.setXY(i,(pauv.getX(i)+.9)/1.8,(pauv.getY(i)-3.88)/1.04);
  const porchArchMesh=new THREE.Mesh(porchArchGeo,surfaces?.ornament||red);porchArchMesh.position.z=5.59;porchArchMesh.castShadow=true;porchArchMesh.name='porch-arch';parts.doors.add(porchArchMesh);
  tube(parts.doors,'porch-arch-trim',[new THREE.Vector3(-.9,3.88,5.68),new THREE.Vector3(-.75,4.28,5.68),new THREE.Vector3(-.48,4.58,5.68),new THREE.Vector3(0,4.74,5.68),new THREE.Vector3(.48,4.58,5.68),new THREE.Vector3(.75,4.28,5.68),new THREE.Vector3(.9,3.88,5.68)],.025,trim);
  const doorLeft=new THREE.Group();doorLeft.name='door-left-hinge';doorLeft.position.set(-.82,2.04,5.26);parts.doors.add(doorLeft);
  const doorRight=new THREE.Group();doorRight.name='door-right-hinge';doorRight.position.set(.82,2.04,5.26);parts.doors.add(doorRight);
  for(const [pivot,s] of [[doorLeft,1],[doorRight,-1]] as const){box(pivot,`door-leaf-${s}`,[.81,2.68,.12],[s*.405,1.34,0],timber);for(const y of [.63,1.91]) box(pivot,`door-inset-${s}-${y}`,[.57,1.0,.04],[s*.405,y,.075],red);box(pivot,`door-handle-${s}`,[.035,.2,.08],[s*.69,1.23,.12],silver);}
  for(let i=0;i<10;i++) {const h=(i+1)*.2;box(parts.stairs,`entry-step-${i}`,[2.45,h,.37],[0,h/2,9.1-i*.36],stone);}
  box(parts.stairs,'stair-base-pad',[2.95,.14,.85],[0,.07,9.52],stone);
  for(const side of [-1,1]){
    for(let i=0;i<10;i++){const h=(i+1)*.2+.12;box(parts.stairs,`stair-cheek-${side}-${i}`,[.14,h,.38],[side*1.29,h/2,9.1-i*.36],red);}
    tube(parts.stairs,`stair-handrail-${side}`,[new THREE.Vector3(side*1.29,.95,9.2),new THREE.Vector3(side*1.29,2.85,5.7)],.045,timber);
    for(const t of [0,.33,.66,1])box(parts.stairs,`rail-post-${side}-${t}`,[.065,.85,.065],[side*1.29,.5+t*1.9,9.2-t*3.5],timber);
  }
  if(detailed) {
    const ornament=surfaces!.ornament;
    for(const z of [-3.99,3.99]) for(const x of [-10,-8,-6,-4,-2,2,4,6,8,10]) {
      const dy=Math.abs(x)===10?.26:0;
      box(parts.pillars,`infill-${x}-${z}`,[1.55,.85+dy*.4,.08],[x,.7+dy*.2,z-.12*Math.sign(z)],under);
      box(parts.ornaments,`lower-panel-${x}-${z}`,[1.82,.43,.07],[x,2.22+dy*.5,z+.15*Math.sign(z)],ornament);
      const arch=new THREE.Shape();arch.moveTo(-.99,1.94+dy*.5);arch.lineTo(.99,1.94+dy*.5);arch.lineTo(.99,.68+dy*.35);arch.bezierCurveTo(.82,.77+dy*.35,.92,1.15+dy*.4,.60,1.30+dy*.45);arch.quadraticCurveTo(.3,1.48+dy*.45,0,1.48+dy*.45);arch.quadraticCurveTo(-.3,1.48+dy*.45,-.60,1.30+dy*.45);arch.bezierCurveTo(-.92,1.15+dy*.4,-.82,.77+dy*.35,-.99,.68+dy*.35);arch.closePath();
      const geo=new THREE.ExtrudeGeometry(arch,{depth:.08,bevelEnabled:false,curveSegments:12});const uv=geo.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)+1)/2,uv.getY(i)/2);
      const fascia=new THREE.Mesh(geo,ornament);fascia.position.set(x,0,z+.12*Math.sign(z));fascia.castShadow=true;fascia.receiveShadow=true;fascia.name=`arcade-fascia-${x}-${z}`;parts.ornaments.add(fascia);
      const pts=[new THREE.Vector3(-.99,.68+dy*.35,0),new THREE.Vector3(-.9,.95+dy*.38,0),new THREE.Vector3(-.6,1.30+dy*.45,0),new THREE.Vector3(0,1.48+dy*.45,0),new THREE.Vector3(.6,1.30+dy*.45,0),new THREE.Vector3(.9,.95+dy*.38,0),new THREE.Vector3(.99,.68+dy*.35,0)].map(p=>p.add(new THREE.Vector3(x,0,z+.23*Math.sign(z))));tube(parts.ornaments,`arcade-trim-${x}-${z}`,pts,.026,trim);
      box(parts.ornaments,`vertical-carving-${x}-${z}`,[.55,2.48-dy*.4,.05],[x-.62,3.73+dy*.5,z+.15*Math.sign(z)],ornament);
      box(parts.ornaments,`top-carving-${x}-${z}`,[1.35,.91-dy*.35,.05],[x+.25,4.55+dy*.45,z+.15*Math.sign(z)],ornament);
      box(parts.ornaments,`fine-carving-${x}-${z}`,[.16,2.48-dy*.4,.05],[x+.85,3.73+dy*.5,z+.15*Math.sign(z)],ornament);
    }
    for(const x of [-11.24,11.24]) for(let j=0;j<8;j++)box(parts.ornaments,`end-panel-${x}-${j}`,[.04,3.3,.85],[x,3.75,-3.5+j],ornament);
    for(const side of [-1,1])box(parts.ornaments,`porch-carving-${side}`,[.38,2.9,.04],[side*1.08,3.55,5.73],ornament);
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.23,.42),createSignMaterial());sign.position.set(0,5.29,5.76);sign.name='pdikm-sign';parts.ornaments.add(sign);
  }
  for(const [id,group] of Object.entries(parts))if(id!=='doors')mergeStaticPart(group);
  mergeStaticPart(ceilingGroup);
  return {root,parts,doorLeft,doorRight,ceilingGroup};
}
