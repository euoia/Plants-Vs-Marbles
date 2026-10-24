// 3D renderer for Ants vs Marbles (three.js). Game logic stays in 2D "maze pixels" (x across, y down the lane);
// this file maps them into a 3D scene and draws it on the #gl canvas underneath the HUD canvas.
// World mapping: 50 maze px = 1 unit, x centred on the board, the marble chute is at z=0 (near the camera)
// and the exit is far away, so ants march toward the viewer.
const K=1/50,CX=GX+LANES*LW/2;
const MARBLE_CLEARANCE=.035;
const wx=x=>(x-CX)*K,wz=y=>-(y-GY)*K;
const VW=900,VH=700;

const gl=document.getElementById('gl');
const R=new THREE.WebGLRenderer({canvas:gl,antialias:true});
R.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
R.setSize(VW,VH,false);
R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=.95;
const scene=new THREE.Scene();
const cam=new THREE.PerspectiveCamera(40,VW/VH,.5,120);
const cameraTarget=new THREE.Vector3(0,0,-5.1);
const cameraOffset=new THREE.Vector3(0,11.5,13.7);
const cameraKeys=new Set();
let cameraDrag=null;
let cameraDistance=1;
let cameraYaw=0;
const cameraRadius=Math.hypot(cameraOffset.y,cameraOffset.z);
let cameraPitch=Math.atan2(cameraOffset.y,cameraOffset.z);
cam.position.copy(cameraTarget).add(cameraOffset);
cam.lookAt(cameraTarget);
cam.updateMatrixWorld();

function updateCamera(){
  const panSpeed=.16/cameraDistance;
  if(cameraKeys.has('ArrowLeft')||cameraKeys.has('a'))cameraTarget.x-=panSpeed;
  if(cameraKeys.has('ArrowRight')||cameraKeys.has('d'))cameraTarget.x+=panSpeed;
  if(cameraKeys.has('ArrowUp')||cameraKeys.has('w'))cameraTarget.z-=panSpeed;
  if(cameraKeys.has('ArrowDown')||cameraKeys.has('s'))cameraTarget.z+=panSpeed;
  cameraTarget.x=Math.max(-7,Math.min(7,cameraTarget.x));
  cameraTarget.z=Math.max(-18,Math.min(5,cameraTarget.z));
  const radius=cameraRadius*cameraDistance;
  const horizontal=radius*Math.cos(cameraPitch);
  cameraOffset.set(Math.sin(cameraYaw)*horizontal,Math.sin(cameraPitch)*radius,Math.cos(cameraYaw)*horizontal);
  cam.position.copy(cameraTarget).addScaledVector(cameraOffset,cameraDistance);
  cam.lookAt(cameraTarget);
}
function zoomCamera(amount){
  cameraDistance=Math.max(.65,Math.min(1.55,cameraDistance+amount));
}
addEventListener('keydown',e=>{
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','d','w','s'].includes(e.key)){
    cameraKeys.add(e.key);e.preventDefault();
  }
});
addEventListener('keyup',e=>cameraKeys.delete(e.key));
cv.addEventListener('wheel',e=>{zoomCamera(e.deltaY>0?.08:-.08);e.preventDefault();},{passive:false});
cv.addEventListener('mousedown',e=>{
  if(e.button===1){
    cameraDrag={x:e.clientX,y:e.clientY,rotate:e.shiftKey};
    e.preventDefault();
  }
});
cv.addEventListener('mousemove',e=>{
  if(!cameraDrag)return;
  const r=cv.getBoundingClientRect(),scale=VW/r.width;
  const dx=(e.clientX-cameraDrag.x)*scale,dy=(e.clientY-cameraDrag.y)*scale;
  if(cameraDrag.rotate){
    cameraYaw-=dx*.008;
    cameraPitch=Math.max(.3,Math.min(1.2,cameraPitch+dy*.006));
  }else{
    cameraTarget.x-=dx*.012/cameraDistance;
    cameraTarget.z+=dy*.012/cameraDistance;
    cameraTarget.x=Math.max(-7,Math.min(7,cameraTarget.x));
    cameraTarget.z=Math.max(-18,Math.min(5,cameraTarget.z));
  }
  cameraDrag.x=e.clientX;cameraDrag.y=e.clientY;
});
addEventListener('mouseup',e=>{if(e.button===1)cameraDrag=null;});

// ---------- projection helpers (used by the HUD and by mouse picking) ----------
const _v=new THREE.Vector3();
function toScreen(x,y,h){_v.set(wx(x),h||0,wz(y)).project(cam);return {x:(_v.x+1)/2*VW,y:(1-_v.y)/2*VH};}
const _ray=new THREE.Raycaster(),_nd=new THREE.Vector2(),_plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),_hit=new THREE.Vector3();
function toWorld(m){
  _nd.set(m.x/VW*2-1,1-m.y/VH*2);_ray.setFromCamera(_nd,cam);
  if(!_ray.ray.intersectPlane(_plane,_hit))return null;
  return {x:CX+_hit.x/K,y:GY-_hit.z/K};
}
function dropHeight(d){return .4+Math.min(1.5,Math.max(0,d.ty-d.y)*.003);}

