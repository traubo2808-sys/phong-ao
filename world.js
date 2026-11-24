import * as THREE from 'three';
import {CSS3DRenderer,CSS3DObject} from 'three/addons/renderers/CSS3DRenderer.js';
import {buildStreet} from './street.js';
import {createHuman} from './character.js';

const APP=window.APP,st=APP.st,$=s=>document.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a);
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const msg=m=>{$('#loadMsg').textContent=m;};

/* ================= renderer ================= */
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.setSize(innerWidth,innerHeight);
renderer.setClearColor(0x000000,0);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.outputColorSpace=THREE.SRGBColorSpace;
$('#gl').appendChild(renderer.domElement);
const cssR=new CSS3DRenderer();cssR.setSize(innerWidth,innerHeight);$('#css3d').appendChild(cssR.domElement);
const scene=new THREE.Scene(),cssScene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.05,300);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);cssR.setSize(innerWidth,innerHeight);});

/* ================= helpers ================= */
function ctex(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}t.userData={c,g};return t;}
const M=o=>new THREE.MeshStandardMaterial(o);
function B(w,h,d,m,x,y,z,p=scene){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
function C(rt,rb,h,m,x,y,z,p=scene,seg=24){const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
function S(r,m,x,y,z,p=scene,sx=1,sy=1,sz=1){const o=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
const colliders=[];const addCol=(x,z,w,d)=>colliders.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2});
const inters=[];
function addInter(o){o.r=o.r||1.5;inters.push(o);(o.meshes||[]).forEach(m=>m.traverse(x=>x.userData.inter=o));return o;}

/* ================= textures & materials ================= */
const woodTex=ctex(1024,1024,(g,w,h)=>{const rows=8,ph=h/rows;for(let r=0;r<rows;r++){let x=-(r%2)*180;while(x<w){const pw=rnd(300,520),l=rnd(.38,.5),hue=rnd(24,30);g.fillStyle=`hsl(${hue},${rnd(38,48)}%,${l*100}%)`;g.fillRect(x,r*ph,pw,ph);
  g.strokeStyle=`rgba(60,30,10,.18)`;g.lineWidth=1.2;for(let k=0;k<7;k++){g.beginPath();const yy=r*ph+rnd(4,ph-4);g.moveTo(x,yy);for(let s=0;s<pw;s+=40)g.lineTo(x+s,yy+Math.sin(s*.02+k)*3);g.stroke();}
  g.fillStyle='rgba(30,15,5,.55)';g.fillRect(x,r*ph,2,ph);x+=pw;}g.fillStyle='rgba(30,15,5,.5)';g.fillRect(0,r*ph,w,2);}},[2.2,1.65]);
const plaster=ctex(256,256,(g,w,h)=>{g.fillStyle='#e9e0d6';g.fillRect(0,0,w,h);for(let i=0;i<5000;i++){g.fillStyle=`rgba(${Math.random()<.5?255:120},${Math.random()<.5?250:110},240,${rnd(.02,.06)})`;g.fillRect(rnd(0,w),rnd(0,h),1.5,1.5);}},[6,3]);
const rugTex=ctex(512,384,(g,w,h)=>{g.fillStyle='#4b3c55';g.fillRect(0,0,w,h);g.strokeStyle='#d9a6a0';g.lineWidth=10;g.strokeRect(22,22,w-44,h-44);g.strokeStyle='#e8cfa8';g.lineWidth=3;g.strokeRect(44,44,w-88,h-88);
  for(let i=0;i<9;i++)for(let j=0;j<6;j++){g.fillStyle=(i+j)%2?'#5d4b69':'#6a5578';g.save();g.translate(80+i*44,80+j*45);g.rotate(Math.PI/4);g.fillRect(-12,-12,24,24);g.restore();}
  for(let i=0;i<3000;i++){g.fillStyle=`rgba(255,255,255,${rnd(0,.04)})`;g.fillRect(rnd(0,w),rnd(0,h),2,2);}});
const mat={
  floor:M({map:woodTex,roughness:.5,metalness:0}),wall:M({map:plaster,roughness:.95}),ceil:M({color:0xf3eee8,roughness:1}),
  white:M({color:0xf2f0ec,roughness:.45}),dark:M({color:0x16161a,roughness:.35,metalness:.2}),wood:M({color:0x8b5d3e,roughness:.55}),woodD:M({color:0x5b3d2a,roughness:.6}),
  fabric:M({color:0x5f6f93,roughness:1}),fabricL:M({color:0x7c8cb2,roughness:1}),pillow:M({color:0xe7b9a4,roughness:1}),blanket:M({color:0xc98b8f,roughness:1}),
  metal:M({color:0xc8ccd2,metalness:.7,roughness:.3}),steel:M({color:0xdfe3e6,metalness:.35,roughness:.25}),inner:M({color:0xeef4f8,roughness:.6,emissive:0x000000}),
  green:M({color:0x3f7d52,roughness:.8}),green2:M({color:0x5a9e69,roughness:.8}),pot:M({color:0xb06a48,roughness:.8}),curtain:M({color:0xc9898f,roughness:1,side:THREE.DoubleSide}),
  rug:M({map:rugTex,roughness:1}),base:M({color:0x6b4a36,roughness:.7}),glass:M({color:0xbfd8ff,transparent:true,opacity:.12,roughness:.05,metalness:.1,depthWrite:false}),
  skin:M({color:0xf0c4a2,roughness:.7}),hair:M({color:0x2a1d18,roughness:.8}),pants:M({color:0x2c3442,roughness:.9}),shirt:M({color:new THREE.Color(st.shirt),roughness:.9}),shoe:M({color:0xf1f1f1,roughness:.6}),
  cat:M({color:0xfff1e0,roughness:.9}),catD:M({color:0xe9cfb2,roughness:.9}),pink:M({color:0xf6a9b3,roughness:.8})
};

/* ================= room shell ================= */
const RH=2.9;
{const f=new THREE.Mesh(new THREE.PlaneGeometry(8,6),mat.floor);f.rotation.x=-Math.PI/2;f.receiveShadow=true;scene.add(f);
 const c=new THREE.Mesh(new THREE.PlaneGeometry(8,6),mat.ceil);c.rotation.x=Math.PI/2;c.position.y=RH;scene.add(c);}
B(8.2,RH,.1,mat.wall,0,RH/2,-3.05);B(.1,RH,6.2,mat.wall,-4.05,RH/2,0);
B(.1,RH,2.1,mat.wall,4.05,RH/2,-1.95);B(.1,RH,2.1,mat.wall,4.05,RH/2,1.95);B(.1,.9,1.8,mat.wall,4.05,.45,0);B(.1,.6,1.8,mat.wall,4.05,2.6,0);
B(6.1,RH,.1,mat.wall,-.95,RH/2,3.05);B(.95,RH,.1,mat.wall,3.525,RH/2,3.05);B(.95,.8,.1,mat.wall,2.575,2.5,3.05);
// chân tường
B(8,.1,.02,mat.base,0,.05,-2.99);B(.02,.1,6,mat.base,-3.99,.05,0);B(6.1,.1,.02,mat.base,-.95,.05,2.99);B(.02,.1,2.1,mat.base,3.99,.05,-1.95);B(.02,.1,2.1,mat.base,3.99,.05,1.95);
// vách gỗ sau TV
for(let x=-1.62;x<=1.62;x+=.09)B(.055,2.7,.03,mat.woodD,x,1.35,-2.985);
// thảm
{const r=new THREE.Mesh(new THREE.PlaneGeometry(3.4,2.5),mat.rug);r.rotation.x=-Math.PI/2;r.position.set(0,.006,.35);r.receiveShadow=true;scene.add(r);}

/* ================= lights ================= */
const hemi=new THREE.HemisphereLight(0xdfe8ff,0x5a4636,.35);scene.add(hemi);
const ceilSpot=new THREE.SpotLight(0xfff0dc,0,0,1.25,.85,2);ceilSpot.position.set(0,2.82,0);ceilSpot.target.position.set(0,0,0);ceilSpot.castShadow=true;ceilSpot.shadow.mapSize.set(1024,1024);ceilSpot.shadow.bias=-.0005;scene.add(ceilSpot,ceilSpot.target);
const ceilFill=new THREE.PointLight(0xfff0dc,0,0,2);ceilFill.position.set(0,2.5,.5);scene.add(ceilFill);
const sun=new THREE.DirectionalLight(0xfff2d6,0);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);const sc=sun.shadow.camera;sc.left=-6;sc.right=6;sc.top=5;sc.bottom=-5;sc.near=1;sc.far=30;sun.shadow.bias=-.0004;scene.add(sun,sun.target);
// đèn trần
{const g=new THREE.Group();scene.add(g);C(.32,.32,.05,M({color:0xffffff,emissive:0xfff2dc,emissiveIntensity:0}),0,RH-.04,0,g,40);g.children[0].castShadow=false;var ceilDisc=g.children[0];}

/* ================= TV ================= */
B(2.2,.5,.45,mat.wood,0,.25,-2.76);for(const x of[-.55,.55])B(1.05,.38,.01,mat.woodD,x,.26,-2.53);for(const x of[-1.02,1.02])B(.06,.06,.4,mat.dark,x,.03,-2.76);
addCol(0,-2.76,2.2,.5);
const tvBody=B(1.47,.86,.035,mat.dark,0,1.04,-2.86);
B(.03,.08,.2,mat.metal,-.6,.54,-2.83);B(.03,.08,.2,mat.metal,.6,.54,-2.83);
const ledStrip=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1.1),new THREE.MeshBasicMaterial({color:0x6b4cff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));ledStrip.position.set(0,1.04,-2.96);scene.add(ledStrip);
const hole=new THREE.Mesh(new THREE.PlaneGeometry(1.43,.805),new THREE.MeshBasicMaterial({color:0x000000,opacity:0,blending:THREE.NoBlending}));hole.position.set(0,1.04,-2.84);scene.add(hole);
const tvFrame=document.createElement('div');tvFrame.style.cssText='width:1040px;height:585px;background:#000';
const tvIframe=document.createElement('iframe');tvIframe.src='tv.html?embed=1';tvIframe.style.cssText='width:1040px;height:585px;border:0;display:block';tvIframe.allow='autoplay; encrypted-media; clipboard-read';tvFrame.appendChild(tvIframe);
const tvCss=new CSS3DObject(tvFrame);tvCss.position.copy(hole.position);tvCss.scale.setScalar(1.43/1040);cssScene.add(tvCss);
const tvLight=new THREE.PointLight(0x8fb0ff,0,5,2);tvLight.position.set(0,1.05,-2.3);scene.add(tvLight);
let tvOn=false;
const tvKey=k=>{try{tvIframe.contentWindow.tvKey(k);}catch(e){}};
addEventListener('message',e=>{const d=e.data;if(!d||!d.luma)return;if('tv' in d){tvOn=!!d.tv;}if(d.exit)exitMode();});
addInter({name:'tv',pos:new THREE.Vector3(0,0,-2.4),r:1.7,label:()=>'Dùng TV',act:()=>enterTV(),meshes:[tvBody,hole]});

/* ================= sofa & bàn ================= */
const sofa=new THREE.Group();sofa.position.set(0,0,1.4);scene.add(sofa);
B(2.2,.4,.9,mat.fabric,0,.2,0,sofa);B(2.2,.6,.24,mat.fabric,0,.7,.33,sofa);B(.2,.62,.9,mat.fabric,-1,.31,0,sofa);B(.2,.62,.9,mat.fabric,1,.31,0,sofa);
B(.88,.13,.66,mat.fabricL,-.45,.46,-.06,sofa);B(.88,.13,.66,mat.fabricL,.45,.46,-.06,sofa);
{const p=B(.42,.36,.12,mat.pillow,-.7,.68,.16,sofa);p.rotation.x=-.25;const p2=B(.42,.36,.12,M({color:0x9fd4c7,roughness:1}),.72,.68,.16,sofa);p2.rotation.x=-.25;}
addCol(0,1.4,2.2,.9);
addInter({name:'sofa',pos:new THREE.Vector3(0,0,.85),r:1.2,label:()=>'Ngồi sofa xem TV',act:()=>sitSofa(),meshes:[sofa]});
B(1.1,.05,.55,mat.wood,0,.42,.15);for(const[x,z]of[[-.5,-.22],[.5,-.22],[-.5,.52],[.5,.52]])C(.025,.025,.4,mat.dark,x,.2,z);
addCol(0,.15,1.1,.55);
const phoneProp=B(.075,.01,.155,mat.dark,.28,.45,.12);phoneProp.rotation.y=.3;
const phoneGlow=new THREE.Mesh(new THREE.PlaneGeometry(.066,.145),new THREE.MeshBasicMaterial({color:0x6a5cff}));phoneGlow.rotation.x=-Math.PI/2;phoneGlow.position.set(0,.006,0);phoneProp.add(phoneGlow);
addInter({name:'phone',pos:new THREE.Vector3(.3,0,.15),r:1.2,label:()=>held?null:'Cầm điện thoại',act:()=>pickPhone(),meshes:[phoneProp]});

/* ================= đèn cây ================= */
C(.17,.19,.03,mat.dark,-1.8,.015,-2.55);C(.014,.014,1.55,mat.dark,-1.8,.8,-2.55);
const shadeMat=M({color:0xe8d6b8,roughness:.9,side:THREE.DoubleSide,emissive:0xffc58a,emissiveIntensity:0});
const shade=new THREE.Mesh(new THREE.CylinderGeometry(.16,.24,.3,32,1,true),shadeMat);shade.position.set(-1.8,1.62,-2.55);scene.add(shade);
const lampLight=new THREE.PointLight(0xffc58a,0,0,2);lampLight.position.set(-1.8,1.58,-2.55);scene.add(lampLight);
addCol(-1.8,-2.55,.4,.4);
addInter({name:'lamp',pos:new THREE.Vector3(-1.8,0,-2.1),r:1.3,label:()=>st.lamp?'Tắt đèn cây':'Bật đèn cây',act:()=>doAct(new THREE.Vector3(-1.8,1.2,-2.55),'press',()=>APP.dev.set('lamp',!st.lamp)),meshes:[shade]});

