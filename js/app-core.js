// app-core.js
// Core state, editor interactions, modal flows, and shared utilities.
// Loaded first so other scripts can reuse these globals.

const { Document, Packer, Paragraph, TextRun } = docx;

let paperSize = 'letter';
let activeId  = null;
let nameFontSize = 14;
let bodyFontSize = 11;
let dragSrcId = null;

let personalInfo = { fullName:'', email:'', phone:'', location:'', linkedin:'', website:'' };

let sections = [
  { id:'personal',  type:'personal',   title:'Personal Information' },
  { id:'edu',       type:'education',  title:'Education',  items:[] },
  { id:'exp',       type:'experience', title:'Experience', items:[] },
  { id:'skills',    type:'skills',     title:'Skills',     categories:[] },
];
const EMPTY_EDITOR_HTML = '<div class="empty-hint"><div class="empty-hint-icon">✦</div><div class="empty-hint-text">Select a section on the left<br>to start editing your resume</div></div>';
const PERSONAL_FIELDS = ['fullName', 'email', 'phone', 'location', 'linkedin', 'website'];
const ITEM_FIELDS = ['institution', 'location', 'degree', 'field', 'gpa', 'startDate', 'endDate', 'company', 'position', 'description', 'exhibitionTitle', 'venue', 'workTitles', 'title', 'subtitle'];

function uid(){ return '_'+Math.random().toString(36).slice(2,9); }
const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

const LS = {
  personal:'rb3_pi',
  sections:'rb3_sec',
  paper:'rb3_paper',
  nameFont:'rb3_nfs',
  bodyFont:'rb3_bfs',
};

function mypField(label, val, id) {
  let selMonth = '', selYear = '';
  if(val) {
    val = val.trim();
    const isoMatch = val.match(/^(\d{4})-(\d{2})$/);
    if(isoMatch) {
      selYear = isoMatch[1];
      selMonth = isoMatch[2];
    }
    else if(/^\d{4}$/.test(val)) {
      selYear = val;
    }
    else {
      const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
      const monthShort = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      const parts = val.toLowerCase().split(/[\s,]+/);
      let foundMonth = '', foundYear = '';
      parts.forEach(p => {
        if(/^\d{4}$/.test(p)) foundYear = p;
        const mi = monthNames.indexOf(p);
        if(mi >= 0) foundMonth = String(mi+1).padStart(2,'0');
        const si = monthShort.indexOf(p.slice(0,3));
        if(si >= 0 && !foundMonth) foundMonth = String(si+1).padStart(2,'0');
      });
      if(foundYear) selYear = foundYear;
      if(foundMonth) selMonth = foundMonth;
    }
  }

  const storedVal = (selYear && selMonth) ? `${selYear}-${selMonth}` : (selYear ? selYear : (val || ''));

  const monthOpts = MONTHS.map((m,i) =>
    `<option value="${i===0?'':String(i).padStart(2,'0')}" ${selMonth===(i===0?'':String(i).padStart(2,'0'))?'selected':''}>${m||'Month (optional)'}</option>`
  ).join('');

  return `<div class="fgroup">
    <label>${label}</label>
    <div class="myp">
      <select id="${id}_m" onchange="mypChange('${id}')">
        ${monthOpts}
      </select>
      <input type="number" id="${id}_y" value="${selYear}" placeholder="Year" min="1950" max="2100" oninput="mypChange('${id}')">
    </div>
    <input type="hidden" id="${id}" value="${storedVal.replace(/"/g,'&quot;')}">
  </div>`;
}

function mypChange(id) {
  const m = document.getElementById(id+'_m');
  const y = document.getElementById(id+'_y');
  const hidden = document.getElementById(id);
  if(!m||!y||!hidden) return;
  let val = '';
  if(y.value && m.value) val = `${y.value}-${m.value}`;
  else if(y.value) val = y.value;
  hidden.value = val;
  onInput();
}

function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function getSectionById(id){
  return sections.find((section) => section.id === id);
}

function refreshEditorAndPreview(){
  save();
  renderEditor();
  renderPreview();
}

