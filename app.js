
const STORE_KEY='eduboss_data';
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));

function load(){
  let d={}; try{ d=JSON.parse(localStorage.getItem(STORE_KEY)||'{}'); }catch(e){ d={}; }
  d.students ||= []; d.sessions ||= []; d.tasks ||= []; d.docs ||= [];
  d.online ||= {plans:[], contact:{phone:'', instagram:''}};
  d.settings ||= {ownerName:'Mehmet Ertürk', ownerTitle:'Matematik Öğretmeni & Öğrenci Koçu', ownerNote:''};
  d.kasa ||= []; // {id,type,cat,dt,amount,method,who,note}
  d.stok ||= []; // {id,name,sku,cat,attr,qty,cost,price}
  d.siparis ||= []; // {id,date,customer,phone,sku,qty,unit,method,note}
  return d;
}
function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
let data = load();
$("#year").textContent = new Date().getFullYear();

// Tabs
$$(".nav button").forEach(btn=>btn.addEventListener('click',()=>{
  $$(".nav button").forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  $$("section[id^='tab-']").forEach(s=>s.classList.add('hidden'));
  const tab = btn.dataset.tab; $("#tab-"+tab).classList.remove('hidden');
  if(tab==='dash') renderDashboard();
  if(tab==='students'){ renderStudents(); renderSessions(); fillStudentOptions(); }
  if(tab==='tasks') renderTasks();
  if(tab==='docs') renderDocs();
  if(tab==='online') renderPlans();
  if(tab==='kasa') { renderKasaMonths(); renderKasa(); }
  if(tab==='dukkan') { renderStok(); renderOrders(); fillOrderSku(); }
  if(tab==='whats') renderWA();
}));

// DASHBOARD
function renderDashboard(){
  // today list: tasks+sessions
  const now=new Date();
  const start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const end=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
  let list=[];
  data.tasks.forEach(t=>{ if(!t.done && t.due){ const d=new Date(t.due); if(d>=start && d<end) list.push({type:'Görev', title:t.title, when:d, extra:t.cat}); } });
  data.sessions.forEach(s=>{ const d=new Date(s.date); if(d>=start && d<end){ const st=data.students.find(x=>x.id===s.studentId); list.push({type:'Ders', title:(st?st.name:'Öğrenci')+' • '+(s.topic||''), when:d, extra:(s.duration||0)+' dk'}); } });
  list.sort((a,b)=>a.when-b.when);
  $("#todayList").innerHTML = list.length? list.map(x=>`• <b>${x.type}</b> – ${x.title} <span class="badge">${x.when.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span> <span class="badge">${x.extra||''}</span>`).join("<br>") : "Bugün kayıt yok.";
  // upcoming docs 7gün
  const next7=new Date(now.getFullYear(),now.getMonth(),now.getDate()+7);
  const up=data.docs.filter(d=>!d.done && d.due).map(d=>({...d, dd:new Date(d.due)})).filter(d=>d.dd>=start && d.dd<=next7).sort((a,b)=>a.dd-b.dd);
  $("#upcomingDocs").innerHTML = up.length? up.map(d=>`• <b>${d.office}</b> – ${d.type} <span class="badge">${d.dd.toLocaleDateString()}</span> <span class="badge">${d.track||''}</span>`).join("<br>") : "Yaklaşan evrak yok.";
  // kasa month summary
  const y=now.getFullYear(), m=now.getMonth();
  const month = d=>{const dt=new Date(d.dt); return dt.getFullYear()===y && dt.getMonth()===m;};
  const g = data.kasa.filter(k=>k.type==='Gelir' && month(k)).reduce((s,k)=>s+(+k.amount||0),0);
  const c = data.kasa.filter(k=>k.type==='Gider' && month(k)).reduce((s,k)=>s+(+k.amount||0),0);
  $("#kGelir").textContent='₺'+g.toFixed(2);
  $("#kGider").textContent='₺'+c.toFixed(2);
  $("#kNet").textContent='₺'+(g-c).toFixed(2);
  const last = [...data.kasa].sort((a,b)=>new Date(b.dt)-new Date(a.dt)).slice(0,5);
  $("#kasaMini").innerHTML = last.length? last.map(k=>`• ${new Date(k.dt).toLocaleString()} – <b>${k.type}</b> ${k.cat} <span class="badge">₺${(+k.amount||0).toFixed(2)}</span>`).join("<br>") : "Kayıt yok.";
}
renderDashboard();

