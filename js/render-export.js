// render-export.js
// Preview rendering and export functions (PDF + DOCX).
// Depends on app state and utilities from app-core.js.

function formatDate(val) {
  if(!val) return '';
  const parts = val.split('-');
  if(
    parts.length === 2 &&
    parts[0].length === 4 &&
    parseInt(parts[1], 10) >= 1 &&
    parseInt(parts[1], 10) <= 12
  ) {
    return `${MONTHS[parseInt(parts[1], 10)]} ${parts[0]}`;
  }
  return val;
}

function renderPreview() {
  const lineSpacing = window.lineSpacing || 1.5;
  const p = personalInfo;
  let html = '';

  const makeDateRange = (start, end) => [start, end].filter(Boolean).join(' \u2013 ');
  const makeBullets = (description) => {
    if(!description) return '';
    const lines = description.split('\n').filter((line) => line.trim());
    if(!lines.length) return '';
    return `<div class="r-bullets">${lines
      .map(
        (line) =>
          `<div class="r-bullet"><span style="flex-shrink:0;margin-top:.15em">&bull;</span><span>${esc(line.trim())}</span></div>`,
      )
      .join('')}</div>`;
  };

  if(p.fullName) {
    html += `<div class="r-name" style="font-size:${nameFontSize}pt">${esc(p.fullName)}</div>`;
  }
  html += `<hr class="r-rule">`;

  const contact = [p.location, p.email, p.phone].filter(Boolean);
  const links = [p.linkedin, p.website]
    .filter(Boolean)
    .map((link) => link.replace(/^https?:\/\/(www\.)?/, ''));

  if(contact.length) {
    html += `<div class="r-contact" style="margin-bottom:${links.length ? 2 : 14}px">${contact.map(esc).join(' &bull; ')}</div>`;
  }
  if(links.length) {
    html += `<div class="r-contact" style="margin-bottom:14px">${links.map(esc).join(' &bull; ')}</div>`;
  }

  sections.forEach((sec) => {
    if(sec.type === 'personal') return;

    if(sec.type === 'education' && sec.items?.length) {
      html += `<div class="r-section"><div class="r-sec-title">${esc(sec.title)}</div>`;
      sec.items.forEach((item) => {
        if(!item.institution && !item.degree) return;

        const mode = item.dateMode || 'expected';
        let dateText = '';
        if(mode === 'range') {
          const start = item.startDate ? formatDate(item.startDate) : '';
          const end = item.endDate ? formatDate(item.endDate) : '';
          const range = makeDateRange(start, end);
          dateText = item.expected && end ? range.replace(end, `expected ${end}`) : range;
        } else {
          const end = item.endDate ? formatDate(item.endDate) : '';
          dateText = end ? (item.expected ? `expected ${end}` : end) : '';
        }

        const degree = [item.degree, item.field].filter(Boolean).join(', ');
        const degreeWithGpa = `${degree}${item.gpa ? ` (GPA: ${item.gpa})` : ''}`;

        html += `<div class="r-entry"><div class="r-row"><span class="r-left">${esc(item.institution || '')}</span><span class="r-right">${esc(item.location || '')}</span></div><div class="r-row"><span class="r-sub-left">${esc(degreeWithGpa)}</span><span class="r-sub-right">${esc(dateText)}</span></div></div>`;
      });
      html += `</div>`;
    }

    if(sec.type === 'experience' && sec.items?.length) {
      html += `<div class="r-section"><div class="r-sec-title">${esc(sec.title)}</div>`;
      sec.items.forEach((item) => {
        if(!item.company && !item.position) return;

        const end = item.current ? 'Present' : item.endDate ? formatDate(item.endDate) : '';
        const dateText = makeDateRange(item.startDate ? formatDate(item.startDate) : '', end);

        html += `<div class="r-entry"><div class="r-row"><span class="r-left">${esc(item.company || '')}</span><span class="r-right">${esc(item.location || '')}</span></div><div class="r-row"><span class="r-sub-left">${esc(item.position || '')}</span><span class="r-sub-right">${esc(dateText)}</span></div>`;
        html += makeBullets(item.description);
        html += `</div>`;
      });
      html += `</div>`;
    }

    if(sec.type === 'exhibitions' && sec.items?.length) {
      html += `<div class="r-section"><div class="r-sec-title">${esc(sec.title)}</div>`;
      sec.items.forEach((item) => {
        if(!item.exhibitionTitle) return;
        const dateText = makeDateRange(
          item.startDate ? formatDate(item.startDate) : '',
          item.endDate ? formatDate(item.endDate) : '',
        );
        const works = item.workTitles ? `<div class="r-plain">Works: ${esc(item.workTitles)}</div>` : '';
        html += `<div class="r-entry"><div class="r-row"><span class="r-left">${esc(item.exhibitionTitle || '')}</span><span class="r-right">${esc(item.location || '')}</span></div><div class="r-row"><span class="r-sub-left">${esc(item.venue || '')}</span><span class="r-sub-right">${esc(dateText)}</span></div>${works}</div>`;
      });
      html += `</div>`;
    }

    if(sec.type === 'skills' && sec.categories?.length) {
      html += `<div class="r-section"><div class="r-sec-title">${esc(sec.title)}</div>`;
      sec.categories.forEach((cat) => {
        const skills = (cat.skillsText || '')
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean);
        if(!skills.length) return;
        const label = cat.category ? `<span class="r-skill-cat">${esc(cat.category)}: </span>` : '';
        html += `<div class="r-skill-line">${label}${esc(skills.join(', '))}</div>`;
      });
      html += `</div>`;
    }

    if(sec.type === 'custom' && sec.items?.length) {
      html += `<div class="r-section"><div class="r-sec-title">${esc(sec.title)}</div>`;
      sec.items.forEach((item) => {
        if(!item.title && !item.subtitle) return;
        const dateText = makeDateRange(
          item.startDate ? formatDate(item.startDate) : '',
          item.endDate ? formatDate(item.endDate) : '',
        );
        html += `<div class="r-entry"><div class="r-row"><span class="r-left">${esc(item.subtitle || item.title || '')}</span><span class="r-right">${esc(item.location || '')}</span></div>`;
        if(item.subtitle && item.title) {
          html += `<div class="r-row"><span class="r-sub-left">${esc(item.title)}</span><span class="r-sub-right">${esc(dateText)}</span></div>`;
        }
        html += makeBullets(item.description);
        html += `</div>`;
      });
      html += `</div>`;
    }
  });

  const sheetW = paperSize === 'a4' ? 794 : 816;
  const sheetH = paperSize === 'a4' ? 1123 : 1056;
  const padX = 72;
  const padTop = 54;
  const padBot = 54;
  const innerH = sheetH - padTop - padBot;

  const sheet = document.getElementById('resumeSheet');
  const msr = document.createElement('div');
  msr.style.cssText = `position:fixed;left:-9999px;top:0;width:${sheetW}px;font-family:'Times New Roman',Times,serif;font-size:${bodyFontSize}pt;line-height:${lineSpacing};padding:${padTop}px ${padX}px ${padBot}px;box-sizing:border-box;color:#111;visibility:hidden;pointer-events:none`;
  msr.innerHTML = html || '<div class="r-empty">Fill in your information on the left.</div>';
  document.body.appendChild(msr);

  const pages = [[]];
  let usedH = 0;
  Array.from(msr.children).forEach((child) => {
    const h = child.getBoundingClientRect().height || child.offsetHeight;
    if(usedH + h > innerH && usedH > 0) {
      pages.push([]);
      usedH = 0;
    }
    pages[pages.length - 1].push(child.outerHTML);
    usedH += h;
  });
  document.body.removeChild(msr);

  sheet.innerHTML = '';
  pages.forEach((group) => {
    const page = document.createElement('div');
    page.className = `rpage ${paperSize}`;
    const inner = document.createElement('div');
    inner.className = 'rpage-inner';
    inner.style.cssText = `font-size:${bodyFontSize}pt;line-height:${lineSpacing};padding:${padTop}px ${padX}px ${padBot}px;box-sizing:border-box;`;
    inner.innerHTML = group.join('') || '<div class="r-empty">Fill in your information on the left.</div>';
    const styleTag = document.createElement('style');
    styleTag.textContent = `
      .rpage-inner *{line-height:${lineSpacing}!important}
      .rpage-inner .r-entry{margin-bottom:${Math.round(bodyFontSize * lineSpacing * 0.6)}px}
      .rpage-inner .r-section{margin-bottom:${Math.round(bodyFontSize * lineSpacing * 0.8)}px}
    `;
    inner.prepend(styleTag);
    page.appendChild(inner);
    sheet.appendChild(page);
  });

  const ind = document.getElementById('pageIndicator');
  if(pages.length === 1) {
    ind.innerHTML = `<div class="page-badge ok">✓ &nbsp;1 page</div>`;
  } else {
    ind.innerHTML = `<div class="page-count">${pages.length} pages</div><div class="page-warn">💡 Resumes are typically 1 page.<br>Try reducing font size or shortening your content.</div>`;
  }

  setTimeout(fitPreview, 0);
}

