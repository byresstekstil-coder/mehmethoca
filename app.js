
const STORE_KEY='eduboss_data';
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
function load(){let d={};try{d=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');}catch(e){d={};}
d.students ||= []; d.sessions ||= []; d.tasks ||= []; d.docs ||= [];
d.online ||= {plans:[],contact:{phone:'',instagram:''}};
d.settings ||= {ownerName:'Mehmet Ertürk', ownerTitle:'Matematik Öğretmeni & Öğrenci Koçu', ownerNote:'', vatRate:18, invoicePrefix:'ME-', invoiceSerial:1001, logoDataUrl:'', logoSize:70, logoPos:'Sol'};
d.kasa ||= []; d.stok ||= []; d.siparis ||= [];
d.taksit ||= []; // {id,name,type,who,total,count,startISO,items:[{id,dateISO,amount,paid}]}
return d;}
function save(){localStorage.setItem(STORE_KEY, JSON.stringify(data));}
let data=load(); $("#year").textContent=new Date().getFullYear();
function refreshOwner(){ const name=data.settings.ownerName||'Mehmet Ertürk'; $("#ownerTag").textContent=`Öğretmen Asistanı • ${name}`; $("#ownerFoot").textContent=name;}
refreshOwner();
// Tabs
$$(".nav button").forEach(btn=>btn.addEventListener('click',()=>{
  $$(".nav button").forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  $$("section[id^='tab-']").forEach(s=>s.classList.add('hidden')); $("#tab-"+btn.dataset.tab).classList.remove('hidden');
  const t=btn.dataset.tab;
  if(t==='dash') renderDashboard();
  if(t==='students'){ renderStudents(); renderSessions(); fillStudentOptions(); }
  if(t==='tasks') renderTasks();
  if(t==='docs') renderDocs();
  if(t==='online') renderPlans();
  if(t==='kasa'){ renderKasaMonths(); renderKasa(); drawKasaChart(); renderTaksit(); }
  if(t==='dukkan'){ renderStok(); renderOrders(); fillOrderSku(); }
}));

// DASHBOARD
function renderDashboard(){
  const now=new Date(), start=new Date(now.getFullYear(),now.getMonth(),now.getDate()), end=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
  let list=[];
  data.tasks.forEach(t=>{ if(!t.done && t.due){const d=new Date(t.due); if(d>=start&&d<end) list.push({type:'Görev',title:t.title,when:d,extra:t.cat});}});
  data.sessions.forEach(s=>{ const d=new Date(s.date); if(d>=start&&d<end){ const st=data.students.find(x=>x.id===s.studentId); list.push({type:'Ders',title:(st?st.name:'Öğrenci')+' • '+(s.topic||''),when:d,extra:(s.duration||0)+' dk'});} });
  list.sort((a,b)=>a.when-b.when);
  $("#todayList").innerHTML=list.length?list.map(x=>`• <b>${x.type}</b> – ${x.title} <span class="badge">${x.when.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span> <span class="badge">${x.extra||''}</span>`).join("<br>"):"Bugün kayıt yok.";
  // docs
  const next7=new Date(now.getFullYear(),now.getMonth(),now.getDate()+7);
  const up=data.docs.filter(d=>!d.done&&d.due).map(d=>({...d,dd:new Date(d.due)})).filter(d=>d.dd>=start&&d.dd<=next7).sort((a,b)=>a.dd-b.dd);
  $("#upcomingDocs").innerHTML=up.length?up.map(d=>`• <b>${d.office}</b> – ${d.type} <span class="badge">${d.dd.toLocaleDateString()}</span> <span class="badge">${d.track||''}</span>`).join("<br>"):"Yaklaşan evrak yok.";
  // kasa summary
  const y=now.getFullYear(), m=now.getMonth();
  const g = data.kasa.filter(k=>k.type==='Gelir' && new Date(k.dt).getFullYear()===y && new Date(k.dt).getMonth()===m).reduce((s,k)=>s+(+k.amount||0),0);
  const c = data.kasa.filter(k=>k.type==='Gider' && new Date(k.dt).getFullYear()===y && new Date(k.dt).getMonth()===m).reduce((s,k)=>s+(+k.amount||0),0);
  $("#kGelir").textContent='₺'+g.toFixed(2); $("#kGider").textContent='₺'+c.toFixed(2); $("#kNet").textContent='₺'+(g-c).toFixed(2);
  const last=[...data.kasa].sort((a,b)=>new Date(b.dt)-new Date(a.dt)).slice(0,5);
  $("#kasaMini").innerHTML=last.length?last.map(k=>`• ${new Date(k.dt).toLocaleString()} – <b>${k.type}</b> ${k.cat} <span class="badge">₺${(+k.amount||0).toFixed(2)}</span>`).join("<br>"):"Kayıt yok.";
  // low stock
  const lows=data.stok.filter(s=>typeof s.min==='number' && s.min>=0 && (s.qty||0) < s.min);
  $("#lowStock").innerHTML = lows.length? lows.map(s=>`• <b>${s.name}</b> (${s.sku}) <span class="badge">${s.qty||0}/${s.min}</span>`).join("<br>") : "Uyarı yok.";
}
renderDashboard();
// Quick task
$("#btnQuickTask")?.addEventListener('click',()=>{ const title=prompt("Görev başlığı?"); if(!title) return; const due=new Date(); due.setHours(due.getHours()+2); data.tasks.push({id:crypto.randomUUID(), title, cat:'Diğer', due:due.toISOString(), prio:'Orta', note:'', done:false}); save(); renderDashboard(); });

// STUDENTS
function clearStudentForm(){["stName","stGrade","stContact","stGoal","stNote"].forEach(id=>$("#"+id).value='');}
$("#addStudent").addEventListener('click',()=>{ const name=$("#stName").value.trim(); if(!name) return alert("İsim gerekli"); data.students.push({id:crypto.randomUUID(),name,grade:$("#stGrade").value.trim(),contact:$("#stContact").value.trim(),goal:$("#stGoal").value.trim(),note:$("#stNote").value.trim(),createdAt:new Date().toISOString()}); save(); clearStudentForm(); renderStudents(); fillStudentOptions();});
function renderStudents(){
  const q=($("#stSearch").value||'').toLowerCase();
  const rows=data.students.filter(s=>[s.name,s.grade,s.goal,s.contact].join(' ').toLowerCase().includes(q)).map(s=>`
    <tr><td>${s.name}</td><td>${s.grade||''}</td><td>${s.goal||''}</td><td>${s.contact||''}</td>
    <td class="actions"><button class="btn" data-wa="${s.contact||''}">WA</button><button class="btn" data-edit="${s.id}">Düzenle</button><button class="btn danger" data-del="${s.id}">Sil</button></td></tr>`).join("");
  $("#studentTable tbody").innerHTML=rows || '<tr><td colspan="5" class="small">Kayıt yok.</td></tr>';
  $$("#studentTable [data-del]").forEach(b=>b.onclick=()=>{ if(confirm("Silinsin mi?")){ data.students=data.students.filter(x=>x.id!==b.dataset.del); data.sessions=data.sessions.filter(x=>x.studentId!==b.dataset.del); save(); renderStudents(); renderSessions(); fillStudentOptions(); } });
  $$("#studentTable [data-edit]").forEach(b=>b.onclick=()=>{ const s=data.students.find(x=>x.id===b.dataset.edit); s.name=prompt("Ad Soyad",s.name)||s.name; s.grade=prompt("Seviye",s.grade||'')||''; s.contact=prompt("İletişim",s.contact||'')||''; s.goal=prompt("Hedef",s.goal||'')||''; save(); renderStudents(); });
  $$("#studentTable [data-wa]").forEach(b=>b.onclick=()=>openWA(b.dataset.wa,`Merhaba, ders randevumuz için yazıyorum.`));
}
$("#stSearch").addEventListener('input',renderStudents);
function fillStudentOptions(){ $("#sesStudent").innerHTML=data.students.map(s=>`<option value="${s.id}">${s.name}</option>`).join(""); }
$("#stExport").addEventListener('click',()=>downloadJSON('ogrenciler',data.students));
$("#stExportCSV").addEventListener('click',()=>downloadCSV('ogrenciler',['name','grade','contact','goal','note'],data.students));
$("#stImportBtn").addEventListener('click',()=>$("#stImport").click());
$("#stImport").addEventListener('change',e=>importJSON(e,arr=>{ if(Array.isArray(arr)){ data.students=arr; save(); renderStudents(); fillStudentOptions(); } }));
$("#addSession").addEventListener('click',()=>{ if(!data.students.length) return alert("Önce öğrenci ekleyin."); const sId=$("#sesStudent").value; const dt=$("#sesDate").value; if(!dt) return alert("Tarih girin."); data.sessions.push({id:crypto.randomUUID(), studentId:sId, date:new Date(dt).toISOString(), duration:parseInt($("#sesDuration").value||'60',10), topic:$("#sesTopic").value.trim()}); save(); $("#sesTopic").value=''; renderSessions(); renderDashboard(); });
function renderSessions(){ const rows=[...data.sessions].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(s=>{ const st=data.students.find(x=>x.id===s.studentId); return `<tr ${new Date(it.dateISO)<new Date()&&!it.paid?'style=\"background:#402\"':''}><td>${st?st.name:'—'}</td><td>${new Date(s.date).toLocaleString()}</td><td>${s.duration||0} dk</td><td>${s.topic||''}</td><td class="actions"><button class="btn danger" data-dels="${s.id}">Sil</button></td></tr>`; }).join(""); $("#sessionTable tbody").innerHTML = rows || '<tr><td colspan="5" class="small">Kayıt yok.</td></tr>'; $$("#sessionTable [data-dels]").forEach(b=>b.onclick=()=>{ data.sessions=data.sessions.filter(x=>x.id!==b.dataset.dels); save(); renderSessions(); renderDashboard(); });}

// TASKS
$("#addTask").addEventListener('click',()=>{ const title=$("#taskTitle").value.trim(); if(!title) return alert("Başlık gerekli."); const t={id:crypto.randomUUID(), title, cat:$("#taskCat").value, due:$("#taskDue").value?new Date($("#taskDue").value).toISOString():null, prio:$("#taskPrio").value, note:$("#taskNote").value.trim(), done:false}; data.tasks.push(t); save(); $("#taskTitle").value=''; $("#taskNote").value=''; $("#taskDue").value=''; renderTasks(); renderDashboard();});
function renderTasks(){ const q=($("#taskSearch").value||'').toLowerCase(); const f=$("#taskFilter").value;
  const rows=data.tasks.filter(t=>(!f||t.cat===f)&&[t.title,t.cat,t.note,t.prio].join(' ').toLowerCase().includes(q)).sort((a,b)=>{ if(a.done!==b.done) return a.done?1:-1; const ad=a.due?new Date(a.due):new Date(8640000000000000); const bd=b.due?new Date(b.due):new Date(8640000000000000); if(ad-bd) return ad-bd; const po={'Yüksek':0,'Orta':1,'Düşük':2}; return (po[a.prio]??9)-(po[b.prio]??9); }).map(t=>`
    <tr><td>${t.title}</td><td><span class="pill">${t.cat}</span></td><td>${t.due?new Date(t.due).toLocaleString():'—'}</td><td>${t.prio}</td><td>${t.done?'<span class="pill">Bitti</span>':'<span class="pill">Açık</span>'}</td>
    <td class="actions"><button class="btn ok" data-done="${t.id}">${t.done?'Geri Al':'Tamam'}</button><button class="btn" data-wa="${encodeURIComponent(t.title)}">WA</button><button class="btn" data-edit="${t.id}">Düzenle</button><button class="btn danger" data-del="${t.id}">Sil</button></td></tr>`).join("");
  $("#taskTable tbody").innerHTML = rows || '<tr><td colspan="6" class="small">Kayıt yok.</td></tr>';
  $$("#taskTable [data-done]").forEach(b=>b.onclick=()=>{ const t=data.tasks.find(x=>x.id===b.dataset.done); t.done=!t.done; save(); renderTasks(); renderDashboard(); });
  $$("#taskTable [data-del]").forEach(b=>b.onclick=()=>{ if(confirm("Silinsin mi?")){ data.tasks=data.tasks.filter(x=>x.id!==b.dataset.del); save(); renderTasks(); renderDashboard(); }});
  $$("#taskTable [data-edit]").forEach(b=>b.onclick=()=>{ const t=data.tasks.find(x=>x.id===b.dataset.edit); t.title=prompt("Başlık",t.title)||t.title; t.cat=prompt("Kategori",t.cat)||t.cat; const due=prompt("Bitiş (YYYY-MM-DD HH:MM)", t.due?new Date(t.due).toISOString().slice(0,16).replace('T',' '):'')||''; t.prio=prompt("Öncelik (Yüksek/Orta/Düşük)",t.prio)||t.prio; t.note=prompt("Not",t.note||'')||t.note; t.due=due?new Date(due.replace(' ','T')).toISOString():null; save(); renderTasks(); renderDashboard(); });
  $$("#taskTable [data-wa]").forEach(b=>b.onclick=()=>openWA('',`Merhaba, "${decodeURIComponent(b.dataset.wa)}" görevi hakkında bilgilendirme.`));
}
$("#taskSearch").addEventListener('input',renderTasks); $("#taskFilter").addEventListener('change',renderTasks); $("#taskExport").addEventListener('click',()=>downloadJSON('gorevler',data.tasks)); $("#taskCSV").addEventListener('click',()=>downloadCSV('gorevler',['title','cat','due','prio','note','done'],data.tasks)); $("#taskImportBtn").addEventListener('click',()=>$("#taskImport").click()); $("#taskImport").addEventListener('change',e=>importJSON(e,arr=>{ if(Array.isArray(arr)){ data.tasks=arr; save(); renderTasks(); renderDashboard(); } }));

// DOCS
$("#addDoc").addEventListener('click',()=>{ const o={id:crypto.randomUUID(),office:$("#docOffice").value,type:$("#docType").value.trim(),track:$("#docTrack").value.trim(),due:$("#docDue").value||null,note:$("#docNote").value.trim(),done:false}; if(!o.type) return alert("Belge/İşlem giriniz."); data.docs.push(o); save(); $("#docType").value=''; $("#docTrack").value=''; $("#docDue").value=''; $("#docNote").value=''; renderDocs(); renderDashboard();});
function renderDocs(){ const q=($("#docSearch").value||'').toLowerCase();
  const rows=data.docs.filter(d=>[d.office,d.type,d.track,d.note].join(' ').toLowerCase().includes(q)).sort((a,b)=>{ if(a.done!==b.done) return a.done?1:-1; const ad=a.due?new Date(a.due):new Date(8640000000000000); const bd=b.due?new Date(b.due):new Date(8640000000000000); return ad-bd; }).map(d=>`
    <tr><td>${d.office}</td><td>${d.type}</td><td>${d.due?new Date(d.due).toLocaleDateString():'—'}</td><td>${d.track||'—'}</td><td>${d.done?'<span class="pill">Tamam</span>':'<span class="pill">Açık</span>'}</td>
    <td class="actions"><button class="btn ok" data-ddone="${d.id}">${d.done?'Geri Al':'Tamam'}</button><button class="btn" data-wa="${encodeURIComponent((d.office||'')+' '+(d.type||''))}">WA</button><button class="btn" data-dedit="${d.id}">Düzenle</button><button class="btn danger" data-ddel="${d.id}">Sil</button></td></tr>`).join("");
  $("#docTable tbody").innerHTML = rows || '<tr><td colspan="6" class="small">Kayıt yok.</td></tr>';
  $$("#docTable [data-ddone]").forEach(b=>b.onclick=()=>{ const d=data.docs.find(x=>x.id===b.dataset.ddone); d.done=!d.done; save(); renderDocs(); renderDashboard(); });
  $$("#docTable [data-ddel]").forEach(b=>b.onclick=()=>{ if(confirm("Silinsin mi?")){ data.docs=data.docs.filter(x=>x.id!==b.dataset.ddel); save(); renderDocs(); renderDashboard(); }});
  $$("#docTable [data-dedit]").forEach(b=>b.onclick=()=>{ const d=data.docs.find(x=>x.id===b.dataset.dedit); d.office=prompt("Kurum",d.office)||d.office; d.type=prompt("Belge/İşlem",d.type)||d.type; d.track=prompt("Takip No",d.track||'')||''; d.due=prompt("Son Tarih (YYYY-MM-DD)",d.due||'')||''; d.note=prompt("Not",d.note||'')||d.note; save(); renderDocs(); renderDashboard(); });
  $$("#docTable [data-wa]").forEach(b=>b.onclick=()=>openWA('',`Merhaba, ${decodeURIComponent(b.dataset.wa)} hakkında bilgi talebi.`));
}
$("#docExport").addEventListener('click',()=>downloadJSON('evrak',data.docs)); $("#docCSV").addEventListener('click',()=>downloadCSV('evrak',['office','type','due','track','note','done'],data.docs)); $("#docImportBtn").addEventListener('click',()=>$("#docImport").click()); $("#docImport").addEventListener('change',e=>importJSON(e,arr=>{ if(Array.isArray(arr)){ data.docs=arr; save(); renderDocs(); renderDashboard(); } }));

// ONLINE
function renderPlans(){ const c=$("#planList"); c.innerHTML=data.online.plans.map((p,i)=>`<div class="card"><h3>${p.name||'Paket'}</h3><div class="kv"><span class="k">Fiyat:</span><span class="v">${p.price?('₺'+p.price):'—'}</span></div><div class="small">${p.desc||''}</div><hr><button class="btn" data-pedit="${i}">Düzenle</button><button class="btn danger" data-pdel="${i}">Sil</button></div>`).join("") || '<div class="small">Plan ekleyin.</div>'; $$("#planList [data-pedit]").forEach(b=>b.onclick=()=>{ const i=+b.dataset.pedit, p=data.online.plans[i]; const name=prompt("Ad",p.name||'')||''; const price=prompt("Aylık Fiyat (₺)",p.price||'')||''; const desc=prompt("Açıklama",p.desc||'')||''; data.online.plans[i]={name,price,desc}; save(); renderPlans();}); $$("#planList [data-pdel]").forEach(b=>b.onclick=()=>{ const i=+b.dataset.pdel; data.online.plans.splice(i,1); save(); renderPlans(); }); $("#contactPhone").value=data.online.contact.phone||''; $("#contactIG").value=data.online.contact.instagram||''; }
$("#addPlan").addEventListener('click',()=>{ const name=$("#planName").value.trim(); if(!name) return alert("Plan adı gerekli"); data.online.plans.push({name,price:$("#planPrice").value.trim(),desc:$("#planDesc").value.trim()}); $("#planName").value=''; $("#planPrice").value=''; $("#planDesc").value=''; save(); renderPlans();});
$("#previewOnline").addEventListener('click',()=>{ data.online.contact.phone=$("#contactPhone").value.trim(); data.online.contact.instagram=$("#contactIG").value.trim(); save(); window.open('/online.html','_blank');});

// KASA
$("#addKK").addEventListener('click',()=>{ const r={id:crypto.randomUUID(), type:$("#kkType").value, cat:$("#kkCat").value, dt: $("#kkDate").value? new Date($("#kkDate").value).toISOString(): new Date().toISOString(), amount: parseFloat($("#kkAmount").value||'0'), method:$("#kkMethod").value, who:$("#kkWho").value.trim(), note:$("#kkNote").value.trim()}; if(!r.amount) return alert("Tutar girin."); data.kasa.push(r); save(); $("#kkAmount").value=''; $("#kkNote").value=''; renderKasa(); renderDashboard(); drawKasaChart(); });
function renderKasaMonths(){ const sel=$("#kkMonth"); sel.innerHTML=''; const months=new Set(data.kasa.map(k=>new Date(k.dt).toISOString().slice(0,7))); const arr=[...months].sort().reverse(); const now=new Date(); const cur=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`; sel.innerHTML = `<option value="">Tümü</option>` + arr.map(m=>`<option ${m===cur?'selected':''}>${m}</option>`).join(""); }
function renderKasa(){ const q=($("#kkSearch").value||'').toLowerCase(); const month=$("#kkMonth").value;
  const rows=data.kasa.filter(k=>[k.type,k.cat,k.method,k.who,k.note].join(' ').toLowerCase().includes(q)).filter(k=>!month || new Date(k.dt).toISOString().slice(0,7)===month).sort((a,b)=>new Date(b.dt)-new Date(a.dt)).map(k=>`
    <tr><td>${new Date(k.dt).toLocaleString()}</td><td>${k.type}</td><td>${k.cat}</td><td>₺${(+k.amount||0).toFixed(2)}</td><td>${k.method}</td><td>${k.who||''}</td><td>${k.note||''}</td>
    <td class="actions"><button class="btn" data-wa="${encodeURIComponent(k.who||'')}">WA</button><button class="btn" data-receipt="${k.id}">Fiş</button><button class="btn danger" data-delkk="${k.id}">Sil</button></td></tr>`).join("");
  $("#kkTable tbody").innerHTML=rows || '<tr><td colspan="8" class="small">Kayıt yok.</td></tr>';
  $$("#kkTable [data-delkk]").forEach(b=>b.onclick=()=>{ data.kasa=data.kasa.filter(x=>x.id!==b.dataset.delkk); save(); renderKasa(); renderDashboard(); drawKasaChart(); });
  $$("#kkTable [data-wa]").forEach(b=>b.onclick=()=>openWA(decodeURIComponent(b.dataset.wa),'Ödeme hakkında bilgi için yazıyorum.'));
  $$("#kkTable [data-receipt]").forEach(b=>b.onclick=()=>printReceipt('kasa', b.dataset.receipt));
}
$("#kkSearch").addEventListener('input',renderKasa); $("#kkMonth").addEventListener('change',renderKasa); $("#kkCSV").addEventListener('click',()=>downloadCSV('kasa',['dt','type','cat','amount','method','who','note'],data.kasa));

// Kasa Grafik (Canvas; simple bars)
function drawKasaChart(){
  const cvs=$("#kkChart"); if(!cvs) return; const ctx=cvs.getContext('2d'); ctx.clearRect(0,0,cvs.width,cvs.height);
  // last 6 months label
  const now=new Date(); const months=[]; for(let i=5;i>=0;i--){ const d=new Date(now.getFullYear(), now.getMonth()-i, 1); months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); }
  const sum=(arr,type,m)=>arr.filter(k=>k.type===type && new Date(k.dt).toISOString().slice(0,7)===m).reduce((s,k)=>s+(+k.amount||0),0);
  const gelir=months.map(m=>sum(data.kasa,'Gelir',m)); const gider=months.map(m=>sum(data.kasa,'Gider',m));
  const net=months.map((m,i)=>gelir[i]-gider[i]); const max=Math.max(1,...gelir,...gider,...net); const W=cvs.width-40, H=cvs.height-40, x0=30,y0=10;
  // axes
  ctx.strokeStyle='#5f6f9a'; ctx.lineWidth=1; ctx.strokeRect(x0,y0,W,H);
  // bars
  const groupW=W/months.length; const barW=(groupW-10)/2;
  for(let i=0;i<months.length;i++){
    const g=gelir[i]/max; const c=gider[i]/max;
    const gx=x0+i*groupW+5, cx=gx+barW;
    const gh=H*g, ch=H*c;
    // gelir (left bar)
    ctx.fillStyle='#2ecc71'; ctx.fillRect(gx, y0+H-gh, barW, gh);
    // gider (right bar)
    ctx.fillStyle='#ff5252'; ctx.fillRect(cx, y0+H-ch, barW, ch);
    // label
    ctx.fillStyle='#b7c4e1'; ctx.font='10px sans-serif'; ctx.fillText(months[i].slice(5), gx, y0+H+12);
  }
  // NET line
  ctx.beginPath();
  for(let i=0;i<months.length;i++){
    const val=net[i]/max; const x=x0+i*groupW+groupW/2; const y=y0+H - val*H; if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.strokeStyle='#3aa0ff'; ctx.lineWidth=2; ctx.stroke();
}

// TAKSİT / BORÇ
$("#txCreate").addEventListener('click',()=>{
  const name=$("#txName").value.trim(); const total=parseFloat($("#txTotal").value||'0'); const count=parseInt($("#txCount").value||'0',10); const start=$("#txStart").value; const type=$("#txType").value.startsWith('Borç')?'Gider':'Gelir'; const who=$("#txWho").value.trim();
  if(!name||!total||!count||!start) return alert("Ad, toplam, taksit sayısı ve başlangıç tarihi gerekli.");
  const items=[]; const per=(total/count);
  const s=new Date(start+'T00:00:00'); for(let i=0;i<count;i++){ const d=new Date(s.getFullYear(), s.getMonth()+i, s.getDate()); items.push({id:crypto.randomUUID(), dateISO:d.toISOString(), amount: per, paid:false}); }
  data.taksit.push({id:crypto.randomUUID(), name, type, who, total, count, startISO: s.toISOString(), items}); save();
  $("#txName").value=''; $("#txTotal").value=''; $("#txCount").value=''; $("#txStart").value=''; $("#txWho").value=''; renderTaksit();
});
function renderTaksit(){
  const rows=data.taksit.flatMap(plan=>plan.items.map((it,idx)=>({plan, it, idx}))).sort((a,b)=>new Date(a.it.dateISO)-new Date(b.it.dateISO)).map(obj=>{
    const {plan,it,idx}=obj; return `<tr ${new Date(it.dateISO)<new Date()&&!it.paid?'style=\"background:#402\"':''}>
      <td>${plan.name} (${plan.type})</td><td>${new Date(it.dateISO).toLocaleDateString()}</td><td>${idx+1}/${plan.count}</td><td>₺${(+it.amount||0).toFixed(2)}</td><td>${it.paid?'<span class="pill">Ödendi</span>':'<span class="pill">Açık</span>'}</td>
      <td class="actions"><button class="btn ok" data-tpay="${plan.id}:${it.id}">${it.paid?'Geri Al':'Öde'}</button><button class="btn" data-tkas="${plan.id}:${it.id}">Kasa</button></td>
    </tr>`;
  }).join("");
  $("#txTable tbody").innerHTML = rows || '<tr><td colspan="6" class="small">Plan yok.</td></tr>';
  $$("#txTable [data-tpay]").forEach(b=>b.onclick=()=>{ const [pid,iid]=b.dataset.tpay.split(':'); const p=data.taksit.find(x=>x.id===pid); const it=p.items.find(x=>x.id===iid); it.paid=!it.paid; save(); renderTaksit(); });
  $$("#txTable [data-tkas]").forEach(b=>b.onclick=()=>{ const [pid,iid]=b.dataset.tkas.split(':'); const p=data.taksit.find(x=>x.id===pid); const it=p.items.find(x=>x.id===iid); data.kasa.push({id:crypto.randomUUID(), type:p.type, cat:'Taksit', dt:new Date(it.dateISO).toISOString(), amount:it.amount, method:'Nakit', who:p.who||'', note:p.name+' '+(p.items.indexOf(it)+1)+'/'+p.count}); it.paid=true; save(); renderKasa(); renderTaksit(); renderDashboard(); drawKasaChart(); });
}

// DÜKKAN - STOK
$("#addStk").addEventListener('click',()=>{
  const s={id:crypto.randomUUID(), name:$("#stkName").value.trim(), sku:$("#stkSku").value.trim(), cat:$("#stkCat").value.trim(), attr:$("#stkAttr").value.trim(), qty:parseInt($("#stkQty").value||'0',10), min:parseInt($("#stkMin").value||'0',10), cost:parseFloat($("#stkCost").value||'0'), price:parseFloat($("#stkPrice").value||'0'), vat:parseFloat($("#stkVAT").value||'')};
  if(!s.name||!s.sku) return alert("Ad ve SKU zorunlu"); data.stok.push(s); save(); ["stkName","stkSku","stkQty","stkMin","stkCost","stkPrice","stkVAT"].forEach(id=>$("#"+id).value=''); renderStok(); fillOrderSku(); renderDashboard();
});
function renderStok(){ const q=($("#stkSearch").value||'').toLowerCase();
  const rows=data.stok.filter(s=>[s.name,s.sku,s.cat,s.attr].join(' ').toLowerCase().includes(q)).map(s=>`<tr>
    <td>${s.name}</td><td>${s.sku}</td><td>${s.cat||''}</td><td>${s.attr||''}</td><td>${s.qty||0}</td><td>${s.min||0}</td><td>₺${(+s.cost||0).toFixed(2)}</td><td>₺${(+s.price||0).toFixed(2)}</td>
    <td class="actions"><button class="btn" data-stkedit="${s.id}">Düzenle</button><button class="btn danger" data-stkdel="${s.id}">Sil</button></td></tr>`).join("");
  $("#stkTable tbody").innerHTML=rows || '<tr><td colspan="9" class="small">Kayıt yok.</td></tr>';
  $$("#stkTable [data-stkdel]").forEach(b=>b.onclick=()=>{ data.stok=data.stok.filter(x=>x.id!==b.dataset.stkdel); save(); renderStok(); fillOrderSku(); renderDashboard(); });
  $$("#stkTable [data-stkedit]").forEach(b=>b.onclick=()=>{ const s=data.stok.find(x=>x.id===b.dataset.stkedit); s.name=prompt("Ad",s.name)||s.name; s.sku=prompt("SKU",s.sku)||s.sku; s.cat=prompt("Kategori",s.cat||'')||''; s.attr=prompt("Özellik",s.attr||'')||''; s.qty=parseInt(prompt("Adet",s.qty)||s.qty,10); s.min=parseInt(prompt("Min Adet",s.min||0)||s.min||0,10); s.cost=parseFloat(prompt("Maliyet",s.cost)||s.cost); s.price=parseFloat(prompt("Satış",s.price)||s.price); save(); renderStok(); fillOrderSku(); renderDashboard(); });
}
$("#stkCSV").addEventListener('click',()=>downloadCSV('stok',['name','sku','cat','attr','qty','min','cost','price'],data.stok));

// DÜKKAN - SİPARİŞ
function fillOrderSku(){ $("#ordSku").innerHTML=data.stok.map(s=>`<option value="${s.sku}" data-price="${s.price||0}">${s.sku} • ${s.name}</option>`).join(""); }
$("#ordSku").addEventListener('change',()=>{ const opt=$("#ordSku").selectedOptions[0]; if(opt) $("#ordPrice").value=opt.getAttribute('data-price')||''; });
$("#addOrd").addEventListener('click',()=>{
  if(!data.stok.length) return alert("Önce stok ekleyin."); const sku=$("#ordSku").value; const item=data.stok.find(s=>s.sku===sku); if(!item) return alert("SKU bulunamadı.");
  const qty=parseInt($("#ordQty").value||'1',10); const unit=parseFloat($("#ordPrice").value||item.price||0);
  const o={id:crypto.randomUUID(), date: $("#ordDate").value? new Date($("#ordDate").value).toISOString(): new Date().toISOString(), customer: $("#ordCust").value.trim(), phone: $("#ordPhone").value.trim(), sku, qty, unit, method:$("#ordMethod").value, note:$("#ordNote").value.trim()};
  data.siparis.push(o); item.qty=(item.qty||0)-qty; data.kasa.push({id:crypto.randomUUID(), type:'Gelir', cat:'Dükkan Satış', dt:o.date, amount: qty*unit, method:o.method==='Kart'?'Kredi Kartı':(o.method==='EFT'?'EFT/Havale':'Nakit'), who:o.customer, note:`${sku} x${qty}`}); save();
  renderOrders(); renderStok(); renderKasa(); renderDashboard(); drawKasaChart();
  $("#ordCust").value=''; $("#ordPhone").value=''; $("#ordQty").value='1'; $("#ordPrice").value=''; $("#ordNote").value='';
});
function renderOrders(){ const q=($("#ordSearch").value||'').toLowerCase();
  const rows=data.siparis.filter(o=>[o.customer,o.phone,o.sku,o.method,o.note].join(' ').toLowerCase().includes(q)).sort((a,b)=>new Date(b.date)-new Date(a.date)).map(o=>{
    const item=data.stok.find(s=>s.sku===o.sku); const tutar=(o.qty*o.unit)||0;
    return `<tr ${new Date(it.dateISO)<new Date()&&!it.paid?'style=\"background:#402\"':''}><td>${new Date(o.date).toLocaleString()}</td><td>${o.customer}</td><td>${item?item.name:o.sku}</td><td>${o.qty}</td><td>₺${tutar.toFixed(2)}</td><td>${o.method}</td><td>${o.note||''}</td>
    <td class="actions"><button class="btn" data-wa="${o.phone||''}">WA</button><button class="btn" data-rec="${o.id}">Fiş</button><button class="btn danger" data-odel="${o.id}">Sil</button></td></tr>`;
  }).join("");
  $("#ordTable tbody").innerHTML=rows || '<tr><td colspan="8" class="small">Kayıt yok.</td></tr>';
  $$("#ordTable [data-odel]").forEach(b=>b.onclick=()=>{ data.siparis=data.siparis.filter(x=>x.id!==b.dataset.odel); save(); renderOrders(); });
  $$("#ordTable [data-wa]").forEach(b=>b.onclick=()=>openWA(b.dataset.wa,'Siparişiniz kaydedildi. Teşekkürler.'));
  $$("#ordTable [data-rec]").forEach(b=>b.onclick=()=>printReceipt('order', b.dataset.rec));
  $$("#ordTable [data-inv]").forEach(b=>b.onclick=()=>printInvoice('order', b.dataset.inv));
}
$("#ordCSV").addEventListener('click',()=>downloadCSV('siparis',['date','customer','phone','sku','qty','unit','method','note'],data.siparis));

// WhatsApp
function renderWA(){ buildWAText(); }
["waTemplate","waVar1","waVar2"].forEach(id=>$("#"+id).addEventListener('input',buildWAText));
$("#waCompose").addEventListener('click',()=>openWA($("#waPhone").value.trim(), $("#waPreview").value));
$("#waCopy").addEventListener('click',()=>{ navigator.clipboard.writeText($("#waPreview").value||''); alert("Kopyalandı."); });
function buildWAText(){ const t=$("#waTemplate").value, a=$("#waVar1").value||'', b=$("#waVar2").value||''; let msg='';
  if(t==='randevu') msg=`Merhaba ${a}, ders randevumuz ${b} tarihinde/saatinde planlanmıştır. Uygunsa onayını rica ederim.`;
  if(t==='odeme') msg=`Merhaba ${a}, ${b} tutarındaki ödemeniz için hatırlatma notudur. Uygunsa bugün içinde tamamlayalım.`;
  if(t==='evrak') msg=`Merhaba ${a}, evrak işlemi hakkında bilgilendirme: ${b}. Sorunuz olursa yazabilirsiniz.`;
  if(t==='siparis') msg=`Merhaba ${a}, siparişiniz oluşturulmuştur. Tutar: ${b}. İlginiz için teşekkürler.`;
  $("#waPreview").value=msg;
}
function openWA(phone,text){ const clean=(phone||'').replace(/\D/g,''); const url=`https://wa.me/${clean?clean:''}?text=${encodeURIComponent(text||'Merhaba')}`; window.open(url,'_blank'); }

// Settings & backup
function renderSettings(){
  $("#ownerName").value=data.settings.ownerName||'';
  $("#ownerTitle").value=data.settings.ownerTitle||'';
  $("#ownerNote").value=data.settings.ownerNote||'';
  $("#ownerVAT").value=(data.settings.vatRate!=null?data.settings.vatRate:18);
  $("#ownerInvPrefix").value=data.settings.invoicePrefix||'';
  $("#ownerInvSerial").value=(data.settings.invoiceSerial!=null?data.settings.invoiceSerial:1);
  if($("#ownerLogoSize")) $("#ownerLogoSize").value=(data.settings.logoSize!=null?data.settings.logoSize:70);
  if($("#ownerLogoPos")) $("#ownerLogoPos").value=(data.settings.logoPos||'Sol');
}
["ownerName","ownerTitle","ownerNote","ownerVAT","ownerInvPrefix","ownerInvSerial","ownerLogoSize","ownerLogoPos"].forEach(id=>{ const el=$("#"+id); if(!el) return; el.addEventListener('input',()=>{ data.settings.ownerName=$("#ownerName").value; data.settings.ownerTitle=$("#ownerTitle").value; data.settings.ownerNote=$("#ownerNote").value; data.settings.vatRate=parseFloat($("#ownerVAT").value||"18"); data.settings.invoicePrefix=$("#ownerInvPrefix").value||""; data.settings.invoiceSerial=parseInt($("#ownerInvSerial").value||"1",10); data.settings.logoSize=parseFloat($("#ownerLogoSize")?$("#ownerLogoSize").value:"70"); data.settings.logoPos=$("#ownerLogoPos")?$("#ownerLogoPos").value:"Sol"; save(); refreshOwner(); }); });
$("#ownerLogo").addEventListener("change", e=>{ const f=e.target.files[0]; if(!f) return; const fr=new FileReader(); fr.onload=()=>{ data.settings.logoDataUrl=fr.result; save(); alert("Logo kaydedildi."); }; fr.readAsDataURL(f); });
$("#backupExport").addEventListener('click',()=>downloadJSON('eduboss-backup',data));
$("#backupImportBtn").addEventListener('click',()=>$("#backupImport").click());
$("#backupImport").addEventListener('change',e=>importJSON(e,obj=>{ if(obj&&typeof obj==='object'){ localStorage.setItem(STORE_KEY, JSON.stringify(obj)); data=load(); alert("Yedek yüklendi."); location.reload(); } }));
$("#wipeAll").addEventListener('click',()=>{ if(confirm("Tüm veriler silinsin mi?")){ localStorage.removeItem(STORE_KEY); data=load(); location.reload(); } });

// Receipts (printable HTML → PDF kaydet)
function printReceipt(kind, id){
  const name = (data.settings&&data.settings.ownerName)||'Mehmet Ertürk';
  const title = (data.settings&&data.settings.ownerTitle)||'Matematik Öğretmeni & Öğrenci Koçu';
  const now = new Date();
  let html=''; let filename='fis';
  if(kind==='kasa'){
    const k=data.kasa.find(x=>x.id===id); if(!k) return;
    filename = 'kasa-fis';
    html = `<h2>${name}</h2><div>${title}</div><hr>
      <h3>Kasa Fişi</h3>
      <div>Tarih: ${new Date(k.dt).toLocaleString()}</div>
      <div>Tür: ${k.type}</div>
      <div>Kategori: ${k.cat}</div>
      <div>Tutar: ₺${(+k.amount||0).toFixed(2)}</div>
      <div>Yöntem: ${k.method}</div>
      <div>Karşı Taraf: ${k.who||'-'}</div>
      <div>Açıklama: ${k.note||'-'}</div>
      <hr><div style="font-size:12px;color:#666">Oluşturma: ${now.toLocaleString()}</div>`;
  }else if(kind==='order'){
    const o=data.siparis.find(x=>x.id===id); if(!o) return; const item=data.stok.find(s=>s.sku===o.sku);
    filename = 'satis-fis';
    html = `<h2>${name}</h2><div>${title}</div><hr>
      <h3>Satış Fişi</h3>
      <div>Tarih: ${new Date(o.date).toLocaleString()}</div>
      <div>Müşteri: ${o.customer||'-'} (${o.phone||'-'})</div>
      <div>Ürün: ${item?item.name:o.sku} (${o.sku})</div>
      <div>Adet: ${o.qty} • Birim: ₺${(+o.unit||0).toFixed(2)}</div>
      <div>Toplam: <b>₺${(o.qty*o.unit).toFixed(2)}</b></div>
      <div>Yöntem: ${o.method}</div>
      <div>Not: ${o.note||'-'}</div>
      <hr><div style="font-size:12px;color:#666">Oluşturma: ${now.toLocaleString()}</div>`;
  }
  const w=window.open('','_blank'); w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Fiş</title><style>
    body{font-family:Arial,Helvetica,sans-serif;padding:24px;} h2{margin:0} hr{border:0;border-top:1px solid #ccc;margin:12px 0}
  </style></head><body>${html}<script>window.onload=()=>window.print();</script></body></html>`); w.document.close();
}

// Utils: export/import
function downloadJSON(name,obj){ const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name+'.json'; a.click(); }
function downloadCSV(name,cols,arr){ const header=cols.join(',')+'\\n'; const rows=arr.map(o=>cols.map(c=>{ let v=(o[c]!==undefined&&o[c]!==null)? String(o[c]).replace(/"/g,'""'):''; if(/[,"\\n]/.test(v)) v='"'+v+'"'; return v; }).join(',')).join('\\n'); const blob=new Blob([header+rows],{type:"text/csv"}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name+'.csv'; a.click(); }
function importJSON(e,onData){ const f=e.target.files[0]; if(!f) return; const fr=new FileReader(); fr.onload=()=>{ try{ const obj=JSON.parse(fr.result); onData(obj); }catch(err){ alert("JSON okunamadı."); } }; fr.readAsText(f); }

// Install hint & SW
let deferredPrompt=null; window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferredPrompt=e; $("#installTip").textContent="Menü > Ana ekrana ekle ile yükleyebilirsin."; });
if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('/service-worker.js').catch(console.error)); }
// AUTO BACKUP
(function(){ try{
  const today=new Date().toISOString().slice(0,10);
  const key='eduboss_autosnap_'+today;
  if(!localStorage.getItem(key)){
    localStorage.setItem(key, JSON.stringify(data));
  }
}catch(e){} })();


// Invoice (Fatura) printable
function printInvoice(kind,id){
  const name=(data.settings&&data.settings.ownerName)||'Mehmet Ertürk';
  const title=(data.settings&&data.settings.ownerTitle)||'Matematik Öğretmeni & Öğrenci Koçu';
  let vat=(data.settings&&data.settings.vatRate!=null)? Number(data.settings.vatRate):18;
  const prefix=(data.settings&&data.settings.invoicePrefix)||'';
  const serial=(data.settings&&data.settings.invoiceSerial!=null)? data.settings.invoiceSerial:1;
  const logo=(data.settings&&data.settings.logoDataUrl)||'';
  const now=new Date();
  if(kind==='order'){
    const o=data.siparis.find(x=>x.id===id); if(!o) return; const item=data.stok.find(s=>s.sku===o.sku);
    const total=(o.qty*o.unit)||0; const prod=(data.stok.find(s=>s.sku===o.sku)||{}); vat = (prod.vat!=null && !Number.isNaN(prod.vat))? Number(prod.vat):vat; const kdv=total*(vat/100); const net=total-kdv;
    const invNo = `${prefix}${String(serial).padStart(6,'0')}`;
    const sz=(data.settings&&data.settings.logoSize!=null)? Number(data.settings.logoSize):70; const pos=(data.settings&&data.settings.logoPos)||'Sol'; const just = pos==='Orta'?'center':(pos==='Sağ'?'flex-end':'flex-start'); const logoHtml = logo? `<div style="display:flex;justify-content:${just};align-items:center;width:40%"><img src="${logo}" style="max-height:${sz}px;object-fit:contain"></div>` : '';
    const html = `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px">${logoHtml}<div style="flex:1"><h2 style="margin:0">${name}</h2><div>${title}</div></div></div><hr>
      <h3>FATURA</h3>
      <div>Fatura No: <b>${invNo}</b></div>
      <div>Tarih: ${new Date(o.date).toLocaleDateString()}</div>
      <div>Müşteri: ${o.customer||'-'} (${o.phone||'-'})</div>
      <table style="width:100%;border-collapse:collapse;margin-top:8px">
        <thead><tr><th style="text-align:left;border-bottom:1px solid #ccc;padding:6px">Ürün</th><th style="text-align:right;border-bottom:1px solid #ccc;padding:6px">Adet</th><th style="text-align:right;border-bottom:1px solid #ccc;padding:6px">Birim</th><th style="text-align:right;border-bottom:1px solid #ccc;padding:6px">Tutar</th></tr></thead>
        <tbody><tr><td style="padding:6px">${item?item.name:o.sku} (${o.sku})</td><td style="text-align:right;padding:6px">${o.qty}</td><td style="text-align:right;padding:6px">₺${(+o.unit||0).toFixed(2)}</td><td style="text-align:right;padding:6px">₺${total.toFixed(2)}</td></tr></tbody>
      </table>
      <div style="margin-top:8px">Ara Toplam: ₺${net.toFixed(2)}</div>
      <div>KDV (%${vat}): ₺${kdv.toFixed(2)}</div>
      <div><b>GENEL TOPLAM: ₺${total.toFixed(2)}</b></div>
      <hr><div style="font-size:12px;color:#666">Oluşturma: ${now.toLocaleString()}</div>`;
    const w=window.open('','_blank'); w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Fatura</title><style>body{font-family:Arial;padding:24px;} h2{margin:0} hr{border:0;border-top:1px solid #ccc;margin:12px 0}</style></head><body>${html}<script>window.onload=()=>window.print();</script></body></html>`); w.document.close();
    data.settings.invoiceSerial = (Number(serial)||0) + 1; save(); if($("#ownerInvSerial")) $("#ownerInvSerial").value=data.settings.invoiceSerial;
  }
}
}

