// ─── Auth Utilities (backed by Store — runs fully client-side) ─────
const Auth = {
  getToken:   ()      => localStorage.getItem('cp_token'),
  getUser:    ()      => { try { return JSON.parse(localStorage.getItem('cp_user')); } catch { return null; } },
  isLoggedIn: ()      => !!localStorage.getItem('cp_token'),
  isAdmin:    ()      => { const u = Auth.getUser(); return u && u.role === 'ADMIN'; },

  save(token, user) {
    localStorage.setItem('cp_token', token);
    localStorage.setItem('cp_user', JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem('cp_token');
    localStorage.removeItem('cp_user');
    const depth = location.pathname.includes('/pages/') ? '../' : '';
    window.location.href = depth + 'index.html';
  },
};

// ── Toast utility ─────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type}`;
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, duration);
}

// ── Render navbar actions ─────────────────────────────────
function renderNavActions() {
  const el = document.getElementById('navActions');
  if (!el) return;
  const depth = location.pathname.includes('/pages/') ? '' : 'pages/';

  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    el.innerHTML = `
      <a href="${depth}history.html" class="btn btn-ghost" style="font-size:13px">My Bookings</a>
      ${Auth.isAdmin() ? `<a href="${depth}admin.html" class="btn btn-ghost" style="font-size:13px">Admin</a>` : ''}
      <span style="color:var(--text-muted);font-size:13px">Hi, ${user?.name?.split(' ')[0] || 'User'}</span>
      <button onclick="Auth.logout()" class="btn btn-ghost" style="font-size:13px">Logout</button>
    `;
  } else {
    el.innerHTML = `
      <a href="${depth}login.html" class="btn btn-ghost">Sign In</a>
      <a href="${depth}register.html" class="btn btn-primary">Get Started</a>
    `;
  }
}

document.addEventListener('DOMContentLoaded', renderNavActions);