// ---------- textures ----------
const srgb=t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;};
function woodTex(base,grain,vertical,repX,repY){
  const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
  x.fillStyle=base;x.fillRect(0,0,512,512);
  for(let i=0;i<150;i++){
    x.strokeStyle=grain;x.globalAlpha=.04+Math.random()*.12;x.lineWidth=1+Math.random()*2.5;
    const o=Math.random()*512;x.beginPath();
    for(let s=0;s<=512;s+=32){const w=Math.sin(s*.02+i)*3+(Math.random()-.5)*1.5;vertical?x.lineTo(o+w,s):x.lineTo(s,o+w);}
    x.stroke();
  }
  x.globalAlpha=.06;x.fillStyle='#000';
  for(let i=0;i<4;i++){const o=i*128;vertical?x.fillRect(o,0,2,512):x.fillRect(0,o,512,2);}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repX,repY);return srgb(t);
}
const swirlCache={};
function swirlTex(col){
  if(swirlCache[col])return swirlCache[col];
  const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');
  x.fillStyle=col;x.fillRect(0,0,256,128);
  for(let i=0;i<16;i++){
    x.strokeStyle=Math.random()<.6?'#fff':'#000';x.globalAlpha=.12+Math.random()*.2;x.lineWidth=3+Math.random()*9;
    const y=Math.random()*128;x.beginPath();x.moveTo(0,y);
    x.bezierCurveTo(70,y+(Math.random()-.5)*60,150,y+(Math.random()-.5)*60,256,y);x.stroke();
  }
  const t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;return swirlCache[col]=srgb(t);
}
function labelTex(text,color,w,h,font){
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
  x.font=font;x.textAlign='center';x.textBaseline='middle';x.fillStyle=color;x.fillText(text,w/2,h/2);
  return srgb(new THREE.CanvasTexture(c));
}
function arrowTex(){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  x.fillStyle='#ffe082';x.lineWidth=14;x.strokeStyle='#ffe082';x.lineCap='round';x.lineJoin='round';
  for(let i=0;i<2;i++){x.beginPath();x.moveTo(28,50+i*44);x.lineTo(64,18+i*44);x.lineTo(100,50+i*44);x.stroke();}
  return srgb(new THREE.CanvasTexture(c));
}

// ---------- shared geometry and material helpers ----------
const SPH=new THREE.SphereGeometry(1,40,28),SPHL=new THREE.SphereGeometry(1,14,10);
const BOX=new THREE.BoxGeometry(1,1,1);
const CYL=new THREE.CylinderGeometry(1,1,1,28);
const SEG=(()=>{const g=new THREE.CylinderGeometry(1,1,1,6);g.translate(0,.5,0);return g;})();
const HALF=new THREE.SphereGeometry(1,20,10,0,Math.PI*2,0,Math.PI/2);
const CONE=new THREE.ConeGeometry(1,1,16);
const TET=new THREE.TetrahedronGeometry(1);
const std=(color,rough,metal,extra)=>new THREE.MeshStandardMaterial({color,roughness:rough??.6,metalness:metal??0,...extra});
function mesh(geo,mat,sx,sy,sz,x,y,z,shadow){
  const m=new THREE.Mesh(geo,mat);m.scale.set(sx,sy,sz);m.position.set(x,y,z);
  if(shadow!==false)m.castShadow=true;return m;
}
const _up=new THREE.Vector3(0,1,0),_d=new THREE.Vector3();
function seg(a,b,rad,mat){
  const m=new THREE.Mesh(SEG,mat);_d.subVectors(b,a);const L=_d.length();
  m.position.copy(a);m.scale.set(rad,L,rad);m.quaternion.setFromUnitVectors(_up,_d.normalize());m.castShadow=true;return m;
}
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const sharedGeometries=new Set([SPH,SPHL,BOX,CYL,SEG,HALF,CONE,TET]);
const sharedMaterials=new Set();
function disposeObj(o){o.traverse(c=>{
  if(c.geometry&&!sharedGeometries.has(c.geometry))c.geometry.dispose();
  if(c.material)for(const m of Array.isArray(c.material)?c.material:[c.material])if(!sharedMaterials.has(m))m.dispose();
});}