// Quick task
$("#btnQuickTask")?.addEventListener('click',()=>{
  const title=prompt("Görev başlığı?"); if(!title) return;
  const due=new Date(); due.setHours(due.getHours()+2);
  data.tasks.push({id:crypto.randomUUID(), title, cat:'Diğer', due:due.toISOString(), prio:'Orta', note:'', done:false});
  save(); renderDashboard();
});

// STUDENTS
function clearStudentForm(){ ["stName","stGrade","stContact","stGoal","stNote"].forEach(id=>$("#"+id).value=''); }
$("#addStudent").addEventListener('click',()=>{
  const name=$("#stName").value.trim(); if(!name) return alert("İsim gerekli");
  const st={id:crypto.randomUUID(), name, grade:$("#stGrade").value.trim(), contact:$("#stContact").value.trim(), goal:$("#stGoal").value.trim(), note:$("#stNote").value.trim(), createdAt:new Date().toISOString()};
  data.students.push(st); save(); clearStudentForm(); renderStudents(); fillStudentOptions();
});
function renderStudents(){
  const q=($("#stSearch").value||'').toLowerCase();
  const rows=data.students.filter(s=>[s.name,s.grade,s.goal,s.contact].join(' ').toLowerCase().includes(q)).map(s=>`
    <tr>
      <td>${s.name}</td><td>${s.grade||''}</td><td>${s.goal||''}</td><td>${s.contact||''}</td>
      <td class="actions">
        <button class="btn" data-wa="${s.contact||''}">WA</button>
        <button class="btn" data-edit="${s.id}">Düzenle</button>
        <button class="btn danger" data-del="${s.id}">Sil</button>
      </td>
    </tr>`).join("");
  $("#studentTable tbody").innerHTML = rows || '<tr><td colspan="5" class="small">Kayıt yok.</td></tr>';
  $$("#studentTable [data-del]").forEach(b=>b.onclick=()=>{ if(confirm("Silinsin mi?")){ data.students=data.students.filter(x=>x.id!==b.dataset.del); data.sessions=data.sessions.filter(x=>x.studentId!==b.dataset.del); save(); renderStudents(); renderSessions(); fillStudentOptions(); } });
  $$("#studentTable [data-edit]").forEach(b=>b.onclick=()=>{
    const s=data.students.find(x=>x.id===b.dataset.edit);
    const name=prompt("Ad Soyad",s.name)||s.name;
    const grade=prompt("Seviye",s.grade||'')||'';
    const contact=prompt("İletişim",s.contact||'')||'';
    const goal=prompt("Hedef",s.goal||'')||'';
    s.name=name; s.grade=grade; s.contact=contact; s.goal=goal; save(); renderStudents();
  });
  $$("#studentTable [data-wa]").forEach(b=>b.onclick=()=>openWA(b.dataset.wa, `Merhaba, ders randevumuz için yazıyorum.`));
}
$("#stSearch").addEventListener('input', renderStudents);
function fillStudentOptions(){ $("#sesStudent").innerHTML = data.students.map(s=>`<option value="${s.id}">${s.name}</option>`).join(""); }
$("#stExport").addEventListener('click',()=>downloadJSON('ogrenciler', data.students));
$("#stExportCSV").addEventListener('click',()=>downloadCSV('ogrenciler', ['name','grade','contact','goal','note'], data.students));
$("#stImportBtn").addEventListener('click',()=>$("#stImport").click());
$("#stImport").addEventListener('change',e=>importJSON(e, arr=>Array.isArray(arr)&&(data.students=arr, save(), renderStudents(), fillStudentOptions())));