/* ================= cây cảnh ================= */
const plant=new THREE.Group();plant.position.set(1.85,0,-2.6);scene.add(plant);
C(.2,.15,.42,mat.pot,0,.21,0,plant);
const leaves=[];for(let i=0;i<11;i++){const a=i/11*Math.PI*2,l=new THREE.Group();l.position.set(0,.42,0);l.rotation.y=a;plant.add(l);const m=S(.07,i%2?mat.green:mat.green2,0,.32,.16,l,1,3.2,.35);m.rotation.x=.55+rnd(-.15,.2);leaves.push(l);}
addCol(1.85,-2.6,.45,.45);
addInter({name:'plant',pos:new THREE.Vector3(1.85,0,-2.05),r:1.3,label:()=>held&&held.kind==='wcan'?'Tưới cây':null,act:()=>waterPlant(),meshes:[plant]});
let plantPerk=0;

/* ================= đồng hồ treo tường ================= */
const clockTex=ctex(256,256,()=>{});
const clock=new THREE.Mesh(new THREE.CylinderGeometry(.24,.24,.04,48),M({color:0x3a2c25}));clock.rotation.x=Math.PI/2;clock.position.set(-2.7,2.05,-2.98);scene.add(clock);
{const face=new THREE.Mesh(new THREE.CircleGeometry(.225,48),M({map:clockTex,roughness:.6}));face.position.set(-2.7,2.05,-2.957);scene.add(face);face.userData.inter=null;var clockFace=face;}
function drawClock(){const{g}=clockTex.userData,d=new Date();g.clearRect(0,0,256,256);g.fillStyle='#f4ecdf';g.beginPath();g.arc(128,128,124,0,7);g.fill();g.fillStyle='#3a2c25';
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;g.save();g.translate(128,128);g.rotate(a);g.fillRect(-2,-112,4,i%3?10:20);g.restore();}
  const hand=(a,l,w,c)=>{g.save();g.translate(128,128);g.rotate(a);g.fillStyle=c;g.fillRect(-w/2,-l,w,l+12);g.restore();};
  const s=d.getSeconds(),m=d.getMinutes()+s/60,h=d.getHours()%12+m/60;hand(h/12*Math.PI*2,62,9,'#2a2026');hand(m/60*Math.PI*2,92,6,'#2a2026');hand(s/60*Math.PI*2,100,2,'#d9534f');g.fillStyle='#2a2026';g.beginPath();g.arc(128,128,8,0,7);g.fill();clockTex.needsUpdate=true;}
drawClock();setInterval(drawClock,1000);
addInter({name:'clock',pos:new THREE.Vector3(-2.7,0,-2.4),r:1.4,label:()=>'Xem giờ, đặt báo thức',act:()=>APP.emit('phone:open','clock'),meshes:[clock,clockFace]});

/* ================= tủ lạnh ================= */
const FX=-3.62,FZ=-2.3,fridge=new THREE.Group();scene.add(fridge);
const fBody=M({color:0xe9ecef,roughness:.35,metalness:.25});
B(.04,1.8,.7,fBody,FX-.33,.9,FZ,fridge);B(.7,.04,.7,fBody,FX,1.78,FZ,fridge);B(.7,.06,.7,fBody,FX,.03,FZ,fridge);B(.7,1.8,.04,fBody,FX,.9,FZ-.33,fridge);B(.7,1.8,.04,fBody,FX,.9,FZ+.33,fridge);B(.66,.04,.66,fBody,FX,1.24,FZ,fridge);
B(.02,1.7,.62,mat.inner,FX-.3,.9,FZ,fridge);
for(const y of[.45,.8])B(.6,.012,.6,mat.glass,FX,y,FZ,fridge);
const items={};
items.nuoc=[];for(let i=0;i<6;i++)items.nuoc.push(C(.033,.033,.12,M({color:i%2?0xd83a3a:0x2f9e5a,metalness:.6,roughness:.3}),FX-.18+(i%3)*.08,.52,FZ-.2+Math.floor(i/3)*.08,fridge,16));
items.sua=[];for(let i=0;i<2;i++)items.sua.push(B(.08,.2,.08,M({color:0xf7f7f2,roughness:.6}),FX+.1,.16,FZ-.18+i*.12,fridge));
items.tao=[];for(let i=0;i<5;i++)items.tao.push(S(.04,M({color:0xcc2b2b,roughness:.5}),FX-.1+(i%3)*.09,.86,FZ+.05+Math.floor(i/3)*.09,fridge));
items.banh=[C(.1,.1,.08,M({color:0xf6c3cf,roughness:.8}),FX+.05,.88,FZ-.15,fridge)];
items.da=[];for(let i=0;i<4;i++)items.da.push(B(.05,.05,.05,M({color:0xd8f0ff,transparent:true,opacity:.7,roughness:.1}),FX+(i%2)*.07,1.3,FZ+(Math.floor(i/2))*.07-.05,fridge));
function syncFridgeItems(){for(const k in items)items[k].forEach((m,i)=>m.visible=k==='da'?true:i<st.stock[k]);}
syncFridgeItems();
const FKIND={nuoc:'can',sua:'milk',tao:'apple',banh:'cake'};
for(const k in FKIND)items[k].forEach(m=>{m.userData.fk=k;m.material=m.material.clone();});
function door(y0,y1){const p=new THREE.Group();p.position.set(FX+.35,0,FZ-.35);fridge.add(p);const h=y1-y0;const d=B(.05,h,.7,fBody,.025,y0+h/2,.35,p);B(.03,h*.55,.03,mat.metal,.06,y0+h/2,.62,p);return{p,d};}
const dLow=door(.06,1.22),dTop=door(1.26,1.8);
const dispTex=ctex(128,64,(g)=>{g.fillStyle='#10161c';g.fillRect(0,0,128,64);g.fillStyle='#7fe0ff';g.font='bold 30px sans-serif';g.textAlign='center';g.fillText('4°C',64,44);});
{const d=new THREE.Mesh(new THREE.PlaneGeometry(.14,.07),new THREE.MeshBasicMaterial({map:dispTex}));d.position.set(.053,1.05,.36);d.rotation.y=Math.PI/2;dLow.p.add(d);}
const fLight=new THREE.PointLight(0xe6f6ff,0,1.6,2);fLight.position.set(FX+.05,1.0,FZ);scene.add(fLight);
addCol(FX,FZ,.72,.72);
let fridgeOpen=false,fridgeAng=0;
addInter({name:'fridge',pos:new THREE.Vector3(-2.75,0,-2.0),r:1.5,label:()=>held&&held.kind==='bag'?'Cất đồ ăn vào tủ lạnh':'Mở tủ lạnh',act:()=>held&&held.kind==='bag'?storeBag():openFridge(),meshes:[fridge]});

/* ================= bếp nhỏ ================= */
B(.62,.88,1.5,M({color:0x46566b,roughness:.6}),-3.68,.44,-1.15);B(.66,.04,1.54,M({color:0xe8e2d8,roughness:.3}),-3.68,.9,-1.15);
for(const z of[-1.6,-.7])B(.01,.7,.66,M({color:0x3a4859}),-3.36,.45,z);
const KETTLE_BASE=new THREE.Vector3(-3.62,1.02,-.7);
const kettle=new THREE.Group();kettle.position.copy(KETTLE_BASE);scene.add(kettle);
{const b=C(.075,.095,.19,mat.steel,0,0,0,kettle);const sp=C(.01,.018,.16,mat.steel,0,.02,.11,kettle,12);sp.rotation.x=1.0;const hd=new THREE.Mesh(new THREE.TorusGeometry(.06,.012,8,20,Math.PI),M({color:0x2b2b2b}));hd.position.set(0,.06,-.06);hd.rotation.y=Math.PI/2;kettle.add(hd);S(.02,M({color:0x2b2b2b}),0,.105,0,kettle);}
const kettleBaseM=C(.1,.1,.02,M({color:0x2b2b2b}),-3.62,.93,-.7);
C(.04,.035,.09,M({color:0xffb47a}),-3.6,.965,-1.3);C(.04,.035,.09,M({color:0x7fd1c7}),-3.6,.965,-1.42);
addCol(-3.68,-1.15,.66,1.54);
addInter({name:'kettle',pos:new THREE.Vector3(-2.95,0,-.85),r:1.3,label:()=>kettleLabel(),act:()=>brewTea(),meshes:[kettle]});
// thùng rác
const bin=new THREE.Group();bin.position.set(-3.7,0,.05);scene.add(bin);
C(.17,.14,.42,M({color:0x5c6b7a,roughness:.6}),0,.21,0,bin);C(.18,.18,.03,M({color:0x3f4a55}),0,.43,0,bin);
addCol(-3.7,.05,.36,.36);
addInter({name:'bin',pos:new THREE.Vector3(-3.1,0,.05),r:1.2,label:()=>held&&isTrash(held)?'Vứt vào thùng rác':null,act:()=>throwTrash(),meshes:[bin]});

/* ================= giường ================= */
const bed=new THREE.Group();scene.add(bed);
B(2.05,.3,1.55,mat.wood,-2.95,.15,1.95,bed);B(1.98,.22,1.48,M({color:0xf5f3ef,roughness:.9}),-2.95,.41,1.95,bed);
B(1.35,.07,1.5,mat.blanket,-2.6,.55,1.95,bed);B(.38,.12,.55,mat.white,-3.68,.58,1.62,bed);B(.38,.12,.55,mat.pillow,-3.68,.58,2.28,bed);B(.08,1.05,1.55,mat.woodD,-3.95,.52,1.95,bed);
B(.25,.03,1.3,mat.wood,-3.86,1.55,1.95);for(let i=0;i<7;i++)B(.16,rnd(.16,.24),.035,M({color:[0x7d8fd1,0xe8a86a,0x9fc7a8,0xd9798a,0xf2d38a][i%5]}),-3.86,1.66,1.5+i*.05);
addCol(-2.95,1.95,2.05,1.55);
addInter({name:'bed',pos:new THREE.Vector3(-1.75,0,1.95),r:1.4,label:()=>'Nằm nghỉ',act:()=>lieBed(),meshes:[bed]});

/* ================= quạt đứng ================= */
const fan=new THREE.Group();fan.position.set(2.75,0,.95);scene.add(fan);
C(.22,.24,.04,mat.white,0,.02,0,fan,32);C(.022,.022,1.0,mat.metal,0,.52,0,fan);
const fanHead=new THREE.Group();fanHead.position.set(0,1.08,0);fan.add(fanHead);
C(.09,.09,.16,mat.white,0,0,-.04,fanHead).rotation.x=Math.PI/2;
const blades=new THREE.Group();blades.position.z=.08;fanHead.add(blades);
for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(.13,16,8),M({color:0x9fd4e8,transparent:true,opacity:.85,roughness:.3}));b.scale.set(.55,1,.12);b.position.set(0,.12,0);const g=new THREE.Group();g.rotation.z=i/3*Math.PI*2;g.add(b);blades.add(g);}
S(.035,mat.white,0,0,.1,fanHead);
{const cage=new THREE.Mesh(new THREE.TorusGeometry(.26,.008,8,48),mat.metal);cage.position.z=.08;fanHead.add(cage);for(let i=0;i<10;i++){const s=new THREE.Mesh(new THREE.BoxGeometry(.004,.52,.004),mat.metal);s.rotation.z=i/10*Math.PI;s.position.z=.12;fanHead.add(s);}}
const fanBase=-1.45;fan.rotation.y=fanBase;
addCol(2.75,.95,.5,.5);
let fanAng=0,fanOscT=0;
// nút số trên thân quạt (đèn sáng theo số)
const fanLeds=[0,1,2,3].map(i=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.012,10,8),new THREE.MeshBasicMaterial({color:0x333333}));m.position.set(-.06+i*.04,.09,.2);fan.add(m);return m;});
B(.2,.05,.08,mat.white,0,.07,.18,fan);
addInter({name:'fan',pos:new THREE.Vector3(2.4,0,.7),r:1.3,label:()=>st.fan<3?`Bấm quạt lên số ${st.fan+1}`:'Bấm tắt quạt',act:()=>doAct(new THREE.Vector3(2.75,.1,.95),'reachLow',()=>APP.dev.set('fan',(st.fan+1)%4)),meshes:[fan]});

/* ================= máy lạnh ================= */
const ac=new THREE.Group();ac.position.set(2.65,2.42,-2.86);scene.add(ac);
B(.98,.3,.24,mat.white,0,0,0,ac);B(.98,.06,.02,M({color:0xe2e2e2}),0,.1,.125,ac);
const flap=new THREE.Group();flap.position.set(0,-.13,.11);ac.add(flap);B(.9,.02,.08,mat.white,0,0,.04,flap);
const acTex=ctex(128,48,()=>{});const acDisp=new THREE.Mesh(new THREE.PlaneGeometry(.1,.0375),new THREE.MeshBasicMaterial({map:acTex,transparent:true}));acDisp.position.set(.34,-.02,.122);ac.add(acDisp);
function drawAC(){const{g}=acTex.userData;g.clearRect(0,0,128,48);if(st.ac){g.fillStyle='#7fffd4';g.font='bold 36px sans-serif';g.textAlign='center';g.fillText(st.acTemp+'°',64,38);}acTex.needsUpdate=true;}
drawAC();
const mistN=70,mistGeo=new THREE.BufferGeometry(),mistPos=new Float32Array(mistN*3),mistV=[];
for(let i=0;i<mistN;i++){mistPos.set([rnd(-.4,.4),rnd(-.6,-.15),rnd(.12,.6)],i*3);mistV.push(rnd(.15,.3));}
mistGeo.setAttribute('position',new THREE.BufferAttribute(mistPos,3));
const mist=new THREE.Points(mistGeo,new THREE.PointsMaterial({color:0xdff6ff,size:.035,transparent:true,opacity:.35,depthWrite:false}));ac.add(mist);
// điều khiển máy lạnh gắn tường
const acRemote=B(.06,.13,.025,mat.white,3.3,1.35,-2.98);B(.04,.03,.005,M({color:0x223040}),3.3,1.39,-2.965);
addInter({name:'ac',pos:new THREE.Vector3(3.2,0,-2.35),r:1.3,label:()=>st.ac?'Bấm tắt máy lạnh':'Bấm bật máy lạnh',act:()=>doAct(new THREE.Vector3(3.3,1.35,-2.98),'press',()=>APP.dev.set('ac',!st.ac)),meshes:[ac,acRemote]});

