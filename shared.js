/* ============================================
   CBMGO 193 — Utilitários Compartilhados
   ============================================ */
(function () {
  const THEME_KEY = 'cbmgo193.theme';

  // ---------- TEMA ----------
  window.applyThemeAc4 = function (mode) {
    const dark = mode === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    const btn = document.getElementById('themeBtn');
    if (btn) {
      const icon = btn.querySelector('[data-icon]') || btn;
      icon.textContent = dark ? '☀️' : '🌙';
      btn.title = dark ? 'Mudar para modo claro' : 'Mudar para modo escuro';
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0a0908' : '#b30000');
  };

  window.toggleThemeAc4 = function () {
    const dark = document.documentElement.classList.contains('dark');
    const next = dark ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
    window.applyThemeAc4(next);
  };

  // Aplica antes do 1º paint
  (function () {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      const dark = saved === 'dark' ||
        (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (dark) document.documentElement.classList.add('dark');
    } catch (_) {}
  })();

  // ---------- ABAS ----------
  const APPS = [
    { id: 'relatorio', label: '📋 Relatório 193', href: './index.html' },
    { id: 'triagem',   label: '🚑 Triagem',       href: './triagem.html' },
    { id: 'ac4',       label: '📝 AC4',           href: './ac4.html' }
  ];

  function currentPage () {
    const p = (location.pathname.split('/').pop() || '').toLowerCase();
    return p === '' ? 'index.html' : p;
  }

  window.renderTabsAc4 = function () {
    const nav = document.getElementById('appTabs');
    if (!nav) return;
    const cur = currentPage();
    nav.innerHTML = APPS.map(a => {
      const file = (a.href.split('/').pop() || 'index.html').toLowerCase();
      const active = (file === cur);
      return `<a class="tab ${active ? 'active' : ''}" href="${a.href}" data-app="${a.id}"${active ? ' aria-current="page"' : ''}>${a.label}</a>`;
    }).join('');
  };

  // ---------- PWA ----------
  let deferredPrompt = null;
  function isStandalone () {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }
  function updateInstallUI () {
    const btn = document.getElementById('installBtn');
    if (!btn) return;
    btn.hidden = isStandalone();
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    updateInstallUI();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    updateInstallUI();
    window.showToastAc4 && window.showToastAc4('Aplicativo instalado! ✅', 'ok');
  });
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('installBtn');
    if (btn) {
      btn.addEventListener('click', async () => {
        if (isStandalone()) return;
        if (deferredPrompt) {
          deferredPrompt.prompt();
          try { await deferredPrompt.userChoice; } catch (_) {}
          deferredPrompt = null;
          updateInstallUI();
          return;
        }
        alert(
          'Como instalar:\n\n' +
          '• iPhone/iPad (Safari): Compartilhar → Adicionar à Tela de Início.\n' +
          '• Android (Chrome): menu ⋮ → Instalar app.\n' +
          '• Desktop (Chrome/Edge): ícone de instalação na barra de endereços.'
        );
      });
    }
    updateInstallUI();
  });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // ---------- TOAST ----------
window.showToastAc4 = function (msg, type = 'info', ms = 3200) {
  let el = document.getElementById('toastAc4');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toastAc4';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = 'toast ' + type + ' show';
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms);
};

  // ---------- INICIALIZAÇÃO ----------
  document.addEventListener('DOMContentLoaded', () => {
    // Botão de tema
    const btn = document.getElementById('themeBtn');
    if (btn) {
      btn.addEventListener('click', window.toggleThemeAc4);
      const dark = document.documentElement.classList.contains('dark');
      const icon = btn.querySelector('[data-icon]') || btn;
      icon.textContent = dark ? '☀️' : '🌙';
    }
    window.renderTabsAc4();
  });
})();

// Aplica já (caso o botão já exista no DOM)
document.addEventListener('DOMContentLoaded', () => {
  window.applyThemeAc4(
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
}, { once: true });