// Sessions
$("#addSession").addEventListener('click',()=>{
  if(!data.students.length) return alert("Önce öğrenci ekleyin.");
  const sId=$("#sesStudent").value; const dt=$("#sesDate").value; if(!dt) return alert("Tarih girin.");
  data.sessions.push({id:crypto.randomUUID(), studentId:sId, date:new Date(dt).toISOString(), duration:parseInt($("#sesDuration").value||'60',10), topic:$("#sesTopic").value.trim()});
  save(); $("#sesTopic").value=''; renderSessions(); renderDashboard();
});
function renderSessions(){
  const rows=[...data.sessions].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(s=>{
    const st=data.students.find(x=>x.id===s.studentId);
    return `<tr>
      <td>${st?st.name:'—'}</td><td>${new Date(s.date).toLocaleString()}</td><td>${s.duration||0} dk</td><td>${s.topic||''}</td>
      <td class="actions"><button class="btn danger" data-dels="${s.id}">Sil</button></td>
    </tr>`;
  }).join("");
  $("#sessionTable tbody").innerHTML = rows || '<tr><td colspan="5" class="small">Kayıt yok.</td></tr>';
  $$("#sessionTable [data-dels]").forEach(b=>b.onclick=()=>{ data.sessions=data.sessions.filter(x=>x.id!==b.dataset.dels); save(); renderSessions(); renderDashboard(); });
}

// TASKS
$("#addTask").addEventListener('click',()=>{
  const title=$("#taskTitle").value.trim(); if(!title) return alert("Başlık gerekli.");
  const t={id:crypto.randomUUID(), title, cat:$("#taskCat").value, due:$("#taskDue").value? new Date($("#taskDue").value).toISOString():null, prio:$("#taskPrio").value, note:$("#taskNote").value.trim(), done:false};
  data.tasks.push(t); save();
  $("#taskTitle").value=''; $("#taskNote").value=''; $("#taskDue").value=''; renderTasks(); renderDashboard();
});
function renderTasks(){
  const q=($("#taskSearch").value||'').toLowerCase(); const f=$("#taskFilter").value;
  const rows=data.tasks.filter(t=>(!f||t.cat===f)&&[t.title,t.cat,t.note,t.prio].join(' ').toLowerCase().includes(q))
    .sort((a,b)=>{ if(a.done!==b.done) return a.done?1:-1; const ad=a.due?new Date(a.due):new Date(8640000000000000); const bd=b.due?new Date(b.due):new Date(8640000000000000); if(ad-bd) return ad-bd; const po={'Yüksek':0,'Orta':1,'Düşük':2}; return (po[a.prio]??9)-(po[b.prio]??9); })
    .map(t=>`<tr>
      <td>${t.title}</td><td><span class="pill">${t.cat}</span></td><td>${t.due?new Date(t.due).toLocaleString():'—'}</td><td>${t.prio}</td><td>${t.done?'<span class="pill">Bitti</span>':'<span class="pill">Açık</span>'}</td>
      <td class="actions">
        <button class="btn ok" data-done="${t.id}">${t.done?'Geri Al':'Tamam'}</button>
        <button class="btn" data-wa="${encodeURIComponent(t.title)}">WA</button>
        <button class="btn" data-edit="${t.id}">Düzenle</button>
        <button class="btn danger" data-del="${t.id}">Sil</button>
      </td>
    </tr>`).join("");
  $("#taskTable tbody").innerHTML = rows || '<tr><td colspan="6" class="small">Kayıt yok.</td></tr>';
  $$("#taskTable [data-done]").forEach(b=>b.onclick=()=>{ const t=data.tasks.find(x=>x.id===b.dataset.done); t.done=!t.done; save(); renderTasks(); renderDashboard(); });
  $$("#taskTable [data-del]").forEach(b=>b.onclick=()=>{ if(confirm("Silinsin mi?")){ data.tasks=data.tasks.filter(x=>x.id!==b.dataset.del); save(); renderTasks(); renderDashboard(); }});
  $$("#taskTable [data-edit]").forEach(b=>b.onclick=()=>{
    const t=data.tasks.find(x=>x.id===b.dataset.edit);
    const title=prompt("Başlık",t.title)||t.title; const cat=prompt("Kategori",t.cat)||t.cat;
    const due=prompt("Bitiş (YYYY-MM-DD HH:MM)", t.due?new Date(t.due).toISOString().slice(0,16).replace('T',' '):'')||'';
    const prio=prompt("Öncelik (Yüksek/Orta/Düşük)",t.prio)||t.prio; const note=prompt("Not",t.note||'')||t.note;
    t.title=title; t.cat=cat; t.prio=prio; t.note=note; t.due= due? new Date(due.replace(' ','T')).toISOString():null; save(); renderTasks(); renderDashboard();
  });
  $$("#taskTable [data-wa]").forEach(b=>b.onclick=()=>openWA('', `Merhaba, "${decodeURIComponent(b.dataset.wa)}" görevi ile ilgili bilgilendirme.`));
}
$("#taskSearch").addEventListener('input',renderTasks);
$("#taskFilter").addEventListener('change',renderTasks);
$("#taskExport").addEventListener('click',()=>downloadJSON('gorevler', data.tasks));
$("#taskCSV").addEventListener('click',()=>downloadCSV('gorevler',['title','cat','due','prio','note','done'], data.tasks));

