import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Keep semantic part groups and moving pivots; combine static surfaces sharing a material across sub-groups. */
export function mergeStaticPart(group:THREE.Group){
  group.updateMatrixWorld(true);
  const invGroup=group.matrixWorld.clone().invert();
  const batches=new Map<string,{material:THREE.Material,meshes:THREE.Mesh[],cast:boolean,receive:boolean}>();
  // mergeGeometries requires exactly the same attribute layout.  A roof combines
  // boxes, extrusions, and curved pieces, so material alone is not sufficient.
  const layout=(geometry:THREE.BufferGeometry)=>Object.entries(geometry.attributes)
    .map(([name,attribute])=>`${name}:${attribute.itemSize}:${attribute.normalized}:${attribute.array.constructor.name}`)
    .sort().join('|');
  function collect(node:THREE.Object3D){
    for(const child of [...node.children]){
      if(child instanceof THREE.Group){
        if(child.userData.keepSeparateGroup)continue;
        collect(child);
        continue;
      }
      if(!(child instanceof THREE.Mesh)||Array.isArray(child.material))continue;
      const key=`${child.material.uuid}:${child.castShadow}:${child.receiveShadow}:${layout(child.geometry)}`;
      if(!batches.has(key))batches.set(key,{material:child.material,meshes:[],cast:child.castShadow,receive:child.receiveShadow});
      batches.get(key)!.meshes.push(child);
    }
  }
  collect(group);
  for(const batch of batches.values()){
    if(batch.meshes.length<2)continue;
    const geometries=batch.meshes.map(mesh=>{
      const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
      g.applyMatrix4(invGroup.clone().multiply(mesh.matrixWorld));
      return g;
    });
    const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
    // Keep the source meshes when a future geometry type is not mergeable. This
    // optimisation must never prevent the reference model from loading.
    if(!geometry)continue;
    geometry.computeBoundingSphere();const merged=new THREE.Mesh(geometry,batch.material);
    merged.name=`${group.name}-static-${batches.size}-${group.children.length}`;
    merged.userData.sourceComponents=batch.meshes.map(m=>m.name);merged.castShadow=batch.cast;merged.receiveShadow=batch.receive;
    batch.meshes.forEach(m=>m.parent?.remove(m));group.add(merged);
  }
}