/* ================= cửa sổ & rèm ================= */
for(const[w,h,d,x,y,z]of[[.12,.07,1.92,3.99,2.335,0],[.12,.07,1.92,3.99,.865,0],[.12,1.5,.07,3.99,1.6,-.93],[.12,1.5,.07,3.99,1.6,.93],[.06,1.4,.04,3.99,1.6,0],[.06,.04,1.8,3.99,1.6,0]])B(w,h,d,mat.white,x,y,z);
{const gl=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.4),mat.glass);gl.rotation.y=-Math.PI/2;gl.position.set(4.0,1.6,0);scene.add(gl);}
B(.28,.04,2.05,mat.white,3.88,.88,0);
C(.015,.015,2.8,mat.metal,3.82,2.47,0).rotation.x=Math.PI/2;
function curtainPanel(side){const pv=new THREE.Group();pv.position.set(3.78,0,side*1.38);scene.add(pv);
  const geo=new THREE.PlaneGeometry(1.38,1.95,40,1);const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i);p.setZ(i,Math.sin((x+.69)*24)*.035);}geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,mat.curtain);m.rotation.y=-Math.PI/2;m.position.set(0,1.45,-side*.69);m.castShadow=true;pv.add(m);return{pv,m};}
const curL=curtainPanel(-1),curR=curtainPanel(1);let curOpen=st.curtains?1:0;
addInter({name:'window',pos:new THREE.Vector3(3.2,0,0),r:1.5,label:()=>st.curtains?'Kéo rèm lại':'Mở rèm cửa sổ',act:()=>doAct(new THREE.Vector3(3.8,1.9,0),'reachHigh',()=>APP.dev.set('curtains',!st.curtains),700),meshes:[curL.m,curR.m]});

/* ================= cửa ra vào, công tắc ================= */
const doorM=B(.9,2.05,.05,M({color:0x7a5236,roughness:.5}),2.575,1.025,3.0);S(.03,mat.metal,2.2,1.0,2.96);
addInter({name:'door',pos:new THREE.Vector3(2.575,0,2.4),r:1.3,label:()=>'Ra phố Nguyễn Huệ',act:()=>goOut(),meshes:[doorM]});
const sw=B(.09,.13,.015,mat.white,1.75,1.25,2.99);const swKnob=B(.03,.05,.012,M({color:0xdddddd}),1.75,1.25,2.98);
addInter({name:'switch',pos:new THREE.Vector3(1.75,0,2.45),r:1.2,label:()=>st.ceiling?'Tắt đèn trần':'Bật đèn trần',act:()=>doAct(new THREE.Vector3(1.75,1.25,2.99),'press',()=>APP.dev.set('ceiling',!st.ceiling)),meshes:[sw,swKnob]});

/* ================= bên ngoài: bầu trời & góc phố ================= */
const skyTex=ctex(512,256,()=>{});
const sky=new THREE.Mesh(new THREE.PlaneGeometry(90,50),new THREE.MeshBasicMaterial({map:skyTex,fog:false}));sky.position.set(40,6,0);sky.rotation.y=-Math.PI/2;scene.add(sky);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,80),M({color:0x2d3036,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set(30,-9,0);scene.add(ground);
const road=new THREE.Mesh(new THREE.PlaneGeometry(6,80),M({color:0x1c1d21,roughness:.9}));road.rotation.x=-Math.PI/2;road.position.set(9,-8.98,0);scene.add(road);
for(let z=-38;z<38;z+=4)B(.15,.01,1.6,new THREE.MeshBasicMaterial({color:0xd9d4b8}),9,-8.96,z);
const winMap=ctex(128,256,(g,w,h)=>{g.fillStyle='#c9ccd2';g.fillRect(0,0,w,h);for(let y=8;y<h;y+=18)for(let x=8;x<w;x+=20){g.fillStyle='#7f9bb8';g.fillRect(x,y,12,11);}});
const winEm=ctex(128,256,(g,w,h)=>{g.fillStyle='#000';g.fillRect(0,0,w,h);for(let y=8;y<h;y+=18)for(let x=8;x<w;x+=20)if(Math.random()<.45){g.fillStyle=Math.random()<.7?'#ffd48a':'#bfe0ff';g.fillRect(x,y,12,11);}});
const bMats=[0x8f98a8,0xa89a8f,0x7d8aa0,0x9aa38f].map(c=>M({color:c,map:winMap,emissive:0xffffff,emissiveMap:winEm,emissiveIntensity:0,roughness:.8}));
const city=new THREE.Group();scene.add(city);
for(let i=0;i<46;i++){const w=rnd(4,8),d=rnd(4,8),far=Math.random(),x=lerp(16,42,far),h=lerp(rnd(6,14),rnd(14,30),far),z=rnd(-34,34);const m=bMats[i%4].clone();m.map=winMap.clone();m.emissiveMap=winEm.clone();for(const t of[m.map,m.emissiveMap]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(w/4,h/8);t.needsUpdate=true;}
  const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,-9+h/2,z);city.add(b);}
const lamps=[];for(let z=-36;z<=36;z+=8){C(.08,.08,5,mat.dark,12.3,-6.5,z,city,8);const bulb=S(.25,new THREE.MeshBasicMaterial({color:0xffd9a0}),11.8,-4,z,city);lamps.push(bulb);}
const cars=[];for(let i=0;i<8;i++){const g=new THREE.Group();const col=[0xd83a3a,0xf2f2f2,0x2f6fe0,0x222222,0xf2c14e][i%5];B(1.8,.7,4,M({color:col,roughness:.4,metalness:.3}),0,.5,0,g);B(1.6,.5,2,M({color:0x223,roughness:.2}),0,1.05,-.2,g);
  const dir=i%2?1:-1;const hl=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.25),new THREE.MeshBasicMaterial({color:0xfff6d8}));hl.position.set(0,.55,dir*2.02);if(dir<0)hl.rotation.y=Math.PI;g.add(hl);
  g.position.set(dir>0?7.6:10.4,-9,rnd(-38,38));g.userData={dir,v:rnd(6,11)};city.add(g);cars.push(g);}
// mưa ngoài cửa sổ
const RN=1400,rainGeo=new THREE.BufferGeometry(),rainPos=new Float32Array(RN*6);
for(let i=0;i<RN;i++){const x=rnd(4.3,16),y=rnd(-9,8),z=rnd(-10,10);rainPos.set([x,y,z,x-.03,y-.35,z],i*6);}
rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));
const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:0xbfd4ff,transparent:true,opacity:0}));scene.add(rain);
const cloudBlobs=[];for(let i=0;i<14;i++)cloudBlobs.push({x:rnd(0,512),y:rnd(20,130),s:rnd(.6,1.4),v:rnd(2,6)});
const stars=[];for(let i=0;i<120;i++)stars.push([rnd(0,512),rnd(0,170),rnd(.4,1.4),rnd(0,6)]);

/* ================= thời tiết thật (Open-Meteo, không cần khóa) ================= */
const WX=c=>c===0?['☀️','Trời quang',0]:c<=2?['🌤️','Ít mây',0]:c===3?['☁️','Nhiều mây',0]:c<=48?['🌫️','Sương mù',0]:c<=57?['🌦️','Mưa phùn',.3]:c<=63?['🌧️',c===61?'Mưa nhẹ':'Mưa vừa',c===61?.45:.7]:c<=67?['🌧️','Mưa to',1]:c<=77?['❄️','Tuyết',0]:c<=82?['🌧️','Mưa rào',c===80?.5:.9]:['⛈️','Dông',1];
APP.wxInfo=(c,day)=>{const r=WX(c);if(!day&&c<=2)r[0]=c===0?'🌙':'☁️';return r;};
async function fetchWeather(){const c=st.city;try{const u=`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,cloud_cover,precipitation,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=auto&forecast_days=5`;
  const j=await (await fetch(u)).json();const cu=j.current;const hm=s=>{const t=s.split('T')[1].split(':');return +t[0]+t[1]/60;};
  APP.weather={temp:cu.temperature_2m,feels:cu.apparent_temperature,hum:cu.relative_humidity_2m,code:cu.weather_code,cloud:cu.cloud_cover/100,precip:cu.precipitation,wind:cu.wind_speed_10m,isDay:!!cu.is_day,off:j.utc_offset_seconds,
    sunrise:hm(j.daily.sunrise[0]),sunset:hm(j.daily.sunset[0]),daily:j.daily.time.map((t,i)=>({t,code:j.daily.weather_code[i],max:j.daily.temperature_2m_max[i],min:j.daily.temperature_2m_min[i],rain:j.daily.precipitation_probability_max[i]})),at:Date.now()};
  APP.emit('weather',APP.weather);}catch(e){APP.weather=APP.weather||null;$('#hWx').textContent='Không lấy được thời tiết';}}
APP.fetchWeather=fetchWeather;fetchWeather();setInterval(fetchWeather,10*60000);
function cityHour(){const w=APP.weather;if(w&&w.off!=null){const s=Date.now()/1000+w.off;return((s/3600)%24+24)%24;}const d=new Date();return d.getHours()+d.getMinutes()/60;}
APP.cityHour=cityHour;

/* ================= nhân vật ================= */
const player=new THREE.Group();scene.add(player);player.position.set(.6,0,-.6);player.rotation.y=Math.PI;
const hum=createHuman({shirt:st.shirt});player.add(hum.root);
const flash=new THREE.SpotLight(0xffffff,0,9,.45,.5,1.5);flash.position.set(.15,1.3,.15);flash.target.position.set(0,1,3);player.add(flash,flash.target);
APP.on('flashlight',v=>{flash.intensity=v?25:0;});
const PR=.22;

/* ================= mèo Mochi ================= */
const cat=new THREE.Group();scene.add(cat);cat.position.set(-1,0,.9);
const catBody=S(.16,mat.cat,0,.17,0,cat,1,.85,1.5);
const catHead=new THREE.Group();catHead.position.set(0,.28,.22);cat.add(catHead);S(.11,mat.cat,0,0,0,catHead);
for(const x of[-.06,.06]){const e=new THREE.Mesh(new THREE.ConeGeometry(.035,.07,12),mat.catD);e.position.set(x,.1,0);catHead.add(e);S(.012,mat.dark,x*.7,.02,.1,catHead);}
S(.02,mat.pink,0,-.02,.105,catHead);
const tail=new THREE.Mesh(new THREE.CapsuleGeometry(.025,.28,4,8),mat.catD);tail.position.set(0,.3,-.25);tail.rotation.x=-.6;cat.add(tail);
const catLegs=[];for(const[x,z]of[[-.07,.12],[.07,.12],[-.07,-.12],[.07,-.12]]){const l=C(.025,.025,.12,mat.cat,x,.06,z,cat,8);catLegs.push(l);}
const catAI={tx:-1,tz:.9,t:2,mode:'idle'};
addInter({name:'cat',pos:cat.position,r:1.1,label:()=>'Vuốt ve Mochi',act:()=>{petCat();},meshes:[cat]});

