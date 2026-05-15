// import-parser.js
// Resume import parsing heuristics (text/docx -> app state).
// Depends on globals from app-core.js.

function runImport(text) {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const fullText = text;
  const normalizedLine = (line) => line.toLowerCase().replace(/[^a-z\s]/g, '').trim();

  const sectionKeywords = [
    ['education'],
    ['experience', 'work experience', 'professional experience', 'employment', 'work history'],
    ['skill', 'skills', 'technical skills', 'core competencies', 'competencies'],
    ['exhibition', 'exhibitions', 'shows', 'group shows', 'solo shows'],
    ['certification', 'certifications', 'awards', 'honors', 'achievements'],
    ['project', 'projects'],
    ['publication', 'publications'],
    ['summary', 'objective', 'profile', 'about', 'professional summary'],
  ];

  function findSectionIdx(keywords) {
    for(let i = 0; i < lines.length; i += 1) {
      const line = normalizedLine(lines[i]);
      if(line.length < 40 && keywords.some((keyword) => line === keyword || line.startsWith(keyword))) {
        return i;
      }
    }
    return -1;
  }

  function getBlock(startIdx, endIdx) {
    if(startIdx < 0) return [];
    const end = endIdx > 0 ? endIdx : lines.length;
    return lines.slice(startIdx + 1, end).filter((line) => line.trim());
  }

  const sectionBounds = [];
  lines.forEach((line, idx) => {
    const normalized = normalizedLine(line);
    if(normalized.length >= 45) return;
    for(const keywords of sectionKeywords){
      if(keywords.some((keyword) => normalized === keyword || normalized.startsWith(`${keyword} `))){
        sectionBounds.push({ idx });
        break;
      }
    }
  });

  function getBlockBetween(startIdx) {
    const nextBound = sectionBounds.find((bound) => bound.idx > startIdx);
    return getBlock(startIdx, nextBound ? nextBound.idx : -1);
  }

  const emailMatch = fullText.match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
  if(emailMatch) personalInfo.email = emailMatch[0];

  const phoneMatch = fullText.match(/(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/);
  if(phoneMatch) personalInfo.phone = phoneMatch[0].trim();

  const linkedinMatch = fullText.match(/(?:linkedin\.com\/in\/)([\w\-]+)/i);
  if(linkedinMatch) personalInfo.linkedin = `https://linkedin.com/in/${linkedinMatch[1]}`;

  const websiteMatches = fullText.match(/(?:https?:\/\/)?(?:www\.)?([\w\-]+\.(?:com|org|net|io|co|art|design|me|edu)(?:\/[\w\-]*)?)/gi);
  if(websiteMatches){
    const site = websiteMatches.find((website) => {
      const lower = website.toLowerCase();
      const emailDomain = personalInfo.email?.split('@')[1] || '~~~';
      return !lower.includes('linkedin') && !lower.includes(emailDomain);
    });
    if(site) personalInfo.website = site.startsWith('http') ? site : `https://${site}`;
  }

  const locationMatch = fullText.match(/([A-Z][a-zA-Z\s]+,\s*(?:[A-Z]{2}|[A-Z][a-z]{2,})(?:\s+\d{5})?)/);
  if(locationMatch) personalInfo.location = locationMatch[0].trim();

  const skipNameLine = /^(education|experience|skill|work|profile|summary|objective|contact|phone|email|linkedin|http|www)/i;
  for(const line of lines.slice(0, 8)){
    const likelyName =
      line.length > 2 &&
      line.length < 60 &&
      !skipNameLine.test(line) &&
      !line.includes('@') &&
      !/^\+?[\d\s\-().]{7,}$/.test(line) &&
      !/linkedin|http|www/i.test(line) &&
      !/^\d/.test(line);
    if(likelyName){
      personalInfo.fullName = line;
      break;
    }
  }

  function ensureSection(type, title, key) {
    let section = sections.find((entry) => entry.type === type);
    if(!section){
      section = { id: uid(), type, title, [key]: [] };
      sections.push(section);
    }
    if(!section[key]) section[key] = [];
    section[key] = [];
    return section;
  }

  function parseDate(str) {
    if(!str) return '';
    str = str.trim();
    if(/^present$/i.test(str)) return 'Present';
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const mY = str.match(
      /^(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\.?\s+(\d{4})$/i,
    );
    if(mY) {
      const mon = mY[1].toLowerCase().replace(/\.$/, '');
      const mi = monthNames.findIndex((m) => mon === m || mon.startsWith(m));
      if(mi >= 0) return `${mY[2]}-${String(mi + 1).padStart(2, '0')}`;
    }
    if(/^\d{4}$/.test(str)) return str;
    const mmYY = str.match(/^(\d{1,2})[\/\-](\d{4})$/);
    if(mmYY) return `${mmYY[2]}-${mmYY[1].padStart(2, '0')}`;
    return str;
  }

  function extractDateRange(line) {
    const mYmY = line.match(/([A-Za-z]+\.?\s+\d{4})\s*[-–—]\s*([A-Za-z]+\.?\s+\d{4}|present)/i);
    if(mYmY) return { start: parseDate(mYmY[1]), end: parseDate(mYmY[2]) };
    const yY = line.match(/(\d{4})\s*[-–—]\s*(\d{4}|present)/i);
    if(yY) return { start: parseDate(yY[1]), end: parseDate(yY[2]) };
    const sy = line.match(/\b(\d{4})\b/);
    if(sy) return { start: '', end: parseDate(sy[1]) };
    return null;
  }
  const eduIdx = findSectionIdx(['education']);
  if(eduIdx >= 0) {
    const eduSec = ensureSection('education', 'Education', 'items');
    let cur = null;

    getBlockBetween(eduIdx).forEach((line) => {
      const dr = extractDateRange(line);
      const isBullet = /^[•\-–*▪]\s/.test(line);
      const isCity = /^[A-Z][a-zA-Z\s]+,\s*(?:[A-Z]{2}|[A-Z][a-z]{2,})$/.test(line);
      const isDeg = /(B\.?A|B\.?S|B\.?F\.?A|M\.?A|M\.?S|M\.?F\.?A|Ph\.?D|Bachelor|Master|Associate|Diploma|Certificate)/i.test(line);
      const isGPA = /gpa|grade/i.test(line);

      if(dr && (line.includes('–') || line.includes('-') || line.includes('—') || /\d{4}/.test(line)) && cur) {
        if(dr.start) cur.startDate = dr.start;
        if(dr.end) {
          if(/present/i.test(String(dr.end))) {
            cur.endDate = 'Present';
            cur.expected = true;
          } else {
            cur.endDate = dr.end;
          }
          if(/expected/i.test(line)) cur.expected = true;
        }
        if(dr.start) cur.dateMode = 'range';
      } else if(isGPA && cur) {
        const g = line.match(/[\d.]+/);
        if(g) cur.gpa = g[0];
      } else if(isBullet && cur) {
        // Keep bullet lines ignored for education parser.
      } else if(isCity && cur) {
        cur.location = line;
      } else if(isDeg && cur) {
        const dm = line.match(
          /(B\.?A\.?|B\.?S\.?|B\.?F\.?A\.?|M\.?A\.?|M\.?S\.?|M\.?F\.?A\.?|Ph\.?D\.?|Bachelor of [A-Za-z\s]+|Master of [A-Za-z\s]+|Associate[A-Za-z\s]*|Diploma[A-Za-z\s]*|Certificate[A-Za-z\s]*)/i,
        );
        if(dm) {
          cur.degree = dm[0].trim();
          const rest = line
            .slice(line.indexOf(dm[0]) + dm[0].length)
            .replace(/^[\s,in]+/i, '')
            .trim();
          if(rest) cur.field = rest;
        } else {
          cur.degree = line;
        }
      } else if(line.length > 3) {
        if(cur && cur.institution) eduSec.items.push(cur);
        cur = {
          institution: line,
          degree: '',
          field: '',
          location: '',
          startDate: '',
          endDate: '',
          gpa: '',
          dateMode: 'expected',
          expected: false,
        };
      }
    });
    if(cur && cur.institution) eduSec.items.push(cur);
  }

  const expIdx = findSectionIdx(['experience', 'work experience', 'professional experience', 'employment', 'work history']);
  if(expIdx >= 0) {
    const expSec = ensureSection('experience', 'Experience', 'items');
    let cur = null;
    let dateAssigned = false;

    getBlockBetween(expIdx).forEach((line) => {
      const isBullet = /^[•\-–*▪]\s/.test(line);
      const isCity = /^[A-Z][a-zA-Z\s]+,\s*(?:[A-Z]{2}|[A-Z][a-z]{2,})$/.test(line);
      const dr = extractDateRange(line);
      const looksDate = dr && (/[-–—]/.test(line) || /\d{4}/.test(line)) && line.length < 40;

      if(isBullet && cur) {
        cur.description = `${cur.description ? `${cur.description}\n` : ''}${line.replace(/^[•\-–*▪]\s*/, '').trim()}`;
      } else if(looksDate && cur) {
        if(dr.start) cur.startDate = dr.start;
        if(dr.end) {
          if(/present/i.test(String(dr.end))) {
            cur.endDate = '';
            cur.current = true;
          } else {
            cur.endDate = dr.end;
          }
        }
        dateAssigned = true;
      } else if(isCity && cur && !cur.location) {
        cur.location = line;
      } else {
        const pipe = line.match(/^(.+?)\s*[|/]\s*(.+)$/);
        const at = line.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);

        if(pipe) {
          if(cur && cur.company) expSec.items.push(cur);
          cur = { company: pipe[1].trim(), position: pipe[2].trim(), location: '', startDate: '', endDate: '', description: '', current: false };
          dateAssigned = false;
        } else if(at) {
          if(cur && cur.company) expSec.items.push(cur);
          cur = { company: at[2].trim(), position: at[1].trim(), location: '', startDate: '', endDate: '', description: '', current: false };
          dateAssigned = false;
        } else if(!cur || (cur.company && cur.position && dateAssigned)) {
          if(cur && cur.company) expSec.items.push(cur);
          cur = { company: line, position: '', location: '', startDate: '', endDate: '', description: '', current: false };
          dateAssigned = false;
        } else if(cur.company && !cur.position) {
          cur.position = line;
        }
      }
    });
    if(cur && cur.company) expSec.items.push(cur);
  }

  const exhibIdx = findSectionIdx(['exhibition', 'exhibitions', 'shows', 'group shows', 'solo shows']);
  if(exhibIdx >= 0) {
    const exhibSec = ensureSection('exhibitions', 'Exhibitions', 'items');
    let cur = null;

    getBlockBetween(exhibIdx).forEach((line) => {
      const dr = extractDateRange(line);
      const isCity = /^[A-Z][a-zA-Z\s]+,\s*(?:[A-Z]{2}|[A-Z][a-z]{2,})$/.test(line);
      const isWorks = /^works?:/i.test(line);
      const looksDate = dr && line.length < 40;

      if(isWorks && cur) {
        cur.workTitles = line.replace(/^works?:\s*/i, '');
      } else if(looksDate && cur) {
        if(dr.start) cur.startDate = dr.start;
        if(dr.end) cur.endDate = dr.end;
      } else if(isCity && cur && !cur.location) {
        cur.location = line;
      } else if(line.length > 2) {
        if(!cur) {
          cur = { exhibitionTitle: line, venue: '', location: '', startDate: '', endDate: '', workTitles: '' };
        } else if(!cur.venue && cur.exhibitionTitle) {
          cur.venue = line;
        } else {
          if(cur.exhibitionTitle) exhibSec.items.push(cur);
          cur = { exhibitionTitle: line, venue: '', location: '', startDate: '', endDate: '', workTitles: '' };
        }
      }
    });
    if(cur && cur.exhibitionTitle) exhibSec.items.push(cur);
  }

  const skillIdx = findSectionIdx(['skill', 'skills', 'technical skills', 'core competencies', 'competencies']);
  if(skillIdx >= 0) {
    const skillSec = ensureSection('skills', 'Skills', 'categories');
    getBlockBetween(skillIdx).forEach((line) => {
      const ci = line.indexOf(':');
      if(ci > 0 && ci < 35) {
        skillSec.categories.push({ category: line.slice(0, ci).trim(), skillsText: line.slice(ci + 1).trim() });
      } else if(/^[•\-–*▪]\s/.test(line)) {
        const skill = line.replace(/^[•\-–*▪]\s*/, '').trim();
        const last = skillSec.categories[skillSec.categories.length - 1];
        if(skillSec.categories.length && !last.category) {
          last.skillsText += `, ${skill}`;
        } else {
          skillSec.categories.push({ category: '', skillsText: skill });
        }
      } else if(line.includes(',')) {
        skillSec.categories.push({ category: '', skillsText: line });
      } else if(line.length > 1) {
        const last = skillSec.categories[skillSec.categories.length - 1];
        if(skillSec.categories.length && !last.category) {
          last.skillsText += `, ${line}`;
        } else {
          skillSec.categories.push({ category: '', skillsText: line });
        }
      }
    });
  }
  function normalizeDate(val) {
    if(!val) return '';
    val = val.trim();
    if(/^\d{4}-\d{2}$/.test(val)) return val;
    if(/^\d{4}$/.test(val)) return val;
    const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const monthShort = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const parts = val.toLowerCase().replace(/,/g,' ').split(/\s+/);
    let foundMonth = '', foundYear = '';
    parts.forEach(p => {
      if(/^\d{4}$/.test(p)) foundYear = p;
      const mi = monthNames.indexOf(p);
      if(mi >= 0) foundMonth = String(mi+1).padStart(2,'0');
      const si = monthShort.indexOf(p.slice(0,3));
      if(si >= 0 && !foundMonth) foundMonth = String(si+1).padStart(2,'0');
    });
    if(foundYear && foundMonth) return `${foundYear}-${foundMonth}`;
    if(foundYear) return foundYear;
    return val;
  }

  sections.forEach(sec => {
    if(sec.type === 'personal') return;
    if(sec.items) {
      sec.items.forEach(item => {
        if(item.startDate) item.startDate = normalizeDate(item.startDate);
        if(item.endDate) item.endDate = normalizeDate(item.endDate);

        if(sec.type === 'education') {
          if(item.startDate && item.endDate) {
            item.dateMode = 'range';
            item.expected = false;
          } else if(item.endDate && !item.startDate) {
            item.dateMode = 'expected';
            item.expected = false;
          } else {
            item.dateMode = 'expected';
            item.expected = false;
          }
        }

        if(sec.type === 'experience') {
          const endRaw = (item.endDate || '').toLowerCase().trim();
          if(!item.endDate || endRaw === 'present' || endRaw === 'now' || endRaw === 'current') {
            item.current = true;
            item.endDate = '';
          } else {
            item.current = false;
          }
        }
      });
    }
  });

  save();
  renderSidebar();
  selectSection('personal');
  renderPreview();
}
