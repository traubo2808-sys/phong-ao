const APP=window.APP,st=APP.st,$=s=>document.querySelector(s);
const phone=$('#phone'),view=$('#papp');
const pad=n=>String(n).padStart(2,'0');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DAYS=['Chủ nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
let screen='lock',flash=false,calc={cur:'0',prev:null,op:null,fresh:true},dial='',ringing=false,ringTI=null,photoView=-1,timer={end:0,left:0,run:false};
const CITIES=[['TP. Hồ Chí Minh',10.776,106.70],['Hà Nội',21.028,105.854],['Đà Nẵng',16.054,108.202],['Hải Phòng',20.845,106.688],['Cần Thơ',10.045,105.746],['Huế',16.463,107.585],['Nha Trang',12.238,109.196],['Đà Lạt',11.940,108.458],['Vũng Tàu',10.346,107.084],['Quy Nhơn',13.782,109.219],['Buôn Ma Thuột',12.667,108.038],['Hạ Long',20.959,107.043]];
const LINKS={facebook:['https://www.facebook.com','Facebook','#1877f2','f'],zalo:['https://chat.zalo.me','Zalo','#0068ff','Z'],messenger:['https://www.messenger.com','Messenger','#a033ff','💬'],google:['https://www.google.com','Google','#ffffff','G'],youtube:['https://www.youtube.com','YouTube','#ff0033','▶'],gmail:['https://mail.google.com','Gmail','#ea4335','✉'],tiktok:['https://www.tiktok.com','TikTok','#111111','♪']};

function open(app){phone.hidden=false;APP.emit('phone:state',true);if(app)go(app);else render();}
function close(){if(ringing)return;phone.hidden=true;APP.emit('phone:state',false);document.activeElement&&document.activeElement.blur&&document.activeElement.blur();}
APP.on('phone:open',a=>{open(a?a:null);if(a&&screen==='lock')go(a);});
APP.on('phone:toggle',()=>phone.hidden?open():close());
APP.on('phone:close',close);
APP.on('devices',()=>{if(!phone.hidden&&screen==='home2')render();});
APP.on('weather',()=>{if(!phone.hidden&&(screen==='weather'||screen==='home'||screen==='lock'))render();});
$('#pHome').onclick=()=>{if(ringing)return;go(screen==='home'?'lock':'home');};
function go(s){screen=s;photoView=-1;render();}

function wxLine(){const w=APP.weather;if(!w)return'Đang lấy thời tiết…';const i=APP.wxInfo(w.code,w.isDay);return`${i[0]} ${Math.round(w.temp)}° · ${i[1]} · ${st.city.name}`;}
function now(){const d=new Date();return{d,hm:`${pad(d.getHours())}:${pad(d.getMinutes())}`,date:`${DAYS[d.getDay()]}, ${d.getDate()} tháng ${d.getMonth()+1}`};}
function hdr(t){return`<div class="ah"><button class="back" data-go="home" aria-label="Quay lại">‹</button><h2>${t}</h2></div>`;}
function app(id,ic,bg,name,extra=''){return`<button class="ap" data-go="${id}" ${extra}><i style="background:${bg}">${ic}</i><span>${name}</span></button>`;}
function linkApp(k){const[u,n,bg,ic]=LINKS[k];return`<a class="ap" href="${u}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none"><i style="background:${bg};color:${bg==='#ffffff'?'#4285f4':'#fff'};font-weight:800;font-family:var(--display)">${ic}</i><span>${n}</span></a>`;}

function render(){view.className='papp';const n=now();$('#pTime').textContent=n.hm;let h='';
  if(screen==='lock'){view.classList.add('wall','lock');h=`<div class="lt">${n.hm}</div><div class="ld">${n.date}</div><div class="lw">${esc(wxLine())}</div>${st.alarms.filter(a=>a.on).length?`<div class="lw">⏰ Báo thức: ${st.alarms.filter(a=>a.on).map(a=>a.t).join(', ')}</div>`:''}<div class="lu">Bấm để mở khóa</div>`;view.innerHTML=h;view.onclick=()=>{view.onclick=null;go('home');};return;}
  view.onclick=null;
  if(screen==='home'){view.classList.add('wall');const w=APP.weather;
    h=`<div class="apps"><div class="wid"><div><div class="t">${n.hm}</div><div style="font-size:13px;opacity:.85">${n.date}</div></div><div style="text-align:right;font-size:13px">${w?`<div style="font-size:30px">${APP.wxInfo(w.code,w.isDay)[0]}</div>${Math.round(w.temp)}° ${esc(st.city.name)}`:'…'}</div></div>
      ${app('home2','🏠','linear-gradient(135deg,#ffb47a,#ff7a59)','Nhà')}${app('weather','🌤️','linear-gradient(135deg,#4facfe,#2a6fdb)','Thời tiết')}${app('clock','⏰','#1c1c1e','Đồng hồ')}${app('calc','🧮','#333','Máy tính')}
      ${app('notes','📝','linear-gradient(135deg,#ffe082,#ffca28)','Ghi chú')}${app('camera','📷','#3a3a3c','Camera')}${app('photos','🖼️','linear-gradient(135deg,#fff,#ddd)','Ảnh')}<button class="ap" id="flashBtn"><i style="background:${flash?'#fff':'#2c2c2e'}">🔦</i><span>Đèn pin</span></button>
      ${linkApp('facebook')}${linkApp('messenger')}${linkApp('youtube')}${linkApp('tiktok')}
      ${linkApp('gmail')}<button class="ap" id="mapApp"><i style="background:linear-gradient(135deg,#7fd36b,#2f8f5a)">🗺️</i><span>Bản đồ</span></button>${app('settings','⚙️','#636366','Cài đặt')}</div>
      <div class="dock">${app('dial','📞','#34c759','Điện thoại')}${linkApp('zalo')}${linkApp('google')}${app('camera','📷','#3a3a3c','Camera')}</div>`;}
  else if(screen==='home2'){const d=APP.dev.get();const row=(k,t,on,sub='')=>`<button class="li" data-dev="${k}"><span>${t}${sub?`<br><small>${sub}</small>`:''}</span><span class="sw ${on?'on':''}"></span></button>`;
    h=hdr('Nhà của tôi')+`<div class="lst" style="margin-bottom:12px"><button class="li" id="orderFood"><span>🛒 Đặt giao đồ ăn<br><small>Giao tới cửa, bạn cầm vào cất tủ lạnh</small></span><small>›</small></button></div><div class="lst">${row('ceiling','💡 Đèn trần',d.ceiling)}${row('lamp','🛋️ Đèn cây',d.lamp)}${row('curtains','🪟 Rèm cửa sổ',d.curtains,d.curtains?'Đang mở':'Đang kéo')}${row('tv','📺 TV LUMA',d.tv,d.tv?'Đang bật':'Đang tắt')}</div>
      <div class="sec">Quạt máy</div><div class="lst"><div class="li" style="gap:6px">${[0,1,2,3].map(v=>`<button class="pb2" data-fan="${v}" style="flex:1;padding:9px 0;border-radius:10px;background:${d.fan===v?'#ff9f0a':'#2c2c2e'};color:${d.fan===v?'#000':'#fff'};font-weight:600">${v?'Số '+v:'Tắt'}</button>`).join('')}</div>${row('fanOsc','Quay qua lại',d.fanOsc)}</div>
      <div class="sec">Máy lạnh</div><div class="lst">${row('ac','❄️ Máy lạnh',d.ac,`Phòng đang ${st.roomTemp.toFixed(1)}°C`)}<div class="li"><button class="back" data-ac="-1" ${d.ac?'':'disabled'}>−</button><span style="font-family:var(--display);font-size:30px">${d.acTemp}°C</span><button class="back" data-ac="1" ${d.ac?'':'disabled'}>+</button></div></div>`;}
  else if(screen==='weather'){const w=APP.weather;
    h=hdr('Thời tiết');
    if(w){const i=APP.wxInfo(w.code,w.isDay);h+=`<div class="wxbig"><div style="font-size:16px">${esc(st.city.name)}</div><div class="tt">${Math.round(w.temp)}°</div><div class="ic">${i[0]}</div><div>${i[1]}</div><div style="font-size:13px;color:#aaa;margin-top:6px">Cảm giác ${Math.round(w.feels)}° · Độ ẩm ${w.hum}% · Gió ${Math.round(w.wind)} km/h</div></div>
      <div class="fc">${w.daily.map((d,k)=>{const dd=new Date(d.t+'T00:00');return`<span>${k?DAYS[dd.getDay()]:'Hôm nay'}</span><span>${APP.wxInfo(d.code,1)[0]} ${d.rain??0}%</span><span>${Math.round(d.min)}° / ${Math.round(d.max)}°</span>`;}).join('')}</div>`;}
    else h+=`<p class="pnote">Đang lấy dữ liệu thời tiết…</p>`;
    h+=`<div class="sec">Chọn thành phố</div><div class="lst"><button class="li" data-geo="1"><span>📍 Dùng vị trí của tôi</span><small>trình duyệt sẽ hỏi</small></button>${CITIES.map((c,i)=>`<button class="li" data-city="${i}"><span>${c[0]}</span>${c[0]===st.city.name?'<small>✓ đang chọn</small>':''}</button>`).join('')}</div><p class="pnote">Dữ liệu thời tiết thật từ Open-Meteo, cập nhật mỗi 10 phút. Cửa sổ trong phòng đổi theo thời tiết này.</p>`;}
  else if(screen==='clock'){h=hdr('Đồng hồ')+`<div class="wxbig"><div class="tt" id="bigT">${n.hm}<span style="font-size:30px">:${pad(n.d.getSeconds())}</span></div><div>${n.date}</div></div>
      <div class="sec">Báo thức</div><div class="lst">${st.alarms.map((a,i)=>`<div class="li"><span style="font-family:var(--display);font-size:28px">${a.t}</span><span style="display:flex;gap:10px;align-items:center"><button data-adel="${i}" style="color:#ff453a;font-size:13px">Xóa</button><button class="sw ${a.on?'on':''}" data-atog="${i}" aria-label="Bật tắt báo thức"></button></span></div>`).join('')||'<div class="li"><small>Chưa có báo thức nào</small></div>'}
      <div class="li"><input type="time" id="newAlarm" value="${pad((n.d.getHours()+1)%24)}:00" style="background:#2c2c2e;color:#fff;border:0;border-radius:10px;padding:8px;font:16px var(--body)"><button id="addAlarm" style="background:#ff9f0a;color:#000;font-weight:700;padding:8px 14px;border-radius:10px">Thêm</button></div></div>
      <div class="sec">Hẹn giờ</div><div class="lst"><div class="li"><span style="font-family:var(--display);font-size:28px" id="tmr">${fmtTimer()}</span><span style="display:flex;gap:6px">${timer.run?'<button class="back" data-tm="stop" style="width:auto;padding:0 12px;border-radius:10px">Dừng</button>':[1,5,15,30].map(m=>`<button class="back" data-tm="${m}" style="width:auto;padding:0 10px;border-radius:10px">${m}p</button>`).join('')}</span></div></div>
      <p class="pnote">Báo thức chạy theo giờ thật của máy. Phòng phải đang mở thì mới kêu.</p>`;}
  else if(screen==='calc'){h=hdr('Máy tính')+`<div class="calc"><div class="disp">${esc(calc.cur)}</div><div class="keys2">${['AC','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','0',',','='].map(k=>`<button data-c="${k}" class="${'÷×−+='.includes(k)?'op':['AC','±','%'].includes(k)?'fn':''} ${k==='0'?'zero':''}">${k}</button>`).join('')}</div></div>`;}
  else if(screen==='notes'){h=hdr('Ghi chú')+`<textarea class="note" id="noteTxt" placeholder="Viết gì đó…">${esc(st.notes)}</textarea><p class="pnote">Tự lưu trên máy này.</p>`;}
  else if(screen==='camera'){h=hdr('Camera')+`<p class="pnote">Chụp lại khung cảnh căn phòng đang thấy trên màn hình. TV đang phát sẽ hiện màu đen trong ảnh.</p>${st.photos.length?`<img src="${st.photos[st.photos.length-1]}" alt="Ảnh vừa chụp" style="width:100%;border-radius:14px;margin-top:6px">`:''}<button class="shutter" id="shoot" aria-label="Chụp ảnh"></button>`;}
  else if(screen==='photos'){h=hdr('Ảnh');if(photoView>=0){h+=`<img src="${st.photos[photoView]}" alt="" style="width:100%;border-radius:14px"><div style="display:flex;gap:10px;margin-top:12px"><button class="li" style="justify-content:center;background:#1c1c1e;border-radius:12px" data-pv="-1">Quay lại</button><button class="li" style="justify-content:center;background:#1c1c1e;border-radius:12px;color:#ff453a" data-pdel="${photoView}">Xóa ảnh</button></div>`;}
    else h+=st.photos.length?`<div class="photos">${st.photos.map((p,i)=>`<img src="${p}" alt="Ảnh ${i+1}" data-pv="${i}">`).reverse().join('')}</div>`:'<p class="pnote">Chưa có ảnh. Mở Camera để chụp.</p>';}
  else if(screen==='dial'){h=hdr('Điện thoại')+`<div class="dnum">${esc(dial)||'&nbsp;'}</div><div class="pad">${[['1',''],['2','ABC'],['3','DEF'],['4','GHI'],['5','JKL'],['6','MNO'],['7','PQRS'],['8','TUV'],['9','WXYZ'],['*',''],['0','+'],['#','']].map(([k,s])=>`<button data-d="${k}">${k}<small>${s}</small></button>`).join('')}</div><div style="display:flex;justify-content:center;gap:30px;align-items:center"><button class="callbtn" id="callGo" aria-label="Gọi">📞</button>${dial?'<button id="dialDel" style="font-size:22px">⌫</button>':''}</div>`;}
  else if(screen==='calling'){h=`<div class="wxbig" style="padding-top:40px"><div style="font-size:15px;color:#aaa">Đang gọi…</div><div style="font-family:var(--display);font-size:34px;margin-top:10px">${esc(dial)}</div></div><p class="pnote" style="text-align:center">Đây là điện thoại ảo nên không gọi được số thật. Bạn có thể gọi miễn phí qua Zalo hoặc Messenger trong tab mới.</p><div class="lst" style="margin-top:10px">${['zalo','messenger'].map(k=>`<a class="li" href="${LINKS[k][0]}" target="_blank" rel="noopener" style="color:#0a84ff;text-decoration:none">Gọi qua ${LINKS[k][1]}<small>mở tab mới</small></a>`).join('')}</div><button class="callbtn" style="background:#ff3b30;margin-top:26px" data-go="dial" aria-label="Kết thúc">✕</button>`;}
  else if(screen==='settings'){h=hdr('Cài đặt')+`<div class="sec">Màu áo nhân vật</div><div class="li" style="background:#1c1c1e;border-radius:16px;gap:8px;justify-content:flex-start;flex-wrap:wrap">${['#4f7cff','#ff6b6b','#2ec4a6','#ffb547','#9b6bff','#f5f5f5','#222831','#ff8fb1'].map(c=>`<button data-shirt="${c}" aria-label="Màu ${c}" style="width:34px;height:34px;border-radius:50%;background:${c};box-shadow:${st.shirt===c?'0 0 0 3px #fff':'0 0 0 1px #555'}"></button>`).join('')}</div>
      <div class="sec">Thành phố</div><div class="lst"><button class="li" data-go="weather"><span>${esc(st.city.name)}</span><small>Đổi ›</small></button></div>
      <div class="sec">Thông tin</div><div class="lst"><div class="li"><span>Phòng Ảo LUMA</span><small>phiên bản căn phòng 3D</small></div></div>`;}
  view.innerHTML=h;bind();}

function fmtTimer(){const s=Math.max(0,Math.ceil(timer.run?(timer.end-Date.now())/1000:timer.left));return`${pad(Math.floor(s/60))}:${pad(s%60)}`;}
function bind(){
  view.querySelectorAll('[data-go]').forEach(b=>b.onclick=e=>{e.stopPropagation();go(b.dataset.go);});
  const ma=$('#mapApp');if(ma)ma.onclick=()=>{close();APP.emit('map:open');};
  const of=$('#orderFood');if(of)of.onclick=()=>{APP.emit('order');close();};
  const fb=$('#flashBtn');if(fb)fb.onclick=()=>{flash=!flash;APP.emit('flashlight',flash);APP.sfx&&APP.sfx.pop();render();};
  view.querySelectorAll('[data-dev]').forEach(b=>b.onclick=()=>{const k=b.dataset.dev,d=APP.dev.get();if(k==='tv')APP.dev.set('tv');else APP.dev.set(k,!d[k]);setTimeout(render,k==='tv'?400:0);});
  view.querySelectorAll('[data-fan]').forEach(b=>b.onclick=()=>{APP.dev.set('fan',+b.dataset.fan);render();});
  view.querySelectorAll('[data-ac]').forEach(b=>b.onclick=()=>{APP.dev.set('acTemp',st.acTemp+(+b.dataset.ac));render();});
  view.querySelectorAll('[data-city]').forEach(b=>b.onclick=()=>{const c=CITIES[+b.dataset.city];st.city={name:c[0],lat:c[1],lon:c[2]};APP.save();APP.weather=null;render();APP.fetchWeather().then(render);});
  const geo=view.querySelector('[data-geo]');if(geo)geo.onclick=()=>{if(!navigator.geolocation){APP.toast('Trình duyệt không hỗ trợ lấy vị trí.');return;}
    navigator.geolocation.getCurrentPosition(p=>{st.city={name:'Vị trí của tôi',lat:+p.coords.latitude.toFixed(3),lon:+p.coords.longitude.toFixed(3)};APP.save();APP.weather=null;render();APP.fetchWeather().then(render);},()=>APP.toast('Chưa được phép lấy vị trí. Hãy chọn thành phố trong danh sách.'));};
  const add=$('#addAlarm');if(add)add.onclick=()=>{const v=$('#newAlarm').value;if(!v)return;st.alarms.push({t:v,on:true,last:''});st.alarms.sort((a,b)=>a.t.localeCompare(b.t));APP.save();APP.toast('Đã đặt báo thức '+v);render();};
  view.querySelectorAll('[data-atog]').forEach(b=>b.onclick=()=>{const a=st.alarms[+b.dataset.atog];a.on=!a.on;APP.save();render();});
  view.querySelectorAll('[data-adel]').forEach(b=>b.onclick=()=>{st.alarms.splice(+b.dataset.adel,1);APP.save();render();});
  view.querySelectorAll('[data-tm]').forEach(b=>b.onclick=()=>{const v=b.dataset.tm;if(v==='stop'){timer.run=false;timer.left=0;}else{timer.run=true;timer.end=Date.now()+v*60000;}render();});
  view.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{calcKey(b.dataset.c);render();});
  const nt=$('#noteTxt');if(nt)nt.oninput=()=>{st.notes=nt.value;};
  const sh=$('#shoot');if(sh)sh.onclick=shoot;
  view.querySelectorAll('[data-pv]').forEach(b=>b.onclick=()=>{photoView=+b.dataset.pv;screen='photos';const k=photoView;render();photoView=k;if(k>=0){/* giữ */}});
  view.querySelectorAll('[data-pdel]').forEach(b=>b.onclick=()=>{st.photos.splice(+b.dataset.pdel,1);APP.save();photoView=-1;render();});
  view.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{if(dial.length<15)dial+=b.dataset.d;APP.sfx&&APP.sfx.pop();render();});
  const dd=$('#dialDel');if(dd)dd.onclick=()=>{dial=dial.slice(0,-1);render();};
  const cg=$('#callGo');if(cg)cg.onclick=()=>{if(!dial){APP.toast('Nhập số trước đã.');return;}go('calling');};
  view.querySelectorAll('[data-shirt]').forEach(b=>b.onclick=()=>{APP.setShirt(b.dataset.shirt);render();});}