function save(){
  try{
    localStorage.setItem(LS.personal, JSON.stringify(personalInfo));
    localStorage.setItem(LS.sections, JSON.stringify(sections));
    localStorage.setItem(LS.paper, paperSize);
    localStorage.setItem(LS.nameFont, String(nameFontSize));
    localStorage.setItem(LS.bodyFont, String(bodyFontSize));
  }catch(_){ /* quota / private window */ }
}
function load(){
  try{
    const pi = localStorage.getItem(LS.personal);
    if(pi) personalInfo = JSON.parse(pi);
    const sc = localStorage.getItem(LS.sections);
    if(sc){
      const parsed = JSON.parse(sc);
      if(Array.isArray(parsed) && parsed.length) sections = parsed;
    }
    const ps = localStorage.getItem(LS.paper);
    if(ps){
      paperSize = ps;
      const sel = document.getElementById('paperSel');
      if(sel) sel.value = ps;
    }
    const nfs = localStorage.getItem(LS.nameFont);
    if(nfs) nameFontSize = parseFloat(nfs);
    const bfs = localStorage.getItem(LS.bodyFont);
    if(bfs) bodyFontSize = parseFloat(bfs);
  }catch(_){}
}
function backupData(){
  const data={personalInfo,sections,paperSize,nameFontSize,bodyFontSize,savedAt:new Date().toISOString()};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=`resume-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
}
function clearAll(){
  if(!confirm('Clear everything and start fresh?')) return;
  Object.values(LS).forEach((k) => localStorage.removeItem(k));
  location.reload();
}

let modalOverlay = null;
function showModal(contentFn){
  if(!modalOverlay){
    modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.addEventListener('click', (e) => {
      if(e.target === modalOverlay) closeModal();
    });
    document.body.appendChild(modalOverlay);
  }
  modalOverlay.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'modal-box';
  modalOverlay.appendChild(box);
  modalOverlay.style.display = 'flex';
  contentFn(box);
}
function closeModal(){
  if(modalOverlay) modalOverlay.style.display = 'none';
}

function openAddSection(){
  showModal(box=>{
    box.innerHTML=`<div class="modal-title">Add Section</div>
      <div class="modal-desc">Choose a section type to add to your resume.</div>
      <div id="__secOpts"></div>
      <div class="modal-btn-row">
        <button class="modal-cancel" onclick="closeModal()">Cancel</button>
      </div>`;
    const types=[
      {type:'education',   title:'Education',      icon:'🎓'},
      {type:'experience',  title:'Experience',     icon:'💼'},
      {type:'exhibitions', title:'Exhibitions',    icon:'🖼'},
      {type:'skills',      title:'Skills',         icon:'⚡'},
      {type:'custom',      title:'Custom Section', icon:'✦'},
    ];
    const existing=sections.map(s=>s.type).filter(t=>t!=='custom');
    const avail=types.filter(t=>!existing.includes(t.type)||t.type==='custom');
    const container=document.getElementById('__secOpts');
    if(!avail.length){
      container.innerHTML = '<p class="modal-muted">You already have every built-in section type. Custom sections can still be stacked if you need more.</p>';
      return;
    }
    avail.forEach(t=>{
      const btn=document.createElement('button');
      btn.className='modal-section-btn';
      btn.innerHTML=`<span class="modal-section-icon">${t.icon}</span><span>${t.title}</span>`;
      btn.onclick=()=>{
        closeModal();
        let finalTitle=t.title;
        if(t.type==='custom') finalTitle=prompt('Name your custom section:','Certifications')||'Custom Section';
        const sec={id:uid(),type:t.type,title:finalTitle};
        if(t.type==='skills') sec.categories=[];
        else sec.items=[];
        sections.push(sec);
        save(); renderSidebar(); selectSection(sec.id);
      };
      container.appendChild(btn);
    });
  });
}

function openImport(){
  const disclaimer =
    '<strong>Heads up:</strong> imports are best-effort. Skim each section afterward—dates and bullets are the usual trouble spots.';

  showModal((box) => {
    const h = document.createElement('h3');
    h.className = 'import-heading';
    h.textContent = 'Import';
    box.appendChild(h);

    const tabLabels = ['Paste text', 'File', 'Backup'];
    let activeIdx = 0;
    const tabBar = document.createElement('div');
    tabBar.className = 'import-tabs';
    const panel = document.createElement('div');
    const tabButtons = [];

    function syncTabs(){
      tabButtons.forEach((btn, i) => btn.classList.toggle('is-active', i === activeIdx));
    }

    function setTab(idx){
      activeIdx = idx;
      syncTabs();
      renderPanel(idx);
    }

    tabLabels.forEach((label, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'import-tab';
      btn.textContent = label;
      btn.addEventListener('click', () => setTab(i));
      tabBar.appendChild(btn);
      tabButtons.push(btn);
    });

    box.appendChild(tabBar);
    box.appendChild(panel);

    const foot = document.createElement('div');
    foot.className = 'import-footer';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'modal-cancel';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', closeModal);
    foot.appendChild(cancel);
    box.appendChild(foot);

    function callout(){
      const el = document.createElement('div');
      el.className = 'import-callout';
      el.innerHTML = '⚠️ ' + disclaimer;
      return el;
    }

    function renderPanel(idx){
      panel.innerHTML = '';

      if(idx === 0){
        const copy = document.createElement('p');
        copy.className = 'import-copy';
        copy.textContent = 'Paste the full text of a resume. We will try to map it into your sections.';
        panel.appendChild(copy);

        const ta = document.createElement('textarea');
        ta.className = 'modal-textarea compact';
        ta.placeholder = 'Paste resume text…';
        panel.appendChild(ta);
        panel.appendChild(callout());

        const go = document.createElement('button');
        go.type = 'button';
        go.className = 'import-primary';
        go.textContent = 'Import';
        go.addEventListener('click', () => {
          const raw = ta.value.trim();
          if(!raw){
            alert('Add some text first.');
            return;
          }
          runImport(raw);
          closeModal();
        });
        panel.appendChild(go);
        setTimeout(() => ta.focus(), 50);
        return;
      }

      if(idx === 1){
        const copy = document.createElement('p');
        copy.className = 'import-copy loose';
        copy.textContent = 'Plain text or Word (.docx). Everything stays in your browser—nothing is uploaded to a server.';
        panel.appendChild(copy);

        const dz = document.createElement('label');
        dz.className = 'import-drop';
        dz.innerHTML = '<span class="import-drop-icon">📄</span><span class="import-drop-title">Choose file</span><span class="import-drop-meta">.txt or .docx</span>';
        const fin = document.createElement('input');
        fin.type = 'file';
        fin.accept = '.txt,.docx';
        fin.hidden = true;
        dz.appendChild(fin);
        panel.appendChild(dz);

        const note = callout();
        note.classList.add('spaced');
        panel.appendChild(note);

        const status = document.createElement('p');
        status.className = 'import-status';
        panel.appendChild(status);

        fin.addEventListener('change', async () => {
          const file = fin.files[0];
          if(!file) return;
          status.textContent = 'Reading…';
          dz.classList.add('is-busy');
          try{
            let text = '';
            const name = file.name.toLowerCase();
            if(name.endsWith('.txt')){
              text = await file.text();
            }else if(name.endsWith('.docx')){
              if(typeof mammoth === 'undefined'){
                alert('The Word converter did not load. Check your connection and try again.');
                status.textContent = '';
                dz.classList.remove('is-busy');
                return;
              }
              const buf = await file.arrayBuffer();
              text = (await mammoth.extractRawText({ arrayBuffer: buf })).value;
            }else{
              status.textContent = 'Use a .txt or .docx file.';
              dz.classList.remove('is-busy');
              return;
            }
            if(!text.trim()){
              status.textContent = 'No text found in that file.';
              dz.classList.remove('is-busy');
              return;
            }
            status.textContent = 'Imported “' + file.name + '”.';
            setTimeout(() => {
              runImport(text);
              closeModal();
            }, 300);
          }catch(err){
            status.textContent = err.message || 'Could not read file.';
            dz.classList.remove('is-busy');
          }
        });
        return;
      }

      const copy = document.createElement('p');
      copy.className = 'import-copy loose';
      copy.textContent = 'Restore a JSON backup you exported from here. This replaces your current draft.';
      panel.appendChild(copy);

      const dz = document.createElement('label');
      dz.className = 'import-drop';
      dz.innerHTML = '<span class="import-drop-icon">🗂</span><span class="import-drop-title">Choose backup</span><span class="import-drop-meta">.json from this app</span>';
      const fin = document.createElement('input');
      fin.type = 'file';
      fin.accept = '.json';
      fin.hidden = true;
      dz.appendChild(fin);
      panel.appendChild(dz);

      const status = document.createElement('p');
      status.className = 'import-status';
      panel.appendChild(status);

      fin.addEventListener('change', () => {
        const file = fin.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          try{
            const data = JSON.parse(e.target.result);
            if(!data.personalInfo || !data.sections){
              status.textContent = 'That file does not look like a backup from this app.';
              return;
            }
            if(!confirm('Replace your current draft with this backup?')) return;
            personalInfo = data.personalInfo;
            sections = data.sections;
            if(data.paperSize) paperSize = data.paperSize;
            if(data.nameFontSize) nameFontSize = data.nameFontSize;
            if(data.bodyFontSize) bodyFontSize = data.bodyFontSize;
            save();
            applySliders();
            const sel = document.getElementById('paperSel');
            if(sel) sel.value = paperSize;
            renderSidebar();
            const first = sections.find((s) => s.type === 'personal')?.id || sections[0]?.id || null;
            if(first) selectSection(first);
            renderPreview();
            closeModal();
          }catch(_){
            status.textContent = 'Could not read that JSON.';
          }
        };
        reader.readAsText(file);
      });
    }

    setTab(0);
  });
}

function renderSidebar(){
  const list = document.getElementById('secList');
  list.innerHTML = '';
  sections.forEach((s) => {
    const wrap = document.createElement('div');
    wrap.className = 'sec-wrap';
    wrap.draggable = true;
    wrap.dataset.id = s.id;

    wrap.addEventListener('dragstart', (e) => {
      dragSrcId = s.id;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => wrap.classList.add('dragging'), 0);
    });
    wrap.addEventListener('dragover', (e) => {
      e.preventDefault();
      document.querySelectorAll('.sec-wrap').forEach((el) => el.classList.remove('drag-over'));
      if(s.id !== dragSrcId) wrap.classList.add('drag-over');
    });
    wrap.addEventListener('dragleave', () => wrap.classList.remove('drag-over'));
    wrap.addEventListener('drop', (e) => {
      e.preventDefault();
      if(!dragSrcId || dragSrcId === s.id) return;
      const from = sections.findIndex((x) => x.id === dragSrcId);
      const to = sections.findIndex((x) => x.id === s.id);
      if(from === -1 || to === -1) return;
      const [moved] = sections.splice(from, 1);
      sections.splice(to, 0, moved);
      save();
      renderSidebar();
      renderPreview();
    });
    wrap.addEventListener('dragend', () => {
      dragSrcId = null;
      document.querySelectorAll('.sec-wrap').forEach((el) => el.classList.remove('dragging', 'drag-over'));
    });

    const btn = document.createElement('button');
    btn.className = 'sec-btn' + (s.id === activeId ? ' active' : '');
    btn.innerHTML = `<span class="dot"></span>${esc(s.title)}`;
    btn.addEventListener('click', () => selectSection(s.id));
    wrap.appendChild(btn);

    if(s.type !== 'personal'){
      const del = document.createElement('button');
      del.className = 'sec-del';
      del.title = 'Remove section';
      del.textContent = '✕';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSec(s.id);
      });
      wrap.appendChild(del);
    }
    list.appendChild(wrap);
  });
}

function selectSection(id){
  activeId = id;
  renderSidebar();
  renderEditor();
}
function deleteSec(id){
  const sec = getSectionById(id);
  if(!sec || sec.type === 'personal') return;
  if(!confirm(`Remove "${sec.title}"?`)) return;
  sections = sections.filter((section) => section.id !== id);
  if(activeId === id) activeId = sections[0]?.id || null;
  save();
  renderSidebar();
  renderEditor();
  renderPreview();
}

function setNameFont(val){
  nameFontSize = parseFloat(val);
  document.getElementById('nameVal').textContent = `${val}pt`;
  save();
  renderPreview();
}
function setBodyFont(val){
  bodyFontSize = parseFloat(val);
  document.getElementById('bodyVal').textContent = `${val}pt`;
  save();
  renderPreview();
}
function applySliders(){
  const nameSlider = document.getElementById('nameSlider');
  if(nameSlider){
    nameSlider.value = nameFontSize;
    document.getElementById('nameVal').textContent = `${nameFontSize}pt`;
  }
  const bodySlider = document.getElementById('bodySlider');
  if(bodySlider){
    bodySlider.value = bodyFontSize;
    document.getElementById('bodyVal').textContent = `${bodyFontSize}pt`;
  }
}
function setPaper(v){
  paperSize = v;
  save();
  renderPreview();
}

function renderEditor(){
  const sec = getSectionById(activeId);
  const editorEl = document.getElementById('editorBody');
  if(!sec){
    editorEl.innerHTML = EMPTY_EDITOR_HTML;
    return;
  }
  if(sec.type === 'personal'){
    editorEl.innerHTML = personalEd();
    return;
  }
  const editorByType = {
    education: eduEd,
    experience: expEd,
    skills: skillsEd,
    exhibitions: exhibEd,
    custom: customEd,
  };
  const render = editorByType[sec.type] || customEd;
  editorEl.innerHTML = render(sec);
}

function fld(label,type,val,id,ph,hint){
  const h=hint?`<div class="hint">${hint}</div>`:'';
  if(type==='textarea')return `<div class="fgroup"><label>${label}</label><textarea id="${id}" oninput="onInput()" placeholder="${ph||''}">${(val||'').replace(/</g,'&lt;')}</textarea>${h}</div>`;
  return `<div class="fgroup"><label>${label}</label><input type="${type}" id="${id}" value="${(val||'').replace(/"/g,'&quot;')}" oninput="onInput()" placeholder="${ph||''}">${h}</div>`;
}