/* ================= hạt hiệu ứng (tim, hơi nước) ================= */
const heartTex=ctex(64,64,(g)=>{g.fillStyle='#ff7fa3';g.beginPath();g.moveTo(32,54);g.bezierCurveTo(-6,28,14,2,32,20);g.bezierCurveTo(50,2,70,28,32,54);g.fill();});
const steamTex=ctex(64,64,(g)=>{const r=g.createRadialGradient(32,32,0,32,32,30);r.addColorStop(0,'rgba(255,255,255,.55)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);});
const waterTex=ctex(32,32,(g)=>{const r=g.createRadialGradient(16,16,0,16,16,15);r.addColorStop(0,'rgba(190,225,255,.95)');r.addColorStop(1,'rgba(160,210,255,0)');g.fillStyle=r;g.fillRect(0,0,32,32);});
const parts=[];
function spawn(tex,pos,vel,life,size){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));s.position.copy(pos);s.scale.setScalar(size);scene.add(s);parts.push({s,vel,life,max:life,size});}
async function petCat(){if(busy||held)return;busy=true;catAI.mode='happy';catAI.t=3.2;face(cat.position);crouchT=2.6;hum.setArms('pet');sfx.purr();
  for(let i=0;i<4;i++){hum.setOverride({sx:-.75,e:-.15});await sleep(280);hum.setOverride({sx:-1.0,e:-.4});await sleep(280);if(i%2===0)for(let k=0;k<3;k++)spawn(heartTex,cat.position.clone().add(new THREE.Vector3(rnd(-.15,.15),.4,rnd(-.15,.15))),new THREE.Vector3(rnd(-.1,.1),rnd(.3,.6),rnd(-.1,.1)),1.6,.1);}
  hum.setOverride(null);hum.setArms('rest');busy=false;}

/* ================= cầm nắm & hành động ================= */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function tw(fn,a,b,ms){return new Promise(res=>{const t0=performance.now();const step=()=>{const k=Math.min(1,(performance.now()-t0)/ms);fn(a+(b-a)*(k*k*(3-2*k)));if(k<1)requestAnimationFrame(step);else res();};step();});}
let held=null,handProp=null,busy=false,mouthK=0,pourK=0,crouchT=0,phoneFromTable=false;
const loose=[];const tmpA=new THREE.Vector3(),tmpB=new THREE.Vector3();
const SURF=[{x0:-.55,x1:.55,z0:-.12,z1:.42,y:.445},{x0:-3.98,x1:-3.36,z0:-1.92,z1:-.38,y:.92},{x0:-1.1,x1:1.1,z0:-2.98,z1:-2.54,y:.5}];
const NAMES={can:'lon nước',milk:'hộp sữa',apple:'quả táo',cake:'bánh kem',mug:'cốc',wcan:'bình tưới',bag:'túi đồ ăn'};
function makeItem(kind,opt={}){const g=new THREE.Group();let h=.1;
  if(kind==='can'){g.add(new THREE.Mesh(new THREE.CylinderGeometry(.033,.033,.12,20),M({color:opt.color||0xd83a3a,metalness:.6,roughness:.3})));const t=new THREE.Mesh(new THREE.CylinderGeometry(.029,.033,.008,20),mat.metal);t.position.y=.064;g.add(t);h=.12;}
  else if(kind==='milk'){g.add(new THREE.Mesh(new THREE.BoxGeometry(.07,.18,.07),M({color:0xf7f7f2,roughness:.6})));const bd=new THREE.Mesh(new THREE.BoxGeometry(.072,.05,.072),M({color:0x3b7dd8}));bd.position.y=.02;g.add(bd);const tp=new THREE.Mesh(new THREE.ConeGeometry(.05,.04,4),M({color:0xf7f7f2}));tp.position.y=.11;tp.rotation.y=Math.PI/4;g.add(tp);h=.2;}
  else if(kind==='apple'){const a=new THREE.Mesh(new THREE.SphereGeometry(.04,20,14),M({color:0xcc2b2b,roughness:.45}));g.add(a);const s=new THREE.Mesh(new THREE.CylinderGeometry(.003,.003,.02),M({color:0x5a3b20}));s.position.y=.045;g.add(s);g.userData.body=a;h=.08;}
  else if(kind==='cake'){const c=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.06,24,1,false,0,Math.PI*1.4),M({color:0xf6c3cf,roughness:.8}));g.add(c);const cr=new THREE.Mesh(new THREE.SphereGeometry(.015,10,8),M({color:0xd8203a}));cr.position.set(.02,.04,.02);g.add(cr);g.userData.body=c;h=.06;}
  else if(kind==='mug'){const cm=M({color:0xf6efe6,roughness:.45,side:THREE.DoubleSide});g.add(new THREE.Mesh(new THREE.CylinderGeometry(.045,.038,.1,24,1,true),cm));const bt=new THREE.Mesh(new THREE.CircleGeometry(.038,20),cm);bt.rotation.x=-Math.PI/2;bt.position.y=-.049;g.add(bt);
    const hd=new THREE.Mesh(new THREE.TorusGeometry(.024,.007,8,16,Math.PI),cm);hd.position.x=.05;hd.rotation.z=-Math.PI/2;g.add(hd);
    const tea=new THREE.Mesh(new THREE.CylinderGeometry(.041,.037,1,24),M({color:0x8a4a14,roughness:.1,transparent:true,opacity:.93}));tea.position.y=-.048;tea.scale.y=.001;tea.visible=false;g.add(tea);g.userData.tea=tea;g.userData.level=0;h=.1;}
  else if(kind==='wcan'){const gm=M({color:0x3f9e6a,roughness:.5});g.add(new THREE.Mesh(new THREE.CylinderGeometry(.07,.08,.16,20),gm));const sp=new THREE.Mesh(new THREE.CylinderGeometry(.008,.014,.22,10),gm);sp.position.set(0,.05,.12);sp.rotation.x=1.0;g.add(sp);const hd=new THREE.Mesh(new THREE.TorusGeometry(.05,.008,8,16,Math.PI),M({color:0x2f7e52}));hd.position.y=.08;hd.rotation.y=Math.PI/2;g.add(hd);h=.16;}
  else if(kind==='bag'){g.add(new THREE.Mesh(new THREE.BoxGeometry(.3,.32,.18),M({color:0xc89b62,roughness:.95})));const tp=new THREE.Mesh(new THREE.BoxGeometry(.24,.08,.12),M({color:0x7fbf5f}));tp.position.y=.19;g.add(tp);h=.32;}
  else if(kind==='remote'){g.add(new THREE.Mesh(new THREE.BoxGeometry(.04,.02,.16),M({color:0x222226,roughness:.4})));const r=new THREE.Mesh(new THREE.BoxGeometry(.012,.006,.012),M({color:0xd83a3a}));r.position.set(0,.012,.06);g.add(r);h=.02;}
  else if(kind==='phone'){g.add(new THREE.Mesh(new THREE.BoxGeometry(.072,.15,.009),M({color:0x111114,roughness:.3})));const s=new THREE.Mesh(new THREE.PlaneGeometry(.064,.138),new THREE.MeshBasicMaterial({color:0x6a5cff}));s.position.z=.005;g.add(s);h=.15;}
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.raycast=()=>{};}});g.userData.kind=kind;g.userData.h=h;return g;}
function addLoose(m,x,y,z){m.position.set(x,y+m.userData.h/2,z);m.rotation.set(0,rnd(0,6),0);scene.add(m);loose.push(m);}
// cốc để trên kệ bếp cạnh ấm, bình tưới cạnh chậu cây
const mug=makeItem('mug');addLoose(mug,-3.58,.92,-.98);
addLoose(makeItem('wcan'),2.3,0,-2.72);
const remoteM=makeItem('remote'),phoneHand=makeItem('phone');
function face(p){player.rotation.y=Math.atan2(p.x-player.position.x,p.z-player.position.z);}
const restPose=()=>hum.setArms(held?(held.kind==='bag'?'holdBoth':'hold'):'rest');
async function doAct(p,pose,fn,ms=420){if(busy)return;busy=true;face(p);hum.setArms(pose);await sleep(ms);fn();await sleep(300);restPose();busy=false;}
function isTrash(h){return h.empty||h.core;}
function pickUp(m){if(busy||held)return;busy=true;face(m.position);hum.setArms(m.position.y<.4?'reachLow':'reach');sfx.pop();
  setTimeout(()=>{const i=loose.indexOf(m);if(i>=0)loose.splice(i,1);held={mesh:m,kind:m.userData.kind,tilt:0};restPose();busy=false;},420);}
function looseInters(){return loose.map(m=>({name:'loose',mesh:m,pos:m.position,r:1.15,label:()=>held?null:'Cầm '+(m.userData.kind==='mug'?(m.userData.level>.05?'cốc trà':'cốc'):NAMES[m.userData.kind]),act:()=>pickUp(m)}));}
function updHeld(){const parent=player.parent;
  if(held){const m=held.mesh;if(m.parent!==parent)parent.add(m);
    if(held.kind==='bag'){hum.gripR.getWorldPosition(tmpA);hum.gripL.getWorldPosition(tmpB);tmpA.add(tmpB).multiplyScalar(.5);tmpA.y-=.1;}
    else{hum.gripR.getWorldPosition(tmpA);tmpA.y-=.01;}
    if(mouthK>0){hum.head.getWorldPosition(tmpB);tmpB.x+=Math.sin(player.rotation.y)*.15;tmpB.z+=Math.cos(player.rotation.y)*.15;tmpB.y+=.06;tmpA.lerp(tmpB,mouthK);}
    if(pourK>0&&held.pourTo)tmpA.lerp(held.pourTo,pourK);
    m.position.copy(tmpA);m.quaternion.setFromEuler(new THREE.Euler(held.tilt,player.rotation.y,0,'YXZ'));}
  if(handProp){if(handProp.parent!==parent)parent.add(handProp);hum.gripR.getWorldPosition(tmpA);handProp.position.copy(tmpA);
    handProp.quaternion.setFromEuler(new THREE.Euler(handProp.userData.kind==='phone'?-.9:0,player.rotation.y,0,'YXZ'));}}
function setHandProp(m){if(handProp&&handProp!==m)handProp.parent&&handProp.parent.remove(handProp);handProp=m;if(!m)return;}
// dùng đồ đang cầm: uống / ăn
function useLabel(){if(!held)return null;const k=held.kind;if(isTrash(held))return null;
  if(k==='can'||k==='milk')return'Uống';if(k==='apple'||k==='cake')return'Ăn';if(k==='mug')return held.mesh.userData.level>.05?'Uống trà':null;return null;}
async function useHeld(){if(busy||!held)return;const h=held,k=h.kind;busy=true;
  if(k==='apple'||k==='cake'){for(let i=0;i<3;i++){hum.setArms('eat');await tw(v=>mouthK=v,0,1,380);sfx.bite();const b=h.mesh.userData.body;b.scale.multiplyScalar(.78);if(k==='apple'&&i===2){b.material=b.material.clone();b.material.color.set(0xe8d6a8);b.scale.set(.35,.95,.35);}
      await sleep(260);await tw(v=>mouthK=v,1,0,320);hum.setArms('hold');await sleep(300);}
    if(k==='apple')h.core=true;else{h.mesh.parent.remove(h.mesh);held=null;restPose();}}
  else{hum.setArms('drink');await tw(v=>{mouthK=v;h.tilt=-1.45*v;},0,1,520);const sips=3;
    for(let i=0;i<sips;i++){sfx.gulp();if(k==='mug'){const u=h.mesh.userData;u.level=Math.max(0,u.level-.32);}await sleep(520);}
    await tw(v=>{mouthK=v;h.tilt=-1.45*v;},1,0,460);hum.setArms('hold');if(k!=='mug')h.empty=true;}
  busy=false;}
// đặt đồ xuống chỗ gần nhất (bàn, kệ bếp, kệ TV hoặc sàn)
function putDown(){if(busy||!held||where!=='room')return;const h=held;busy=true;const f=new THREE.Vector3(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y));
  const p=player.position.clone().addScaledVector(f,.5);let y=0;for(const s of SURF)if(p.x>s.x0&&p.x<s.x1&&p.z>s.z0&&p.z<s.z1){y=s.y;break;}
  if(!y){p.x=clamp(p.x,-3.8,3.8);p.z=clamp(p.z,-2.8,2.8);}
  hum.setArms(y>.6?'reach':'reachLow');setTimeout(()=>{held=null;h.tilt=0;addLoose(h.mesh,p.x,y,p.z);if(h.empty||h.core){h.mesh.userData.trash=true;}restPose();sfx.pop();busy=false;},380);}
async function throwTrash(){if(busy||!held)return;const h=held;busy=true;face(bin.position);hum.setArms('throw');await sleep(250);held=null;const m=h.mesh,from=m.position.clone(),to=new THREE.Vector3(bin.position.x,.45,bin.position.z);
  await tw(v=>{m.position.lerpVectors(from,to,v);m.position.y+=Math.sin(v*Math.PI)*.35;m.rotation.x+=.2;},0,1,520);m.parent.remove(m);sfx.door();restPose();busy=false;}
// tủ lạnh: mở cửa, nhìn vào trong, bấm món để lấy
async function openFridge(){if(busy)return;busy=true;face(new THREE.Vector3(FX,1,FZ));hum.setArms('reach');await sleep(350);fridgeOpen=true;sfx.door();await sleep(250);restPose();
  mode='fridge';player.position.set(-2.75,0,-2.3);player.rotation.y=-Math.PI/2;player.visible=false;tweenCam(new THREE.Vector3(-2.55,1.25,-2.3),new THREE.Vector3(FX,.85,FZ),.7);
  const pr=$('#prompt');pr.innerHTML='<kbd>Chuột</kbd><span>bấm vào món muốn lấy</span><kbd>E</kbd><span>đóng tủ</span>';pr._h=null;pr.hidden=false;busy=false;}
async function closeFridge(){if(mode!=='fridge')return;mode='walk';camTween=null;player.visible=true;player.position.set(-2.55,0,-1.55);player.rotation.y=-2.3;yaw=.8;pitch=.25;dist=2.6;if(fridgeHover){fridgeHover.material.emissive.setHex(0);fridgeHover=null;}hum.setArms('reach');await sleep(300);fridgeOpen=false;sfx.door();await sleep(250);restPose();}
async function takeFromFridge(m){if(busy)return;if(held){shake();return;}busy=true;const k=m.userData.fk;hum.setArms('reach');await sleep(380);
  m.visible=false;st.stock[k]=Math.max(0,st.stock[k]-1);APP.save();const it=makeItem(FKIND[k],{color:m.material.color.getHex()});player.parent.add(it);held={mesh:it,kind:FKIND[k],tilt:0};sfx.pop();restPose();busy=false;}
function shake(){const el=$('#prompt');el.animate([{transform:'translateX(-50%)'},{transform:'translateX(-46%)'},{transform:'translateX(-54%)'},{transform:'translateX(-50%)'}],{duration:300});}
// giao đồ ăn: đặt qua điện thoại, chuông cửa, túi đồ ở cửa
let bagOut=null;
APP.on('order',()=>{if(bagOut){APP.toast('Đơn đồ ăn trước vẫn chưa cất vào tủ.');return;}APP.toast('Đã đặt giao đồ ăn. Khoảng 10 giây nữa tới.',2600);
  setTimeout(()=>{sfx.bell();const b=makeItem('bag');bagOut=b;addLoose(b,2.2,0,2.55);APP.toast('Ding dong! Đồ ăn đã giao tới cửa.',3000);},10000);});
async function storeBag(){if(busy)return;const h=held;busy=true;face(new THREE.Vector3(FX,1,FZ));fridgeOpen=true;sfx.door();await sleep(300);hum.setArms('reach');h.pourTo=new THREE.Vector3(FX+.1,.8,FZ);await tw(v=>pourK=v,0,1,500);
  h.mesh.parent.remove(h.mesh);held=null;bagOut=null;pourK=0;st.stock={nuoc:6,sua:2,tao:5,banh:1,da:12};syncFridgeItems();APP.save();sfx.pop();await sleep(500);fridgeOpen=false;sfx.door();restPose();busy=false;}
// pha trà: cầm ấm rót vào cốc trên kệ bếp
function mugAtKettle(){return loose.includes(mug)&&mug.position.distanceTo(KETTLE_BASE)<.7;}
function kettleLabel(){if(held)return null;if(!mugAtKettle())return loose.includes(mug)||held&&held.mesh===mug?'Pha trà (đặt cốc lên kệ bếp trước)':null;return mug.userData.level>.05?null:'Pha trà';}
const stream=new THREE.Mesh(new THREE.CylinderGeometry(.005,.006,1,8),M({color:0xd9ecff,transparent:true,opacity:.7,roughness:.1}));stream.visible=false;scene.add(stream);
async function brewTea(){if(busy||held)return;if(!mugAtKettle()){shake();return;}busy=true;face(KETTLE_BASE);hum.setArms('reach');await sleep(380);
  scene.remove(kettle);held={mesh:kettle,kind:'kettle',tilt:0};hum.setArms('hold');await sleep(350);
  held.pourTo=mug.position.clone().add(new THREE.Vector3(.07,.2,0));hum.setArms('pour');await tw(v=>{pourK=v;held.tilt=1.05*v;},0,1,650);
  stream.visible=true;sfx.pour();const u=mug.userData;u.tea.visible=true;
  await tw(v=>{u.level=v*.9;const a=new THREE.Vector3();kettle.localToWorld(a.set(0,.08,.2));const b=mug.position.clone();b.y+=-.05+.1*u.level;const mid=a.clone().add(b).multiplyScalar(.5);stream.position.copy(mid);stream.scale.y=a.distanceTo(b);stream.lookAt(b);stream.rotateX(Math.PI/2);},0,1,2300);
  stream.visible=false;await tw(v=>{pourK=v;held.tilt=1.05*v;},1,0,500);held.pourTo=null;hum.setArms('reach');await sleep(300);
  held=null;kettle.position.copy(KETTLE_BASE);kettle.quaternion.identity();scene.add(kettle);u.steam=90;restPose();busy=false;}