// giữ ảnh đang xem khi render lại
const _render=render;
function calcKey(k){const c=calc;const num=()=>parseFloat(c.cur.replace(',','.'))||0;const fmt=v=>{if(!isFinite(v))return'Lỗi';let s=String(+v.toPrecision(10));return s.replace('.',',');};
  if(/[0-9]/.test(k)){c.cur=c.fresh||c.cur==='0'?k:(c.cur.length<12?c.cur+k:c.cur);c.fresh=false;}
  else if(k===','){if(c.fresh){c.cur='0,';c.fresh=false;}else if(!c.cur.includes(','))c.cur+=',';}
  else if(k==='AC'){c.cur='0';c.prev=null;c.op=null;c.fresh=true;}
  else if(k==='±'){c.cur=fmt(-num());}else if(k==='%'){c.cur=fmt(num()/100);}
  else{if(c.op&&!c.fresh){const a=c.prev,b=num();const r=c.op==='+'?a+b:c.op==='−'?a-b:c.op==='×'?a*b:a/b;c.cur=fmt(r);}
    c.prev=parseFloat(c.cur.replace(',','.'));c.op=k==='='?null:k;c.fresh=true;}}
function shoot(){const src=APP.capture();const img=new Image();img.onload=()=>{const W=420,H=Math.round(img.height*W/img.width);const c=document.createElement('canvas');c.width=W;c.height=H;c.getContext('2d').drawImage(img,0,0,W,H);
  st.photos.push(c.toDataURL('image/jpeg',.7));if(st.photos.length>12)st.photos.shift();APP.save();const f=document.createElement('div');f.style.cssText='position:fixed;inset:0;background:#fff;z-index:30;opacity:.8;transition:opacity .4s;pointer-events:none';document.body.appendChild(f);requestAnimationFrame(()=>f.style.opacity=0);setTimeout(()=>f.remove(),450);render();};img.src=src;}

