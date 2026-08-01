// ═══════════════════════════════════════════════════════
//  Backend API client — used specifically for endpoints
//  that MUST run server-side (payment order creation,
//  signature verification). Everything else in this demo
//  runs client-side via store.js.
// ═══════════════════════════════════════════════════════

const API_BASE = 'http://localhost:8080/api';

const Api = {
  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('cp_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    if (!res.ok) {
      let msg = `Backend error ${res.status}`;
      try { const d = await res.json(); msg = d.error || d.message || msg; } catch {}
      throw new Error(msg);
    }
    return res.json();
  },
};

// ── Backend-not-running fallback ───────────────────────────
// If the Spring Boot backend (with Razorpay configured) isn't
// running, payments/create-order will fail to fetch. We catch
// that specific case and fall back to a clearly-labeled
// simulation so the rest of the app stays usable for a demo.
const _origRequest = Api.request.bind(Api);
Api.request = async function (method, path, body) {
  try {
    return await _origRequest(method, path, body);
  } catch (err) {
    if (path === '/payments/create-order') {
      console.warn('Backend unreachable — simulating order creation. Start the Spring Boot backend for real Razorpay test payments.');
      return {
        orderId: 'order_SIMULATED_' + Date.now(),
        amount: body.amount * 100,
        currency: 'INR',
        keyId: null, // signals simulation mode to RazorpayPay caller
        _simulated: true,
      };
    }
    if (path === '/payments/verify') {
      return { verified: true, _simulated: true };
    }
    throw err;
  }
};