function personalEd(){
  const p=personalInfo;
  return `<div class="editor-section-title">Personal Info</div>
    ${fld('Full Name','text',p.fullName,'pi_fullName','Your name')}
    <div class="row2">${fld('Email','email',p.email,'pi_email','you@email.com')}${fld('Phone','tel',p.phone,'pi_phone','+1 555 000 0000')}</div>
    ${fld('Location','text',p.location,'pi_location','City, State ZIP')}
    ${fld('LinkedIn','text',p.linkedin,'pi_linkedin','linkedin.com/in/yourname')}
    ${fld('Website','text',p.website,'pi_website','yoursite.com')}`;
}

function eduEd(sec){
  const items=(sec.items||[]).map((item,i)=>{
    const mode=item.dateMode||'expected';const secId=sec.id;
    const dateFields=mode==='range'
      ?`${mypField('Start Date',item.startDate,`${secId}_${i}_startDate`)}${mypField('End Date',item.endDate,`${secId}_${i}_endDate`)}`
      :mypField('Graduation Date',item.endDate,`${secId}_${i}_endDate`);
    return `<div class="icard">
      <div class="icard-hdr"><span class="icard-title">Entry ${i+1}</span><button class="btn-del" onclick="delItem('${secId}',${i})">✕</button></div>
      ${fld('Institution','text',item.institution,`${secId}_${i}_institution`,'University Name')}
      <div class="row2">${fld('Location','text',item.location,`${secId}_${i}_location`,'City, State')}${fld('Degree','text',item.degree,`${secId}_${i}_degree`,'BFA, BA…')}</div>
      <div class="row2">${fld('Field / Major','text',item.field,`${secId}_${i}_field`,'Studio Art')}${fld('GPA','text',item.gpa,`${secId}_${i}_gpa`,'optional')}</div>
      <label class="toggle-row">
        <input type="checkbox" onchange="setEduDateMode('${secId}',${i},this.checked?'range':'expected')" ${mode==='range'?'checked':''}>
        <span class="toggle-row-label">Use date range</span>
      </label>
      ${dateFields}
      <label class="toggle-row" style="${mode==='range'?'opacity:.35;pointer-events:none':''}">
        <input type="checkbox" id="${secId}_${i}_expected" onchange="setEduExpected('${secId}',${i},this.checked)" ${item.expected&&mode!=='range'?'checked':''} ${mode==='range'?'disabled':''}>
        <span class="toggle-row-label">Expected graduation date</span>
      </label>
    </div>`;
  }).join('');
  return `<div class="editor-section-title">${esc(sec.title)}</div>${items}<button class="btn-add-item" onclick="addItem('${sec.id}')">+ Add Entry</button>`;
}

