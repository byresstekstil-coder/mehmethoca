
// Minimal state store in localStorage
const STORE_KEY = 'eduboss_data';
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));

function load(){
  let d = {};
  try{ d = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }catch(e){ d={} }
  // defaults
  d.students ||= [];
  d.sessions ||= [];
  d.tasks ||= [];
  d.docs ||= [];
  d.online ||= { plans: [], contact: { phone:'', instagram:'' } };
  d.settings ||= { ownerName: 'Mehmet Ertürk', ownerTitle:'Matematik Öğretmeni & Öğrenci Koçu', ownerNote:'' };
  return d;
}
function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(data)); }

let data = load();
$("#year").textContent = new Date().getFullYear();

// Tabs
$$(".nav button").forEach(btn=>btn.addEventListener('click', ()=>{
  $$(".nav button").forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const tab = btn.dataset.tab;
  $$("section[id^='tab-']").forEach(s=>s.classList.add('hidden'));
  $("#tab-"+tab).classList.remove('hidden');
  if(tab==='students'){ renderStudents(); renderSessions(); fillStudentOptions(); }
  if(tab==='tasks'){ renderTasks(); }
  if(tab==='docs'){ renderDocs(); }
  if(tab==='online'){ renderPlans(); }
  if(tab==='dash'){ renderDashboard(); }
  if(tab==='settings'){ renderSettings(); }
}));

// Dashboard
function renderDashboard(){
  // Today's tasks/sessions
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1);

  let list = [];
  data.tasks.forEach(t=>{
    if(!t.done && t.due){
      const due = new Date(t.due);
      if(due>=todayStart && due<todayEnd) list.push({type:'Görev', title:t.title, when:due, extra:t.cat});
    }
  });
  data.sessions.forEach(s=>{
    const d = new Date(s.date);
    if(d>=todayStart && d<todayEnd){
      const st = data.students.find(x=>x.id===s.studentId);
      list.push({type:'Ders', title:(st?st.name:'Öğrenci')+' • '+(s.topic||''), when:d, extra: (s.duration||0)+' dk'});
    }
  });
  list.sort((a,b)=>a.when-b.when);
  $("#todayList").innerHTML = list.length ? list.map(x=>`<div>• <b>${x.type}</b> – ${x.title} <span class="badge">${x.when.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span> <span class="badge">${x.extra||''}</span></div>`).join("") : 'Bugün için kayıtlı öğe yok.';

  // Upcoming docs (7 gün)
  const next7 = new Date(now.getFullYear(), now.getMonth(), now.getDate()+7);
  const up = data.docs
    .filter(d=>!d.done && d.due)
    .map(d=>({...d, dueDate:new Date(d.due)}))
    .filter(d=>d.dueDate>=todayStart && d.dueDate<=next7)
    .sort((a,b)=>a.dueDate-b.dueDate);
  $("#upcomingDocs").innerHTML = up.length ? up.map(d=>`<div>• <b>${d.office}</b> – ${d.type} <span class="badge">${d.dueDate.toLocaleDateString()}</span> <span class="badge">${d.track||''}</span></div>`).join("") : 'Yaklaşan evrak tarihi yok.';

  // Metrics
  $("#metricStudents").textContent = data.students.length;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()-now.getDay()+1); // Pazartesi
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate()-now.getDay()+8);
  $("#metricSessions").textContent = data.sessions.filter(s=>{
    const d=new Date(s.date); return d>=weekStart && d<weekEnd;
  }).length;

  // Recent sessions
  const recent = [...data.sessions].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);
  $("#recentSessions").innerHTML = recent.length ? recent.map(s=>{
    const st = data.students.find(x=>x.id===s.studentId);
    return `<div>• ${new Date(s.date).toLocaleString()} – <b>${st?st.name:'Öğrenci'}</b> (${s.duration||0} dk) – ${s.topic||''}</div>`;
  }).join("") : 'Kayıt yok.';
}
renderDashboard();