// ---------- environment, lights, table ----------
(function setupWorld(){
  const bg=0x2b1c10;
  scene.background=new THREE.Color(bg);scene.fog=new THREE.Fog(bg,26,60);

  // reflection environment: a warm sky gradient with a few bright softboxes, baked with PMREM
  const es=new THREE.Scene(),gc=document.createElement('canvas');gc.width=8;gc.height=256;
  const gx=gc.getContext('2d'),gr=gx.createLinearGradient(0,0,0,256);
  gr.addColorStop(0,'#9cc4ff');gr.addColorStop(.5,'#fff0d8');gr.addColorStop(1,'#6b4a2a');gx.fillStyle=gr;gx.fillRect(0,0,8,256);
  const gt=new THREE.CanvasTexture(gc);gt.colorSpace=THREE.SRGBColorSpace;
  es.add(new THREE.Mesh(new THREE.SphereGeometry(50,32,16),new THREE.MeshBasicMaterial({map:gt,side:THREE.BackSide})));
  const box=(w,h,x,y,z,k)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(1,.95,.85).multiplyScalar(k),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);es.add(m);};
  box(24,10,-20,26,12,9);box(14,14,22,14,-10,5);box(30,8,0,30,-20,4);
  const pm=new THREE.PMREMGenerator(R);scene.environment=pm.fromScene(es,.02).texture;pm.dispose();

  scene.add(new THREE.HemisphereLight(0xfff1dc,0x6b4a2a,.22));
  const sun=new THREE.DirectionalLight(0xffe2b8,3.0);
  sun.position.set(-7,15,5);sun.target.position.set(0,0,-5.4);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  const sc=sun.shadow.camera;sc.left=-9;sc.right=9;sc.top=10;sc.bottom=-10;sc.near=1;sc.far=45;
  sun.shadow.bias=-.0004;sun.shadow.normalBias=.03;
  scene.add(sun,sun.target);

  // kitchen table with a wooden tray holding the five lanes
  const table=new THREE.Mesh(new THREE.PlaneGeometry(90,90),std(0xffffff,.8,0,{map:woodTex('#7a5230','#3b2410',false,9,9)}));
  table.rotation.x=-Math.PI/2;table.position.y=-.32;table.receiveShadow=true;scene.add(table);

  const Z0=wz(GY-10),Z1=wz(BOTTOM+120),Len=Z0-Z1,Zc=(Z0+Z1)/2;
  const plank=[std(0xffffff,.7,0,{map:woodTex('#b98b55','#6a4620',true,1,1)}),std(0xffffff,.7,0,{map:woodTex('#a97c48','#5d3d1b',true,1,1)})];
  for(let l=0;l<LANES;l++){
    const m=mesh(BOX,plank[l%2],LW*K-.1,.3,Len,wx(laneX(l)),-.15,Zc,false);m.receiveShadow=true;scene.add(m);
  }
  const rail=std(0x4a2d12,.55,.05),railTop=std(0x5b3a1a,.5);
  for(let l=0;l<=LANES;l++){
    const edge=l===0||l===LANES;
    const m=mesh(BOX,rail,edge?.34:.12,edge?.55:.1,Len,wx(GX+l*LW)+(l===0?-.1:l===LANES?.1:0),edge?.05:-.02,Zc);m.receiveShadow=true;scene.add(m);
  }
  const base=mesh(BOX,rail,LANES*LW*K+1,.25,Len+.4,0,-.42,Zc,false);scene.add(base);

  // marble chute: glossy red lip with a sign on the floor
  const chute=mesh(BOX,std(0xcc2a2a,.25,.1),LANES*LW*K+.7,.35,.28,0,.05,Z0+.2);chute.receiveShadow=true;scene.add(chute);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(7,.7),new THREE.MeshBasicMaterial({map:labelTex('▼  MARBLES DROP IN HERE  ▼','rgba(255,255,255,.6)',1024,100,'bold 56px sans-serif'),transparent:true,depthWrite:false}));
  sign.rotation.x=-Math.PI/2;sign.position.set(0,.011,wz(GY+14));scene.add(sign);

  // ant tunnel at the far end: pillars, a lintel and a dark sign
  const ZE=wz(BOTTOM+8),stone=std(0x3a3632,.9,0,{map:woodTex('#4a453f','#2a2724',false,3,1)});
  for(let l=0;l<=LANES;l++)scene.add(mesh(BOX,stone,.34,1.9,.7,wx(GX+l*LW),.8,ZE));
  scene.add(mesh(BOX,stone,LANES*LW*K+.34,.8,.9,0,1.35,ZE));
  const holeMat=new THREE.MeshBasicMaterial({color:0x080503});
  const holeRim=std(0x4a2d18,.8);
  for(let l=0;l<LANES;l++){
    const hx=wx(laneX(l)),hz=wz(BOTTOM+30);
    scene.add(mesh(CYL,holeMat,.42,.018,.42,hx,.012,hz));
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.43,.06,10,24),holeRim);
    rim.position.set(hx,.035,hz);rim.rotation.x=Math.PI/2;rim.castShadow=true;scene.add(rim);
  }
  const exitSign=new THREE.Mesh(new THREE.PlaneGeometry(7,.7),new THREE.MeshBasicMaterial({map:labelTex('EXIT  ▲  ants enter here  ▲','#ffd54f',1024,100,'bold 52px sans-serif'),transparent:true}));
  exitSign.position.set(0,1.36,ZE+.46);scene.add(exitSign);
  const dark=mesh(BOX,new THREE.MeshBasicMaterial({color:0x050302}),LANES*LW*K+.6,2.2,.2,0,.9,wz(BOTTOM+125));scene.add(dark);

  // scattered crumbs on the table
  const crumb=std(0xd9b36a,.9);
  for(let i=0;i<70;i++){
    const a=Math.random()*6.28,r=9+Math.random()*30,s=.08+Math.random()*.22;
    const m=mesh(SPHL,crumb,s*1.2,s*.7,s,Math.cos(a)*r*.8,-.3+s*.5,-5-Math.sin(a)*r*.7);m.rotation.y=Math.random()*6;scene.add(m);
  }
})();