// DOCS
$("#addDoc").addEventListener('click',()=>{
  const o={id:crypto.randomUUID(), office:$("#docOffice").value, type:$("#docType").value.trim(), track:$("#docTrack").value.trim(), due:$("#docDue").value||null, note:$("#docNote").value.trim(), done:false};
  if(!o.type) return alert("Belge/İşlem giriniz.");
  data.docs.push(o); save(); $("#docType").value=''; $("#docTrack").value=''; $("#docDue").value=''; $("#docNote").value=''; renderDocs(); renderDashboard();
});
function renderDocs(){
  const q=($("#docSearch").value||'').toLowerCase();
  const rows=data.docs.filter(d=>[d.office,d.type,d.track,d.note].join(' ').toLowerCase().includes(q)).sort((a,b)=>{
    if(a.done!==b.done) return a.done?1:-1; const ad=a.due?new Date(a.due):new Date(8640000000000000); const bd=b.due?new Date(b.due):new Date(8640000000000000); return ad-bd;
  }).map(d=>`<tr>
    <td>${d.office}</td><td>${d.type}</td><td>${d.due?new Date(d.due).toLocaleDateString():'—'}</td><td>${d.track||'—'}</td><td>${d.done?'<span class="pill">Tamam</span>':'<span class="pill">Açık</span>'}</td>
    <td class="actions">
      <button class="btn ok" data-ddone="${d.id}">${d.done?'Geri Al':'Tamam'}</button>
      <button class="btn" data-wa="${encodeURIComponent((d.office||'')+' '+(d.type||''))}">WA</button>
      <button class="btn" data-dedit="${d.id}">Düzenle</button>
      <button class="btn danger" data-ddel="${d.id}">Sil</button>
    </td>
  </tr>`).join("");
  $("#docTable tbody").innerHTML = rows || '<tr><td colspan="6" class="small">Kayıt yok.</td></tr>';
  $$("#docTable [data-ddone]").forEach(b=>b.onclick=()=>{ const d=data.docs.find(x=>x.id===b.dataset.ddone); d.done=!d.done; save(); renderDocs(); renderDashboard(); });
  $$("#docTable [data-ddel]").forEach(b=>b.onclick=()=>{ if(confirm("Silinsin mi?")){ data.docs=data.docs.filter(x=>x.id!==b.dataset.ddel); save(); renderDocs(); renderDashboard(); }});
  $$("#docTable [data-dedit]").forEach(b=>b.onclick=()=>{
    const d=data.docs.find(x=>x.id===b.dataset.dedit);
    const office=prompt("Kurum",d.office)||d.office;
    const type=prompt("Belge/İşlem",d.type)||d.type;
    const track=prompt("Takip No",d.track||'')||'';
    const due=prompt("Son Tarih (YYYY-MM-DD)",d.due||'')||'';
    const note=prompt("Not",d.note||'')||d.note;
    d.office=office; d.type=type; d.track=track; d.due=due||null; d.note=note; save(); renderDocs(); renderDashboard();
  });
  $$("#docTable [data-wa]").forEach(b=>b.onclick=()=>openWA('', `Merhaba, ${decodeURIComponent(b.dataset.wa)} hakkında bilgi talebi.`));
}
$("#docExport").addEventListener('click',()=>downloadJSON('evrak', data.docs));
$("#docCSV").addEventListener('click',()=>downloadCSV('evrak',['office','type','due','track','note','done'], data.docs));
$("#docImportBtn").addEventListener('click',()=>$("#docImport").click());
$("#docImport").addEventListener('change',e=>importJSON(e, arr=>Array.isArray(arr)&&(data.docs=arr, save(), renderDocs(), renderDashboard())));