async function waterPlant(){if(busy||!held)return;const h=held;busy=true;face(plant.position);h.pourTo=new THREE.Vector3(1.85+.1,.95,-2.6+.25);hum.setArms('pour');await tw(v=>{pourK=v;h.tilt=1.1*v;},0,1,600);
  for(let i=0;i<40;i++){const tip=new THREE.Vector3();h.mesh.localToWorld(tip.set(0,.12,.22));spawn(waterTex,tip,new THREE.Vector3(rnd(-.15,.15),-1.2,rnd(-.15,.15)),.55,.03);await sleep(45);}
  plantPerk=4;await tw(v=>{pourK=v;h.tilt=1.1*v;},1,0,450);h.pourTo=null;restPose();busy=false;}
// điện thoại: cầm lên từ bàn hoặc lấy từ túi
async function pickPhone(){if(busy||held)return;busy=true;face(phoneProp.position);hum.setArms('reachLow');await sleep(380);phoneProp.visible=false;phoneFromTable=true;busy=false;APP.emit('phone:open');}
APP.on('phone:state',v=>{if(v){if(!held){setHandProp(phoneHand);hum.setArms('phone');}}else{if(handProp===phoneHand){setHandProp(null);phoneHand.parent&&phoneHand.parent.remove(phoneHand);}restPose();if(phoneFromTable){phoneFromTable=false;phoneProp.visible=true;}}});

/* ================= âm thanh ================= */
const sfx=(()=>{let ac=null,master,loops={};
  function nb(kind){const len=ac.sampleRate*3,b=ac.createBuffer(1,len,ac.sampleRate),d=b.getChannelData(0);let l=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;if(kind){l=(l+.02*w)/1.02;d[i]=l*3.5;}else d[i]=w;}return b;}
  function loop(buf,type,f,q){const s=ac.createBufferSource();s.buffer=buf;s.loop=true;const fl=ac.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=ac.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(master);s.start(0,Math.random()*2);return g;}
  function tone(f,dur,gain,type='sine',t0){if(!ac)return;t0=t0||ac.currentTime;const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(gain,t0+.01);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);o.connect(g);g.connect(master);o.start(t0);o.stop(t0+dur+.05);}
  return{init(){if(ac){ac.resume();return;}try{ac=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}master=ac.createGain();master.gain.value=st.sound?.9:0;master.connect(ac.destination);
      const w=nb(0),b=nb(1);loops.rain=loop(w,'bandpass',1300,.5);loops.rainLow=loop(b,'lowpass',400,.7);loops.fan=loop(b,'bandpass',520,.6);loops.ac=loop(b,'lowpass',260,.7);loops.fridge=loop(b,'lowpass',110,.8);loops.traffic=loop(b,'lowpass',420,.5);
      const ps=ac.createBufferSource();ps.buffer=b;ps.loop=true;const pl=ac.createBiquadFilter();pl.type='lowpass';pl.frequency.value=170;const am=ac.createGain();am.gain.value=.5;const lfo=ac.createOscillator();lfo.frequency.value=23;const lg=ac.createGain();lg.gain.value=.5;lfo.connect(lg);lg.connect(am.gain);loops.purr=ac.createGain();loops.purr.gain.value=0;ps.connect(pl);pl.connect(am);am.connect(loops.purr);loops.purr.connect(master);ps.start();lfo.start();},
    set(n,v){if(!ac||!loops[n]||n!=='purr')return;// tắt mọi tiếng rè nền (quạt, máy lạnh, tủ lạnh, xe, mưa) vì nghe như gió, gây nhức đầu
      loops[n].gain.setTargetAtTime(v,ac.currentTime,.4);},
    mute(m){if(master)master.gain.setTargetAtTime(m?0:.9,ac.currentTime,.2);},
    pop(){tone(660,.1,.05);tone(990,.1,.035,'sine',ac&&ac.currentTime+.05);},
    door(){tone(140,.25,.06,'triangle');},
    step(){if(!ac)return;tone(rnd(70,95),.07,.025,'triangle');},
    beep(){tone(1650,.12,.05,'square');},
    purr(){if(!ac)return;loops.purr.gain.setTargetAtTime(.5,ac.currentTime,.1);setTimeout(()=>loops.purr.gain.setTargetAtTime(0,ac.currentTime,.3),1600);},
    thunder(){if(!ac)return;const s=ac.createBufferSource();s.buffer=nb(1);const g=ac.createGain(),t=ac.currentTime;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.3,t+.15);g.gain.exponentialRampToValueAtTime(.0001,t+3);const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=200;s.connect(f);f.connect(g);g.connect(master);s.start();s.stop(t+3.2);},
    bite(){if(!ac)return;const t=ac.currentTime;for(let i=0;i<3;i++)tone(rnd(900,1400),.04,.03,'square',t+i*.04);},
    gulp(){tone(220,.12,.05,'sine');tone(160,.15,.04,'sine',ac&&ac.currentTime+.08);},
    pour(){if(!ac)return;const s=ac.createBufferSource();s.buffer=nb(0);const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=2200;f.Q.value=1.5;const g=ac.createGain(),t=ac.currentTime;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+.2);g.gain.setValueAtTime(.05,t+2);g.gain.linearRampToValueAtTime(0,t+2.4);s.connect(f);f.connect(g);g.connect(master);s.start();s.stop(t+2.5);},
    bell(){if(!ac)return;const t=ac.currentTime;tone(880,.6,.08,'sine',t);tone(698,.9,.08,'sine',t+.45);},
    horn(){if(!ac)return;const t=ac.currentTime,f=rnd(380,520),g=rnd(.012,.03);tone(f,.14,g,'square',t);tone(f*1.26,.14,g*.8,'square',t);if(Math.random()<.5){tone(f,.12,g,'square',t+.2);tone(f*1.26,.12,g*.8,'square',t+.2);}},
    alarm(){if(!ac)return;const t=ac.currentTime;for(let i=0;i<4;i++){tone(880,.12,.08,'square',t+i*.25);tone(1320,.12,.06,'square',t+i*.25+.12);}}};})();
APP.sfx=sfx;

/* ================= thiết bị (dùng chung với điện thoại) ================= */
APP.dev={get:()=>({fan:st.fan,fanOsc:st.fanOsc,ac:st.ac,acTemp:st.acTemp,ceiling:st.ceiling,lamp:st.lamp,curtains:st.curtains,tv:tvOn}),
  set(k,v){if(k==='tv'){tvKey('power');return;}st[k]=v;if(k==='ac'||k==='acTemp'){st.acTemp=clamp(st.acTemp,16,30);drawAC();sfx.beep();}else sfx.pop();
    if(k==='fan')APP.toast(v?`Quạt số ${v}`:'Đã tắt quạt',1600);if(k==='ac')APP.toast(v?`Máy lạnh bật, ${st.acTemp}°C`:'Đã tắt máy lạnh',1600);
    APP.save();refreshPanel();APP.emit('devices',APP.dev.get());}};

/* ================= panel ================= */
let panelFn=null,panelKey=null;
function openPanel(fn,key){panelFn=fn;panelKey=key;refreshPanel();}
function refreshPanel(){const p=$('#panel');if(!panelFn){p.hidden=true;return;}const d=panelFn();p.hidden=false;
  p.innerHTML=`<h3>${d.title}</h3>${d.text?`<p>${d.text}</p>`:''}<div class="row">${d.buttons.map((b,i)=>`<button class="pb ${b.on?'on':''}" data-i="${i}" ${b.disabled?'disabled':''} ${b.act?'':'style="cursor:default"'}>${b.label}${b.sub?`<small>${b.sub}</small>`:''}</button>`).join('')}</div>`;
  p.querySelectorAll('.pb').forEach(el=>el.onclick=()=>{const b=d.buttons[+el.dataset.i];if(b.act){b.act();refreshPanel();}});}
function closePanel(){if(panelKey==='fridge'&&fridgeOpen){fridgeOpen=false;sfx.door();}panelFn=null;panelKey=null;refreshPanel();}

/* ================= điều khiển ================= */
rain.raycast=()=>{};mist.raycast=()=>{};sky.raycast=()=>{};ledStrip.raycast=()=>{};player.traverse(o=>o.raycast=()=>{});
const camRay=new THREE.Raycaster(),occluders=[];
{const skip=new Set();[player,cat,city].forEach(g=>g.traverse(o=>skip.add(o)));scene.traverse(o=>{if(o.isMesh&&!skip.has(o)&&o!==sky&&o!==ground&&o!==road&&o!==hole&&o!==ledStrip&&o.material!==mat.glass)occluders.push(o);});}
const keys=new Set();let started=false,mode='walk',yaw=.35,pitch=.32,dist=3.2,camTween=null,phoneOpen=false;
APP.on('phone:state',v=>{phoneOpen=v;});
addEventListener('keydown',e=>{const tag=e.target.tagName;if(tag==='INPUT'||tag==='TEXTAREA')return;if(!started)return;
  const k=e.key.toLowerCase();
  if(mode==='tv'||mode==='sit'){const map={arrowup:'up',arrowdown:'down',arrowleft:'left',arrowright:'right',enter:'ok',backspace:'back',' ':'play','+':'volup','=':'volup','-':'voldown',pageup:'chup',pagedown:'chdown'};
    if(k==='escape'){exitMode();e.preventDefault();return;}if(map[k]){tvKey(map[k]);e.preventDefault();return;}if(k==='q'){APP.emit('phone:toggle');return;}return;}
  if(mode==='lie'){if(k==='escape'||k==='e'||k==='w'){exitMode();}return;}
  if(mapOpen){if(k==='escape'||k==='m')closeMap();return;}
  if(k==='v'){svOpen?closeSV():openSV();return;}
  if(svOpen){if(k==='escape')closeSV();return;}
  if(k==='m'&&mode==='walk'){openMap();return;}
  if(mode==='fridge'){if(k==='escape'||k==='e'){closeFridge();}return;}
  if(k==='escape'){if(phoneOpen){APP.emit('phone:close');return;}if(panelFn){closePanel();return;}return;}
  if(k==='q'){APP.emit('phone:toggle');return;}
  if(phoneOpen)return;
  if(k==='e'||k==='enter'){interact();e.preventDefault();return;}
  if(k==='g'){putDown();return;}
  if(k==='f'){if(useLabel())useHeld();return;}
  if(k==='r'){runLock=!runLock;APP.toast(runLock?'Luôn chạy: bật (bấm R để tắt)':'Luôn chạy: tắt',1500);return;}
  if(k===' '){e.preventDefault();if(player.position.y<.01&&mode==='walk'&&!busy)vy=3.6;return;}
  if(k==='h'&&where==='street'){goHome();return;}
  if(k==='t'&&where==='street'){const r=street.toggle3D();APP.toast(r==null?'Phố 3D Google chưa tải xong hoặc chưa có mã Cesium.':r?'Phố 3D thật của Google':'Phố vẽ từ bản đồ mở',1800);return;}
  keys.add(k);if(k.startsWith('arrow'))e.preventDefault();});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('blur',()=>keys.clear());
const cv=renderer.domElement;let drag=null;
cv.addEventListener('pointerdown',e=>{if(!started)return;drag={x:e.clientX,y:e.clientY,moved:0};cv.setPointerCapture(e.pointerId);});
cv.addEventListener('pointermove',e=>{mouse.x=e.clientX/innerWidth*2-1;mouse.y=-(e.clientY/innerHeight)*2+1;hoverDirty=true;
  if(!drag||mode==='tv')return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved+=Math.abs(dx)+Math.abs(dy);drag.x=e.clientX;drag.y=e.clientY;
  if(mode==='walk'||mode==='lie'){yaw-=dx*.006;pitch=clamp(pitch+dy*.004,-.15,1.2);}});
cv.addEventListener('pointerup',e=>{if(drag&&drag.moved<6&&mode==='fridge'){mouse.x=e.clientX/innerWidth*2-1;mouse.y=-(e.clientY/innerHeight)*2+1;const it=pickFridgeItem();if(it)takeFromFridge(it);drag=null;return;}
  if(drag&&drag.moved<6&&mode==='walk'&&where==='room'){mouse.x=e.clientX/innerWidth*2-1;mouse.y=-(e.clientY/innerHeight)*2+1;hovered=pickHover();if(hovered)clickInter(hovered);}drag=null;});
cv.addEventListener('wheel',e=>{if(mode!=='walk')return;dist=clamp(dist+e.deltaY*.0025,1.2,5.5);},{passive:true});
const mouse=new THREE.Vector2(-9,-9),ray=new THREE.Raycaster();let hovered=null,hoverDirty=false,autoWalk=null;
function pickHover(){ray.setFromCamera(mouse,camera);const hits=ray.intersectObjects(scene.children,true);for(const h of hits){if(h.distance>12)break;if(h.object.userData.inter)return h.object.userData.inter;if(h.object!==hole&&!h.object.isSprite&&!h.object.isPoints&&!h.object.isLineSegments)return null;}return null;}
const fridgeItems=[].concat(...Object.keys(FKIND).map(k=>items[k]));let fridgeHover=null;
function pickFridgeItem(){ray.setFromCamera(mouse,camera);const h=ray.intersectObjects(fridgeItems.filter(m=>m.visible),false)[0];return h?h.object:null;}
function distTo(o){return Math.hypot(player.position.x-o.pos.x,player.position.z-o.pos.z);}
function clickInter(o){if(o.label&&o.label()==null)return;if(distTo(o)<=o.r){runInter(o);}else autoWalk={o,t:5};}
function runInter(o){autoWalk=null;if(busy)return;o.act();}
let near=null,runLock=false,vy=0,curSpeed=0,curRun=false;
function interact(){if(busy)return;if(near){runInter(near);return;}if(useLabel())useHeld();}