// ---------- marble models ----------
function marbleMat(type,col){
  if(type==='glass')return new THREE.MeshPhysicalMaterial({color:0xd8f2ff,roughness:.02,metalness:0,transparent:true,opacity:.5,clearcoat:1,envMapIntensity:2.2,depthWrite:false});
  if(type==='steel')return std(0xc4c8ce,.2,1,{envMapIntensity:1.5});
  if(type==='gold')return std(0xf5c518,.22,.95,{envMapIntensity:1.4});
  if(type==='bomb')return new THREE.MeshPhysicalMaterial({color:0x1a1a1e,roughness:.35,metalness:.3,clearcoat:1,clearcoatRoughness:.1});
  return new THREE.MeshPhysicalMaterial({color:0xffffff,map:swirlTex(col),roughness:.12,metalness:.05,clearcoat:1,clearcoatRoughness:.04,envMapIntensity:.8});
}
const eyeWhite=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.3}),eyeBlack=new THREE.MeshStandardMaterial({color:0x080808,roughness:.2});
sharedMaterials.add(eyeWhite);sharedMaterials.add(eyeBlack);
function addEyes(face,r,x){
  for(const s of[-1,1]){
    const d=V(s*.34,.3,.89).normalize();
    face.add(mesh(SPHL,eyeWhite,r*.22,r*.26,r*.14,x+d.x*r,r+d.y*r,d.z*r,false));
    face.add(mesh(SPHL,eyeBlack,r*.11,r*.13,r*.08,x+d.x*r*1.03,r+d.y*r*1.03,d.z*r*1.06,false));
  }
}
function makeMarble(type){
  const T=TYPES[type],g=new THREE.Group(),r=({steel:26,twin:17}[type]||22)*K;
  g.userData.bodies=[];g.userData.r=r;
  const xs=type==='twin'?[-10*K,10*K]:[0];
  for(const x of xs){
    const body=mesh(SPH,marbleMat(type,T.color),r,r,r,x,r,0);body.userData.r=r;g.add(body);g.userData.bodies.push(body);
    if(type==='glass')g.add(mesh(SPHL,std(0x5fb8ff,.3,0,{map:swirlTex('#5fb8ff'),transparent:true,opacity:.8}),r*.55,r*.55,r*.55,x,r,0,false));
    if(type==='steel'){const band=new THREE.Mesh(new THREE.TorusGeometry(r*1.005,r*.07,10,40),std(0xeeeeee,.15,1));band.rotation.x=Math.PI/2;band.position.set(x,r,0);band.castShadow=true;g.add(band);}
    if(type!=='bomb'){const face=new THREE.Group();addEyes(face,r,x);g.add(face);}
    if(type==='red'||type==='blue'||type==='twin'){
      const barrel=mesh(CYL,std(type==='blue'?0x4d6a85:0x2a2a2a,.35,.8),r*.3,r*1.1,r*.3,x,r*1.02,-r*.9);
      barrel.rotation.x=Math.PI/2;g.add(barrel);
      g.add(mesh(CYL,std(type==='blue'?0x9fd8ff:0x111111,.3,.4,type==='blue'?{emissive:0x4aa8ff,emissiveIntensity:.8}:{}),r*.2,r*.12,r*.2,x,r*1.02,-r*1.46,false)).rotation.x=Math.PI/2;
    }
  }
  if(type==='bomb'){
    const fuse=seg(V(r*.4,r*1.85,r*-.1),V(r*.85,r*2.35,r*-.2),.03,std(0x7b5a2a,.8));g.add(fuse);
    const spark=mesh(SPHL,new THREE.MeshBasicMaterial({color:0xffaa22}),.07,.07,.07,r*.85,r*2.38,-r*.2,false);g.add(spark);g.userData.spark=spark;
  }
  return g;
}
function updatePlant(e,p){
  const ud=e.userData,r=ud.r;
  const age=(performance.now()-ud.t0)/1000,drop=Math.max(0,1-age/.3);
  const bob=p.rolling?0:Math.sin((p.t||0)*3)*.02;
  e.position.set(wx(laneX(p.l)+(p.xo||0)),r+MARBLE_CLEARANCE+drop*drop*3+bob,wz(p.y));
  const dy=p.y-(ud.py===undefined?p.y:ud.py);ud.py=p.y;
  for(const b of ud.bodies)b.rotation.x-=dy*K/b.userData.r;
  if(p.type==='bomb'){
    const f=!!p.engaged&&Math.floor(p.fuse*8)%2===1,m=ud.bodies[0].material;
    m.color.set(f?0xff3322:0x1a1a1e);m.emissive.set(f?0xff2200:0x000000);
    e.scale.setScalar(f?1.14:1);ud.spark.scale.setScalar(.05+Math.random()*.05);
  }else if(p.type!=='glass'){
    const poisoned=p.poison>0;
    for(const b of ud.bodies)b.material.emissive.set(poisoned?0x1a6a00:0x000000);
  }
}