// ONLINE
function renderPlans(){
  const c=$("#planList");
  c.innerHTML = data.online.plans.map((p,i)=>`<div class="card"><h3>${p.name||'Paket'}</h3><div class="kv"><span class="k">Fiyat:</span><span class="v">${p.price?('₺'+p.price):'—'}</span></div><div class="small">${p.desc||''}</div><hr><button class="btn" data-pedit="${i}">Düzenle</button><button class="btn danger" data-pdel="${i}">Sil</button></div>`).join("") || '<div class="small">Plan ekleyin.</div>';
  $$("#planList [data-pedit]").forEach(b=>b.onclick=()=>{
    const i=+b.dataset.pedit; const p=data.online.plans[i];
    const name=prompt("Ad",p.name||'')||''; const price=prompt("Aylık Fiyat (₺)",p.price||'')||''; const desc=prompt("Açıklama",p.desc||'')||'';
    data.online.plans[i]={name,price,desc}; save(); renderPlans();
  });
  $$("#planList [data-pdel]").forEach(b=>b.onclick=()=>{ const i=+b.dataset.pdel; data.online.plans.splice(i,1); save(); renderPlans(); });
  $("#contactPhone").value=data.online.contact.phone||''; $("#contactIG").value=data.online.contact.instagram||'';
}
$("#addPlan").addEventListener('click',()=>{
  const name=$("#planName").value.trim(); if(!name) return alert("Plan adı gerekli");
  data.online.plans.push({name, price:$("#planPrice").value.trim(), desc:$("#planDesc").value.trim()});
  $("#planName").value=''; $("#planPrice").value=''; $("#planDesc").value=''; save(); renderPlans();
});
$("#previewOnline").addEventListener('click',()=>{
  data.online.contact.phone=$("#contactPhone").value.trim(); data.online.contact.instagram=$("#contactIG").value.trim(); save();
  window.open('/online.html','_blank');
});

// KASA (income/expense)
$("#addKK").addEventListener('click',()=>{
  const r={id:crypto.randomUUID(), type:$("#kkType").value, cat:$("#kkCat").value, dt: $("#kkDate").value? new Date($("#kkDate").value).toISOString(): new Date().toISOString(), amount: parseFloat($("#kkAmount").value||'0'), method:$("#kkMethod").value, who:$("#kkWho").value.trim(), note:$("#kkNote").value.trim()};
  if(!r.amount) return alert("Tutar girin."); data.kasa.push(r); save();
  $("#kkAmount").value=''; $("#kkNote").value=''; renderKasa(); renderDashboard();
});
function renderKasaMonths(){
  const sel=$("#kkMonth"); sel.innerHTML='';
  const months=new Set(data.kasa.map(k=>{const d=new Date(k.dt); return `${d.getFullYear()}-${(d.getMonth()+1+'').padStart(2,'0')}`;}));
  const arr=[...months].sort().reverse(); const now=new Date(); const cur=`${now.getFullYear()}-${(now.getMonth()+1+'').padStart(2,'0')}`;
  sel.innerHTML = `<option value="">Tümü</option>` + arr.map(m=>`<option ${m===cur?'selected':''}>${m}</option>`).join("");
}
function renderKasa(){
  const q=($("#kkSearch").value||'').toLowerCase(); const month=$("#kkMonth").value;
  const rows=data.kasa.filter(k=>[k.type,k.cat,k.method,k.who,k.note].join(' ').toLowerCase().includes(q))
    .filter(k=>!month || (new Date(k.dt).toISOString().slice(0,7)===month))
    .sort((a,b)=>new Date(b.dt)-new Date(a.dt))
    .map(k=>`<tr>
      <td>${new Date(k.dt).toLocaleString()}</td><td>${k.type}</td><td>${k.cat}</td><td>₺${(+k.amount||0).toFixed(2)}</td><td>${k.method}</td><td>${k.who||''}</td><td>${k.note||''}</td>
      <td class="actions"><button class="btn" data-wa="${encodeURIComponent(k.who||'')}">WA</button><button class="btn danger" data-delkk="${k.id}">Sil</button></td>
    </tr>`).join("");
  $("#kkTable tbody").innerHTML = rows || '<tr><td colspan="8" class="small">Kayıt yok.</td></tr>';
  $$("#kkTable [data-delkk]").forEach(b=>b.onclick=()=>{ data.kasa=data.kasa.filter(x=>x.id!==b.dataset.delkk); save(); renderKasa(); renderDashboard(); });
  $$("#kkTable [data-wa]").forEach(b=>b.onclick=()=>openWA(decodeURIComponent(b.dataset.wa),'Ödeme hakkında bilgi için yazıyorum.'));
}
$("#kkSearch").addEventListener('input',renderKasa);
$("#kkMonth").addEventListener('change',renderKasa);
$("#kkExport").addEventListener('click',()=>downloadCSV('kasa',['dt','type','cat','amount','method','who','note'], data.kasa));
$("#kkTemplate").addEventListener('click',()=>downloadFile('/templates/gelir-gider-template.csv','gelir-gider-template.csv'));

