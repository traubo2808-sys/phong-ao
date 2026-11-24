// Phố 3D dựng từ dữ liệu OpenStreetMap thật (khu Nguyễn Huệ, Quận 1). © OpenStreetMap contributors.
import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a);
const VEH=new Set(['primary','secondary','tertiary','tertiary_link','residential','unclassified','living_street','trunk']);
const WALK=new Set(['footway','pedestrian','path','steps','living_street']);
function ctex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;t.userData={c,g};return t;}
function pip(x,z,p){let ins=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const xi=p[i][0],zi=p[i][1],xj=p[j][0],zj=p[j][1];if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/(zj-zi)+xi))ins=!ins;}return ins;}
function segDist(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,l=dx*dx+dz*dz;let t=l?((px-ax)*dx+(pz-az)*dz)/l:0;t=clamp(t,0,1);const x=ax+dx*t,z=az+dz*t;return{d:Math.hypot(px-x,pz-z),x,z,t};}
function area(p){let a=0;for(let i=0,j=p.length-1;i<p.length;j=i++)a+=(p[j][0]+p[i][0])*(p[j][1]-p[i][1]);return Math.abs(a/2);}

export async function buildStreet(opts){
  const data=await (await fetch('q1.json')).json();
  const scene=new THREE.Scene();
  const M=o=>new THREE.MeshStandardMaterial(o);
  const procStart=scene.children.length;

  /* ---------- lưới tra cứu ---------- */
  const CELL=24,grid=new Map();const key=(i,j)=>i+','+j;
  function gAdd(x0,z0,x1,z1,item){for(let i=Math.floor(x0/CELL);i<=Math.floor(x1/CELL);i++)for(let j=Math.floor(z0/CELL);j<=Math.floor(z1/CELL);j++){const k=key(i,j);if(!grid.has(k))grid.set(k,{b:[],r:[]});grid.get(k)[item.t].push(item);}}
  function gNear(x,z,rad=0){const out={b:new Set(),r:new Set()};for(let i=Math.floor((x-rad)/CELL);i<=Math.floor((x+rad)/CELL);i++)for(let j=Math.floor((z-rad)/CELL);j<=Math.floor((z+rad)/CELL);j++){const c=grid.get(key(i,j));if(c){c.b.forEach(v=>out.b.add(v));c.r.forEach(v=>out.r.add(v));}}return out;}

  /* ---------- đường ---------- */
  const roads=data.roads.filter(r=>r.p.length>=2);
  roads.forEach((r,ri)=>{r.id=ri;for(let i=0;i<r.p.length-1;i++){const a=r.p[i],b=r.p[i+1];gAdd(Math.min(a[0],b[0])-r.w,Math.min(a[1],b[1])-r.w,Math.max(a[0],b[0])+r.w,Math.max(a[1],b[1])+r.w,{t:'r',r,i});}});
  function onRoad(x,z,pad=1){for(const s of gNear(x,z,16).r){const a=s.r.p[s.i],b=s.r.p[s.i+1];if(segDist(x,z,a[0],a[1],b[0],b[1]).d<s.r.w/2+pad)return true;}return false;}
  // nhà từ bản đồ
  const blds=data.buildings.map(b=>{const ar=area(b.p);let h=b.h||(ar<120?rnd(9,15):ar<600?rnd(14,26):rnd(22,40));return{p:b.p,h,n:b.n,osm:true};});
  blds.forEach(b=>{const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]);b.x0=Math.min(...xs);b.x1=Math.max(...xs);b.z0=Math.min(...zs);b.z1=Math.max(...zs);gAdd(b.x0,b.z0,b.x1,b.z1,{t:'b',b});});
  function inBld(x,z,pad=0){for(const it of gNear(x,z,pad+2).b){const b=it.b;if(x<b.x0-pad||x>b.x1+pad||z<b.z0-pad||z>b.z1+pad)continue;if(pip(x,z,b.p))return b;if(pad){for(let i=0,j=b.p.length-1;i<b.p.length;j=i++)if(segDist(x,z,b.p[j][0],b.p[j][1],b.p[i][0],b.p[i][1]).d<pad)return b;}}return null;}
  const parks=data.areas.filter(a=>a.k!=='water');
  const inPark=(x,z)=>parks.some(a=>pip(x,z,a.p));

  /* ---------- nhà ở của người chơi: chung cư 42 Nguyễn Huệ ---------- */
  let home=blds.find(b=>b.n&&/42 Nguy/i.test(b.n))||blds[0];
  const nh=roads.filter(r=>r.n==='Nguyễn Huệ');
  let door={x:0,z:0,nx:0,nz:1};{let best=1e9;const cx=(home.x0+home.x1)/2,cz=(home.z0+home.z1)/2;
    for(let i=0,j=home.p.length-1;i<home.p.length;j=i++){const a=home.p[j],b=home.p[i],mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;let d=1e9;for(const r of nh)for(let k=0;k<r.p.length-1;k++)d=Math.min(d,segDist(mx,mz,r.p[k][0],r.p[k][1],r.p[k+1][0],r.p[k+1][1]).d);
      if(d<best){best=d;const ex=b[0]-a[0],ez=b[1]-a[1],L=Math.hypot(ex,ez);let nx=ez/L,nz=-ex/L;if((mx-cx)*nx+(mz-cz)*nz<0){nx=-nx;nz=-nz;}door={x:mx,z:mz,nx,nz};}}}
  home.h=Math.max(home.h,30);

  /* ---------- nhà phố tự điền vào chỗ bản đồ còn trống ---------- */
  const fill=[];
  for(const r of roads){if(!VEH.has(r.k)&&r.k!=='service')continue;for(let i=0;i<r.p.length-1;i++){const a=r.p[i],b=r.p[i+1],dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz);if(L<8)continue;const ux=dx/L,uz=dz/L,nx=-uz,nz=ux;
      for(let s=4;s<L-4;s+=rnd(6,9)){for(const side of[-1,1]){const W=rnd(5,8),D=rnd(10,16),off=r.w/2+3.2+D/2,cx=a[0]+ux*s+nx*off*side,cz=a[1]+uz*s+nz*off*side;
        const pts=[[-W/2,-D/2],[W/2,-D/2],[W/2,D/2],[-W/2,D/2]].map(([u,v])=>[cx+ux*u+nx*v*side,cz+uz*u+nz*v*side]);
        if(Math.hypot(cx-door.x,cz-door.z)<18)continue;
        if(pts.concat([[cx,cz]]).some(p=>inBld(p[0],p[1],1)||onRoad(p[0],p[1],2)||inPark(p[0],p[1])))continue;
        if(fill.some(f=>Math.hypot(f.cx-cx,f.cz-cz)<Math.max(W,6)))continue;
        const b={p:pts,h:rnd(8,22),cx,cz,fill:true};const xs=pts.map(p=>p[0]),zs=pts.map(p=>p[1]);b.x0=Math.min(...xs);b.x1=Math.max(...xs);b.z0=Math.min(...zs);b.z1=Math.max(...zs);
        fill.push(b);blds.push(b);gAdd(b.x0,b.z0,b.x1,b.z1,{t:'b',b});}}}}

  /* ---------- vật liệu ---------- */
  const facadeTex=[0,1].map(v=>ctex(256,256,(g,w,h)=>{g.fillStyle='#ffffff';g.fillRect(0,0,w,h);for(let f=0;f<2;f++)for(let c=0;c<4;c++){const x=c*64+10,y=f*128+(v?22:30);g.fillStyle='#9aa6b4';g.fillRect(x-3,y-3,50,(v?84:64)+6);g.fillStyle='#4d6378';g.fillRect(x,y,44,v?84:64);g.fillStyle='rgba(255,255,255,.18)';g.fillRect(x,y,44,8);if(v){g.fillStyle='#bfbfbf';g.fillRect(c*64,f*128+110,64,6);}}}));
  const facadeEm=[0,1].map(v=>ctex(256,256,(g,w,h)=>{g.fillStyle='#000';g.fillRect(0,0,w,h);for(let f=0;f<2;f++)for(let c=0;c<4;c++)if(Math.random()<.55){g.fillStyle=Math.random()<.75?'#ffcf86':'#cfe6ff';g.fillRect(c*64+10,f*128+(v?22:30),44,v?84:64);}}));
  const shopTex=ctex(512,128,(g,w,h)=>{g.fillStyle='#e7e1d6';g.fillRect(0,0,w,h);g.fillStyle='#3a3a40';g.fillRect(16,8,w-32,28);g.fillStyle='#d9553f';g.fillRect(8,36,w-16,10);g.fillStyle='#6d8796';g.fillRect(24,52,w-48,h-56);g.fillStyle='#c8a46a';g.fillRect(24,52,w-48,6);g.fillStyle='#2b2f36';g.fillRect(w/2-3,52,6,h-56);});
  const shopEm=ctex(512,128,(g,w,h)=>{g.fillStyle='#000';g.fillRect(0,0,w,h);g.fillStyle='#ffd8a0';g.fillRect(24,58,w-48,h-62);g.fillStyle='#ffffff';g.fillRect(40,14,w-80,14);});
  const facMat=facadeTex.map((t,i)=>M({map:t,emissive:0xffffff,emissiveMap:facadeEm[i],emissiveIntensity:0,vertexColors:true,roughness:.75,side:THREE.DoubleSide}));
  const shopMat=M({map:shopTex,emissive:0xffffff,emissiveMap:shopEm,emissiveIntensity:0,vertexColors:true,roughness:.6,side:THREE.DoubleSide});
  const roofMat=M({color:0x8c8a86,roughness:.95,side:THREE.DoubleSide});
  const PAL=[0xf2ede4,0xe8d9c4,0xd9e2e8,0xf0d8cc,0xdfe6d6,0xc9ced6,0xf5f1ea,0xe3c9a8];

  /* ---------- dựng nhà (gộp thành vài lưới cho nhanh) ---------- */
  const G={f0:{p:[],n:[],u:[],c:[]},f1:{p:[],n:[],u:[],c:[]},s:{p:[],n:[],u:[],c:[]}};
  function quad(T,a,b,y0,y1,u0,u1,v0,v1,col){const dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz),nx=dz/L,nz=-dx/L;
    const P=[[a[0],y0,a[1]],[b[0],y0,b[1]],[b[0],y1,b[1]],[a[0],y0,a[1]],[b[0],y1,b[1]],[a[0],y1,a[1]]],U=[[u0,v0],[u1,v0],[u1,v1],[u0,v0],[u1,v1],[u0,v1]];
    for(let k=0;k<6;k++){T.p.push(...P[k]);T.n.push(nx,0,nz);T.u.push(...U[k]);T.c.push(col.r,col.g,col.b);}}
  const roofGeos=[];
  for(const b of blds){const col=new THREE.Color(b===home?0xf3e3c8:PAL[Math.floor(Math.random()*PAL.length)]);const T=Math.random()<.5?G.f0:G.f1;const uo=Math.floor(rnd(0,4))*.25,GF=b.h>7?4.2:b.h;
    for(let i=0,j=b.p.length-1;i<b.p.length;j=i++){const a=b.p[j],c=b.p[i],L=Math.hypot(c[0]-a[0],c[1]-a[1]);if(L<.3)continue;
      quad(G.s,a,c,0,GF,0,Math.max(1,Math.round(L/6)),0,1,new THREE.Color().setHSL(Math.random(),.25,.8));
      if(b.h>GF)quad(T,a,c,GF,b.h,uo,uo+Math.max(.25,Math.round(L/3.2)/4),0,(b.h-GF)/6.6,col);}
    const sh=new THREE.Shape(b.p.map(p=>new THREE.Vector2(p[0],-p[1])));const rg=new THREE.ShapeGeometry(sh);rg.rotateX(-Math.PI/2);rg.translate(0,b.h,0);roofGeos.push(rg);}
  const bMeshes=[];
  for(const[k,mat]of[['f0',facMat[0]],['f1',facMat[1]],['s',shopMat]]){const T=G[k];const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(T.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(T.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(T.u,2));g.setAttribute('color',new THREE.Float32BufferAttribute(T.c,3));
    const m=new THREE.Mesh(g,mat);m.castShadow=m.receiveShadow=true;scene.add(m);bMeshes.push(m);}
  {const {mergeGeometries}=await import('three/addons/utils/BufferGeometryUtils.js');const rg=mergeGeometries(roofGeos);const m=new THREE.Mesh(rg,roofMat);m.receiveShadow=true;m.castShadow=true;scene.add(m);}

  /* ---------- mặt đất, đường, công viên ---------- */
  const groundTex=ctex(256,256,(g,w,h)=>{g.fillStyle='#9b968c';g.fillRect(0,0,w,h);g.strokeStyle='rgba(60,55,50,.25)';g.lineWidth=2;for(let i=0;i<=w;i+=32){g.beginPath();g.moveTo(i,0);g.lineTo(i,h);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(w,i);g.stroke();}for(let i=0;i<2500;i++){g.fillStyle=`rgba(0,0,0,${rnd(0,.06)})`;g.fillRect(rnd(0,w),rnd(0,h),2,2);}});
  groundTex.repeat.set(250,250);
  const groundMat=M({map:groundTex,roughness:.95});
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(1000,1000),groundMat);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);const flatStart=scene.children.length-1;
  function ribbonGeo(list,y,uvLen){const P=[],U=[];for(const{p,w}of list){let acc=0;for(let i=0;i<p.length-1;i++){const a=p[i],b=p[i+1],dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz);if(L<.01)continue;const nx=-dz/L*w/2,nz=dx/L*w/2;
      const A=[a[0]+nx,y,a[1]+nz],Bv=[a[0]-nx,y,a[1]-nz],C=[b[0]-nx,y,b[1]-nz],D=[b[0]+nx,y,b[1]+nz];const u0=acc/uvLen,u1=(acc+L)/uvLen;acc+=L;
      P.push(...A,...Bv,...C,...A,...C,...D);U.push(u0,0,u0,1,u1,1,u0,0,u1,1,u1,0);}
      for(let i=1;i<p.length-1;i++){const c=p[i];for(let k=0;k<12;k++){const a0=k/12*Math.PI*2,a1=(k+1)/12*Math.PI*2;P.push(c[0],y,c[1],c[0]+Math.cos(a1)*w/2,y,c[1]+Math.sin(a1)*w/2,c[0]+Math.cos(a0)*w/2,y,c[1]+Math.sin(a0)*w/2);U.push(.5,.5,.5,.5,.5,.5);}}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.computeVertexNormals();
    // pháp tuyến luôn hướng lên
    const n=g.attributes.normal;for(let i=0;i<n.count;i++)n.setXYZ(i,0,1,0);return g;}
  const DS=THREE.DoubleSide;const asphalt=M({color:0x34363b,roughness:.85,side:DS}),paving=M({color:0xc2b6a3,roughness:.9,side:DS}),greenM=M({color:0x4f8a4a,roughness:1,side:DS}),waterM=M({color:0x6fa3c4,roughness:.25,metalness:0,emissive:0x1d3a4f,emissiveIntensity:.4,side:DS});
  for(const a of data.areas){const sh=new THREE.Shape(a.p.map(p=>new THREE.Vector2(p[0],-p[1])));const g=new THREE.ShapeGeometry(sh);g.rotateX(-Math.PI/2);g.translate(0,.012,0);const m=new THREE.Mesh(g,a.k==='water'?waterM:greenM);m.receiveShadow=true;scene.add(m);}
  {const m=new THREE.Mesh(ribbonGeo(roads.filter(r=>!WALK.has(r.k)||r.k==='living_street'),.03,10),asphalt);m.receiveShadow=true;scene.add(m);}
  {const m=new THREE.Mesh(ribbonGeo(roads.filter(r=>WALK.has(r.k)&&r.k!=='living_street'),.045,10),paving);m.receiveShadow=true;scene.add(m);}
  {const dash=ctex(64,16,(g)=>{g.clearRect(0,0,64,16);g.fillStyle='#f2eedf';g.fillRect(0,4,36,8);});const mk=new THREE.MeshBasicMaterial({map:dash,transparent:true,depthWrite:false,side:THREE.DoubleSide});mk.map.repeat.set(1,1);
    const m=new THREE.Mesh(ribbonGeo(roads.filter(r=>['primary','secondary','tertiary','trunk'].includes(r.k)).map(r=>({p:r.p,w:.18})),.05,6),mk);scene.add(m);}

  const flats=scene.children.slice(flatStart);// mặt đất, đường, công viên: thay bằng ảnh vệ tinh Google khi có
  /* ---------- cây xanh & đèn đường ---------- */
  const treePos=[],lampPos=[];
  for(const r of roads){if(!VEH.has(r.k)&&r.k!=='pedestrian')continue;const big=['primary','secondary','tertiary','pedestrian','trunk'].includes(r.k);let acc=0,nextT=rnd(2,8),nextL=rnd(4,12);
    for(let i=0;i<r.p.length-1;i++){const a=r.p[i],b=r.p[i+1],dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz);if(L<.1)continue;const ux=dx/L,uz=dz/L,nx=-uz,nz=ux;
      for(let s=0;s<L;s++){acc++;const x=a[0]+ux*s,z=a[1]+uz*s;
        if(acc>=nextT&&big){nextT=acc+rnd(11,16);for(const side of[-1,1]){const off=r.k==='pedestrian'?r.w/2-1.5:r.w/2+1.2,px=x+nx*off*side,pz=z+nz*off*side;if(!inBld(px,pz,1.5)&&!onRoad(px,pz,.3))treePos.push([px,pz,rnd(.8,1.25)]);}}
        if(acc>=nextL){nextL=acc+(big?24:32);const side=acc%2?1:-1,off=r.w/2+.6,px=x+nx*off*side,pz=z+nz*off*side;if(!inBld(px,pz,.8)&&!onRoad(px,pz,.2))lampPos.push([px,pz,Math.atan2(-nx*side,-nz*side)]);}}}}
  const dummy=new THREE.Object3D();
  const trunkI=new THREE.InstancedMesh(new THREE.CylinderGeometry(.14,.2,3.2,7),M({color:0x5a4030,roughness:1}),treePos.length);
  const crownI=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.1,1),M({color:0x3f7d3e,roughness:1,flatShading:true}),treePos.length);
  treePos.forEach(([x,z,s],i)=>{dummy.position.set(x,1.6*s,z);dummy.rotation.set(0,rnd(0,6),0);dummy.scale.setScalar(s);dummy.updateMatrix();trunkI.setMatrixAt(i,dummy.matrix);dummy.position.y=4.1*s;dummy.scale.set(s*rnd(.9,1.2),s*rnd(.8,1),s*rnd(.9,1.2));dummy.updateMatrix();crownI.setMatrixAt(i,dummy.matrix);crownI.setColorAt(i,new THREE.Color().setHSL(rnd(.26,.33),.45,rnd(.28,.38)));});
  trunkI.castShadow=crownI.castShadow=true;scene.add(trunkI,crownI);
  const poleI=new THREE.InstancedMesh(new THREE.CylinderGeometry(.06,.09,6.5,6),M({color:0x3a3d42,metalness:.5,roughness:.5}),lampPos.length);
  const armI=new THREE.InstancedMesh(new THREE.BoxGeometry(.08,.08,1.4),M({color:0x3a3d42}),lampPos.length);
  const bulbMat=new THREE.MeshBasicMaterial({color:0x777777});const bulbI=new THREE.InstancedMesh(new THREE.BoxGeometry(.35,.1,.6),bulbMat,lampPos.length);
  lampPos.forEach(([x,z,yaw],i)=>{dummy.position.set(x,3.25,z);dummy.rotation.set(0,yaw,0);dummy.scale.setScalar(1);dummy.updateMatrix();poleI.setMatrixAt(i,dummy.matrix);
    dummy.position.set(x+Math.sin(yaw)*.65,6.45,z+Math.cos(yaw)*.65);dummy.updateMatrix();armI.setMatrixAt(i,dummy.matrix);dummy.position.set(x+Math.sin(yaw)*1.25,6.35,z+Math.cos(yaw)*1.25);dummy.updateMatrix();bulbI.setMatrixAt(i,dummy.matrix);});
  poleI.castShadow=true;scene.add(poleI,armI,bulbI);
  const nightLights=[];for(let i=0;i<8;i++){const l=new THREE.PointLight(0xffc98a,0,26,1.6);scene.add(l);nightLights.push(l);}

  const procs=scene.children.slice(procStart).filter(o=>!o.isLight);
  /* ---------- cửa nhà ---------- */
  const doorG=new THREE.Group();doorG.position.set(door.x+door.nx*.05,0,door.z+door.nz*.05);doorG.rotation.y=Math.atan2(door.nx,door.nz);scene.add(doorG);
  {const fr=M({color:0x2b2f36});const B=(w,h,d,m,x,y,z)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;doorG.add(o);return o;};
   B(2.2,.15,.3,fr,0,2.6,.1);B(.15,2.6,.3,fr,-1.05,1.3,.1);B(.15,2.6,.3,fr,1.05,1.3,.1);B(1.9,2.5,.06,M({color:0x6b4a2f,roughness:.5}),0,1.25,.03);
   const sign=ctex(256,64,(g)=>{g.fillStyle='#1d1a24';g.fillRect(0,0,256,64);g.fillStyle='#ffb47a';g.font='bold 30px sans-serif';g.textAlign='center';g.fillText('Nhà của tôi',128,43);});
   const s=new THREE.Mesh(new THREE.PlaneGeometry(1.6,.4),new THREE.MeshBasicMaterial({map:sign}));s.position.set(0,2.95,.27);doorG.add(s);
   const glow=new THREE.PointLight(0xffb47a,4,8,2);glow.position.set(0,2.5,1.2);doorG.add(glow);}
  const spawn={x:door.x+door.nx*2.6,z:door.z+door.nz*2.6,yaw:Math.atan2(door.nx,door.nz)};

  /* ---------- người đi đường, xe máy, ô tô ---------- */
  const ends=new Map();const ek=p=>Math.round(p[0]/3)+','+Math.round(p[1]/3);
  roads.forEach(r=>{for(const end of[0,r.p.length-1]){const k=ek(r.p[end]);if(!ends.has(k))ends.set(k,[]);ends.get(k).push({r,end});}});
  const vehRoads=roads.filter(r=>VEH.has(r.k)),walkRoads=roads.filter(r=>WALK.has(r.k)||VEH.has(r.k));
  function seglen(r,i){const a=r.p[i],b=r.p[i+1];return Math.hypot(b[0]-a[0],b[1]-a[1]);}
  function newAgent(list,kind){const r=list[Math.floor(Math.random()*list.length)];const i=Math.floor(Math.random()*(r.p.length-1));return{r,i,t:rnd(0,seglen(r,i)),dir:Math.random()<.5?1:-1,kind,speed:kind==='car'?rnd(7,11):kind==='moto'?rnd(8,12):rnd(1.1,1.6),lane:kind==='ped'?(VEH.has(r.k)?(r.w/2+rnd(.8,2.2))*(Math.random()<.5?1:-1):rnd(-r.w/2+.5,r.w/2-.5)):kind==='car'?r.w/4:rnd(.6,r.w/2-.4),x:0,z:0,yaw:0,pause:0,ok:list};}
  function advance(a,dt){if(a.pause>0){a.pause-=dt;return;}let move=a.speed*dt;
    while(move>0){const L=seglen(a.r,a.i);if(a.dir>0){const left=L-a.t;if(move<left){a.t+=move;move=0;}else{move-=left;if(a.i<a.r.p.length-2){a.i++;a.t=0;}else nextRoad(a,a.r.p.length-1);}}
      else{if(move<a.t){a.t-=move;move=0;}else{move-=a.t;if(a.i>0){a.i--;a.t=seglen(a.r,a.i);}else nextRoad(a,0);}}if(!isFinite(a.t)){a.t=0;break;}}
    const p0=a.r.p[a.i],p1=a.r.p[a.i+1],L=seglen(a.r,a.i)||1,ux=(p1[0]-p0[0])/L,uz=(p1[1]-p0[1])/L,dx=ux*a.dir,dz=uz*a.dir;
    let lane=a.lane;if(a.kind!=='ped'&&a.r.o)lane=a.kind==='car'?0:lane*.5;
    a.x=p0[0]+ux*a.t+(-dz)*lane;a.z=p0[1]+uz*a.t+dx*lane;if(a.kind==='ped'&&VEH.has(a.r.k)){a.x=p0[0]+ux*a.t+(-uz)*a.lane;a.z=p0[1]+uz*a.t+ux*a.lane;}
    a.yaw=Math.atan2(dx,dz);}
  function nextRoad(a,end){const opts=(ends.get(ek(a.r.p[end]))||[]).filter(o=>o.r!==a.r&&a.ok.includes(o.r)&&!(a.kind!=='ped'&&o.r.o&&o.end!==0));
    if(opts.length){const o=opts[Math.floor(Math.random()*opts.length)];a.r=o.r;if(o.end===0){a.dir=1;a.i=0;a.t=0;}else{a.dir=-1;a.i=o.r.p.length-2;a.t=seglen(o.r,a.i);}if(a.kind==='ped'&&!VEH.has(a.r.k))a.lane=rnd(-a.r.w/2+.5,a.r.w/2-.5);if(a.kind==='ped'&&VEH.has(a.r.k))a.lane=(a.r.w/2+rnd(.8,2.2))*(Math.random()<.5?1:-1);}
    else{if(a.r.o&&a.kind!=='ped'){Object.assign(a,newAgent(a.ok,a.kind));return;}a.dir*=-1;a.t=a.dir>0?0:seglen(a.r,a.i);}}
  const NP=140,NM=70,NC=26;
  const peds=Array.from({length:NP},()=>newAgent(walkRoads,'ped')),motos=Array.from({length:NM},()=>newAgent(vehRoads,'moto')),cars=Array.from({length:NC},()=>newAgent(vehRoads,'car'));
  // người đi đường: thân, hông, 2 tay, 2 chân đánh theo bước, đầu có khuôn mặt vẽ (mắt, lông mày, mũi, miệng), tóc
  const faceTex=ctex(256,128,(g,w,h)=>{g.fillStyle='#ffffff';g.fillRect(0,0,w,h);const cx=w*.25,cy=h*.54;
    for(const s of[-1,1]){g.fillStyle='#fdfdfd';g.beginPath();g.ellipse(cx+s*9,cy-4,5.2,3.6,0,0,7);g.fill();g.fillStyle='#3a2416';g.beginPath();g.arc(cx+s*9,cy-4,2.7,0,7);g.fill();g.fillStyle='#000';g.beginPath();g.arc(cx+s*9,cy-4,1.3,0,7);g.fill();
      g.strokeStyle='#2a1c14';g.lineWidth=1.8;g.beginPath();g.moveTo(cx+s*5,cy-11);g.quadraticCurveTo(cx+s*9,cy-13.5,cx+s*13,cy-11);g.stroke();}
    g.strokeStyle='rgba(120,70,50,.6)';g.lineWidth=1.4;g.beginPath();g.moveTo(cx,cy-2);g.lineTo(cx-1.5,cy+5);g.lineTo(cx+1.5,cy+5.5);g.stroke();
    g.strokeStyle='#b5544f';g.lineWidth=2;g.beginPath();g.arc(cx,cy+8,4.5,.15*Math.PI,.85*Math.PI);g.stroke();
    g.fillStyle='rgba(240,140,140,.25)';for(const s of[-1,1]){g.beginPath();g.arc(cx+s*13,cy+4,3.5,0,7);g.fill();}});
  faceTex.wrapS=THREE.ClampToEdgeWrapping;
  const limbG=(r,len)=>{const g=new THREE.CapsuleGeometry(r,len,4,8);g.translate(0,-len/2-r*.5,0);return g;};
  const pedBody=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.16,.32,4,10),M({roughness:.9}),NP),pedHip=new THREE.InstancedMesh(new THREE.SphereGeometry(.15,10,8),M({roughness:.9}),NP);
  const pedHead=new THREE.InstancedMesh(new THREE.SphereGeometry(.115,20,14),M({map:faceTex,roughness:.75}),NP),pedHair=new THREE.InstancedMesh(new THREE.SphereGeometry(.122,16,8,0,Math.PI*2,0,Math.PI*.5),M({color:0x1e1612,roughness:.9}),NP);
  const pedLegL=new THREE.InstancedMesh(limbG(.065,.7),M({roughness:.9}),NP),pedLegR=new THREE.InstancedMesh(limbG(.065,.7),M({roughness:.9}),NP),pedArmL=new THREE.InstancedMesh(limbG(.048,.5),M({roughness:.9}),NP),pedArmR=new THREE.InstancedMesh(limbG(.048,.5),M({roughness:.9}),NP);
  const SH=[0xe85d5d,0x4f7cff,0xffffff,0x2ec4a6,0xffb547,0x222222,0xf28fb1,0x7a5cff,0x9ad16b,0xd9d2c5],PA=[0x2c3442,0x1d1d22,0x3b4f7a,0xc9b48f,0x4a4a4a,0x6b4e3a],SK=[0xf1c6a5,0xe0ad86,0xc98f64,0xf5d3ba,0xa86f4c];
  peds.forEach((p,i)=>{const sh=new THREE.Color(SH[i%SH.length]),pa=new THREE.Color(PA[(i*7)%PA.length]),sk=new THREE.Color(SK[(i*3)%SK.length]);
    pedBody.setColorAt(i,sh);pedArmL.setColorAt(i,sh);pedArmR.setColorAt(i,sh);pedHip.setColorAt(i,pa);pedLegL.setColorAt(i,pa);pedLegR.setColorAt(i,pa);pedHead.setColorAt(i,sk);pedHair.setColorAt(i,new THREE.Color([0x1e1612,0x3b2416,0x111111,0x5a3a22][i%4]));p.ph=rnd(0,6);});
  const motoBody=new THREE.InstancedMesh(new THREE.BoxGeometry(.32,.55,1.7),M({roughness:.5,metalness:.3}),NM),motoRider=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.2,.5,4,8),M({roughness:.9}),NM),motoHelm=new THREE.InstancedMesh(new THREE.SphereGeometry(.17,10,8),M({roughness:.3}),NM),motoLight=new THREE.InstancedMesh(new THREE.BoxGeometry(.16,.1,.05),new THREE.MeshBasicMaterial({color:0xfff2c8}),NM);
  motos.forEach((m,i)=>{motoBody.setColorAt(i,new THREE.Color([0xd83a3a,0x222,0xf2f2f2,0x2f6fe0,0x8a8f99][i%5]));motoRider.setColorAt(i,new THREE.Color(SH[(i*3)%SH.length]));motoHelm.setColorAt(i,new THREE.Color([0xffd23f,0xff4d4d,0xffffff,0x2b6fff,0x2ec4a6][i%5]));});
  const carBody=new THREE.InstancedMesh(new THREE.BoxGeometry(1.8,.75,4.3),M({roughness:.35,metalness:.45}),NC),carTop=new THREE.InstancedMesh(new THREE.BoxGeometry(1.6,.6,2.3),M({color:0x1b2430,roughness:.15,metalness:.6}),NC),carLight=new THREE.InstancedMesh(new THREE.BoxGeometry(1.5,.14,.05),new THREE.MeshBasicMaterial({color:0xfff6d8}),NC);
  cars.forEach((c,i)=>carBody.setColorAt(i,new THREE.Color([0xf2f2f2,0x1d1d1f,0xc9c9cf,0xb3202a,0x2f4f8f,0xf2c14e][i%6])));
  const PEDS=[pedBody,pedHip,pedHead,pedHair,pedLegL,pedLegR,pedArmL,pedArmR];
  for(const m of[...PEDS,motoBody,motoRider,motoHelm,carBody,carTop]){if(m!==pedHair)m.castShadow=true;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);if(!scene.children.includes(m))scene.add(m);}
  for(const m of[motoLight,carLight]){m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(m);}
  const GREET=['Chào bạn! Hôm nay trời đẹp ghê.','Ê, đi cà phê không?','Phố đi bộ tối nay đông vui lắm.','Mình đang đi dạo thôi.','Chào nha, chúc ngày vui!','Bạn mới chuyển tới 42 Nguyễn Huệ hả?','Quán cà phê ở chung cư 42 ngon lắm đó.','Coi chừng xe máy nha!'];

  /* ---------- nhãn quán xá & toà nhà ---------- */
  const ICON={cafe:'☕',restaurant:'🍜',fast_food:'🍔',bar:'🍸',pub:'🍺',hotel:'🏨',bank:'🏦',atm:'🏧',pharmacy:'💊',clothes:'👕',bakery:'🥖',books:'📚',ice_cream:'🍦',supermarket:'🛒',convenience:'🏪',museum:'🏛️',theatre:'🎭',cinema:'🎬',place_of_worship:'⛪',fuel:'⛽',parking:'🅿️'};
  const pois=data.pois.filter(p=>!inBld(p.x,p.z,0)||true);
  const labelPool=[];for(let i=0;i<14;i++){const t=ctex(512,96,()=>{});const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,fog:false}));s.visible=false;s.scale.set(6,1.125,1);s.renderOrder=10;scene.add(s);labelPool.push({s,t,id:null});}
  function drawLabel(L,txt,sub){const{g}=L.t.userData;g.clearRect(0,0,512,96);g.font='bold 34px "Be Vietnam Pro",sans-serif';const w=Math.min(500,g.measureText(txt).width+44);g.fillStyle='rgba(24,19,33,.82)';const x=(512-w)/2;g.beginPath();g.roundRect(x,8,w,sub?80:60,18);g.fill();g.fillStyle='#fff';g.textAlign='center';g.fillText(txt,256,sub?46:50,480);if(sub){g.font='22px "Be Vietnam Pro",sans-serif';g.fillStyle='#ffb47a';g.fillText(sub,256,76,480);}L.t.needsUpdate=true;}
  const named=blds.filter(b=>b.n).map(b=>({x:(b.x0+b.x1)/2,z:(b.z0+b.z1)/2,n:b.n,h:b.h,bld:true}));

  /* ---------- bầu trời, sương, nắng, mưa ---------- */
  const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:new THREE.Color()},bot:{value:new THREE.Color()}},
    vertexShader:'varying float vy;void main(){vy=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform vec3 top;uniform vec3 bot;varying float vy;void main(){gl_FragColor=vec4(mix(bot,top,smoothstep(-.02,.55,vy)),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
  const sky=new THREE.Mesh(new THREE.SphereGeometry(480,32,16),skyMat);sky.renderOrder=-1;scene.add(sky);
  const sunSpr=new THREE.Sprite(new THREE.SpriteMaterial({map:ctex(128,128,(g)=>{const r=g.createRadialGradient(64,64,0,64,64,62);r.addColorStop(0,'rgba(255,250,225,1)');r.addColorStop(.25,'rgba(255,240,200,.9)');r.addColorStop(1,'rgba(255,220,170,0)');g.fillStyle=r;g.fillRect(0,0,128,128);}),transparent:true,depthWrite:false,fog:false}));sunSpr.scale.setScalar(70);scene.add(sunSpr);
  const starGeo=new THREE.BufferGeometry(),sp=[];for(let i=0;i<500;i++){const th=rnd(0,Math.PI*2),ph=rnd(.08,1.4),r=450;sp.push(Math.cos(th)*Math.cos(ph)*r,Math.sin(ph)*r,Math.sin(th)*Math.cos(ph)*r);}starGeo.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));
  const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xffffff,size:1.6,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false}));scene.add(stars);
  scene.fog=new THREE.Fog(0x9fb4c8,90,430);
  const hemi=new THREE.HemisphereLight(0xdfe8ff,0x6b5a48,.6);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xfff2d6,2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:1,far:300});sun.shadow.bias=-.0006;sun.shadow.normalBias=.04;scene.add(sun,sun.target);
  const RN=2500,rg=new THREE.BufferGeometry(),rp=new Float32Array(RN*6);for(let i=0;i<RN;i++){const x=rnd(-35,35),y=rnd(0,25),z=rnd(-35,35);rp.set([x,y,z,x-.03,y-.5,z],i*6);}rg.setAttribute('position',new THREE.BufferAttribute(rp,3));
  const rain=new THREE.LineSegments(rg,new THREE.LineBasicMaterial({color:0xc4d4ef,transparent:true,opacity:0,fog:false}));rain.frustumCulled=false;scene.add(rain);
  [rain,sky,stars,sunSpr,...labelPool.map(l=>l.s)].forEach(o=>o.raycast=()=>{});

  /* ---------- bản đồ nhỏ ---------- */
  const MS=1.2,mapC=document.createElement('canvas');mapC.width=mapC.height=1000;{const g=mapC.getContext('2d');g.fillStyle='#d8d2c6';g.fillRect(0,0,1000,1000);const T=(x,z)=>[500+x*MS,500+z*MS];
    for(const a of data.areas){g.fillStyle=a.k==='water'?'#8fb7d4':'#a9cf9a';g.beginPath();a.p.forEach((p,i)=>{const[x,y]=T(p[0],p[1]);i?g.lineTo(x,y):g.moveTo(x,y);});g.fill();}
    g.lineCap='round';g.lineJoin='round';for(const r of roads){g.strokeStyle=WALK.has(r.k)?'#f4efe6':'#ffffff';g.lineWidth=Math.max(1.5,r.w*MS);g.beginPath();r.p.forEach((p,i)=>{const[x,y]=T(p[0],p[1]);i?g.lineTo(x,y):g.moveTo(x,y);});g.stroke();}
    for(const b of blds){g.fillStyle=b===home?'#ff9f5a':b.fill?'#b9b2a6':'#a39a8c';g.beginPath();b.p.forEach((p,i)=>{const[x,y]=T(p[0],p[1]);i?g.lineTo(x,y):g.moveTo(x,y);});g.fill();}}
  function drawMinimap(cv,px,pz,yaw){const g=cv.getContext('2d'),W=cv.width,H=cv.height,s=1.6;g.save();g.clearRect(0,0,W,H);g.beginPath();g.arc(W/2,H/2,W/2,0,7);g.clip();g.fillStyle='#d8d2c6';g.fillRect(0,0,W,H);
    const sx=500+px*MS,sz=500+pz*MS,vw=W/s;g.drawImage(mapC,sx-vw/2,sz-vw/2,vw,vw,0,0,W,H);
    const hx=W/2+(door.x-px)*MS*s,hz=H/2+(door.z-pz)*MS*s;g.fillStyle='#ff6a3d';g.beginPath();g.arc(clamp(hx,8,W-8),clamp(hz,8,H-8),5,0,7);g.fill();
    g.translate(W/2,H/2);g.rotate(Math.PI-yaw);g.fillStyle='#2f6fe0';g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.moveTo(0,-9);g.lineTo(6,7);g.lineTo(0,3);g.lineTo(-6,7);g.closePath();g.fill();g.stroke();g.restore();
    g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=2;g.beginPath();g.arc(W/2,H/2,W/2-1,0,7);g.stroke();g.fillStyle='#333';g.font='bold 11px sans-serif';g.textAlign='center';g.fillText('B',W/2,13);}
  function streetName(x,z){let best=null,bd=18;for(const s of gNear(x,z,18).r){if(!s.r.n)continue;const a=s.r.p[s.i],b=s.r.p[s.i+1],d=segDist(x,z,a[0],a[1],b[0],b[1]).d;if(d<bd){bd=d;best=s.r.n;}}return best;}

  /* ---------- va chạm người chơi ---------- */
  function collide(p,r=.3){for(let it=0;it<2;it++){for(const o of gNear(p.x,p.z,4).b){const b=o.b;if(p.x<b.x0-r||p.x>b.x1+r||p.z<b.z0-r||p.z>b.z1+r)continue;const P=b.p;
        let best=null;for(let i=0,j=P.length-1;i<P.length;j=i++){const s=segDist(p.x,p.z,P[j][0],P[j][1],P[i][0],P[i][1]);if(!best||s.d<best.d)best=s;}
        const inside=pip(p.x,p.z,P);if(inside||best.d<r){let nx=p.x-best.x,nz=p.z-best.z,l=Math.hypot(nx,nz)||1;nx/=l;nz/=l;if(inside){nx=-nx;nz=-nz;}p.x=best.x+nx*r;p.z=best.z+nz*r;}}}
    p.x=clamp(p.x,-480,480);p.z=clamp(p.z,-480,480);}

  /* ---------- tương tác ---------- */
  const homeInter={name:'homedoor',pos:new THREE.Vector3(door.x+door.nx*1.2,0,door.z+door.nz*1.2),r:2.6,label:()=>'Về phòng (chung cư 42 Nguyễn Huệ)',act:()=>opts.onHome()};
  let npcInter={name:'npc',pos:new THREE.Vector3(),r:1.8,label:()=>'Chào người đi đường',act:()=>{const p=npcInter.agent;if(!p)return;p.pause=4;const pl=opts.player.position;p.yaw=Math.atan2(pl.x-p.x,pl.z-p.z);opts.toast('“'+GREET[Math.floor(Math.random()*GREET.length)]+'”');}};
  let poiInter={name:'poi',pos:new THREE.Vector3(),r:5,label:()=>'Ghé '+(poiInter.poi?poiInter.poi.n:''),act:()=>opts.toast(`${poiInter.poi.n}: bên trong đang được dựng, sẽ vào được ở phần sau.`)};
  function interactables(px,pz){const list=[homeInter];let bp=null,bd=1.8;for(const p of peds){if(!p.vis)continue;const d=Math.hypot(p.x-px,p.z-pz);if(d<bd){bd=d;bp=p;}}if(bp){npcInter.agent=bp;npcInter.pos.set(bp.x,0,bp.z);list.push(npcInter);}
    let bq=null,bq2=5;for(const p of pois){const d=Math.hypot(p.x-px,p.z-pz);if(d<bq2){bq2=d;bq=p;}}if(bq){poiInter.poi=bq;poiInter.pos.set(bq.x,0,bq.z);list.push(poiInter);}return list;}

  /* ---------- cập nhật mỗi khung hình ---------- */
  let lblT=0,lightT=0,T=0;
  dummy.rotation.order='YXZ';
  function setInst(m,i,x,y,z,yaw,s=1,rx=0){dummy.position.set(x,y,z);dummy.rotation.set(rx,yaw,0);dummy.scale.setScalar(s);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);}
  // đặt một bộ phận theo vị trí cục bộ (ox ngang, oy cao, oz trước) của người
  function part(m,i,p,ox,oy,oz,rx){const s=Math.sin(p.yaw),c=Math.cos(p.yaw);setInst(m,i,p.x+ox*c+oz*s,oy,p.z-ox*s+oz*c,p.yaw,1,rx);}
  function update(dt,env,player){T+=dt;const{day,twi,cloud,rainAmt,h,flash}=env;const night=1-day;
    if(tiles){const ts=tiles.stats,busy=ts.parsing+ts.downloading+ts.queued;if(tiles._et==null)tiles._et=48;
      if(busy<4&&tiles._et>8)tiles._et=Math.max(8,tiles._et*.85);tiles.errorTarget=tiles._et;opts.camera.updateMatrixWorld();tiles.setResolutionFromRenderer(opts.camera,opts.renderer);tiles.update();{const b=Math.min(1.05,Math.max(.3,.32+(hemi.intensity-.25)*.7));for(const m of tileMats)m.color.setScalar(b);}
      if(g3dState==='on'){groundT-=dt;if(groundT<0&&groundTries<40){groundT=groundTries<10?.8:3;groundTries++;alignGround(player.position.x,player.position.z);}}
      attrT-=dt;if(attrT<0){attrT=2;const el=document.getElementById('mapAttr');if(el){let a='';try{a=tiles.getAttributions().map(x=>x.value).filter(v=>typeof v==='string').join(' · ');}catch(e){}el.textContent=g3dState==='on'?('Ảnh 3D © Google'+(a?' · '+a:'')+' · © OpenStreetMap'):'© OpenStreetMap';}}}
    // dân số theo giờ thật
    const pedFrac=h<5?.12:h<7?.35:h<11?.6:h<16?.55:h<23?1:.4,motoFrac=h<5?.15:h<7?.5:h<9?1:h<16?.7:h<20?1:h<23?.6:.25,carFrac=h<5?.25:h<22?.9:.5;
    const rainy=rainAmt>.3;
    peds.forEach((p,i)=>{p.vis=i<NP*pedFrac*(rainy?.45:1);if(!p.vis){PEDS.forEach(m=>setInst(m,i,0,-50,0,0,0));return;}
      advance(p,dt);const walking=p.pause<=0;if(walking)p.ph+=dt*p.speed*4.2;const sw=walking?Math.sin(p.ph)*.5:0,bob=walking?Math.abs(Math.cos(p.ph))*.035:0;
      part(pedLegL,i,p,-.085,.86+bob,0,sw);part(pedLegR,i,p,.085,.86+bob,0,-sw);part(pedHip,i,p,0,.9+bob,0,0);
      part(pedBody,i,p,0,1.15+bob,0,0);part(pedArmL,i,p,-.21,1.38+bob,0,-sw*.8);part(pedArmR,i,p,.21,1.38+bob,0,sw*.8);
      part(pedHead,i,p,0,1.6+bob,0,0);part(pedHair,i,p,0,1.62+bob,-.01,-.15);});
    motos.forEach((m,i)=>{const v=i<NM*motoFrac;if(!v){[motoBody,motoRider,motoHelm,motoLight].forEach(o=>setInst(o,i,0,-50,0,0,0));return;}advance(m,dt);const s=Math.sin(m.yaw),c=Math.cos(m.yaw);
      setInst(motoBody,i,m.x,.55,m.z,m.yaw);setInst(motoRider,i,m.x-s*.15,1.25,m.z-c*.15,m.yaw,1,-.15);setInst(motoHelm,i,m.x-s*.05,1.72,m.z-c*.05,m.yaw);setInst(motoLight,i,m.x+s*.86,.75,m.z+c*.86,m.yaw);});
    cars.forEach((cr,i)=>{const v=i<NC*carFrac;if(!v){[carBody,carTop,carLight].forEach(o=>setInst(o,i,0,-50,0,0,0));return;}advance(cr,dt);const s=Math.sin(cr.yaw),c=Math.cos(cr.yaw);
      setInst(carBody,i,cr.x,.62,cr.z,cr.yaw);setInst(carTop,i,cr.x-s*.2,1.27,cr.z-c*.2,cr.yaw);setInst(carLight,i,cr.x+s*2.16,.7,cr.z+c*2.16,cr.yaw);});
    for(const m of[...PEDS,motoBody,motoRider,motoHelm,motoLight,carBody,carTop,carLight])m.instanceMatrix.needsUpdate=true;
    motoLight.visible=carLight.visible=night>.25;
    // ánh sáng
    const t=clamp((h-(env.sr||6))/((env.ss||18)-(env.sr||6)),0,1),sd=new THREE.Vector3(Math.cos(t*Math.PI)*.8,Math.max(.12,Math.sin(t*Math.PI)),-.45).normalize();
    sun.position.copy(player.position).addScaledVector(sd,150);sun.target.position.copy(player.position);sun.intensity=day*3*(1-cloud*.7)*(rainAmt?.4:1);sun.color.setHSL(.09,.6,lerp(.62,.9,1-twi));
    sunSpr.position.copy(player.position).addScaledVector(sd,420);sunSpr.material.opacity=day*(1-cloud*.8);
    hemi.intensity=.25+day*1.1*(1-cloud*.3)+flash*3;
    const top=new THREE.Color().setHSL(.6,.55,lerp(.04,.45,day)),bot=new THREE.Color().setHSL(lerp(.66,.58,day),.45,lerp(.08,.75,day));if(twi>0){bot.lerp(new THREE.Color(0xff9a62),twi*.7);top.lerp(new THREE.Color(0x6a5c9a),twi*.4);}
    const grey=clamp(cloud*.6+rainAmt*.4,0,.9);top.lerp(new THREE.Color().setHSL(.6,.08,lerp(.08,.5,day)),grey);bot.lerp(new THREE.Color().setHSL(.6,.06,lerp(.1,.65,day)),grey);if(flash){top.lerp(new THREE.Color(0xeef),flash*.6);bot.lerp(new THREE.Color(0xeef),flash*.6);}
    skyMat.uniforms.top.value.copy(top);skyMat.uniforms.bot.value.copy(bot);scene.fog.color.copy(bot);scene.fog.near=rainAmt?40:90;scene.fog.far=rainAmt?220:430;
    sky.position.copy(player.position);stars.position.copy(player.position);stars.material.opacity=clamp(night*1.4-.4,0,1)*(1-cloud);
    facMat.forEach(m=>m.emissiveIntensity=night*.9);shopMat.emissiveIntensity=lerp(.05,1.1,night);bulbMat.color.setScalar(night>.3?1:.45);if(night>.3)bulbMat.color.setRGB(1,.85,.6);
    groundMat.color.setScalar(rainAmt?.72:1);asphalt.color.setHex(rainAmt?0x26282c:0x34363b);
    lightT-=dt;if(lightT<0){lightT=.5;const near=lampPos.map(l=>[l,Math.hypot(l[0]-player.position.x,l[1]-player.position.z)]).sort((a,b)=>a[1]-b[1]).slice(0,nightLights.length);
      nightLights.forEach((L,i)=>{const n=near[i];if(!n){L.intensity=0;return;}const[x,z,yaw]=n[0];L.position.set(x+Math.sin(yaw)*1.25,6,z+Math.cos(yaw)*1.25);L.intensity=night>.3?70:0;});}
    // mưa quanh người chơi
    rain.material.opacity=rainAmt*.5;rain.position.set(player.position.x,0,player.position.z);if(rainAmt){for(let i=0;i<RN;i++){const o=i*6;rp[o+1]-=16*dt;rp[o+4]-=16*dt;if(rp[o+1]<0){const y=25;rp[o+1]=y;rp[o+4]=y-.5;}}rg.attributes.position.needsUpdate=true;}
    // nhãn
    lblT-=dt;if(lblT<0){lblT=.4;const px=player.position.x,pz=player.position.z;const cand=pois.map(p=>({p,d:Math.hypot(p.x-px,p.z-pz)})).filter(o=>o.d<38).sort((a,b)=>a.d-b.d).slice(0,9).concat(named.map(p=>({p,d:Math.hypot(p.x-px,p.z-pz)})).filter(o=>o.d<110).sort((a,b)=>a.d-b.d).slice(0,5));
      labelPool.forEach((L,i)=>{const c=cand[i];if(!c){L.s.visible=false;L.id=null;return;}const p=c.p,id=p.n+(p.bld?'b':'');if(L.id!==id){L.id=id;drawLabel(L,(p.bld?'🏢 ':(ICON[p.k]||'📍')+' ')+p.n,p.bld?null:null);}
        L.s.visible=true;L.s.position.set(p.x,p.bld?Math.min(p.h+4,60):4.2,p.z);const sc=p.bld?clamp(c.d*.06,5,12):clamp(c.d*.08,2.6,5);L.s.scale.set(sc,sc*.1875,1);});}
    return{traffic:motoFrac*.8+carFrac*.4};}

  /* ---------- địa điểm cho bản đồ lớn & dịch chuyển ---------- */
  const LAT0=data.origin[0],LON0=data.origin[1],KXm=111320*Math.cos(LAT0*Math.PI/180),KZm=110540;
  const toLatLon=(x,z)=>[+(LAT0-z/KZm).toFixed(6),+(LON0+x/KXm).toFixed(6)];
  const places=[{n:'Nhà của tôi (chung cư 42 Nguyễn Huệ)',x:spawn.x,z:spawn.z,k:'home'}];
  {const seen=new Set();for(const r of roads){if(!r.n||seen.has(r.n))continue;seen.add(r.n);let best=null,bl=0;for(const o of roads.filter(q=>q.n===r.n))for(let i=0;i<o.p.length-1;i++){const L=seglen(o,i);if(L>bl){bl=L;best=[(o.p[i][0]+o.p[i+1][0])/2,(o.p[i][1]+o.p[i+1][1])/2];}}if(best)places.push({n:'Đường '+r.n,x:best[0],z:best[1],k:'street'});}}
  for(const b of named)places.push({n:b.n,x:b.x,z:b.z,k:'bld'});
  for(const p of pois)places.push({n:p.n,x:p.x,z:p.z,k:p.k});
  /* ---------- phố 3D thật của Google (qua Cesium ion, mã trong config.js) ---------- */
  let tiles=null,g3dState='off',groundT=0,groundTries=0,attrT=0;const tileMats=new Set();
  async function setupGoogle3D(){const tok=(window.LUMA_CESIUM||'').trim();if(!tok||!opts.renderer)return;g3dState='loading';
    try{const[{TilesRenderer},P,{DRACOLoader}]=await Promise.all([import('3d-tiles-renderer'),import('3d-tiles-renderer/plugins'),import('three/addons/loaders/DRACOLoader.js')]);
      const t=new TilesRenderer();
      t.registerPlugin(new P.CesiumIonAuthPlugin({apiToken:tok,assetId:'2275207',autoRefreshToken:true}));
      t.registerPlugin(new P.GLTFExtensionsPlugin({dracoLoader:new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')}));
      t.group.matrixAutoUpdate=false;setFrame(t.group);
      t.errorTarget=8;try{t.parseQueue.maxJobs=6;t.downloadQueue.maxJobs=24;t.lruCache.minSize=900;t.lruCache.maxSize=1600;}catch(e){}t.setCamera(opts.camera);t.setResolutionFromRenderer(opts.camera,opts.renderer);
      t.addEventListener('load-model',e=>{e.scene.traverse(o=>{if(o.isMesh){o.receiveShadow=true;o.raycast=THREE.Mesh.prototype.raycast;}});e.scene.traverse(o=>{if(o.isMesh)tileMats.add(o.material);});if(g3dState!=='on'){g3dState='on';flats.forEach(o=>o.visible=false);opts.toast&&opts.toast('Mặt đường đang dùng ảnh vệ tinh thật của Google. Bấm T để đổi sang mặt đường vẽ.');}});
      t.addEventListener('dispose-model',e=>{e.scene.traverse(o=>{if(o.isMesh)tileMats.delete(o.material);});});
      t.addEventListener('load-error',e=>{console.warn('3D tiles lỗi',e);if(g3dState!=='on'){g3dState='error';flats.forEach(o=>o.visible=true);opts.toast&&opts.toast('Không tải được phố 3D Google, đang dùng phố tự vẽ.');}});
      scene.add(t.group);tiles=t;}
    catch(e){console.warn(e);g3dState='error';}}
  // chuyển toạ độ Trái Đất (ECEF, WGS84) sang toạ độ phố: x = đông, y = lên, z = nam; gốc ở tâm khu Nguyễn Huệ
  let groundOff=0;
  function setFrame(g){const f=LAT0*Math.PI/180,l=LON0*Math.PI/180,a=6378137,e2=6.69437999014e-3,sf=Math.sin(f),cf=Math.cos(f),sl=Math.sin(l),cl=Math.cos(l);
    const N=a/Math.sqrt(1-e2*sf*sf),O=[N*cf*cl,N*cf*sl,N*(1-e2)*sf];
    const E=[-sl,cl,0],U=[cf*cl,cf*sl,sf],S=[sf*cl,sf*sl,-cf];
    const t=R=>-(R[0]*O[0]+R[1]*O[1]+R[2]*O[2]);
    g.matrix.set(E[0],E[1],E[2],t(E), U[0],U[1],U[2],t(U)+groundOff, S[0],S[1],S[2],t(S), 0,0,0,1);g.matrixWorldNeedsUpdate=true;g.updateMatrixWorld(true);}
  const groundRay=new THREE.Raycaster();
  function alignGround(px,pz){// đặt mặt đất của phố 3D về đúng độ cao 0 tại chỗ người chơi
    groundRay.set(new THREE.Vector3(px,600,pz),new THREE.Vector3(0,-1,0));groundRay.far=1400;
    const vis=o=>{for(;o;o=o.parent)if(!o.visible)return false;return true;};
    const h=groundRay.intersectObject(tiles.group,true).find(i=>vis(i.object));
    if(h){const want=groundOff-h.point.y;if(Math.abs(want)<45&&Math.abs(h.point.y)>.05){groundOff=want;setFrame(tiles.group);}}return !!h;}
  setupGoogle3D();
  function safeSpot(x,z){if(!inBld(x,z,.7))return[x,z];for(let r=1;r<80;r+=.8)for(let a=0;a<24;a++){const px=x+Math.cos(a/24*6.283)*r,pz=z+Math.sin(a/24*6.283)*r;if(!inBld(px,pz,.7))return[px,pz];}return[spawn.x,spawn.z];}
  let use3D=true;
  function toggle3D(){if(!tiles||g3dState!=='on')return null;use3D=!use3D;tiles.group.visible=use3D;flats.forEach(o=>o.visible=!use3D);return use3D;}
  return{toggle3D,get tiles(){return tiles;},get g3dState(){return g3dState;},mapC,MS,places,toLatLon,safeSpot,ICON,homeDoor:door,
    debug:{crownI,trunkI,sun,hemi},scene,spawn,update,collide,interactables,drawMinimap,streetName,occluders:bMeshes,homeDoor:door,counts:{blds:blds.length,osm:data.buildings.length,roads:roads.length,pois:pois.length,trees:treePos.length,lamps:lampPos.length}};
}