/* báo thức & hẹn giờ chạy nền */
function ring(label){ringing=true;open();const r=document.createElement('div');r.className='ring';r.id='ringBox';r.innerHTML=`<div style="font-size:40px">⏰</div><div class="rt">${now().hm}</div><div>${esc(label)}</div><button id="stopRing">Tắt báo thức</button>`;$('#pscreen').appendChild(r);
  APP.emit('alarm');clearInterval(ringTI);ringTI=setInterval(()=>APP.emit('alarm'),1300);$('#stopRing').onclick=()=>{ringing=false;clearInterval(ringTI);r.remove();render();};}
setInterval(()=>{const n=now(),key=n.d.toDateString()+n.hm;for(const a of st.alarms){if(a.on&&a.t===n.hm&&a.last!==key){a.last=key;APP.save();ring('Báo thức '+a.t);}}
  if(timer.run&&Date.now()>=timer.end){timer.run=false;timer.left=0;ring('Hết giờ hẹn');}
  if(!phone.hidden){$('#pTime').textContent=n.hm;if(screen==='clock'){const b=$('#bigT');if(b)b.innerHTML=`${n.hm}<span style="font-size:30px">:${pad(n.d.getSeconds())}</span>`;const t=$('#tmr');if(t)t.textContent=fmtTimer();}else if(screen==='lock'){const l=view.querySelector('.lt');if(l)l.textContent=n.hm;}}},1000);