// DÜKKAN - STOCK
$("#addStk").addEventListener('click',()=>{
  const s={id:crypto.randomUUID(), name:$("#stkName").value.trim(), sku:$("#stkSku").value.trim(), cat:$("#stkCat").value.trim(), attr:$("#stkAttr").value.trim(), qty:parseInt($("#stkQty").value||'0',10), cost:parseFloat($("#stkCost").value||'0'), price:parseFloat($("#stkPrice").value||'0')};
  if(!s.name||!s.sku) return alert("Ad ve SKU zorunlu"); data.stok.push(s); save();
  $("#stkName").value=''; $("#stkSku").value=''; $("#stkQty").value=''; $("#stkCost").value=''; $("#stkPrice").value=''; renderStok(); fillOrderSku();
});
function renderStok(){
  const q=($("#stkSearch").value||'').toLowerCase();
  const rows=data.stok.filter(s=>[s.name,s.sku,s.cat,s.attr].join(' ').toLowerCase().includes(q)).map(s=>`<tr>
    <td>${s.name}</td><td>${s.sku}</td><td>${s.cat||''}</td><td>${s.attr||''}</td><td>${s.qty||0}</td><td>₺${(+s.cost||0).toFixed(2)}</td><td>₺${(+s.price||0).toFixed(2)}</td>
    <td class="actions"><button class="btn" data-stkedit="${s.id}">Düzenle</button><button class="btn danger" data-stkdel="${s.id}">Sil</button></td>
  </tr>`).join("");
  $("#stkTable tbody").innerHTML = rows || '<tr><td colspan="8" class="small">Kayıt yok.</td></tr>';
  $$("#stkTable [data-stkdel]").forEach(b=>b.onclick=()=>{ data.stok=data.stok.filter(x=>x.id!==b.dataset.stkdel); save(); renderStok(); fillOrderSku(); });
  $$("#stkTable [data-stkedit]").forEach(b=>b.onclick=()=>{
    const s=data.stok.find(x=>x.id===b.dataset.stkedit);
    const name=prompt("Ad",s.name)||s.name; const sku=prompt("SKU",s.sku)||s.sku;
    const cat=prompt("Kategori",s.cat||'')||''; const attr=prompt("Özellik",s.attr||'')||'';
    const qty=parseInt(prompt("Adet",s.qty)||s.qty,10); const cost=parseFloat(prompt("Maliyet",s.cost)||s.cost); const price=parseFloat(prompt("Satış",s.price)||s.price);
    Object.assign(s,{name,sku,cat,attr,qty,cost,price}); save(); renderStok(); fillOrderSku();
  });
}
$("#stkCSV").addEventListener('click',()=>downloadCSV('stok',['name','sku','cat','attr','qty','cost','price'], data.stok));
$("#stkTemplate").addEventListener('click',()=>downloadFile('/templates/stok-template.csv','stok-template.csv'));

