import * as THREE from 'three';

function canvas(size=1024){const c=document.createElement('canvas');c.width=c.height=size;return c;}
function texture(c:HTMLCanvasElement,color=false){const t=new THREE.CanvasTexture(c);t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;}
function random(seed:number){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

/** Authored color and independent relief channels; no reference photograph is used as a texture. */
export function createSurfaceMaterials(){
  const roofColor=canvas(),roofHeight=canvas();const rc=roofColor.getContext('2d')!,rh=roofHeight.getContext('2d')!;const rng=random(1135);
  rc.fillStyle='#383e3c';rc.fillRect(0,0,1024,1024);rh.fillStyle='#808080';rh.fillRect(0,0,1024,1024);
  for(let y=0;y<16;y++)for(let x=-1;x<16;x++){
    const px=x*64+(y%2)*32,py=y*64,v=48+Math.floor(rng()*15);
    rc.fillStyle=`rgb(${v},${v+4},${v+3})`;rc.fillRect(px+1,py+1,62,62);
    rc.strokeStyle='#202724';rc.lineWidth=3;rc.beginPath();rc.moveTo(px,py+59);rc.quadraticCurveTo(px+32,py+66,px+64,py+59);rc.stroke();
    rc.strokeStyle='#555b56';rc.lineWidth=1;rc.beginPath();rc.moveTo(px,py+55);rc.lineTo(px+64,py+55);rc.stroke();
    rh.fillStyle='#999999';rh.fillRect(px+3,py+3,58,51);rh.strokeStyle='#333333';rh.lineWidth=4;rh.beginPath();rh.moveTo(px,py+60);rh.quadraticCurveTo(px+32,py+67,px+64,py+60);rh.stroke();
  }
  const ornamentColor=canvas(),ornamentHeight=canvas();
  function drawOrnament(ctx:CanvasRenderingContext2D,height:boolean){
    ctx.fillStyle=height?'#555555':'#522b24';ctx.fillRect(0,0,1024,1024);
    const border=height?'#bbbbbb':'#dbd6b9';ctx.strokeStyle=border;ctx.lineWidth=12;ctx.strokeRect(20,20,984,984);ctx.lineWidth=5;ctx.strokeRect(43,43,938,938);ctx.strokeStyle=height?'#999999':'#b19558';ctx.lineWidth=9;ctx.strokeRect(65,65,894,894);
    for(let row=0;row<8;row++)for(let col=0;col<4;col++){
      const cx=176+col*224,cy=121+row*111;
      for(const side of [-1,1]){
        ctx.strokeStyle=height?'#bbbbbb':'#d2ccb0';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(cx,cy+48);ctx.bezierCurveTo(cx+side*95,cy+30,cx+side*90,cy-55,cx+side*32,cy-30);ctx.bezierCurveTo(cx+side*9,cy-20,cx+side*20,cy+2,cx+side*43,cy-4);ctx.stroke();
        for(let leaf=0;leaf<3;leaf++){
          const lx=cx+side*(29+leaf*19),ly=cy+27-leaf*24;ctx.save();ctx.translate(lx,ly);ctx.rotate(side*(-.7+leaf*.35));ctx.fillStyle=height?'#999999':['#bfa859','#88917a','#d4cbb2'][leaf];ctx.beginPath();ctx.ellipse(0,0,9,20,0,0,Math.PI*2);ctx.fill();ctx.restore();
        }
      }
      for(let petal=0;petal<6;petal++){ctx.save();ctx.translate(cx,cy+17);ctx.rotate(petal*Math.PI/3);ctx.fillStyle=height?'#cccccc':petal%2?'#c5ac61':'#d7d2b8';ctx.beginPath();ctx.ellipse(0,12,6,13,0,0,Math.PI*2);ctx.fill();ctx.restore();}
      ctx.fillStyle=height?'#eeeeee':'#8b4030';ctx.beginPath();ctx.arc(cx,cy+17,5,0,Math.PI*2);ctx.fill();
    }
  }
  drawOrnament(ornamentColor.getContext('2d')!,false);drawOrnament(ornamentHeight.getContext('2d')!,true);
  const wood=canvas();const wc=wood.getContext('2d')!;wc.fillStyle='#44382b';wc.fillRect(0,0,1024,1024);
  for(let i=0;i<240;i++){const x=rng()*1024;wc.strokeStyle=i%3?'#3a3027':'#514431';wc.lineWidth=1+rng()*2;wc.beginPath();wc.moveTo(x,0);wc.bezierCurveTo(x+18,330,x-17,650,x+7,1024);wc.stroke();}

  // Woven bamboo wall & ceiling mat (anyaman bilik bambu) seen in pdikm-interior.jpg
  const bambooColor=canvas(512),bambooBump=canvas(512);
  const bc=bambooColor.getContext('2d')!,bb=bambooBump.getContext('2d')!;
  bc.fillStyle='#d8ceb8';bc.fillRect(0,0,512,512);bb.fillStyle='#787878';bb.fillRect(0,0,512,512);
  const step=16;
  for(let y=0;y<512;y+=step)for(let x=0;x<512;x+=step){
    const horiz=((x/step+y/step)&1)===0;
    const tone=206+Math.floor(rng()*18);
    bc.fillStyle=horiz?`rgb(${tone},${tone-11},${tone-30})`:`rgb(${tone-10},${tone-20},${tone-38})`;
    bc.fillRect(x+1,y+1,step-2,step-2);
    bc.strokeStyle='#b5a78d';bc.lineWidth=1;bc.strokeRect(x+.5,y+.5,step-1,step-1);
    bb.fillStyle=horiz?'#b8b8b8':'#606060';bb.fillRect(x+2,y+2,step-4,step-4);
  }
  const bwMap=texture(bambooColor,true),bwBump=texture(bambooBump,false);
  bwMap.repeat.set(6,3);bwBump.repeat.set(6,3);

  // Woven rattan floor mat (tikar rotan lantai ruang dalam) seen in pdikm-interior.jpg
  const rattanColor=canvas(512),rattanBump=canvas(512);
  const rtc=rattanColor.getContext('2d')!,rtb=rattanBump.getContext('2d')!;
  rtc.fillStyle='#c8b289';rtc.fillRect(0,0,512,512);rtb.fillStyle='#808080';rtb.fillRect(0,0,512,512);
  for(let y=0;y<512;y+=6){
    const t=192+Math.floor(rng()*16);
    rtc.fillStyle=`rgb(${t},${t-20},${t-54})`;rtc.fillRect(0,y,512,5);
    rtc.fillStyle='#a89168';rtc.fillRect(0,y+5,512,1);
    rtb.fillStyle='#a8a8a8';rtb.fillRect(0,y+1,512,4);
  }
  for(const x of [0,128,256,384]){
    rtc.fillStyle='#9c8259';rtc.fillRect(x,0,4,512);
    rtb.fillStyle='#484848';rtb.fillRect(x,0,4,512);
  }
  const rtMap=texture(rattanColor,true),rtBump=texture(rattanBump,false);
  rtMap.repeat.set(10,4);rtBump.repeat.set(10,4);

  // Polished reddish-brown mahogany wood for PDIKM reception desk, reading tables, and vitrines
  const maho=canvas(512);const mc=maho.getContext('2d')!;mc.fillStyle='#6d2e1b';mc.fillRect(0,0,512,512);
  for(let i=0;i<160;i++){const x=rng()*512;mc.strokeStyle=i%2?'#582212':'#823922';mc.lineWidth=1+rng()*2;mc.beginPath();mc.moveTo(x,0);mc.bezierCurveTo(x+12,170,x-12,340,x+4,512);mc.stroke();}

  return {
    roof:new THREE.MeshStandardMaterial({map:texture(roofColor,true),bumpMap:texture(roofHeight),bumpScale:.045,roughness:.88,metalness:.07,side:THREE.DoubleSide}),
    ornament:new THREE.MeshStandardMaterial({map:texture(ornamentColor,true),bumpMap:texture(ornamentHeight),bumpScale:.018,roughness:.83}),
    wood:new THREE.MeshStandardMaterial({map:texture(wood,true),roughness:.85}),
    bambooWeave:new THREE.MeshStandardMaterial({map:bwMap,bumpMap:bwBump,bumpScale:.015,roughness:.9,side:THREE.DoubleSide}),
    rattanMat:new THREE.MeshStandardMaterial({map:rtMap,bumpMap:rtBump,bumpScale:.012,roughness:.76}),
    mahogany:new THREE.MeshStandardMaterial({map:texture(maho,true),roughness:.42,metalness:.04}),
  };
}

export function createSignMaterial(){const c=document.createElement('canvas');c.width=1024;c.height=192;const ctx=c.getContext('2d')!;ctx.fillStyle='#2a3c29';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#c3b46c';ctx.lineWidth=8;ctx.strokeRect(8,8,1008,176);ctx.fillStyle='#e1d6a1';ctx.textAlign='center';ctx.font='bold 37px sans-serif';ctx.fillText('PUSAT DOKUMENTASI DAN INFORMASI',512,65);ctx.font='bold 45px sans-serif';ctx.fillText('KEBUDAYAAN MINANGKABAU',512,121);ctx.font='22px sans-serif';ctx.fillText('PADANG PANJANG',512,158);return new THREE.MeshStandardMaterial({map:texture(c,true),roughness:.84});}

export function createPlaqueMaterial(){
  const c=document.createElement('canvas');c.width=512;c.height=640;const ctx=c.getContext('2d')!;
  ctx.fillStyle='#232621';ctx.fillRect(0,0,512,640);
  ctx.strokeStyle='#c9ad5a';ctx.lineWidth=14;ctx.strokeRect(18,18,476,604);
  ctx.strokeStyle='#8e7432';ctx.lineWidth=4;ctx.strokeRect(34,34,444,572);
  ctx.fillStyle='#d8be72';ctx.textAlign='center';
  ctx.font='bold 26px serif';ctx.fillText('PRASASTI PERESMIAN',256,96);
  ctx.font='bold 22px sans-serif';ctx.fillText('PUSAT DOKUMENTASI & INFORMASI',256,148);
  ctx.fillText('KEBUDAYAAN MINANGKABAU',256,180);
  ctx.fillStyle='#b8a468';ctx.font='18px serif';
  const lines=['Diresmikan di Padang Panjang','sebagai pusat pelestarian naskah,','arsitektur, dan sejarah adat','Minangkabau Sumatera Barat.'];
  lines.forEach((l,i)=>ctx.fillText(l,256,255+i*38));
  ctx.strokeStyle='#c9ad5a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(136,460);ctx.lineTo(376,460);ctx.stroke();
  ctx.font='italic 20px serif';ctx.fillText('Padang Panjang, Sumatera Barat',256,515);
  return new THREE.MeshStandardMaterial({map:texture(c,true),roughness:.45,metalness:.25});
}

export function createArchivalPhotoMaterial(variant=0){
  const c=document.createElement('canvas');c.width=256;c.height=320;const ctx=c.getContext('2d')!;
  ctx.fillStyle='#f1ede2';ctx.fillRect(0,0,256,320);
  ctx.fillStyle='#2a2926';ctx.fillRect(28,32,200,220);
  ctx.fillStyle='#d5d0c3';ctx.fillRect(34,38,188,208);
  ctx.fillStyle='#3c3a35';
  if(variant%2===0){
    // Silhouette of historical Rumah Gadang photo
    ctx.beginPath();ctx.moveTo(48,180);ctx.quadraticCurveTo(85,150,102,95);ctx.quadraticCurveTo(128,155,154,95);ctx.quadraticCurveTo(172,150,208,180);ctx.closePath();ctx.fill();
    ctx.fillRect(62,178,132,48);
  }else{
    // Historical portrait / manuscript archive motif
    ctx.beginPath();ctx.arc(128,118,32,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(128,198,52,38,0,Math.PI,0,true);ctx.fill();
  }
  ctx.fillStyle='#6b675e';ctx.fillRect(68,268,120,8);ctx.fillRect(88,284,80,6);
  return new THREE.MeshStandardMaterial({map:texture(c,true),roughness:.65});
}