// ---------- track pieces ----------
const wedgeGeo={};
function wedge(dir){
  if(wedgeGeo[dir])return wedgeGeo[dir];
  const s=new THREE.Shape();s.moveTo(-.7,0);s.lineTo(.7,0);s.lineTo(-dir*.7,.5);s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:.9,bevelEnabled:true,bevelSize:.03,bevelThickness:.03,bevelSegments:2});
  g.translate(0,0,-.45);sharedGeometries.add(g);return wedgeGeo[dir]=g;
}
class Helix extends THREE.Curve{getPoint(t,o=new THREE.Vector3()){const a=t*Math.PI*2*4.5;return o.set(Math.cos(a)*.34,t,Math.sin(a)*.34);}}
const HELIX=new THREE.TubeGeometry(new Helix(),120,.05,8,false);
sharedGeometries.add(HELIX);
let _arrow;
function makePiece(kind){
  const g=new THREE.Group(),ud=g.userData;
  if(kind==='spring'){
    const metal=std(0xffb300,.25,.9),plate=std(0x6d4c41,.6,.1);
    g.add(mesh(CYL,plate,.5,.06,.5,0,.03,0));
    const coil=new THREE.Mesh(HELIX,metal);coil.castShadow=true;coil.position.y=.06;coil.scale.y=.6;g.add(coil);
    const top=mesh(CYL,std(0xffca28,.3,.8),.5,.06,.5,0,.7,0);g.add(top);
    ud.coil=coil;ud.top=top;ud.bars=[];
    for(let i=0;i<4;i++){const b=mesh(BOX,new THREE.MeshBasicMaterial({color:0xff5722}),.2,.04,.1,-.45+i*.3,.02,.62,false);g.add(b);ud.bars.push(b);}
  }else if(kind==='ring'){
    const m=std(0xffc107,.2,.95,{emissive:0xff9800,emissiveIntensity:0});
    const t=new THREE.Mesh(new THREE.TorusGeometry(.62,.08,16,48),m);t.position.y=.65;t.castShadow=true;g.add(t);
    for(const s of[-1,1])g.add(mesh(CYL,std(0x5b3a1a,.6),.1,.2,.1,s*.62,.1,0));
    ud.mat=m;ud.ring=t;
  }else if(kind==='boost'){
    _arrow=_arrow||arrowTex();
    const m=std(0xd84315,.4,.3,{emissive:0xff5722,emissiveIntensity:0});
    g.add(mesh(BOX,m,1.2,.1,.95,0,.05,0));
    const dec=new THREE.Mesh(new THREE.PlaneGeometry(.9,.9),new THREE.MeshBasicMaterial({map:_arrow,transparent:true}));
    dec.rotation.x=-Math.PI/2;dec.position.y=.106;g.add(dec);ud.mat=m;
  }else{
    const dir=TYPES[kind].dir,m=new THREE.Mesh(wedge(dir),std(0x8d6e63,.55,.05));m.castShadow=m.receiveShadow=true;g.add(m);
    const th=Math.atan(.5/1.4),phi=Math.atan2(-dir*Math.cos(th),-Math.sin(th));
    const a=mesh(CONE,new THREE.MeshBasicMaterial({color:0xffe082}),.1,.3,.1,0,.3,0,false);a.rotation.z=phi;g.add(a);
  }
  return g;
}
function updatePiece(e,pc){
  const ud=e.userData;e.position.set(wx(laneX(pc.l)),0,wz(pc.y));
  const pulse=pc.pulse>0;
  if(pc.kind==='spring'){
    const h=(22-(pulse?pc.pulse*30*.5:0))/22*.6;ud.coil.scale.y=h;ud.top.position.y=.06+h+.03;
    const pw=pc.power||4;ud.bars.forEach((b,i)=>b.material.color.set(i<pw?0xff5722:0x222222));
  }else if(pc.kind==='ring'){ud.mat.emissiveIntensity=pulse?1.6:0;e.scale.y=pulse?1.15:1;}
  else if(pc.kind==='boost')ud.mat.emissiveIntensity=pulse?1.3:0;
}

