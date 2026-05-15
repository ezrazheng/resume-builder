// app-init.js
// Theme setup and app bootstrap sequence.
// Loaded last after core/import/render scripts.

const THEMES = ['light', 'dark', 'dark2'];
const THEME_ICONS = { light: '☀︎', dark: '☾', dark2: '☽' };
const THEME_TITLES = {
  light: 'Light mode',
  dark: 'Dark mode',
  dark2: 'Dark mode (dark resume)',
};

function applyTheme(theme) {
  const normalizedTheme = THEMES.includes(theme) ? theme : 'light';
  document.documentElement.classList.remove('dark', 'dark2');
  if(normalizedTheme === 'dark') document.documentElement.classList.add('dark');
  if(normalizedTheme === 'dark2') document.documentElement.classList.add('dark2');
  const btn = document.getElementById('themeToggle');
  if(btn) {
    btn.textContent = THEME_ICONS[normalizedTheme];
    btn.title = THEME_TITLES[normalizedTheme];
  }
  localStorage.setItem('rb3_theme', normalizedTheme);
}

function toggleTheme() {
  const current = localStorage.getItem('rb3_theme') || 'light';
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
  applyTheme(next);
}

function loadTheme() {
  const saved = localStorage.getItem('rb3_theme');
  const theme = saved || 'light';
  applyTheme(theme);
}

function setupMobilePanels() {
  if(window.innerWidth > 768) return;
  const sidebarEl = document.getElementById('mobileSidebar');
  const editorEl = document.getElementById('mobileEditor');
  const previewEl = document.getElementById('previewArea');
  [sidebarEl, editorEl, previewEl].forEach((el) => {
    if(el) el.classList.remove('mobile-active');
  });
  if(sidebarEl) sidebarEl.classList.add('mobile-active');
}

function initApp() {
  loadTheme();
  load();
  applySliders();
  renderSidebar();
  loadSidebarMode();
  setupMobilePanels();

  const initSec = sections.find((s) => s.type === 'personal')?.id || sections[0]?.id || null;
  if(initSec) {
    activeId = initSec;
    renderSidebar();
    renderEditor();
  }

  renderPreview();
  setTimeout(fitPreview, 100);
}

initApp();