function expEd(sec){
  const items=(sec.items||[]).map((item,i)=>{
    const isCurrent=item.current===true;
    return `<div class="icard">
      <div class="icard-hdr"><span class="icard-title">Entry ${i+1}</span><button class="btn-del" onclick="delItem('${sec.id}',${i})">✕</button></div>
      ${fld('Organization','text',item.company,`${sec.id}_${i}_company`,'Company or Studio')}
      <div class="row2">${fld('Location','text',item.location,`${sec.id}_${i}_location`,'City, State')}${fld('Role / Title','text',item.position,`${sec.id}_${i}_position`,'Your title')}</div>
      ${mypField('Start Date',item.startDate,`${sec.id}_${i}_startDate`)}
      <div class="fgroup" style="margin-bottom:6px">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;text-transform:none;font-size:13px;font-weight:600;letter-spacing:0">
          <input type="checkbox" onchange="setExpCurrent('${sec.id}',${i},this.checked)"
            ${isCurrent?'checked':''}
            style="width:16px;height:16px;cursor:pointer;accent-color:var(--accent)">
          Currently working here
        </label>
      </div>
      ${!isCurrent?mypField('End Date',item.endDate,`${sec.id}_${i}_endDate`):''}
      ${fld('Description','textarea',item.description,`${sec.id}_${i}_description`,'Each line becomes a bullet','One bullet per line')}
    </div>`;
  }).join('');
  return `<div class="editor-section-title">${esc(sec.title)}</div>${items}<button class="btn-add-item" onclick="addItem('${sec.id}')">+ Add Entry</button>`;
}