// DÜKKAN - ORDERS
function fillOrderSku(){ $("#ordSku").innerHTML = data.stok.map(s=>`<option value="${s.sku}" data-price="${s.price||0}">${s.sku} • ${s.name}</option>`).join(""); }
$("#ordSku").addEventListener('change',()=>{ const opt=$("#ordSku").selectedOptions[0]; if(opt){ $("#ordPrice").value = opt.getAttribute('data-price')||''; } });
$("#addOrd").addEventListener('click',()=>{
  if(!data.stok.length) return alert("Önce stok ekleyin.");
  const sku=$("#ordSku").value; const item=data.stok.find(s=>s.sku===sku); if(!item) return alert("SKU bulunamadı.");
  const qty=parseInt($("#ordQty").value||'1',10); if(qty>item.qty) if(!confirm("Stok yetersiz. Yine de kaydet?")) return;
  const unit=parseFloat($("#ordPrice").value||item.price||0);
  const o={id:crypto.randomUUID(), date: $("#ordDate").value? new Date($("#ordDate").value).toISOString(): new Date().toISOString(), customer: $("#ordCust").value.trim(), phone: $("#ordPhone").value.trim(), sku, qty, unit, method:$("#ordMethod").value, note:$("#ordNote").value.trim()};
  data.siparis.push(o); item.qty = (item.qty||0) - qty; // düş
  // kasa kaydı (Gelir)
  data.kasa.push({id:crypto.randomUUID(), type:'Gelir', cat:'Dükkan Satış', dt:o.date, amount: qty*unit, method:o.method==='Kart'?'Kredi Kartı': (o.method==='EFT'?'EFT/Havale':'Nakit'), who:o.customer, note:`${sku} x${qty}`});
  save(); renderOrders(); renderStok(); renderKasa(); renderDashboard();
  // temizle
  $("#ordCust").value=''; $("#ordPhone").value=''; $("#ordQty").value='1'; $("#ordPrice").value=''; $("#ordNote").value='';
});
function renderOrders(){
  const q=($("#ordSearch").value||'').toLowerCase();
  const rows=data.siparis.filter(o=>[o.customer,o.phone,o.sku,o.method,o.note].join(' ').toLowerCase().includes(q)).sort((a,b)=>new Date(b.date)-new Date(a.date)).map(o=>{
    const item=data.stok.find(s=>s.sku===o.sku);
    const tutar=(o.qty*o.unit)||0;
    return `<tr>
      <td>${new Date(o.date).toLocaleString()}</td><td>${o.customer}</td><td>${item?item.name:o.sku}</td><td>${o.qty}</td><td>₺${tutar.toFixed(2)}</td><td>${o.method}</td><td>${o.note||''}</td>
      <td class="actions"><button class="btn" data-wa="${o.phone||''}">WA</button><button class="btn danger" data-odel="${o.id}">Sil</button></td>
    </tr>`;
  }).join("");
  $("#ordTable tbody").innerHTML = rows || '<tr><td colspan="8" class="small">Kayıt yok.</td></tr>';
  $$("#ordTable [data-odel]").forEach(b=>b.onclick=()=>{ data.siparis=data.siparis.filter(x=>x.id!==b.dataset.odel); save(); renderOrders(); });
  $$("#ordTable [data-wa]").forEach(b=>b.onclick=()=>openWA(b.dataset.wa, 'Siparişiniz kaydedildi. Teşekkürler.'));
}
$("#ordCSV").addEventListener('click',()=>downloadCSV('siparis',['date','customer','phone','sku','qty','unit','method','note'], data.siparis));
$("#ordTemplate").addEventListener('click',()=>downloadFile('/templates/siparis-template.csv','siparis-template.csv'));

// WHATSAPP
function renderWA(){ buildWAText(); }
$("#waTemplate, #waVar1, #waVar2").forEach? null : null;
["waTemplate","waVar1","waVar2"].forEach(id=>$("#"+id).addEventListener('input', buildWAText));
function buildWAText(){
  const t=$("#waTemplate").value, a=$("#waVar1").value||'', b=$("#waVar2").value||'';
  let msg='';
  if(t==='randevu') msg = `Merhaba ${a}, ders randevumuz ${b} tarihinde/saatinde planlanmıştır. Uygunsa onayını rica ederim.`;
  if(t==='odeme') msg = `Merhaba ${a}, ${b} tutarındaki ödemeniz için hatırlatma notudur. Uygunsa bugün içinde tamamlayalım.`;
  if(t==='evrak') msg = `Merhaba ${a}, evrak işlemi hakkında bilgilendirme: ${b}. Sorunuz olursa yazabilirsiniz.`;
  if(t==='siparis') msg = `Merhaba ${a}, siparişiniz oluşturulmuştur. Tutar: ${b}. İlginiz için teşekkürler.`;
  $("#waPreview").value = msg;
}
$("#waCompose").addEventListener('click',()=>openWA($("#waPhone").value.trim(), $("#waPreview").value));
$("#waCopy").addEventListener('click',()=>{ navigator.clipboard.writeText($("#waPreview").value||''); alert("Kopyalandı."); });
function openWA(phone, text){
  const clean=(phone||'').replace(/\D/g,'');
  const url = `https://wa.me/${clean?clean:''}?text=${encodeURIComponent(text||'Merhaba')}`;
  window.open(url,'_blank');
}