// Quick task
$("#btnQuickTask").addEventListener('click', ()=>{
  const title = prompt("Görev başlığı?");
  if(!title) return;
  const due = new Date(); due.setHours(due.getHours()+2);
  data.tasks.push({id:crypto.randomUUID(), title, cat:'Diğer', due:due.toISOString(), prio:'Orta', note:'', done:false});
  save(); renderDashboard();
});

// Students
function clearStudentForm(){
  $("#stName").value = $("#stGrade").value = $("#stContact").value = $("#stGoal").value = $("#stNote").value = '';
}
$("#addStudent").addEventListener('click', ()=>{
  const name = $("#stName").value.trim();
  if(!name) return alert("İsim gerekli");
  const st = {
    id: crypto.randomUUID(),
    name, grade: $("#stGrade").value.trim(),
    contact: $("#stContact").value.trim(),
    goal: $("#stGoal").value.trim(),
    note: $("#stNote").value.trim(),
    createdAt: new Date().toISOString()
  };
  data.students.push(st); save(); clearStudentForm(); renderStudents(); fillStudentOptions();
});

function renderStudents(){
  const q = ($("#stSearch").value||'').toLowerCase();
  const rows = data.students
    .filter(s=>[s.name,s.grade,s.goal,s.contact].join(' ').toLowerCase().includes(q))
    .map(s=>`<tr>
      <td>${s.name}</td><td>${s.grade||''}</td><td>${s.goal||''}</td><td>${s.contact||''}</td>
      <td><button class="btn" data-edit="${s.id}">Düzenle</button> <button class="btn danger" data-del="${s.id}">Sil</button></td>
    </tr>`).join("");
  $("#studentTable tbody").innerHTML = rows || '<tr><td colspan="5" class="small">Kayıt yok.</td></tr>';
  // actions
  $$("#studentTable [data-del]").forEach(b=>b.onclick=()=>{
    const id=b.dataset.del; if(confirm("Silinsin mi?")){
      data.students = data.students.filter(x=>x.id!==id);
      data.sessions = data.sessions.filter(x=>x.studentId!==id);
      save(); renderStudents(); renderSessions(); fillStudentOptions();
    }
  });
  $$("#studentTable [data-edit]").forEach(b=>b.onclick=()=>{
    const s = data.students.find(x=>x.id===b.dataset.edit);
    const name = prompt("Ad Soyad", s.name); if(!name) return;
    const grade = prompt("Seviye", s.grade||'')||'';
    const contact = prompt("İletişim", s.contact||'')||'';
    const goal = prompt("Hedef", s.goal||'')||'';
    s.name=name; s.grade=grade; s.contact=contact; s.goal=goal; save(); renderStudents(); fillStudentOptions();
  });
}
$("#stSearch").addEventListener('input', renderStudents);

function fillStudentOptions(){
  $("#sesStudent").innerHTML = data.students.map(s=>`<option value="${s.id}">${s.name}</option>`).join("");
}

$("#addSession").addEventListener('click', ()=>{
  if(!data.students.length) return alert("Önce öğrenci ekleyin.");
  const sId = $("#sesStudent").value;
  const dt = $("#sesDate").value;
  if(!dt) return alert("Tarih saat giriniz.");
  const obj = {
    id: crypto.randomUUID(),
    studentId: sId,
    date: new Date(dt).toISOString(),
    duration: parseInt($("#sesDuration").value||'60',10),
    topic: $("#sesTopic").value.trim()
  };
  data.sessions.push(obj); save(); $("#sesTopic").value=''; renderSessions(); renderDashboard();
});

function renderSessions(){
  const rows = [...data.sessions].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(s=>{
    const st = data.students.find(x=>x.id===s.studentId);
    return `<tr>
      <td>${st?st.name:'—'}</td>
      <td>${new Date(s.date).toLocaleString()}</td>
      <td>${s.duration||0} dk</td>
      <td>${s.topic||''}</td>
      <td><button class="btn" data-dels="${s.id}">Sil</button></td>
    </tr>`;
  }).join("");
  $("#sessionTable tbody").innerHTML = rows || '<tr><td colspan="5" class="small">Kayıt yok.</td></tr>';
  $$("#sessionTable [data-dels]").forEach(b=>b.onclick=()=>{
    const id=b.dataset.dels; if(confirm("Silinsin mi?")){
      data.sessions = data.sessions.filter(x=>x.id!==id); save(); renderSessions(); renderDashboard();
    }
  });
}