function exhibEd(sec){
  const items=(sec.items||[]).map((item,i)=>`
    <div class="icard">
      <div class="icard-hdr"><span class="icard-title">Exhibition ${i+1}</span><button class="btn-del" onclick="delItem('${sec.id}',${i})">✕</button></div>
      ${fld('Exhibition Title','text',item.exhibitionTitle,`${sec.id}_${i}_exhibitionTitle`,'Exhibition Name')}
      <div class="row2">${fld('Venue','text',item.venue,`${sec.id}_${i}_venue`,'Gallery or Institution')}${fld('Location','text',item.location,`${sec.id}_${i}_location`,'City, State')}</div>
      ${mypField('Start Date',item.startDate,`${sec.id}_${i}_startDate`)}
      ${mypField('End Date',item.endDate,`${sec.id}_${i}_endDate`)}
      ${fld('Works','text',item.workTitles,`${sec.id}_${i}_workTitles`,'Title 1, Title 2, Title 3')}
    </div>`).join('');
  return `<div class="editor-section-title">${esc(sec.title)}</div>${items}<button class="btn-add-item" onclick="addItem('${sec.id}')">+ Add Exhibition</button>`;
}

function skillsEd(sec){
  const cats=(sec.categories||[]).map((cat,i)=>`
    <div class="icard">
      <div class="icard-hdr"><span class="icard-title">Category ${i+1}</span><button class="btn-del" onclick="delCat('${sec.id}',${i})">✕</button></div>
      ${fld('Label','text',cat.category,`${sec.id}_${i}_category`,'Technical, Language… (optional)')}
      ${fld('Skills','textarea',cat.skillsText,`${sec.id}_${i}_skillsText`,'Skill 1, Skill 2, Skill 3…','Separate with commas')}
    </div>`).join('');
  return `<div class="editor-section-title">${esc(sec.title)}</div>${cats}<button class="btn-add-item" onclick="addCat('${sec.id}')">+ Add Category</button>`;
}