/* ================= chế độ: TV / sofa / giường ================= */
let saved=null;
function tweenCam(pos,look,dur=.8){camTween={from:camera.position.clone(),fromQ:camera.quaternion.clone(),to:pos.clone(),look:look.clone(),t:0,dur};}
function tvClickable(on){cv.style.pointerEvents=on?'none':'';$('#gl').style.pointerEvents=on?'none':'';}
function autoPowerTV(){let n=0;const tick=()=>{if(tvOn||!(mode==='tv'||mode==='sit'))return;let w=null;try{w=tvIframe.contentWindow;}catch(e){}
  if(w&&w.tvKey&&w.tvIsOn){if(!w.tvIsOn())w.tvKey('power');return;}if(++n<60)setTimeout(tick,150);};setTimeout(tick,200);}
function enterTV(){closePanel();mode='tv';saved=player.position.clone();tweenCam(new THREE.Vector3(0,1.04,-1.45),new THREE.Vector3(0,1.04,-2.84));autoPowerTV();
  setTimeout(()=>{if(mode==='tv')tvClickable(true);},300);$('#tvbar').hidden=false;$('#tvbarTxt').textContent='Đang dùng TV · bấm thẳng lên màn hình hoặc dùng remote';$('#remote').hidden=false;$('#prompt').hidden=true;$('#keys').hidden=true;}
function sitSofa(){if(held){shake();return;}closePanel();mode='sit';player.position.set(0,0,1.32);player.rotation.y=Math.PI;pose='sit';setHandProp(remoteM);hum.setArms('remote');tweenCam(new THREE.Vector3(.6,1.8,2.6),new THREE.Vector3(0,1.04,-2.84),1);autoPowerTV();
  fovTarget=21;setTimeout(()=>{if(mode==='sit')tvClickable(true);},300);
  $('#tvbar').hidden=false;$('#tvbarTxt').textContent='Đang ngồi xem TV · bấm thẳng lên màn hình hoặc dùng remote';$('#remote').hidden=false;$('#prompt').hidden=true;$('#keys').hidden=true;}
function lieBed(){closePanel();mode='lie';pose='lie';const m=new THREE.Matrix4().makeBasis(new THREE.Vector3(0,0,-1),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,1,0));player.quaternion.setFromRotationMatrix(m);player.position.set(-1.98,.66,1.95);
  tweenCam(new THREE.Vector3(-1.1,2.05,.55),new THREE.Vector3(-2.9,.7,1.95),1);APP.toast('Đang nằm nghỉ. Bấm Esc hoặc W để dậy.');$('#prompt').hidden=true;}
function exitMode(){if(mode==='walk')return;if(mode==='fridge'){closeFridge();return;}const was=mode;mode='walk';pose='stand';tvClickable(false);fovTarget=60;if(handProp===remoteM){setHandProp(null);remoteM.parent&&remoteM.parent.remove(remoteM);}restPose();$('#tvbar').hidden=true;$('#remote').hidden=true;$('#keys').hidden=false;
  player.quaternion.identity();if(was==='tv'){player.position.set(0,0,-1.75);player.rotation.y=Math.PI;yaw=0;pitch=.25;}else if(was==='sit'){player.position.set(0,0,.72);player.rotation.y=Math.PI;yaw=0;}else{player.position.set(-1.6,0,1.3);player.rotation.y=Math.PI/2;yaw=-Math.PI/2;}
  camTween=null;try{window.focus();}catch(e){}}
/* ================= ra phố / về phòng ================= */
function fade(on,txt){const f=$('#fade');f.querySelector('span').textContent=txt||'';if(on){f.hidden=false;requestAnimationFrame(()=>f.style.opacity=1);}else{f.style.opacity=0;setTimeout(()=>f.hidden=true,450);}}
const streetOpts=()=>({player,renderer,camera,toast:(m)=>APP.toast(m,4200),onHome:goHome});
async function goOut(target){if(streetBuilding||where==='street')return;closePanel();sfx.door();fade(true,street?'':'Đang dựng khu phố Nguyễn Huệ từ bản đồ thật…');streetBuilding=true;
  try{if(!street){await new Promise(r=>setTimeout(r,450));street=await buildStreet(streetOpts());}}
  catch(e){console.error(e);streetBuilding=false;fade(false);APP.toast('Không dựng được khu phố: '+e.message);return;}
  streetBuilding=false;APP._street=street;scene.remove(player);street.scene.add(player);const s=street.spawn;let spx=s.x,spz=s.z;if(target&&target.x!=null)[spx,spz]=street.safeSpot(target.x,target.z);player.position.set(spx,0,spz);player.rotation.y=s.yaw;yaw=s.yaw+Math.PI;pitch=.28;dist=4.2;
  where='street';camTween=null;camera.far=3000;camera.updateProjectionMatrix();$('#css3d').hidden=true;$('#minimapBox').hidden=false;$('#bHome').hidden=false;$('#hRoomLbl').textContent='Đang ở';
  camera.position.set(spx-Math.sin(s.yaw)*4,2.5,spz-Math.cos(s.yaw)*4);camera.lookAt(spx,1.5,spz);
  setTimeout(()=>{fade(false);APP.toast(target&&target.n?'Đã tới: '+target.n:'Bạn đang đứng trước chung cư 42 Nguyễn Huệ. Bấm M để mở bản đồ.',4500);},200);}
function goHome(){fade(true);setTimeout(()=>{camera.far=300;camera.updateProjectionMatrix();street.scene.remove(player);scene.add(player);player.position.set(2.575,0,2.3);player.rotation.y=Math.PI;yaw=0;pitch=.3;dist=3.2;where='room';
  $('#css3d').hidden=false;$('#minimapBox').hidden=true;$('#bHome').hidden=true;$('#hRoomLbl').textContent='Trong phòng';camera.position.set(2.575,2,3.5);sfx.door();updHud();fade(false);},350);}
document.querySelectorAll('#remote [data-k]').forEach(b=>b.addEventListener('click',()=>{sfx.beep&&sfx.pop();tvKey(b.dataset.k);}));
$('#tvExit').onclick=exitMode;

/* ================= vòng lặp ================= */
let pose='stand',stepT=0,last=performance.now(),T=0,flashT=0,skyT=0,hudT=0;
const tmpV=new THREE.Vector3();
function moveChar(dt){let ix=0,iz=0;if(keys.has('w')||keys.has('arrowup'))iz+=1;if(keys.has('s')||keys.has('arrowdown'))iz-=1;if(keys.has('a')||keys.has('arrowleft'))ix-=1;if(keys.has('d')||keys.has('arrowright'))ix+=1;
  if(busy){curSpeed=0;return false;}
  const run=keys.has('shift')!==runLock;let mx=0,mz=0;
  if(ix||iz){autoWalk=null;const fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);mx=fx*iz+rx*ix;mz=fz*iz+rz*ix;}
  else if(autoWalk){const o=autoWalk.o,dx=o.pos.x-player.position.x,dz=o.pos.z-player.position.z,d=Math.hypot(dx,dz);autoWalk.t-=dt;if(d<=o.r*.9){runInter(o);}else if(autoWalk.t<0){autoWalk=null;APP.toast('Không tới gần được, thử đi vòng nhé.');}else{mx=dx/d;mz=dz/d;}}
  const l=Math.hypot(mx,mz);const sp=where==='street'?(run?6.5:2.2):(run?3.6:1.8);
  // nhảy
  if(vy!==0||player.position.y>0){vy-=9.8*dt;player.position.y+=vy*dt;if(player.position.y<=0){player.position.y=0;vy=0;sfx.step();}}
  curRun=run&&l>0;curSpeed=l>0?sp:0;
  if(l>0){mx/=l;mz/=l;player.position.x+=mx*sp*dt;player.position.z+=mz*sp*dt;const target=Math.atan2(mx,mz);let dr=target-player.rotation.y;dr=Math.atan2(Math.sin(dr),Math.cos(dr));player.rotation.y+=dr*Math.min(1,dt*12);
    stepT-=dt*sp;if(stepT<0&&player.position.y===0){stepT=run?.95:.72;sfx.step();}if(panelFn&&near&&panelKey!==near.name)closePanel();}
  // va chạm
  const p=player.position;if(where==='street'){street.collide(p);return l>0;}
  p.x=clamp(p.x,-4+PR,4-PR);p.z=clamp(p.z,-3+PR,3-PR);
  for(const c of colliders){const x0=c.x0-PR,x1=c.x1+PR,z0=c.z0-PR,z1=c.z1+PR;if(p.x>x0&&p.x<x1&&p.z>z0&&p.z<z1){const dl=p.x-x0,dr=x1-p.x,dn=p.z-z0,ds=z1-p.z,m=Math.min(dl,dr,dn,ds);if(m===dl)p.x=x0;else if(m===dr)p.x=x1;else if(m===dn)p.z=z0;else p.z=z1;}}
  return l>0;}
function animChar(moving,dt){crouchT=Math.max(0,crouchT-dt);
  const base=pose==='sit'?'sit':pose==='lie'?'lie':crouchT>0?'crouch':'stand';
  hum.update(dt,{speed:moving?curSpeed:0,run:curRun,base,air:mode==='walk'&&player.position.y>.02});}
let fovTarget=60,camOccT=0,streetCamK=1,where='room',street=null,streetBuilding=false,mapT=0,hornT=3,lastEnv={};
function updCam(dt){if(Math.abs(camera.fov-fovTarget)>.05){camera.fov=lerp(camera.fov,fovTarget,1-Math.pow(.02,dt));camera.updateProjectionMatrix();}
  if(camTween){const c=camTween;c.t+=dt;const k=smooth(0,1,c.t/c.dur);camera.position.lerpVectors(c.from,c.to,k);const m=new THREE.Matrix4().lookAt(c.to,c.look,new THREE.Vector3(0,1,0));const q=new THREE.Quaternion().setFromRotationMatrix(m);camera.quaternion.slerpQuaternions(c.fromQ,q,k);if(mode==='walk')camTween=null;return;}
  if(mode!=='walk')return;
  const tgt=tmpV.set(player.position.x,1.5,player.position.z);let cp=new THREE.Vector3(tgt.x+Math.sin(yaw)*Math.cos(pitch)*dist,tgt.y+Math.sin(pitch)*dist,tgt.z+Math.cos(yaw)*Math.cos(pitch)*dist);
  // camera không xuyên tường: rút lại dọc theo tia từ nhân vật ra
  let k=1;const dx=cp.x-tgt.x,dy=cp.y-tgt.y,dz=cp.z-tgt.z;
  if(where==='street'){const len=Math.hypot(dx,dy,dz);camOccT-=dt;if(camOccT<0){camOccT=.1;camRay.set(tgt,new THREE.Vector3(dx/len,dy/len,dz/len));camRay.far=len;const h=camRay.intersectObjects(street.occluders,false)[0];streetCamK=h?Math.max(.15,(h.distance-.3)/len):1;}
    k=streetCamK;if(tgt.y+dy*k<.4)k=Math.max(.1,(.4-tgt.y)/dy);cp.set(tgt.x+dx*k,tgt.y+dy*k,tgt.z+dz*k);camera.position.lerp(cp,1-Math.pow(.0001,dt));camera.lookAt(tgt);return;}
  if(tgt.x+dx>3.75)k=Math.min(k,(3.75-tgt.x)/dx);if(tgt.x+dx<-3.75)k=Math.min(k,(-3.75-tgt.x)/dx);
  if(tgt.z+dz>2.75)k=Math.min(k,(2.75-tgt.z)/dz);if(tgt.z+dz<-2.75)k=Math.min(k,(-2.75-tgt.z)/dz);
  if(tgt.y+dy>2.55)k=Math.min(k,(2.55-tgt.y)/dy);if(tgt.y+dy<.3)k=Math.min(k,(.3-tgt.y)/dy);
  // tránh đồ vật che giữa nhân vật và camera
  const len=Math.hypot(dx,dy,dz);camRay.set(tgt,new THREE.Vector3(dx/len,dy/len,dz/len));camRay.far=len*k;
  const hit=camRay.intersectObjects(occluders,false)[0];if(hit)k=Math.min(k,Math.max(.12,(hit.distance-.18)/len));
  k=clamp(k,.12,1);cp.set(tgt.x+dx*k,tgt.y+dy*k,tgt.z+dz*k);
  camera.position.lerp(cp,1-Math.pow(.0001,dt));camera.lookAt(tgt);}
function updCat(dt){const a=catAI;a.t-=dt;
  if(a.mode==='happy'){cat.position.y=Math.abs(Math.sin(T*8))*.03;if(a.t<0){a.mode='idle';a.t=2;}return;}
  if(a.mode==='idle'){cat.position.y=0;if(a.t<0){a.mode='walk';const follow=Math.random()<.35;let tx,tz,ok=false;for(let k=0;k<20&&!ok;k++){tx=follow?player.position.x+rnd(-.8,.8):rnd(-3.5,3.5);tz=follow?player.position.z+rnd(-.8,.8):rnd(-2.6,2.6);ok=!colliders.some(c=>tx>c.x0-.25&&tx<c.x1+.25&&tz>c.z0-.25&&tz<c.z1+.25);}a.tx=ok?tx:cat.position.x;a.tz=ok?tz:cat.position.z;a.t=8;}return;}
  const dx=a.tx-cat.position.x,dz=a.tz-cat.position.z,d=Math.hypot(dx,dz);if(d<.08||a.t<0){a.mode='idle';a.t=rnd(3,8);return;}
  const v=.55;cat.position.x+=dx/d*v*dt;cat.position.z+=dz/d*v*dt;let dr=Math.atan2(dx,dz)-cat.rotation.y;dr=Math.atan2(Math.sin(dr),Math.cos(dr));cat.rotation.y+=dr*Math.min(1,dt*6);
  cat.position.y=Math.abs(Math.sin(T*10))*.015;catLegs.forEach((l,i)=>l.rotation.x=Math.sin(T*10+i*Math.PI)*.4);
  const p=cat.position;for(const c of colliders){if(p.x>c.x0-.15&&p.x<c.x1+.15&&p.z>c.z0-.15&&p.z<c.z1+.15){a.mode='idle';a.t=1;break;}}}