// Tasks
$("#addTask").addEventListener('click', ()=>{
  const title = $("#taskTitle").value.trim(); if(!title) return alert("Başlık gerekli.");
  const t = {
    id: crypto.randomUUID(),
    title,
    cat: $("#taskCat").value,
    due: $("#taskDue").value? new Date($("#taskDue").value).toISOString() : null,
    prio: $("#taskPrio").value,
    note: $("#taskNote").value.trim(),
    done: false
  };
  data.tasks.push(t); save();
  $("#taskTitle").value=''; $("#taskNote").value=''; $("#taskDue").value='';
  renderTasks(); renderDashboard();
});

function renderTasks(){
  const q = ($("#taskSearch").value||'').toLowerCase();
  const f = $("#taskFilter").value;
  const rows = data.tasks
    .filter(t=>(!f || t.cat===f) && [t.title,t.cat,t.note,t.prio].join(' ').toLowerCase().includes(q))
    .sort((a,b)=>{
      // sort by done asc, due asc, prio
      if(a.done!==b.done) return a.done?1:-1;
      const ad=a.due?new Date(a.due):new Date(8640000000000000);
      const bd=b.due?new Date(b.due):new Date(8640000000000000);
      if(ad-bd!==0) return ad-bd;
      const po={'Yüksek':0,'Orta':1,'Düşük':2};
      return (po[a.prio]??9)-(po[b.prio]??9);
    })
    .map(t=>`<tr>
      <td>${t.title}</td>
      <td><span class="pill">${t.cat}</span></td>
      <td>${t.due?new Date(t.due).toLocaleString():'—'}</td>
      <td>${t.prio}</td>
      <td>${t.done?'<span class="pill">Bitti</span>':'<span class="pill">Açık</span>'}</td>
      <td>
        <button class="btn ok" data-done="${t.id}">${t.done?'Geri Al':'Tamam'}</button>
        <button class="btn" data-edit="${t.id}">Düzenle</button>
        <button class="btn danger" data-del="${t.id}">Sil</button>
      </td>
    </tr>`).join("");
  $("#taskTable tbody").innerHTML = rows || '<tr><td colspan="6" class="small">Kayıt yok.</td></tr>';
  $$("#taskTable [data-done]").forEach(b=>b.onclick=()=>{
    const t = data.tasks.find(x=>x.id===b.dataset.done);
    t.done = !t.done; save(); renderTasks(); renderDashboard();
  });
  $$("#taskTable [data-del]").forEach(b=>b.onclick=()=>{
    if(!confirm("Silinsin mi?")) return;
    data.tasks = data.tasks.filter(x=>x.id!==b.dataset.del); save(); renderTasks(); renderDashboard();
  });
  $$("#taskTable [data-edit]").forEach(b=>b.onclick=()=>{
    const t = data.tasks.find(x=>x.id===b.dataset.edit);
    const title = prompt("Başlık", t.title)||t.title;
    const cat = prompt("Kategori (Okul/Dershane/Özel Ders/Dükkan/Evrak/Diğer)", t.cat)||t.cat;
    const due = prompt("Bitiş (YYYY-MM-DD HH:MM)", t.due?new Date(t.due).toISOString().slice(0,16).replace('T',' '):'')||'';
    const prio = prompt("Öncelik (Yüksek/Orta/Düşük)", t.prio)||t.prio;
    const note = prompt("Not", t.note||'')||t.note;
    t.title=title; t.cat=cat; t.prio=prio; t.note=note; t.due = due? new Date(due.replace(' ','T')).toISOString() : null;
    save(); renderTasks(); renderDashboard();
  });
}
$("#taskSearch").addEventListener('input', renderTasks);
$("#taskFilter").addEventListener('change', renderTasks);