function customEd(sec){
  const titleFld=`<div class="fgroup"><label>Section Title</label><input type="text" id="${sec.id}_sectitle" value="${(sec.title||'').replace(/"/g,'&quot;')}" oninput="onInput()"></div>`;
  const items=(sec.items||[]).map((item,i)=>`
    <div class="icard">
      <div class="icard-hdr"><span class="icard-title">Entry ${i+1}</span><button class="btn-del" onclick="delItem('${sec.id}',${i})">✕</button></div>
      ${fld('Title (bold)','text',item.subtitle,`${sec.id}_${i}_subtitle`,'Organization or project')}
      <div class="row2">${fld('Subtitle (italic)','text',item.title,`${sec.id}_${i}_title`,'Role')}${fld('Location','text',item.location,`${sec.id}_${i}_location`,'City')}</div>
      ${mypField('Start Date',item.startDate,`${sec.id}_${i}_startDate`)}
      ${mypField('End Date',item.endDate,`${sec.id}_${i}_endDate`)}
      ${fld('Details','textarea',item.description,`${sec.id}_${i}_description`,'One bullet per line (optional)')}
    </div>`).join('');
  return `<div class="editor-section-title">Custom Section</div>${titleFld}${items}<button class="btn-add-item" onclick="addItem('${sec.id}')">+ Add Entry</button>`;
}