// ---------- ant models ----------
const darkMat=c=>std(new THREE.Color(c).multiplyScalar(.6),.6);
function makeAnt(type){
  const d=ANTS[type],g=new THREE.Group(),inner=new THREE.Group(),ud=g.userData;g.add(inner);
  const body=std(d.color,d.shiny?.1:.45,d.shiny?.55:.05,d.shiny?{envMapIntensity:1.6}:{}),legMat=darkMat(d.color),H=.3;
  const part=(sx,sy,sz,x,y,z,mat)=>{const m=mesh(SPHL,mat||body,sx,sy,sz,x,y,z);inner.add(m);return m;};
  part(.2,.19,.3,0,H+.02,-.34);part(.15,.13,.2,0,H,0);part(.17,.15,.18,0,H+.01,.28);
  const eye=new THREE.MeshStandardMaterial({color:0xff2222,emissive:0xff0000,emissiveIntensity:.7});
  for(const s of[-1,1]){
    inner.add(mesh(SPHL,eye,.04,.04,.04,s*.1,H+.07,.4,false));
    inner.add(seg(V(s*.08,H-.01,.4),V(s*.04,H-.02,.58),.02,legMat));
    inner.add(seg(V(s*.06,H+.1,.38),V(s*.18,H+.3,.6),.012,legMat));
    inner.add(seg(V(s*.18,H+.3,.6),V(s*.26,H+.22,.72),.012,legMat));
  }
  ud.legs=[];
  for(let i=0;i<3;i++)for(const s of[-1,1]){
    const lg=new THREE.Group();lg.position.set(s*.1,H-.04,.1-i*.12);
    lg.add(seg(V(0,0,0),V(s*.28,.1,0),.022,legMat));lg.add(seg(V(s*.28,.1,0),V(s*.4,-.26,0),.018,legMat));
    inner.add(lg);ud.legs.push({g:lg,i,s});
  }
  if(type==='jumper')part(.205,.195,.06,0,H+.02,-.34,std(0xa5d6a7,.5));
  if(type==='digger')for(const s of[-1,1])inner.add(mesh(BOX,std(0xffca28,.4,.6),.06,.05,.14,s*.1,H-.05,.52));
  if(type==='spitter')part(.08,.08,.08,0,H+.2,-.5,new THREE.MeshStandardMaterial({color:0x76ff03,emissive:0x76ff03,emissiveIntensity:.8}));
  if(type==='boss'||type==='queen'){
    const gold=std(0xffd54f,.25,.9);
    for(let i=0;i<5;i++){const a=i/5*Math.PI*2;inner.add(mesh(CONE,gold,.035,.12,.035,Math.cos(a)*.09,H+.24,.28+Math.sin(a)*.09));}
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.095,.02,8,20),gold);ring.rotation.x=Math.PI/2;ring.position.set(0,H+.17,.28);inner.add(ring);
  }
  if(d.armor){
    const sh=mesh(HALF,std(0xcfd8dc,.25,.95,{side:THREE.DoubleSide}),.3,.3,.2,0,H+.02,.34);sh.rotation.x=Math.PI/2;inner.add(sh);ud.shield=sh;
  }
  const ice=mesh(SPHL,new THREE.MeshPhysicalMaterial({color:0x9fdcff,transparent:true,opacity:.35,roughness:.1,clearcoat:1}),.5,.4,.85,0,H,0,false);
  inner.add(ice);ice.visible=false;ud.ice=ice;
  ud.inner=inner;ud.body=body;
  // dirt mound shown while a digger is underground
  const mound=new THREE.Group();
  mound.add(mesh(HALF,std(0x5d4037,1),.5,.28,.5,0,0,0));
  for(let i=1;i<4;i++)mound.add(mesh(SPHL,std(0x6d4c41,1),.07,.07,.07,(i%2?.1:-.1),.05,-i*.28,false));
  mound.visible=false;g.add(mound);ud.mound=mound;
  g.scale.setScalar(d.size||1);
  return g;
}
function updateAnt(e,a){
  const ud=e.userData,d=ANTS[a.type];
  const emerge=Math.min(1,1-(a.emerge||0)/.8),emergeEase=emerge*emerge*(3-2*emerge);
  const displayY=a.emerge>0?BOTTOM+30+(a.y-(BOTTOM+30))*emergeEase:a.y;
  const rise=Math.sin(emergeEase*Math.PI)*.16;
  if(a.wide){
    e.scale.set(7,7,4.6);
    e.position.set(wx(a.x),rise,wz(displayY+5)-.3*4.6);
  }else e.position.set(wx(a.x),(a.lift||0)*K+rise,wz(displayY));
  const dig=!!(a.jump&&a.jump.dig);
  ud.mound.visible=dig;
  ud.inner.visible=!dig||a.jump.t<.15||a.jump.t>.85;
  ud.inner.position.y=Math.abs(Math.sin(a.ph))*.015;
  for(const l of ud.legs)l.g.rotation.y=Math.sin(a.ph+l.i*2+(l.s>0?0:Math.PI))*.4;
  ud.body.emissive.setScalar(a.flash>0?.85:0);
  ud.ice.visible=a.slow>0;
  if(ud.shield)ud.shield.visible=a.armor>0;
}