function updEnv(dt){const w=APP.weather,h=cityHour();const sr=w?w.sunrise:6,ss=w?w.sunset:18;
  const day=smooth(sr-.6,sr+.6,h)*(1-smooth(ss-.6,ss+.6,h));const twi=Math.max(1-Math.abs(h-sr)/1.2,1-Math.abs(h-ss)/1.2,0);
  const cloud=w?w.cloud:.4,rainAmt=w?WX(w.code)[2]:0,storm=w&&w.code>=95;
  // mặt trời qua cửa sổ hướng đông
  const t=clamp((h-sr)/(ss-sr),0,1);sun.position.set(Math.cos(t*Math.PI)*14,Math.sin(t*Math.PI)*10+1.5,-2.5);sun.target.position.set(0,0,0);
  sun.intensity=day*(t<.5?3.2:.6)*(1-cloud*.75)*(rainAmt?.35:1);sun.color.setHSL(.09,.6,lerp(.62,.88,1-twi));
  const curtainK=lerp(.25,1,curOpen);sun.intensity*=curtainK;
  hemi.intensity=(.22+day*.75*(1-cloud*.35))*lerp(.45,1,curOpen)+flashT*3;hemi.color.setHSL(.6,.4,lerp(.45,.85,day));
  const ce=st.ceiling?1:0,la=st.lamp?1:0;ceilSpot.intensity=lerp(ceilSpot.intensity,ce*26,.15);ceilFill.intensity=lerp(ceilFill.intensity,ce*7,.15);ceilDisc.material.emissiveIntensity=ce*1.6;
  lampLight.intensity=lerp(lampLight.intensity,la*5,.15);shadeMat.emissiveIntensity=la*.9;
  tvLight.intensity=lerp(tvLight.intensity,tvOn?(2.2+Math.sin(T*7)*.25+Math.sin(T*2.3)*.3):0,.1);ledStrip.material.opacity=lerp(ledStrip.material.opacity,tvOn?.35:0,.05);
  renderer.toneMappingExposure=lerp(.95,1.1,day);
  // bầu trời
  skyT-=dt;if(skyT<0){skyT=.25;drawSky(h,day,twi,cloud,rainAmt);}
  const night=1-day;city.children.forEach(b=>{if(b.material&&b.material.emissiveMap){b.material.emissiveIntensity=night*1.1;b.material.color.setScalar(lerp(.18,1,day));}});lamps.forEach(l=>l.visible=night>.3);
  for(const c of cars){c.position.z+=c.userData.dir*c.userData.v*dt;if(c.position.z>40)c.position.z=-40;if(c.position.z<-40)c.position.z=40;}
  rain.material.opacity=rainAmt*.55;if(rainAmt){const p=rainPos;for(let i=0;i<RN;i++){const o=i*6;p[o+1]-=12*dt;p[o+4]-=12*dt;if(p[o+1]<-9){const y=8+rnd(0,2);p[o+1]=y;p[o+4]=y-.35;}}rainGeo.attributes.position.needsUpdate=true;}
  if(storm&&Math.random()<dt*.06){flashT=1;setTimeout(()=>sfx.thunder(),rnd(300,1500));}flashT=Math.max(0,flashT-dt*3);
  // âm thanh môi trường
  const out_=where==='street';
  const rs=st.rainSound===false?0:rainAmt;sfx.set('rain',rs*(out_?.09:.045*lerp(.6,1,curOpen)));sfx.set('rainLow',rs*(out_?.08:.05));sfx.set('fan',out_?0:[0,.05,.09,.14][st.fan]);sfx.set('ac',!out_&&st.ac?.07:0);sfx.set('fridge',out_?0:fridgeOpen?.08:.015);
  // nhiệt độ phòng
  const out=w?w.temp:30,target=st.ac?st.acTemp:out+1.5,rate=st.ac?.06:.01;st.roomTemp+=clamp(target-st.roomTemp,-rate*dt*10,rate*dt*10)*.1;
  lastEnv={day,twi,cloud,rainAmt,h,flash:flashT,sr,ss};return lastEnv;}
function drawSky(h,day,twi,cloud,rainAmt){const{g}=skyTex.userData,W=512,H=256;const top=new THREE.Color().setHSL(.62,.55,lerp(.06,.52,day)),bot=new THREE.Color().setHSL(lerp(.66,.58,day),.45,lerp(.12,.78,day));
  if(twi>0){bot.lerp(new THREE.Color(0xff9a62),twi*.7);top.lerp(new THREE.Color(0x6a5c9a),twi*.4);}
  const grey=clamp(cloud*.6+rainAmt*.4,0,.9);top.lerp(new THREE.Color().setHSL(.6,.08,lerp(.1,.55,day)),grey);bot.lerp(new THREE.Color().setHSL(.6,.06,lerp(.14,.7,day)),grey);
  const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#'+top.getHexString());gr.addColorStop(1,'#'+bot.getHexString());g.fillStyle=gr;g.fillRect(0,0,W,H);
  if(day<.5&&cloud<.8)for(const s of stars){g.globalAlpha=(1-day*2)*(1-cloud)*(.5+.5*Math.sin(T*2+s[3]));g.fillStyle='#fff';g.fillRect(s[0],s[1],s[2],s[2]);}g.globalAlpha=1;
  if(day>.05){const sr=APP.weather?APP.weather.sunrise:6,ss=APP.weather?APP.weather.sunset:18,t=clamp((h-sr)/(ss-sr),0,1),sx=W*(.5+.4*Math.cos(t*Math.PI)),sy=H*(.75-.6*Math.sin(t*Math.PI));const r=g.createRadialGradient(sx,sy,0,sx,sy,60);r.addColorStop(0,`rgba(255,245,210,${.9*(1-cloud*.8)})`);r.addColorStop(1,'rgba(255,230,180,0)');g.fillStyle=r;g.fillRect(sx-60,sy-60,120,120);}
  else{const mx=W*.35,my=H*.3;g.fillStyle=`rgba(240,238,220,${1-cloud*.8})`;g.beginPath();g.arc(mx,my,12,0,7);g.fill();}
  const n=Math.round(cloud*cloudBlobs.length);for(let i=0;i<n;i++){const c=cloudBlobs[i];c.x+=c.v*.25*.25;if(c.x>W+80)c.x=-80;g.fillStyle=`rgba(${lerp(70,240,day)|0},${lerp(75,242,day)|0},${lerp(90,248,day)|0},${.55+grey*.3})`;for(const[ox,oy,r]of[[0,0,26],[24,-8,30],[50,0,22],[24,8,24]]){g.beginPath();g.ellipse(c.x+ox*c.s,c.y+oy*c.s,r*c.s*1.3,r*c.s*.8,0,0,7);g.fill();}}
  if(flashT>0){g.fillStyle=`rgba(230,235,255,${flashT*.7})`;g.fillRect(0,0,W,H);}
  skyTex.needsUpdate=true;}
const DAYS=['Chủ nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
function updHud(){const d=new Date(),p=n=>String(n).padStart(2,'0');$('#hTime').textContent=`${p(d.getHours())}:${p(d.getMinutes())}`;$('#hDate').textContent=`${DAYS[d.getDay()]}, ${d.getDate()}/${d.getMonth()+1}`;
  const w=APP.weather;if(w){const i=APP.wxInfo(w.code,w.isDay);$('#hWxIc').textContent=i[0];$('#hOut').textContent=Math.round(w.temp)+'°';$('#hWx').textContent=`${i[1]} · ${st.city.name}`;}
  if(where==='street'){const n=street.streetName(player.position.x,player.position.z);$('#hRoom').textContent=n||'Quận 1';$('#hRoom').style.fontSize=n&&n.length>12?'18px':'';}
  else{$('#hRoom').textContent=st.roomTemp.toFixed(1)+'°';$('#hRoom').style.fontSize='';}}

function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;T+=dt;
  let moving=false;if(started&&mode==='walk'&&!phoneOpen&&!mapOpen)moving=moveChar(dt);
  animChar(moving,dt);updCam(dt);updCat(dt);const env=updEnv(dt);updHeld();
  if(where==='street'){const r=street.update(dt,env,player);sfx.set('traffic',.05+.12*r.traffic);hornT-=dt*r.traffic;if(hornT<0){hornT=rnd(1.5,6);sfx.horn(Math.hypot(1,1));}
    mapT-=dt;if(mapT<0){mapT=.05;street.drawMinimap($('#minimap'),player.position.x,player.position.z,player.rotation.y);}
    let best=null,bd=9;for(const o of street.interactables(player.position.x,player.position.z)){const d=distTo(o);if(d<o.r&&d<bd){bd=d;best=o;}}near=best;
    showPrompt(near&&mode==='walk'?near.label():null);
    hudT-=dt;if(hudT<0){hudT=1;updHud();}
    renderer.render(street.scene,camera);requestAnimationFrame(frame);return;}
  sfx.set('traffic',.012);
  // đồ vật chuyển động
  const fs=[0,9,15,22][st.fan];fanAng+=fs*dt;blades.rotation.z=-fanAng;if(st.fan&&st.fanOsc){fanOscT+=dt*.5;fanHead.rotation.y=Math.sin(fanOscT)*.7;}
  if(st.fan){const sway=Math.sin(T*3)*.012*st.fan;curL.m.rotation.z=sway;curR.m.rotation.z=-sway;leaves.forEach((l,i)=>l.rotation.z=Math.sin(T*4+i)*.03*st.fan);}else leaves.forEach((l,i)=>l.rotation.z=Math.sin(T*.8+i)*.01+(plantPerk>0?.05:0));plantPerk=Math.max(0,plantPerk-dt);
  flap.rotation.x=lerp(flap.rotation.x,st.ac?.9:0,.05);mist.visible=st.ac;if(st.ac){for(let i=0;i<mistN;i++){mistPos[i*3+1]-=mistV[i]*dt;mistPos[i*3+2]+=mistV[i]*dt*.8;if(mistPos[i*3+1]<-.9){mistPos[i*3+1]=-.15;mistPos[i*3+2]=.12;mistPos[i*3]=rnd(-.4,.4);}}mistGeo.attributes.position.needsUpdate=true;}
  fridgeAng=lerp(fridgeAng,fridgeOpen?1.75:0,.12);dLow.p.rotation.y=fridgeAng;dTop.p.rotation.y=fridgeAng*.95;fLight.intensity=fridgeOpen?1.2:0;mat.inner.emissive.setScalar(fridgeOpen?.25:0);
  curOpen=lerp(curOpen,st.curtains?1:0,.06);const cs=lerp(.28,1,1-curOpen);curL.pv.scale.z=cs;curR.pv.scale.z=cs;
  phoneGlow.material.color.setHSL(.7,.6,.35+Math.sin(T*2)*.1);
  {const u=mug.userData;u.tea.scale.y=Math.max(.001,u.level*.09);u.tea.position.y=-.048+u.level*.045;u.tea.visible=u.level>.01;
    if(u.steam>0&&u.level>.05){u.steam-=dt;if(Math.random()<dt*5){const p=mug.position.clone();p.y+=.07;spawn(steamTex,p,new THREE.Vector3(rnd(-.02,.02),.13,rnd(-.02,.02)),1.8,.07);}}}
  fanLeds.forEach((l,i)=>l.material.color.setHex(i===st.fan?(i?0x6bff8f:0xff5a5a):0x333333));
  if(mode==='fridge'){if(hoverDirty){const it=pickFridgeItem();if(fridgeHover&&fridgeHover!==it)fridgeHover.material.emissive.setHex(0);fridgeHover=it;if(it)it.material.emissive.setHex(0x553311);cv.style.cursor=it?'pointer':'default';hoverDirty=false;}}
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=dt;if(p.life<=0){scene.remove(p.s);p.s.material.dispose();parts.splice(i,1);continue;}p.s.position.addScaledVector(p.vel,dt);p.s.material.opacity=Math.min(1,p.life/p.max*2);p.s.scale.setScalar(p.size*(1.4-p.life/p.max*.4));}
  // gợi ý tương tác
  if(started&&mode==='walk'){if(hoverDirty){hovered=pickHover();hoverDirty=false;cv.style.cursor=hovered?'pointer':'grab';}
    let best=null,bd=9;for(const o of inters.concat(looseInters())){const d=distTo(o);if(d<o.r&&d<bd&&o.label()!=null){bd=d;best=o;}}near=best;
    const show=hovered&&hovered.label()!=null&&distTo(hovered)<=hovered.r?hovered:near;near=show;showPrompt(show?show.label():null);
    if(panelFn&&(!near||near.name!==panelKey))closePanel();}
  else if(started&&mode!=='fridge'&&mode!=='walk')$('#prompt').hidden=true;
  hudT-=dt;if(hudT<0){hudT=1;updHud();}
  renderer.render(scene,camera);cssR.render(cssScene,camera);requestAnimationFrame(frame);}

/* ================= camera chụp ảnh cho điện thoại ================= */
APP.capture=()=>{renderer.render(scene,camera);return renderer.domElement.toDataURL('image/jpeg',.85);};
APP.setShirt=c=>{st.shirt=c;hum.setColors({shirt:c});APP.save();};
function showPrompt(main){const p=$('#prompt');const parts=[];
  if(main)parts.push(['E',main]);{const u=useLabel();if(u&&!busy)parts.push(['F',u]);}
  if(held&&where==='room'&&!busy)parts.push(['G','Đặt xuống']);
  if(!parts.length||busy){p.hidden=true;return;}
  const html=parts.map(([k,t])=>`<kbd>${k}</kbd><span>${t}</span>`).join('');if(p._h!==html){p.innerHTML=html;p._h=html;}p.hidden=false;}