// Stok içe aktarma
const stkImportInput=document.createElement('input'); stkImportInput.type='file'; stkImportInput.accept='.csv'; stkImportInput.classList.add('hidden'); document.body.appendChild(stkImportInput);
const stkImportBtn=document.createElement('button'); stkImportBtn.className='btn'; stkImportBtn.textContent='CSV İçe Aktar'; document.querySelector("#tab-dukkan .card").appendChild(stkImportBtn);
stkImportBtn.addEventListener('click',()=>stkImportInput.click());
stkImportInput.addEventListener('change',e=>{ const f=e.target.files[0]; if(!f) return; const fr=new FileReader(); fr.onload=()=>{ const lines=fr.result.split(/\\r?\\n/).filter(l=>l.trim()); const cols=lines.shift().split(','); lines.forEach(l=>{ const parts=l.split(','); const o={}; cols.forEach((c,i)=>o[c.trim()]=parts[i]); if(o.name&&o.sku){ data.stok.push({id:crypto.randomUUID(), name:o.name, sku:o.sku, cat:o.cat, attr:o.attr, qty:parseInt(o.qty||'0',10), min:parseInt(o.min||'0',10), cost:parseFloat(o.cost||'0'), price:parseFloat(o.price||'0')}); }}); save(); renderStok(); fillOrderSku(); renderDashboard(); }; fr.readAsText(f); });