function fitPreview() {
  const area = document.getElementById('previewArea');
  if(!area) return;
  const sheetW = paperSize === 'a4' ? 794 : 816;
  const sheetH = paperSize === 'a4' ? 1123 : 1056;
  const isMobile = window.innerWidth <= 768;

  // on mobile use the full viewport width minus minimal padding
  const padding = isMobile ? 8 : 40;
  const availW = isMobile ? window.innerWidth - padding : area.clientWidth - padding;
  const scale = Math.min(1, availW / sheetW);

  document.querySelectorAll('.rpage').forEach((page) => {
    page.style.transform = `scale(${scale})`;
    page.style.transformOrigin = 'top center';
    page.style.marginBottom = `${sheetH * scale - sheetH + 20}px`;
  });

  const sheet = document.getElementById('resumeSheet');
  if(sheet) sheet.style.width = `${sheetW * scale}px`;
}
window.addEventListener('resize', fitPreview);

function exportPDF(){
  const lineSpacing = window.lineSpacing || 1.5;
  const pages=document.querySelectorAll('.rpage');
  if(!pages.length){alert('Nothing to export yet.');return;}
  const sheetW=paperSize==='a4'?'210mm':'215.9mm',sheetH=paperSize==='a4'?'297mm':'279.4mm';
  let pagesHtml='';
  pages.forEach((page,i)=>{const inner=page.querySelector('.rpage-inner');pagesHtml+=`<div class="print-page">${inner?inner.innerHTML:''}</div>${i<pages.length-1?'<div class="pb"></div>':''}`;});
  const win=window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${personalInfo.fullName||'Resume'}</title><style>
    *{box-sizing:border-box;margin:0;padding:0}body{font-family:'Times New Roman',Times,serif;color:#111;background:#fff}
    .rpage,.rpage-inner,.print-page{background:#fff!important;color:#111!important}
    .r-rule{border-top-color:#111!important}
    .r-contact{color:#222!important}
    .r-sec-title{border-bottom-color:#111!important}
    .r-right{color:#111!important}
    .r-sub-right{color:#333!important}
    .print-page{width:${sheetW};min-height:${sheetH};padding:54px 72px;font-size:${bodyFontSize}pt;line-height:${lineSpacing}}.pb{page-break-after:always}
    .r-name{text-align:center;font-weight:700;letter-spacing:.01em;margin-bottom:4px;line-height:1.1;font-size:${nameFontSize}pt}
    .r-rule{border:none;border-top:3px solid #111;margin:5px 0 4px}.r-contact{text-align:center;color:#222;line-height:1.7}
    .r-section{margin-bottom:14px}.r-sec-title{text-align:center;font-weight:700;letter-spacing:.05em;border-bottom:1px solid #111;padding-bottom:3px;margin-bottom:8px}
    .r-entry{margin-bottom:${Math.round(bodyFontSize * lineSpacing * 0.6)}px}.r-row{display:flex;justify-content:space-between;align-items:baseline}
    *{line-height:${lineSpacing}!important}
    .r-left{font-weight:700;flex:1;padding-right:8px}.r-right{text-align:right;flex-shrink:0;color:#111}
    .r-sub-left{font-style:italic;flex:1;padding-right:8px}.r-sub-right{color:#333;flex-shrink:0}
    .r-bullets{margin:3px 0 0}.r-bullet{display:flex;gap:6px;line-height:1.5;margin-bottom:1px}
    .r-plain{line-height:1.6;margin-top:2px}.r-skill-line{margin-bottom:3px;line-height:1.5}.r-skill-cat{font-weight:700}
    @media print{body{margin:0}.print-page{page-break-after:always}.pb{display:none}}
    @page{size:${sheetW} ${sheetH};margin:0}
  </style></head><body>${pagesHtml}<script>window.onload=function(){window.print();setTimeout(()=>window.close(),1000)};<\/script></body></html>`);
  win.document.close();
}

async function exportDOCX(){
  const lineSpacing = window.lineSpacing || 1.5;
  const btn=document.getElementById('btnDOCX');
  btn.textContent='↓ Generating…';btn.disabled=true;
  try{
    const isA4=paperSize==='a4';
    const pageW=isA4?11906:12240,pageH=isA4?16838:15840;
    const mSide=72*15,mTB=54*15,TAB=pageW-mSide*2;
    const fs=Math.round(bodyFontSize*2),nameFs=Math.round(nameFontSize*2),secFs=Math.round((bodyFontSize+1)*2);
    const lineVal=Math.round(bodyFontSize*lineSpacing*20),LS={line:lineVal,lineRule:'exact'};
    const p=personalInfo,children=[];
    const run=(text,opts={})=>new TextRun({text,font:'Times New Roman',size:fs,...opts});
    const bold=(text,opts={})=>run(text,{bold:true,...opts});
    const ital=(text,opts={})=>run(text,{italics:true,...opts});
    const tab=()=>run('\t');
    const TS=[{type:'right',position:TAB}];
    const secHdr=title=>new Paragraph({alignment:'center',spacing:{before:Math.round(bodyFontSize*15),after:Math.round(bodyFontSize*8),...LS},border:{bottom:{color:'000000',style:'single',size:6,space:1}},children:[bold(title,{size:secFs})]});
    const twoCol=(lr,right,before=0)=>new Paragraph({tabStops:TS,spacing:{before,after:0,...LS},children:[...lr,tab(),run(right||'')]});
    const bulletRow=text=>new Paragraph({numbering:{reference:'bullets',level:0},spacing:{before:0,after:0,...LS},children:[run(text)]});
    const plainRow=text=>new Paragraph({spacing:{before:0,after:0,...LS},children:[run(text)]});
    const gap=()=>new Paragraph({spacing:{before:0,after:135,line:120,lineRule:'exact'},children:[run('')]});
    const nameLineVal=Math.round(nameFontSize*1.5*20);
    children.push(new Paragraph({alignment:'center',spacing:{before:0,after:Math.round(bodyFontSize*10),line:nameLineVal,lineRule:'exact'},border:{bottom:{color:'000000',style:'single',size:18,space:1}},children:[bold(p.fullName||'',{size:nameFs})]}));
    const cp=[p.location,p.email,p.phone].filter(Boolean);
    const lp=[p.linkedin,p.website].filter(Boolean).map(l=>l.replace(/^https?:\/\/(www\.)?/,''));
    if(cp.length)children.push(new Paragraph({alignment:'center',spacing:{before:0,after:lp.length?60:Math.round(bodyFontSize*15),...LS},children:[run(cp.join('  \u2022  '))]}));
    if(lp.length)children.push(new Paragraph({alignment:'center',spacing:{before:0,after:Math.round(bodyFontSize*15),...LS},children:[run(lp.join('  \u2022  '))]}));
    sections.forEach(sec=>{
      if(sec.type==='personal')return;
      if(sec.type==='education'&&sec.items?.length){
        const v=sec.items.filter(i=>i.institution||i.degree);if(!v.length)return;
        children.push(secHdr(sec.title));
        v.forEach((item,idx)=>{
          const mode=item.dateMode||'expected';let d='';
          if(mode==='range'){
            const start=item.startDate?formatDate(item.startDate):'';
            const end=item.endDate?formatDate(item.endDate):'';
            const dateStr=[start,end].filter(Boolean).join(' \u2013 ');
            d=item.expected&&end?dateStr.replace(end,'expected '+end):dateStr;
          } else {
            const ds=item.endDate?formatDate(item.endDate):'';
            d=ds?(item.expected?'expected '+ds:ds):'';
          }
          const deg=[item.degree,item.field].filter(Boolean).join(', ')+(item.gpa?` (GPA: ${item.gpa})`:'');
          children.push(twoCol([bold(item.institution||'')],item.location||'',80));
          children.push(twoCol([run(deg)],d));
          if(idx<v.length-1)children.push(gap());
        });
      }
      if(sec.type==='experience'&&sec.items?.length){
        const v=sec.items.filter(i=>i.company||i.position);if(!v.length)return;
        children.push(secHdr(sec.title));
        v.forEach((item,idx)=>{
          const endStr=item.current?'Present':(item.endDate?formatDate(item.endDate):'');
          const d=[item.startDate?formatDate(item.startDate):'',endStr].filter(Boolean).join(' \u2013 ');
          children.push(twoCol([bold(item.company||'')],item.location||'',80));
          children.push(twoCol([ital(item.position||'')],d));
          if(item.description)item.description.split('\n').filter(l=>l.trim()).forEach(line=>children.push(bulletRow(line.trim())));
          if(idx<v.length-1)children.push(gap());
        });
      }
      if(sec.type==='exhibitions'&&sec.items?.length){
        const v=sec.items.filter(i=>i.exhibitionTitle);if(!v.length)return;
        children.push(secHdr(sec.title));
        v.forEach((item,idx)=>{
          const d=[item.startDate,item.endDate].filter(Boolean).map(formatDate).join(' \u2013 ');
          children.push(twoCol([bold(item.exhibitionTitle||'')],item.location||'',80));
          children.push(twoCol([run(item.venue||'')],d));
          if(item.workTitles)children.push(plainRow('Works: '+item.workTitles));
          if(idx<v.length-1)children.push(gap());
        });
      }
      if(sec.type==='skills'&&sec.categories?.length){
        const v=sec.categories.filter(c=>(c.skillsText||'').split(',').map(s=>s.trim()).filter(Boolean).length);if(!v.length)return;
        children.push(secHdr(sec.title));
        v.forEach(cat=>{
          const skills=(cat.skillsText||'').split(',').map(s=>s.trim()).filter(Boolean).join(', ');if(!skills)return;
          children.push(new Paragraph({spacing:{before:40,after:0,...LS},children:cat.category?[bold(`${cat.category}: `),run(skills)]:[run(skills)]}));
        });
      }
      if(sec.type==='custom'&&sec.items?.length){
        const v=sec.items.filter(i=>i.title||i.subtitle);if(!v.length)return;
        children.push(secHdr(sec.title));
        v.forEach((item,idx)=>{
          const d=[item.startDate,item.endDate].filter(Boolean).map(formatDate).join(' \u2013 ');
          children.push(twoCol([bold(item.subtitle||item.title||'')],item.location||'',80));
          if(item.subtitle&&item.title)children.push(twoCol([ital(item.title)],d));
          if(item.description)item.description.split('\n').filter(l=>l.trim()).forEach(line=>children.push(bulletRow(line.trim())));
          if(idx<v.length-1)children.push(gap());
        });
      }
    });
    const doc=new Document({
      numbering:{config:[{reference:'bullets',levels:[{level:0,format:'bullet',text:'\u2022',alignment:'left',style:{paragraph:{indent:{left:360,hanging:360},spacing:{...LS}}}}]}]},
      sections:[{properties:{page:{size:{width:pageW,height:pageH},margin:{top:mTB,right:mSide,bottom:mTB,left:mSide}}},children}]
    });
    const blob=await Packer.toBlob(doc);
    saveAs(blob,`${p.fullName||'resume'}.docx`);
  }catch(e){alert('Word export failed: '+e.message);}
  finally{btn.textContent='↓ Word';btn.disabled=false;}
}

window.exportPDF = exportPDF;
window.exportDOCX = exportDOCX;