/* ================= bắt đầu ================= */
camera.position.set(1.5,2,1.5);camera.lookAt(0,1,-1);
updHud();requestAnimationFrame(frame);
const go=$('#go');
let iframeReady=false;tvIframe.addEventListener('load',()=>{iframeReady=true;});
setTimeout(()=>{go.disabled=false;go.textContent='Vào phòng';msg('');},400);
go.onclick=()=>{started=true;$('#start').hidden=true;sfx.init();renderer.domElement.focus();if(!APP.weather)fetchWeather();};
$('#bSound').onclick=()=>{st.sound=!st.sound;sfx.mute(!st.sound);$('#bSound').textContent='Âm thanh: '+(st.sound?'bật':'tắt');APP.save();};
$('#bSound').textContent='Âm thanh: '+(st.sound?'bật':'tắt');
const rainBtn=()=>{$('#bRain').textContent='Tiếng mưa: '+(st.rainSound===false?'tắt':'bật');};rainBtn();
$('#bRain').onclick=()=>{st.rainSound=st.rainSound===false;rainBtn();APP.save();APP.toast(st.rainSound?'Đã bật tiếng mưa':'Đã tắt tiếng mưa (mưa vẫn rơi ngoài cửa sổ)',1800);};
$('#bPhone').onclick=()=>APP.emit('phone:toggle');
$('#bHome').onclick=()=>{if(where==='street')goHome();};
APP.on('weather',()=>{updHud();skyT=0;});
APP.on('alarm',()=>sfx.alarm());
/* ================= bản đồ lớn: xem vị trí, tìm địa điểm, dịch chuyển ================= */
let mapOpen=false,mapView={cx:0,cz:0,zoom:1},mapSel=null,mapDrag=null;
const mcv=$('#mapcv'),mg=mcv.getContext('2d');
const norm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'d').toLowerCase();
const KINDV={home:'Nhà của bạn',street:'Đường phố',bld:'Toà nhà',pin:'Điểm đã chọn',cafe:'Quán cà phê',restaurant:'Nhà hàng',fast_food:'Đồ ăn nhanh',bar:'Quán bar',pub:'Quán bia',hotel:'Khách sạn',bank:'Ngân hàng',atm:'ATM',pharmacy:'Nhà thuốc',clothes:'Cửa hàng quần áo',bakery:'Tiệm bánh',books:'Nhà sách',ice_cream:'Quán kem',supermarket:'Siêu thị',convenience:'Cửa hàng tiện lợi',museum:'Bảo tàng',theatre:'Nhà hát',cinema:'Rạp phim',place_of_worship:'Nơi thờ tự',fuel:'Cây xăng',parking:'Bãi giữ xe'};
const kindIcon=k=>k==='home'?'🏠':k==='street'?'🛣️':k==='bld'?'🏢':k==='pin'?'📍':(street.ICON[k]||'📍');
const kindName=k=>KINDV[k]||'Địa điểm';
const gmUrl=(x,z)=>{const[la,lo]=street.toLatLon(x,z);return`https://www.google.com/maps/search/?api=1&query=${la},${lo}`;};
function playerXZ(){return where==='street'?{x:player.position.x,z:player.position.z}:{x:street.spawn.x,z:street.spawn.z};}
async function openMap(){if(mapOpen||streetBuilding)return;if(mode!=='walk')exitMode();if(phoneOpen)APP.emit('phone:close');
  if(!street){fade(true,'Đang tải bản đồ khu phố…');streetBuilding=true;try{street=await buildStreet(streetOpts());}catch(e){streetBuilding=false;fade(false);APP.toast('Không tải được bản đồ: '+e.message);return;}streetBuilding=false;fade(false);}
  mapOpen=true;keys.clear();const p=playerXZ();mapView={cx:p.x,cz:p.z,zoom:1.4};mapSel=null;$('#mapSel').hidden=true;$('#mapq').value='';$('#bigmap').hidden=false;
  const r=mcv.getBoundingClientRect();mcv.width=Math.round(r.width);mcv.height=Math.round(r.height);renderMapList();updMapWhere();drawMap();}
function closeMap(){if(!mapOpen)return;mapOpen=false;$('#bigmap').hidden=true;$('#mapq').blur();}
function w2c(x,z){return[mcv.width/2+(x-mapView.cx)*mapView.zoom,mcv.height/2+(z-mapView.cz)*mapView.zoom];}
function c2w(px,py){return[mapView.cx+(px-mcv.width/2)/mapView.zoom,mapView.cz+(py-mcv.height/2)/mapView.zoom];}
function drawMap(){if(!mapOpen)return;const W=mcv.width,H=mcv.height,MS=street.MS,z=mapView.zoom;mg.fillStyle='#d8d2c6';mg.fillRect(0,0,W,H);
  const sw=W/z*MS,sh=H/z*MS;mg.imageSmoothingEnabled=true;mg.drawImage(street.mapC,500+mapView.cx*MS-sw/2,500+mapView.cz*MS-sh/2,sw,sh,0,0,W,H);
  mg.textAlign='center';mg.textBaseline='middle';
  for(const p of street.places){if(p.k!=='street'&&p.k!=='bld')continue;if(p.k==='bld'&&z<1.6)continue;const[x,y]=w2c(p.x,p.z);if(x<-50||y<0||x>W+50||y>H)continue;
    mg.font=(p.k==='street'?'700 13px':'500 11px')+' "Be Vietnam Pro",sans-serif';const t=p.k==='street'?p.n.replace('Đường ',''):p.n;mg.lineWidth=4;mg.strokeStyle='rgba(255,255,255,.92)';mg.strokeText(t,x,y);mg.fillStyle=p.k==='street'?'#3b3240':'#7a5c40';mg.fillText(t,x,y);}
  if(z>=2.4){mg.font='15px sans-serif';for(const p of street.places){if(p.k==='street'||p.k==='bld'||p.k==='home')continue;const[x,y]=w2c(p.x,p.z);if(x<0||y<0||x>W||y>H)continue;mg.fillText(kindIcon(p.k),x,y);}}
  {const[x,y]=w2c(street.spawn.x,street.spawn.z);mg.font='22px sans-serif';mg.fillText('🏠',x,y-8);}
  if(mapSel){const[x,y]=w2c(mapSel.x,mapSel.z);mg.fillStyle='#e8453c';mg.beginPath();mg.arc(x,y-16,10,Math.PI,0);mg.lineTo(x,y);mg.closePath();mg.fill();mg.fillStyle='#fff';mg.beginPath();mg.arc(x,y-16,4,0,7);mg.fill();}
  const p=playerXZ(),[px,py]=w2c(p.x,p.z);mg.fillStyle='rgba(47,111,224,.2)';mg.beginPath();mg.arc(px,py,24,0,7);mg.fill();
  mg.save();mg.translate(px,py);mg.rotate(Math.PI-(where==='street'?player.rotation.y:street.spawn.yaw));mg.fillStyle='#2f6fe0';mg.strokeStyle='#fff';mg.lineWidth=2.5;mg.beginPath();mg.moveTo(0,-13);mg.lineTo(9,10);mg.lineTo(0,4);mg.lineTo(-9,10);mg.closePath();mg.fill();mg.stroke();mg.restore();
  mg.fillStyle='rgba(24,19,33,.8)';mg.beginPath();mg.arc(30,30,18,0,7);mg.fill();mg.fillStyle='#fff';mg.font='bold 13px sans-serif';mg.fillText('B',30,25);mg.fillText('↑',30,38);}
function nearestPlace(x,z,rad){let best=null,bd=rad;for(const p of street.places){if(p.k==='street')continue;const d=Math.hypot(p.x-x,p.z-z);if(d<bd){bd=d;best=p;}}return best;}
function selectPlace(p,center){mapSel=p;$('#mapSel').hidden=false;$('#selName').textContent=kindIcon(p.k)+' '+p.n;
  const d=Math.round(Math.hypot(p.x-playerXZ().x,p.z-playerXZ().z));$('#selKind').textContent=`${kindName(p.k)} · cách bạn khoảng ${d>=1000?(d/1000).toFixed(1)+' km':d+' m'}`;$('#selGm').href=gmUrl(p.x,p.z);
  if(center){mapView.cx=p.x;mapView.cz=p.z;mapView.zoom=Math.max(mapView.zoom,2.2);}drawMap();}
function renderMapList(){const q=norm($('#mapq').value.trim());let list=street.places;
  if(q)list=list.filter(p=>norm(p.n).includes(q));else list=list.filter(p=>p.k==='home'||p.k==='street'||p.k==='bld');
  const box=$('#maplist');box.innerHTML=list.slice(0,120).map((p,i)=>`<button class="mitem" data-i="${street.places.indexOf(p)}"><i>${kindIcon(p.k)}</i><span>${p.n.replace(/[<>&]/g,'')}</span><small>${kindName(p.k)}</small></button>`).join('')||'<small style="color:var(--soft);padding:10px">Không tìm thấy. Thử gõ tên khác, không cần dấu.</small>';
  box.querySelectorAll('.mitem').forEach(b=>b.onclick=()=>{box.querySelectorAll('.mitem').forEach(x=>x.classList.toggle('on',x===b));selectPlace(street.places[+b.dataset.i],true);});}
function updMapWhere(){const p=playerXZ();let txt='Trong phòng · chung cư 42 Nguyễn Huệ, Quận 1';if(where==='street'){const n=street.streetName(p.x,p.z);txt='Đang ở '+(n?'đường '+n:'khu Nguyễn Huệ')+', Quận 1';}$('#mapWhere').textContent=txt;$('#gmLink').href=gmUrl(p.x,p.z);}
function teleport(p){closeMap();if(where!=='street'){goOut(p);return;}fade(true);sfx.door();setTimeout(()=>{const[x,z]=street.safeSpot(p.x,p.z);player.position.set(x,0,z);vy=0;camera.position.set(x-Math.sin(player.rotation.y)*4,3,z-Math.cos(player.rotation.y)*4);updHud();fade(false);APP.toast('Đã tới: '+p.n,3000);},380);}
mcv.addEventListener('pointerdown',e=>{mapDrag={x:e.offsetX,y:e.offsetY,m:0};mcv.setPointerCapture(e.pointerId);});
mcv.addEventListener('pointermove',e=>{if(!mapDrag)return;const dx=e.offsetX-mapDrag.x,dy=e.offsetY-mapDrag.y;mapDrag.m+=Math.abs(dx)+Math.abs(dy);mapDrag.x=e.offsetX;mapDrag.y=e.offsetY;mapView.cx-=dx/mapView.zoom;mapView.cz-=dy/mapView.zoom;drawMap();});
mcv.addEventListener('pointerup',e=>{if(mapDrag&&mapDrag.m<5){const[x,z]=c2w(e.offsetX,e.offsetY);selectPlace(nearestPlace(x,z,14/mapView.zoom)||{n:'Điểm đã chọn trên bản đồ',x,z,k:'pin'});}mapDrag=null;});
mcv.addEventListener('wheel',e=>{e.preventDefault();const[wx,wz]=c2w(e.offsetX,e.offsetY);mapView.zoom=clamp(mapView.zoom*(e.deltaY<0?1.2:1/1.2),.5,6);const[nx,nz]=c2w(e.offsetX,e.offsetY);mapView.cx+=wx-nx;mapView.cz+=wz-nz;drawMap();},{passive:false});
$('#mzIn').onclick=()=>{mapView.zoom=clamp(mapView.zoom*1.4,.5,6);drawMap();};$('#mzOut').onclick=()=>{mapView.zoom=clamp(mapView.zoom/1.4,.5,6);drawMap();};
$('#mzMe').onclick=()=>{const p=playerXZ();mapView.cx=p.x;mapView.cz=p.z;drawMap();};
$('#selGo').onclick=()=>{if(mapSel)teleport(mapSel);};$('#mapClose').onclick=closeMap;
$('#bigmap').addEventListener('pointerdown',e=>{if(e.target.id==='bigmap')closeMap();});
$('#mapq').addEventListener('input',renderMapList);
$('#mapq').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')closeMap();if(e.key==='Enter'){const b=$('#maplist .mitem');if(b)b.click();}});
$('#bMap').onclick=()=>mapOpen?closeMap():openMap();
APP.on('map:open',()=>openMap());
/* ================= ảnh đường phố thật (Google Street View nhúng chính thức) ================= */
let svOpen=false;
async function ensureStreet(){if(street)return true;if(streetBuilding)return false;fade(true,'Đang tải bản đồ khu phố…');streetBuilding=true;try{street=await buildStreet(streetOpts());}catch(e){streetBuilding=false;fade(false);APP.toast('Không tải được bản đồ: '+e.message);return false;}streetBuilding=false;fade(false);return true;}
async function openSV(x,z,heading,name){if(!await ensureStreet())return;if(mapOpen)closeMap();if(phoneOpen)APP.emit('phone:close');
  if(x==null){const p=playerXZ();x=p.x;z=p.z;const v=new THREE.Vector3();camera.getWorldDirection(v);heading=where==='street'?(Math.atan2(v.x,-v.z)*180/Math.PI+360)%360:(180-street.spawn.yaw*180/Math.PI+360)%360;}
  const[sx,sz]=street.snapRoad(x,z);const[la,lo]=street.toLatLon(sx,sz);heading=Math.round(heading||0);
  $('#svFrame').src=`https://maps.google.com/maps?layer=c&cbll=${la},${lo}&cbp=11,${heading},0,0,0&output=svembed`;
  let n=name;if(!n){const sn=street.streetName(x,z);n=sn?'Đường '+sn+', Quận 1':'Khu Nguyễn Huệ, Quận 1';}$('#svWhere').textContent='Ảnh thật · '+n;
  keys.clear();svOpen=true;$('#sv').hidden=false;$('#bSv').innerHTML='Quay lại game <kbd>V</kbd>';}
function closeSV(){if(!svOpen)return;svOpen=false;$('#sv').hidden=true;$('#svFrame').src='about:blank';$('#bSv').innerHTML='Ảnh thật <kbd>V</kbd>';}
$('#bSv').onclick=()=>svOpen?closeSV():openSV();$('#svClose').onclick=closeSV;
$('#selSv').onclick=()=>{if(mapSel){const p=playerXZ();const h=(Math.atan2(mapSel.x-p.x,-(mapSel.z-p.z))*180/Math.PI+360)%360;openSV(mapSel.x,mapSel.z,h,mapSel.n);}};
APP.openSV=openSV;
setInterval(()=>{if(mapOpen){updMapWhere();drawMap();}},500);
APP._dbg={player,hum,camera,brewTea,openFridge,closeFridge,takeFromFridge,useHeld,putDown,pickUp,throwTrash,mug,loose,items,setYaw:v=>{yaw=v;},setPitch:v=>{pitch=v;},setDist:v=>{dist=v;},get held(){return held;},get busy(){return busy;}};
APP.goOut=goOut;APP.goHome=()=>{if(where==='street')goHome();};APP.sitSofa=()=>{if(where==='room'&&mode==='walk')sitSofa();};
APP.ready=true;