function setExpCurrent(secId, idx, isCurrent){
  const sec = getSectionById(secId);
  if(!sec || !sec.items?.[idx]) return;
  readInputs();
  sec.items[idx].current = isCurrent;
  if(isCurrent) sec.items[idx].endDate = '';
  refreshEditorAndPreview();
}
function setEduDateMode(secId, idx, mode){
  const sec = getSectionById(secId);
  if(!sec || !sec.items?.[idx]) return;
  readInputs();
  sec.items[idx].dateMode = mode;
  if(mode === 'expected') sec.items[idx].startDate = '';
  refreshEditorAndPreview();
}
function setEduExpected(secId, idx, isExpected){
  const sec = getSectionById(secId);
  if(!sec || !sec.items?.[idx]) return;
  readInputs();
  sec.items[idx].expected = isExpected;
  save();
  renderPreview();
}
function onInput(){
  readInputs();
  save();
  renderPreview();
}
function readInputs(){
  PERSONAL_FIELDS.forEach((field) => {
    const el = document.getElementById(`pi_${field}`);
    if(el) personalInfo[field] = el.value;
  });
  sections.forEach((sec) => {
    if(sec.type === 'personal') return;
    if(sec.type === 'skills'){
      (sec.categories || []).forEach((cat, i) => {
        const categoryInput = document.getElementById(`${sec.id}_${i}_category`);
        if(categoryInput) cat.category = categoryInput.value;
        const skillsInput = document.getElementById(`${sec.id}_${i}_skillsText`);
        if(skillsInput) cat.skillsText = skillsInput.value;
      });
      return;
    }
    const sectionTitle = document.getElementById(`${sec.id}_sectitle`);
    if(sectionTitle) sec.title = sectionTitle.value;
    (sec.items || []).forEach((item, i) => {
      ITEM_FIELDS.forEach((field) => {
        const input = document.getElementById(`${sec.id}_${i}_${field}`);
        if(input) item[field] = input.value;
      });
    });
  });
}
function addItem(secId){
  const sec = getSectionById(secId);
  if(!sec) return;
  if(!sec.items) sec.items = [];
  sec.items.push({});
  refreshEditorAndPreview();
}
function addCat(secId){
  const sec = getSectionById(secId);
  if(!sec) return;
  if(!sec.categories) sec.categories = [];
  sec.categories.push({ category: '', skillsText: '' });
  refreshEditorAndPreview();
}
function delItem(secId, idx){
  const sec = getSectionById(secId);
  if(!sec) return;
  if(!confirm('Remove this entry?')) return;
  sec.items.splice(idx, 1);
  refreshEditorAndPreview();
}
function delCat(secId, idx){
  const sec = getSectionById(secId);
  if(!sec) return;
  sec.categories.splice(idx, 1);
  refreshEditorAndPreview();
}

