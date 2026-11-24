// Nhân vật người dựng bằng hình khối: đủ ngũ quan, bàn tay 5 ngón có khớp, khung xương đơn giản để tạo dáng.
import * as THREE from 'three';
const lerp=(a,b,t)=>a+(b-a)*t;
const V=(a)=>a.map(p=>new THREE.Vector2(p[0],p[1]));

// Các dáng tay: sx = vai đưa trước(-)/sau(+), sz = vai dang ra/khép vào, sy = xoay vai, e = khuỷu gập (âm = gập về trước), wr = xoay cổ tay, c = nắm ngón (0..1)
export const POSES={
  rest:{r:{sx:0,sz:.07,sy:0,e:-.12,wr:0,c:.25},l:{sx:0,sz:.07,sy:0,e:-.12,wr:0,c:.25},spine:0,head:0},
  hold:{r:{sx:-.35,sz:-.12,sy:-.25,e:-1.45,wr:0,c:.85}},
  holdBoth:{r:{sx:-.55,sz:-.28,sy:-.2,e:-1.25,wr:0,c:.8},l:{sx:-.55,sz:-.28,sy:.2,e:-1.25,wr:0,c:.8}},
  reach:{r:{sx:-1.25,sz:.05,sy:0,e:-.25,wr:0,c:.15},spine:.12},
  reachHigh:{r:{sx:-2.35,sz:.1,sy:0,e:-.15,wr:0,c:.2}},
  reachLow:{r:{sx:-.85,sz:.08,sy:0,e:-.2,wr:0,c:.2},spine:.55,head:.25},
  press:{r:{sx:-1.3,sz:.02,sy:0,e:-.12,wr:0,c:.6,point:1},spine:.08},
  drink:{r:{sx:-1.12,sz:-.5,sy:0,e:-2.42,wr:0,c:.85},head:-.35},
  eat:{r:{sx:-1.1,sz:-.5,sy:0,e:-2.48,wr:0,c:.85},head:-.05},
  pour:{r:{sx:-1.05,sz:.05,sy:0,e:-.55,wr:1.2,c:.9},spine:.12},
  phone:{r:{sx:-.55,sz:-.18,sy:-.35,e:-1.55,wr:0,c:.7},l:{sx:-.5,sz:-.18,sy:.35,e:-1.5,wr:0,c:.5},head:.35},
  pet:{r:{sx:-.9,sz:.0,sy:0,e:-.3,wr:0,c:.1},spine:.3,head:.3},
  throw:{r:{sx:-1.7,sz:.1,sy:0,e:-.3,wr:0,c:.1}},
  wave:{r:{sx:-.2,sz:1.9,sy:0,e:-1.3,wr:0,c:0}},
  remote:{r:{sx:-.45,sz:.05,sy:-.2,e:-1.3,wr:0,c:.85}}
};