// ---------- anteater ----------
function makeEater(){
  const g=new THREE.Group(),fur=std(0x6d5a48,.9),dk=std(0x3e3128,.9),lt=std(0x8a735d,.85);
  const add=(geo,mat,sx,sy,sz,x,y,z)=>{const m=mesh(geo,mat,sx,sy,sz,x,y,z);g.add(m);return m;};
  add(SPHL,fur,.5,.46,.85,0,.75,-.15);add(SPHL,dk,.4,.4,.3,0,.8,.28).scale.set(.52,.47,.2);
  add(SPHL,lt,.3,.28,.34,0,.82,.82);
  const snout=add(CONE,lt,.13,1,.13,0,.7,1.4);snout.rotation.x=Math.PI/2;snout.scale.set(.14,1.1,.14);
  g.add(mesh(SPHL,eyeWhite,.07,.07,.05,.13,.95,.98,false),mesh(SPHL,eyeWhite,.07,.07,.05,-.13,.95,.98,false));
  g.add(mesh(SPHL,eyeBlack,.035,.035,.03,.14,.95,1.02,false),mesh(SPHL,eyeBlack,.035,.035,.03,-.14,.95,1.02,false));
  for(const s of[-1,1])add(SPHL,dk,.09,.14,.05,s*.2,1.08,.8);
  const tongue=seg(V(0,.62,1.9),V(0,.55,2.5),.025,std(0xe57373,.5));g.add(tongue);g.userData.tongue=tongue;
  const tail=add(SPHL,dk,.24,.34,.95,0,.85,-1.25);tail.rotation.x=-.35;
  g.userData.legs=[];
  for(const [x,z] of[[-.3,.35],[.3,.35],[-.3,-.5],[.3,-.5]]){
    const lg=new THREE.Group();lg.position.set(x,.55,z);lg.add(seg(V(0,0,0),V(0,-.55,0),.1,dk));g.add(lg);g.userData.legs.push(lg);
  }
  return g;
}
const eaters=[];

// ---------- projectiles, effects, drops, shards ----------
const basic=(c,o)=>new THREE.MeshBasicMaterial({color:c,transparent:true,toneMapped:false,...o});
const makeShot=s=>{const m=mesh(SPHL,basic(s.ice?0x88ccff:0xff5544,{transparent:false}),.13,.13,.26,0,0,0,false);return m;};
const makeFx=f=>mesh(SPHL,basic(f.kind==='boom'?0xffa020:f.kind==='spit'?0x76ff03:0xbbbbbb),1,1,1,0,0,0,false);
function updateFx(e,f){
  const k=f.t/f.max;
  if(f.kind==='boom'){const s=(40+k*120)*K;e.scale.setScalar(s);e.position.set(wx(f.x),.5,wz(f.y));e.material.color.setRGB(1,(180-k*150)/255,0);e.material.opacity=.9*(1-k);}
  else if(f.kind==='spit'){e.scale.setScalar(.14);e.position.set(wx(f.x+(f.tx-f.x)*k),.5+Math.sin(k*Math.PI)*.4,wz(f.y+(f.ty-f.y)*k));}
  else if(f.kind==='dmg')e.visible=false;
  else{e.scale.setScalar((10+k*20)*K*1.4);e.position.set(wx(f.x),.35+k*.4,wz(f.y));e.material.opacity=.6*(1-k);}
}
const coinMat=std(0xffd54f,.25,.9,{emissive:0xffa000,emissiveIntensity:.5});
sharedMaterials.add(coinMat);
const makeDrop=()=>{const c=mesh(CYL,coinMat,.3,.07,.3,0,0,0);c.rotation.x=Math.PI/2-.5;const g=new THREE.Group();g.add(c);return g;};
const shardMat=new THREE.MeshPhysicalMaterial({color:0xcfefff,roughness:.05,transparent:true,opacity:.8,clearcoat:1,envMapIntensity:2});
const makeShard=s=>{const m=mesh(TET,shardMat.clone(),s.sz*K*1.2,s.sz*K*.5,s.sz*K*1.2,0,0,0,false);m.rotation.set(Math.random()*.6,s.rot,Math.random()*.6);return m;};