// Docs
$("#addDoc").addEventListener('click', ()=>{
  const o = {
    id: crypto.randomUUID(),
    office: $("#docOffice").value,
    type: $("#docType").value.trim(),
    track: $("#docTrack").value.trim(),
    due: $("#docDue").value || null,
    note: $("#docNote").value.trim(),
    done: false
  };
  if(!o.type) return alert("Belge/İşlem giriniz.");
  data.docs.push(o); save();
  $("#docType").value=''; $("#docTrack").value=''; $("#docDue").value=''; $("#docNote").value='';
  renderDocs(); renderDashboard();
});

function renderDocs(){
  const q = ($("#docSearch").value||'').toLowerCase();
  const rows = data.docs
    .filter(d=>[d.office,d.type,d.track,d.note].join(' ').toLowerCase().includes(q))
    .sort((a,b)=>{
      if(a.done!==b.done) return a.done?1:-1;
      const ad=a.due?new Date(a.due):new Date(8640000000000000);
      const bd=b.due?new Date(b.due):new Date(8640000000000000);
      return ad-bd;
    })
    .map(d=>`<tr>
      <td>${d.office}</td>
      <td>${d.type}</td>
      <td>${d.due?new Date(d.due).toLocaleDateString():'—'}</td>
      <td>${d.track||'—'}</td>
      <td>${d.done?'<span class="pill">Tamam</span>':'<span class="pill">Açık</span>'}</td>
      <td>
        <button class="btn ok" data-ddone="${d.id}">${d.done?'Geri Al':'Tamam'}</button>
        <button class="btn" data-dedit="${d.id}">Düzenle</button>
        <button class="btn danger" data-ddel="${d.id}">Sil</button>
      </td>
    </tr>`).join("");
  $("#docTable tbody").innerHTML = rows || '<tr><td colspan="6" class="small">Kayıt yok.</td></tr>';
  $$("#docTable [data-ddone]").forEach(b=>b.onclick=()=>{
    const d = data.docs.find(x=>x.id===b.dataset.ddone);
    d.done = !d.done; save(); renderDocs(); renderDashboard();
  });
  $$("#docTable [data-ddel]").forEach(b=>b.onclick=()=>{
    if(!confirm("Silinsin mi?")) return;
    data.docs = data.docs.filter(x=>x.id!==b.dataset.ddel); save(); renderDocs(); renderDashboard();
  });
  $$("#docTable [data-dedit]").forEach(b=>b.onclick=()=>{
    const d = data.docs.find(x=>x.id===b.dataset.dedit);
    const office = prompt("Kurum", d.office)||d.office;
    const type = prompt("Belge/İşlem", d.type)||d.type;
    const track = prompt("Takip No", d.track||'')||'';
    const due = prompt("Son Tarih (YYYY-MM-DD)", d.due||'')||'';
    const note = prompt("Not", d.note||'')||d.note;
    d.office=office; d.type=type; d.track=track; d.due=due||null; d.note=note;
    save(); renderDocs(); renderDashboard();
  });
}
$("#docSearch").addEventListener('input', renderDocs);

// Online plans
function renderPlans(){
  const c = $("#planList");
  c.innerHTML = data.online.plans.map((p,i)=>`<div class="card">
    <h3>${p.name||'Paket'}</h3>
    <div class="kv"><span class="k">Fiyat:</span><span class="v">${p.price?('₺'+p.price):'—'}</span></div>
    <div class="small">${p.desc||''}</div>
    <hr>
    <button class="btn" data-pedit="${i}">Düzenle</button>
    <button class="btn danger" data-pdel="${i}">Sil</button>
  </div>`).join("") || '<div class="small">Plan ekleyin.</div>';
  $$("#planList [data-pedit]").forEach(b=>b.onclick=()=>{
    const i = +b.dataset.pedit;
    const p = data.online.plans[i];
    const name = prompt("Ad", p.name||'')||'';
    const price = prompt("Aylık Fiyat (₺)", p.price||'')||'';
    const desc = prompt("Açıklama", p.desc||'')||'';
    data.online.plans[i] = {name, price, desc}; save(); renderPlans();
  });
  $$("#planList [data-pdel]").forEach(b=>b.onclick=()=>{
    const i = +b.dataset.pdel; data.online.plans.splice(i,1); save(); renderPlans();
  });
  $("#contactPhone").value = data.online.contact.phone||'';
  $("#contactIG").value = data.online.contact.instagram||'';
}
$("#addPlan").addEventListener('click', ()=>{
  const name = $("#planName").value.trim(); if(!name) return alert("Plan adı gerekli");
  data.online.plans.push({name, price: $("#planPrice").value.trim(), desc: $("#planDesc").value.trim()});
  $("#planName").value=''; $("#planPrice").value=''; $("#planDesc").value='';
  save(); renderPlans();
});
$("#previewOnline").addEventListener('click', ()=>{
  data.online.contact.phone = $("#contactPhone").value.trim();
  data.online.contact.instagram = $("#contactIG").value.trim();
  save();
  window.open('/online.html','_blank');
});