export function createHuman(opt={}){
  const C=Object.assign({skin:0xf1c6a5,shirt:0x4f7cff,pants:0x2c3442,hair:0x2a1b14,shoe:0xf4f4f4,iris:0x5a3a22,lips:0xc56b66},opt);
  const M=(c,r=.7,extra={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:r},extra));
  const mat={skin:M(C.skin,.6),shirt:M(C.shirt,.85),pants:M(C.pants,.9),hair:M(C.hair,.7),shoe:M(C.shoe,.45),sole:M(0x2b2b2b,.8),white:M(0xfdfdfd,.25),iris:M(C.iris,.25),pupil:M(0x0d0d0d,.15),lips:M(C.lips,.45),brow:M(C.hair,.9),nail:M(0xf6d2c0,.3)};
  const root=new THREE.Group();
  const mk=(geo,m,x,y,z,p)=>{const o=new THREE.Mesh(geo,m);o.position.set(x||0,y||0,z||0);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;};
  const G=(x,y,z,p)=>{const g=new THREE.Group();g.position.set(x||0,y||0,z||0);p.add(g);return g;};

  /* ---- hông, thân ---- */
  const hips=G(0,.94,0,root);
  mk(new THREE.SphereGeometry(.155,24,16),mat.pants,0,0,0,hips).scale.set(1,.62,.74);
  const belt=mk(new THREE.TorusGeometry(.142,.012,8,32),M(0x3a2a20,.5),0,.06,0,hips);belt.rotation.x=Math.PI/2;belt.scale.set(1,.74,1);
  const spine=G(0,.04,0,hips);
  const torso=mk(new THREE.LatheGeometry(V([[0,0],[.138,0],[.145,.08],[.152,.2],[.168,.32],[.172,.41],[.15,.48],[.09,.53],[0,.545]]),32),mat.shirt,0,0,0,spine);torso.scale.z=.66;
  const collar=mk(new THREE.TorusGeometry(.052,.012,8,24),mat.shirt,0,.535,0,spine);collar.rotation.x=Math.PI/2;
  const chest=G(0,.47,0,spine);

  /* ---- cổ, đầu, khuôn mặt ---- */
  const neck=G(0,.04,0,chest);mk(new THREE.CylinderGeometry(.05,.056,.1,16),mat.skin,0,.03,0,neck);
  const head=G(0,.065,0,neck);
  const skull=mk(new THREE.LatheGeometry(V([[0,-.13],[.04,-.127],[.068,-.112],[.09,-.075],[.102,-.03],[.108,.02],[.106,.07],[.094,.11],[.068,.142],[.035,.158],[0,.162]]),40),mat.skin,0,.12,0,head);skull.scale.set(1,1,1.07);
  const face=G(0,.12,0,head);
  const lids=[];
  for(const s of[-1,1]){
    const eye=G(s*.039,.012,.104,face);
    mk(new THREE.SphereGeometry(.021,20,14),mat.white,0,0,0,eye).scale.set(1,.82,.62);
    mk(new THREE.SphereGeometry(.0128,16,12),mat.iris,0,0,.0102,eye).scale.set(1,1,.45);
    mk(new THREE.SphereGeometry(.0058,12,8),mat.pupil,0,0,.0148,eye).scale.set(1,1,.4);
    mk(new THREE.SphereGeometry(.0024,8,6),mat.white,.004,.004,.0158,eye);
    const lid=mk(new THREE.SphereGeometry(.0228,20,10,0,Math.PI*2,0,Math.PI/2),mat.skin,0,0,0,eye);lid.scale.set(1.02,.86,.66);lid.rotation.x=.35;lids.push(lid);
    const lash=mk(new THREE.TorusGeometry(.019,.0022,4,16,Math.PI),mat.brow,0,.004,.006,eye);lash.scale.set(1,.7,1);
    const brow=mk(new THREE.CapsuleGeometry(.0055,.034,4,8),mat.brow,s*.041,.045,.113,face);brow.rotation.z=Math.PI/2+s*.12;brow.scale.z=.6;
    const ear=mk(new THREE.SphereGeometry(.031,16,12),mat.skin,s*.106,.0,-.005,face);ear.scale.set(.38,1,.68);
    mk(new THREE.SphereGeometry(.014,10,8),M(0xe6a796,.6),s*.1055,-.004,-.002,face).scale.set(.3,.8,.5);
  }
  const nose=G(0,-.018,.104,face);
  mk(new THREE.CapsuleGeometry(.0095,.03,4,10),mat.skin,0,.012,0,nose).rotation.x=-.35;
  mk(new THREE.SphereGeometry(.0165,14,10),mat.skin,0,-.012,.012,nose).scale.set(1.15,.85,.9);
  for(const s of[-1,1])mk(new THREE.SphereGeometry(.0075,10,8),mat.skin,s*.012,-.016,.006,nose);
  const mouth=G(0,-.066,.1,face);
  const ul=mk(new THREE.TorusGeometry(.021,.0058,8,20,Math.PI),mat.lips,0,.004,0,mouth);ul.rotation.z=Math.PI;ul.scale.set(1,.5,.7);
  const ll=mk(new THREE.CapsuleGeometry(.0065,.022,4,8),mat.lips,0,-.004,-.001,mouth);ll.rotation.z=Math.PI/2;ll.scale.z=.7;
  mk(new THREE.SphereGeometry(.03,14,10),mat.skin,0,-.11,.07,face).scale.set(1.2,.6,.7);// cằm
  /* tóc */
  const hairG=G(0,.12,0,head);
  mk(new THREE.SphereGeometry(.12,32,16,0,Math.PI*2,0,Math.PI*.56),mat.hair,0,.03,-.006,hairG).scale.set(1.06,1.12,1.12);
  mk(new THREE.SphereGeometry(.118,32,16,Math.PI,Math.PI,Math.PI*.3,Math.PI*.45),mat.hair,0,.015,-.01,hairG).scale.set(1.07,1.08,1.12);
  for(let i=0;i<7;i++){const a=(i-3)/3;const f=mk(new THREE.CapsuleGeometry(.018,.045,4,8),mat.hair,a*.07,.118-Math.abs(a)*.01,.095-Math.abs(a)*.022,hairG);f.rotation.set(1.25,0,a*.5);f.scale.set(1.1,1,.55);}
  for(const s of[-1,1]){const sb=mk(new THREE.CapsuleGeometry(.022,.06,4,8),mat.hair,s*.1,.03,.03,hairG);sb.rotation.z=s*.15;sb.scale.set(.6,1,1);}

  /* ---- tay ---- */
  function arm(s){
    const sh=G(s*.185,.4,0,spine);
    mk(new THREE.SphereGeometry(.062,18,14),mat.shirt,0,0,0,sh);
    const up=G(0,0,0,sh);
    mk(new THREE.CylinderGeometry(.062,.055,.15,18),mat.shirt,0,-.065,0,up);
    mk(new THREE.CapsuleGeometry(.043,.17,6,14),mat.skin,0,-.15,0,up);
    const el=G(0,-.27,0,up);
    mk(new THREE.SphereGeometry(.04,12,10),mat.skin,0,0,0,el);
    mk(new THREE.CapsuleGeometry(.038,.18,6,14),mat.skin,0,-.115,0,el).scale.set(1,1,.9);
    const wr=G(0,-.245,0,el);
    const hand=G(0,0,0,wr);
    const palm=mk(new THREE.SphereGeometry(.04,16,12),mat.skin,0,-.038,0,hand);palm.scale.set(.42,1,.92);
    const fingers=[];const len=[.9,1,.95,.78];
    for(let i=0;i<4;i++){const z=(1.5-i)*.0175;const b=G(-s*.002,-.072,z,hand);const L=.022*len[i];
      mk(new THREE.CapsuleGeometry(.0088,L,4,8),mat.skin,0,-L/2-.004,0,b);const j=G(0,-L-.009,0,b);
      mk(new THREE.CapsuleGeometry(.0082,L*.75,4,8),mat.skin,0,-L*.38-.004,0,j);const j2=G(0,-L*.8-.006,0,j);
      mk(new THREE.CapsuleGeometry(.0076,L*.5,4,8),mat.skin,0,-L*.25-.003,0,j2);mk(new THREE.SphereGeometry(.0055,8,6),mat.nail,-s*.004,-L*.42,0,j2).scale.set(.4,1,.9);
      fingers.push([b,j,j2]);}
    const tb=G(-s*.018,-.028,.03,hand);tb.rotation.set(.55,0,-s*.35);
    mk(new THREE.CapsuleGeometry(.0105,.022,4,8),mat.skin,0,-.016,0,tb);const tj=G(0,-.034,0,tb);mk(new THREE.CapsuleGeometry(.0095,.018,4,8),mat.skin,0,-.013,0,tj);
    const grip=G(-s*.032,-.085,.0,hand);
    return{sh,up,el,wr,hand,fingers,thumb:[tb,tj],grip,cur:{sx:0,sz:.06,sy:0,e:-.12,wr:0,c:.25,point:0}};}
  const armR=arm(1),armL=arm(-1);

  /* ---- chân ---- */
  function leg(s){const th=G(s*.086,-.02,0,hips);mk(new THREE.CapsuleGeometry(.072,.31,6,14),mat.pants,0,-.21,0,th);
    const kn=G(0,-.43,0,th);mk(new THREE.CapsuleGeometry(.058,.32,6,14),mat.pants,0,-.19,0,kn);
    const an=G(0,-.42,0,kn);const shoe=mk(new THREE.CapsuleGeometry(.048,.14,6,12),mat.shoe,0,-.035,.045,an);shoe.rotation.x=Math.PI/2;shoe.scale.set(1.12,1,.72);
    const sole=mk(new THREE.BoxGeometry(.1,.018,.25),mat.sole,0,-.068,.045,an);
    return{th,kn,an};}
  const legR=leg(1),legL=leg(-1);

  /* ---- hoạt ảnh ---- */
  let ph=0,t=0,blinkT=2,blink=0,armPose='rest',armPoseL=null,override=null,lean=0,headPitch=0,spineBend=0,hipY=.94,airT=0;
  const target={r:Object.assign({},POSES.rest.r),l:Object.assign({},POSES.rest.l)};
  function setArms(name,nameL){armPose=name||'rest';armPoseL=nameL||null;}
  function applyArm(a,s,tg,k){const c=a.cur;for(const key of['sx','sz','sy','e','wr','c','point'])c[key]=lerp(c[key]||0,tg[key]||0,k);
    a.up.rotation.set(c.sx,c.sy*s,-c.sz*s);a.el.rotation.set(c.e,0,0);a.wr.rotation.set(0,c.wr*s,0);
    a.fingers.forEach((f,i)=>{const cc=(c.point&&i===0)?0:c.c;f[0].rotation.z=-s*cc*1.25;f[1].rotation.z=-s*cc*1.5;f[2].rotation.z=-s*cc*1.1;});
    a.thumb[1].rotation.z=-s*c.c*.8;}
  function update(dt,st){t+=dt;const sp=st.speed||0,run=!!st.run&&sp>2.6,base=st.base||'stand';
    // chớp mắt
    blinkT-=dt;if(blinkT<0){blink=.16;blinkT=2+Math.random()*4;}blink=Math.max(0,blink-dt);const lidA=blink>0?1.45:-.3;lids.forEach(l=>l.rotation.x=lerp(l.rotation.x,lidA,.6));
    const k=1-Math.pow(.0005,dt);
    // thân dưới
    let thR=0,thL=0,knR=0,knL=0,hy=.94,sb=0;
    if(base==='sit'){thR=thL=-1.5;knR=knL=1.45;hy=.5;}
    else if(base==='lie'){thR=thL=0;knR=knL=.05;hy=.94;}
    else if(base==='crouch'){thR=thL=-1.25;knR=knL=2.2;hy=.52;sb=.25;}
    else if(st.air){thR=-.5;thL=-.2;knR=.9;knL=.5;}
    else if(sp>.05){ph+=dt*sp*(run?2.15:3.1);const A=run?.95:.55,B=run?1.5:.7;thR=-Math.sin(ph)*A;thL=Math.sin(ph)*A;knR=B*(.5+.5*Math.sin(ph-1.4));knL=B*(.5+.5*Math.sin(ph+Math.PI-1.4));hy=.94-.02+Math.abs(Math.cos(ph))*(run?.065:.03);}
    else{hy=.94+Math.sin(t*1.8)*.004;}
    legR.th.rotation.x=lerp(legR.th.rotation.x,thR,k);legL.th.rotation.x=lerp(legL.th.rotation.x,thL,k);legR.kn.rotation.x=lerp(legR.kn.rotation.x,knR,k);legL.kn.rotation.x=lerp(legL.kn.rotation.x,knL,k);
    legR.an.rotation.x=-legR.kn.rotation.x*.3-legR.th.rotation.x*.2;legL.an.rotation.x=-legL.kn.rotation.x*.3-legL.th.rotation.x*.2;
    hips.position.y=lerp(hips.position.y,hy,k);
    // thân trên
    const P=POSES[armPose]||POSES.rest;lean=lerp(lean,(run?.2:sp>.05?.05:0)+(P.spine||0)+sb,k);spine.rotation.x=lean;
    headPitch=lerp(headPitch,(P.head||0)-lean*.5,k);head.rotation.x=headPitch;
    chest.scale.y=1+Math.sin(t*2)*.008;
    // tay: vung theo bước đi nếu không cầm gì
    const swing=sp>.05&&base==='stand'?Math.sin(ph)*(run?.9:.45):0;
    const tr=Object.assign({},POSES.rest.r,P.r||{});const tl=Object.assign({},POSES.rest.l,(armPoseL&&POSES[armPoseL]?POSES[armPoseL].r:null)||P.l||{});
    if(!P.r||armPose==='rest')tr.sx+=swing,tr.e+=run?-1.2:-.15;
    if(!(P.l||armPoseL)||armPose==='rest')tl.sx-=swing,tl.e+=run?-1.2:-.15;
    if(base==='sit'&&armPose==='rest'){tr.sx=-.5;tl.sx=-.5;tr.e=-.6;tl.e=-.6;}
    if(override){Object.assign(tr,override);}
    applyArm(armR,1,tr,k);applyArm(armL,-1,tl,k);}
  function setColors(c){if(c.shirt!=null)mat.shirt.color.set(c.shirt);if(c.pants!=null)mat.pants.color.set(c.pants);if(c.hair!=null){mat.hair.color.set(c.hair);mat.brow.color.set(c.hair);}if(c.skin!=null)mat.skin.color.set(c.skin);}
  return{root,hips,spine,head,armR,armL,legR,legL,gripR:armR.grip,gripL:armL.grip,mat,update,setArms,setOverride:o=>{override=o;},setColors,get armPose(){return armPose;}};
}