// ---------- hover highlight + ghost preview ----------
const lanePick=new THREE.Mesh(new THREE.PlaneGeometry(LW*K-.1,LEN*K+.4),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.18,depthWrite:false}));
lanePick.rotation.x=-Math.PI/2;lanePick.position.y=.02;lanePick.visible=false;scene.add(lanePick);
const ghost={key:null,obj:null};
function setGhost(key,isPiece){
  if(ghost.key===key)return;
  if(ghost.obj){scene.remove(ghost.obj);disposeObj(ghost.obj);}
  ghost.key=key;ghost.obj=null;if(!key)return;
  const o=isPiece?makePiece(key):makeMarble(key);o.userData.t0=-1e9;
  o.traverse(c=>{c.castShadow=false;if(c.material){c.material=c.material.clone();c.material.transparent=true;c.material.opacity*=.6;c.material.depthWrite=false;}});
  ghost.obj=o;scene.add(o);
}

// ---------- per-frame sync ----------
const maps={plants:new Map(),pieces:new Map(),ants:new Map(),shots:new Map(),fx:new Map(),drops:new Map(),shards:new Map()};
function sync(map,list,make,update){
  const seen=new Set();
  for(const o of list){
    let e=map.get(o);
    if(!e){e=make(o);e.userData.t0=performance.now();map.set(o,e);scene.add(e);}
    update(e,o);seen.add(o);
  }
  for(const [o,e] of map)if(!seen.has(o)){scene.remove(e);disposeObj(e);map.delete(o);}
}
function render3d(){
  updateCamera();
  if(S.state!=='play'&&S.state!=='win'&&S.state!=='lose')return;
  const T=performance.now()/1000;
  sync(maps.pieces,S.pieces,o=>makePiece(o.kind),updatePiece);
  sync(maps.plants,S.plants,o=>makeMarble(o.type),updatePlant);
  sync(maps.ants,S.ants,o=>makeAnt(o.type),updateAnt);
  sync(maps.shots,S.shots,makeShot,(e,s)=>e.position.set(wx(s.x),.6,wz(s.y)));
  sync(maps.fx,S.fx,makeFx,updateFx);
  sync(maps.drops,S.drops,makeDrop,(e,d)=>{e.position.set(wx(d.x),dropHeight(d),wz(d.ty));e.rotation.y=T*2.5+d.x;});
  sync(maps.shards,S.shards,makeShard,(e,s)=>{e.position.set(wx(s.x),.03,wz(s.y));e.material.opacity=.8*Math.min(1,s.life/5);});

  // ant eater: one anteater per lane sweeping up the maze
  while(eaters.length<LANES){const e=makeEater();e.visible=false;scene.add(e);eaters.push(e);}
  eaters.forEach((e,l)=>{
    e.visible=!!S.eater;if(!S.eater)return;
    e.position.set(wx(laneX(l)),0,wz(S.eater.y)-.4);
    e.userData.legs.forEach((lg,i)=>lg.rotation.x=Math.sin(T*14+(i%2)*Math.PI)*.5);
  });

  // hover: lane highlight and a ghost of the marble / piece being placed
  let hl=-1,gk=null,gp=false,pw=null;
  if((S.sel||S.glove)&&S.state==='play'&&!S.paused){
    pw=toWorld(S.mouse);hl=pw?laneAt(pw):-1;
    if(S.held){gk=S.held.isPiece?S.held.obj.kind:S.held.obj.type;gp=S.held.isPiece;}
    else if(S.sel){gk=S.sel;gp=TYPES[S.sel].kind==='piece';}
  }
  lanePick.visible=hl>=0;
  if(hl>=0){
    lanePick.position.set(wx(laneX(hl)),.02,wz(GY+LEN/2));
    lanePick.material.color.set(S.glove&&!S.held?0x66ccff:0xffffff);
  }
  setGhost(hl>=0?gk:null,gp);
  if(ghost.obj){
    const py=Math.max(SPAWN_Y,Math.min(BOTTOM-60,pw.y));
    ghost.obj.position.set(wx(laneX(hl)),gp?0:ghost.obj.userData.r+MARBLE_CLEARANCE,wz(py));
    if(gp)updatePiece(ghost.obj,S.held?S.held.obj:{kind:gk,l:hl,y:py,pulse:0,power:4});
    else ghost.obj.position.y+=Math.sin(T*3)*.03;
    if(gp)ghost.obj.position.set(wx(laneX(hl)),0,wz(py));
  }
  R.render(scene,cam);
}
