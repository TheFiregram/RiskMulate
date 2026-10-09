import * as THREE from 'three';
import {Tree, TreePreset} from '@dgreenheck/ez-tree';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';

// Offline EZ-Tree presets. The young age is the lower-detail mid-ring model.
export async function generateTrees() {
  await new Promise(resolve => setTimeout(resolve, 500));
  const exporter = new GLTFExporter();
  const output=[]; const mature=[];
  for (const [species,index] of ['pine','spruce','birch','oak'].map((s,i)=>[s,i])) {
    for (const age of ['mature','young']) {
      const low=age==='young';
      const tree=new Tree();
      tree.options.copy(structuredClone(TreePreset[species==='birch'?'Aspen Medium':species==='oak'?'Oak Medium':'Pine Medium']));
      tree.options.seed=642+index*137+(low?17:0);
      const o=tree.options;
      o.bark.type=species==='birch'?'birch':species==='oak'?'oak':'pine';
      o.bark.flatShading=false;
      o.branch.levels=species==='birch'||species==='oak'?2:1;
      o.branch.children[0]=species==='birch'||species==='oak'?(low?5:7):(low?18:32);
      o.branch.children[1]=low?2:3;
      o.branch.sections={0:low?5:9,1:low?3:5,2:low?2:3,3:2};
      o.branch.segments={0:low?5:8,1:low?3:5,2:3,3:3};
      o.branch.start[1]=species==='spruce'?0.13:species==='pine'?0.29:0.4;
      o.branch.angle[1]=species==='spruce'?108:species==='pine'?113:57;
      o.branch.length[1]=species==='spruce'?19:species==='pine'?24:o.branch.length[1];
      o.leaves.count=species==='birch'?0:species==='oak'?(low?3:7):(low?6:12);
      o.leaves.size=species==='spruce'?2.4:species==='pine'?2.7:o.leaves.size;
      o.leaves.alphaTest=0.5;
      o.leaves.tint=species==='spruce'?0xadc0ab:species==='pine'?0xc4ceb4:0xc5c8ad;
      tree.generate();
      // Normalize at export so shaders and placement use metres above the ground.
      const box=new THREE.Box3().setFromObject(tree);
      const height=(low?7.0:9.4)+(index===1?1.2:0);
      const scale=height/(box.max.y-box.min.y);
      for (const child of [...tree.children]) {
        if(species==='birch' && child===tree.leavesMesh) {tree.remove(child);continue;}
        if(!child.geometry?.getAttribute('position')?.count) {tree.remove(child);continue;}
        child.geometry.translate(0,-box.min.y,0); child.geometry.scale(scale,scale,scale);
        const old=child.material;
        const leaves=child===tree.leavesMesh;
        child.name=leaves?'needles':'bark';
        child.material=new THREE.MeshStandardMaterial({name:child.name,map:old.map,normalMap:leaves?null:old.normalMap,roughnessMap:old.roughnessMap,color:old.color,roughness:leaves?0.92:1,side:leaves?THREE.DoubleSide:THREE.FrontSide,alphaTest:leaves?0.5:0});
      }
      const glb=await exporter.parseAsync(tree,{binary:true,maxTextureSize:1024});
      output.push({name:`${species}-${age}.glb`,data:Array.from(new Uint8Array(glb)),settings:structuredClone(o),triangles:tree.children.reduce((n,m)=>n+m.geometry.index.count/3,0)});
      if(!low)mature.push(tree);
    }
  }
  // Bake actual generated trees into a transparent impostor atlas, no painted silhouettes.
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
  renderer.setSize(512,512);renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(); scene.add(new THREE.HemisphereLight(0xb9d2cc,0x3f342a,2.4));
  const light=new THREE.DirectionalLight(0xffd0a1,4.3);light.position.set(12,9,8);scene.add(light);
  const camera=new THREE.OrthographicCamera(-6,6,12,0,0.1,100);camera.position.set(0,0,25);camera.lookAt(0,6,0);
  // Centre the camera projection at tree mid-height.
  camera.position.set(0,6,25); camera.lookAt(0,6,0); camera.top=6; camera.bottom=-6;camera.updateProjectionMatrix();
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;const ctx=canvas.getContext('2d');
  mature.forEach((tree,i)=>{scene.add(tree);renderer.render(scene,camera);ctx.drawImage(renderer.domElement,(i%2)*512,Math.floor(i/2)*512);scene.remove(tree);});
  renderer.dispose();
  return {output,atlas:canvas.toDataURL('image/png')};
}
window.generateTrees=generateTrees;