// SETTINGS + BACKUP + EXPORT HELPERS
function renderSettings(){
  $("#ownerName").value=data.settings.ownerName||'';
  $("#ownerTitle").value=data.settings.ownerTitle||'';
  $("#ownerNote").value=data.settings.ownerNote||'';
}
["ownerName","ownerTitle","ownerNote"].forEach(id=>$("#"+id).addEventListener('input',()=>{
  data.settings.ownerName=$("#ownerName").value; data.settings.ownerTitle=$("#ownerTitle").value; data.settings.ownerNote=$("#ownerNote").value; save();
}));
$("#backupExport").addEventListener('click',()=>downloadJSON('eduboss-backup', data));
$("#backupImportBtn").addEventListener('click',()=>$("#backupImport").click());
$("#backupImport").addEventListener('change',e=>importJSON(e, obj=>{ if(obj&&typeof obj==='object'){ localStorage.setItem(STORE_KEY, JSON.stringify(obj)); data=load(); alert("Yedek yüklendi."); location.reload(); } }));
$("#wipeAll").addEventListener('click',()=>{ if(confirm("Tüm veriler silinsin mi?")){ localStorage.removeItem(STORE_KEY); data=load(); location.reload(); } });

// utilities
function downloadJSON(name, obj){
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download = name+'.json'; a.click();
}
function downloadCSV(name, cols, arr){
  const header = cols.join(',')+'\n';
  const rows = arr.map(o=>cols.map(c=>{
    let v = (o[c]!==undefined && o[c]!==null)? String(o[c]).replace(/"/g,'""') : '';
    if(/[,"\n]/.test(v)) v='"'+v+'"';
    return v;
  }).join(',')).join('\n');
  const blob=new Blob([header+rows],{type:"text/csv"});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name+'.csv'; a.click();
}
function importJSON(e, onData){
  const f=e.target.files[0]; if(!f) return; const fr=new FileReader();
  fr.onload=()=>{ try{ const obj=JSON.parse(fr.result); onData(obj); }catch(err){ alert("JSON okunamadı."); } };
  fr.readAsText(f);
}
function downloadFile(path, name){
  // since it's a static app, we can't fetch local packaged files without server; we generate a small example inline instead:
  if(path.endsWith('gelir-gider-template.csv')){
    downloadCSV('gelir-gider-template',['tarih','tur','kat','amount','method','who','note'],[{tarih:'2025-09-01 14:00',tur:'Gelir',kat:'Özel Ders',amount:1500,method:'Nakit',who:'Ali Yılmaz',note:'Eylül ilk ders ücreti'}]);
  }else if(path.endsWith('stok-template.csv')){
    downloadCSV('stok-template',['name','sku','cat','attr','qty','cost','price'],[{name:'Basic Tişört',sku:'TS-001',cat:'Tişört',attr:'L-Beyaz',qty:50,cost:80,price:149}]);
  }else if(path.endsWith('siparis-template.csv')){
    downloadCSV('siparis-template',['date','customer','phone','sku','qty','unit','method','note'],[{date:'2025-09-02 11:30',customer:'Ayşe Demir',phone:'905551112233',sku:'TS-001',qty:3,unit:149,method:'Nakit',note:'Mağazadan teslim'}]);
  }
}

// Install hint + SW
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferredPrompt=e; $("#installTip").textContent="Menü > Ana ekrana ekle ile yükleyebilirsin."; });
if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('/service-worker.js').catch(console.error)); }
