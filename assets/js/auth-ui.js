// assets/js/auth-ui.js
// Navbar dinamis + Logout (admin di /admin/* ATAU di profile.html -> menu ringkas)
document.addEventListener('DOMContentLoaded', () => {
  const isAdminPath = /\/admin(\/|$)/i.test(location.pathname);
  const isProfilePath = /\/profile\.html(\?|$)/i.test(location.pathname);
  const ROOT = isAdminPath ? '../' : '';

  const navUL = document.querySelector('#navmenu ul');
  const ctaBtn = document.querySelector('.btn-getstarted');

  async function me() {
    try {
      const r = await fetch(`${ROOT}api_auth.php?action=me`, {
        credentials: 'same-origin',
        cache: 'no-store'
      });
      return await r.json();
    } catch { return { status: 0 }; }
  }

  function activeEndsWith(name) {
    return location.pathname.toLowerCase().endsWith(name.toLowerCase()) ? 'active' : '';
  }

  function renderGuest() {
    if (!navUL) return;
    navUL.innerHTML = `
      <li><a href="${ROOT}index.html#cek-resi-section" class="active">Cek Resi</a></li>
      <li><a href="${ROOT}login.html">Login</a></li>
      <li><a href="${ROOT}signup.html">Signup</a></li>
    `;
    if (ctaBtn) {
      ctaBtn.classList.remove('d-none');
      ctaBtn.href = `${ROOT}index.html#cek-resi-section`;
    }
  }

  function renderUser(user) {
    if (!navUL) return;
    const isAdmin = String(user?.role || '').toLowerCase() === 'admin';

    // === MODE ADMIN RINGKAS ===
    // - Semua halaman di /admin/*
    // - profile.html (meski di luar /admin), sesuai permintaan
    if (isAdmin && (isAdminPath || isProfilePath)) {
      navUL.innerHTML = `
        <li><a href="${ROOT}profile.html" class="${activeEndsWith('profile.html')}">Profil</a></li>
        <li><a href="${ROOT}admin/index.html" class="${activeEndsWith('admin/index.html')}">Admin</a></li>
        <li><a href="#" data-logout>Logout</a></li>
      `;
      ctaBtn?.classList.add('d-none');
      return;
    }

    // === MODE USER BIASA (admin di halaman umum tetap dapat akses Admin) ===
    navUL.innerHTML = `
      <li><a href="${ROOT}index.html#cek-resi-section">Cek Resi</a></li>
      <li><a href="${ROOT}history.html" class="${activeEndsWith('history.html')}">History</a></li>
      <li><a href="${ROOT}contact.html" class="${activeEndsWith('contact.html')}">Kontak</a></li>
      <li><a href="${ROOT}profile.html" class="${activeEndsWith('profile.html')}">Profil</a></li>
      ${isAdmin ? `<li><a href="${ROOT}admin/index.html" class="${isAdminPath ? 'active' : ''}">Admin</a></li>` : ``}
      <li><a href="#" data-logout>Logout</a></li>
    `;
    if (ctaBtn) {
      ctaBtn.classList.remove('d-none');
      ctaBtn.href = `${ROOT}index.html#cek-resi-section`;
    }
  }

  async function doLogout() {
    try {
      await fetch(`${ROOT}api_auth.php?action=logout`, {
        credentials: 'same-origin', cache: 'no-store'
      });
    } catch { }
    location.href = `${ROOT}index.html`;
  }

  // Delegasi klik agar Logout tetap hidup meski menu digambar ulang
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-logout]');
    if (!el) return;
    e.preventDefault();
    doLogout();
  });

  (async () => {
    const d = await me();
    if (d?.status === 200 && d.user) renderUser(d.user);
    else renderGuest();
  })();
});