// Settings & Backup
function renderSettings(){
  $("#ownerName").value = data.settings.ownerName||'';
  $("#ownerTitle").value = data.settings.ownerTitle||'';
  $("#ownerNote").value = data.settings.ownerNote||'';
}
["ownerName","ownerTitle","ownerNote"].forEach(id=>{
  $( "#"+id ).addEventListener('input', ()=>{
    data.settings.ownerName = $("#ownerName").value;
    data.settings.ownerTitle = $("#ownerTitle").value;
    data.settings.ownerNote = $("#ownerNote").value;
    save();
  });
});
$("#backupExport").addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `eduboss-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
});
$("#backupImportBtn").addEventListener('click', ()=>$("#backupImport").click());
$("#backupImport").addEventListener('change', (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const fr = new FileReader();
  fr.onload = ()=>{
    try{
      const obj = JSON.parse(fr.result);
      localStorage.setItem(STORE_KEY, JSON.stringify(obj));
      data = load();
      alert("Yedek içe aktarıldı.");
      renderDashboard(); renderStudents(); renderSessions(); renderTasks(); renderDocs(); renderPlans(); renderSettings();
    }catch(err){ alert("Dosya okunamadı."); }
  };
  fr.readAsText(file);
});
$("#wipeAll").addEventListener('click', ()=>{
  if(confirm("Tüm veriler silinecek. Emin misiniz?")){
    localStorage.removeItem(STORE_KEY);
    data = load();
    renderDashboard(); renderStudents(); renderSessions(); renderTasks(); renderDocs(); renderPlans(); renderSettings();
  }
});

// Section-specific exports/imports
function makeExportBtn(id, mapper){
  $(id).addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(mapper(), null, 2)], {type:"application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `eduboss-${id.replace('#','')}-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  });
}
makeExportBtn('#stExport', ()=>data.students);
makeExportBtn('#taskExport', ()=>data.tasks);
makeExportBtn('#docExport', ()=>data.docs);

function makeImportBtn(btnId, inputId, apply){
  $(btnId).addEventListener('click', ()=>$(inputId).click());
  $(inputId).addEventListener('change', (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const fr = new FileReader();
    fr.onload = ()=>{
      try{
        const arr = JSON.parse(fr.result);
        apply(arr);
        save();
        alert("İçe aktarıldı.");
        renderStudents(); renderSessions(); renderTasks(); renderDocs(); renderPlans(); renderSettings(); renderDashboard();
      }catch(err){ alert("Dosya okunamadı."); }
    };
    fr.readAsText(file);
  });
}
makeImportBtn('#stImportBtn','#stImport', (arr)=>{ if(Array.isArray(arr)) data.students = arr; });
makeImportBtn('#taskImportBtn','#taskImport', (arr)=>{ if(Array.isArray(arr)) data.tasks = arr; });
makeImportBtn('#docImportBtn','#docImport', (arr)=>{ if(Array.isArray(arr)) data.docs = arr; });

// Install (A2HS) tip
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  $("#installTip").textContent = "İpucu: Tarayıcı menüsünden 'Ana ekrana ekle' ile uygulamayı yükleyebilirsiniz.";
});
if(!('BeforeInstallPromptEvent' in window)){
  $("#installTip").textContent = "İpucu: Tarayıcı ayarlarından 'Ana ekrana ekle' ile uygulamayı yükleyebilirsiniz.";
}

// Register service worker
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  });
}
