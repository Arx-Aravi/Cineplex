// ═══════════════════════════════════════════════════════
//  CinePlex Assistant — booking-aware chat widget
//  Pattern-matches intent locally (no API cost) and can
//  trigger real navigation/search actions in the app.
// ═══════════════════════════════════════════════════════

const ChatBot = {
  open: false,
  history: [],

  // ── Bootstrapping ──────────────────────────────────
  init() {
    this._injectMarkup();
    this._bindEvents();
    this._greet();
  },

  _injectMarkup() {
    document.body.insertAdjacentHTML('beforeend', `
      <button id="cbLauncher" class="cb-launcher" aria-label="Open chat assistant">
        <span class="cb-launcher-icon">💬</span>
      </button>
      <div id="cbPanel" class="cb-panel">
        <div class="cb-header">
          <div>
            <div class="cb-title">CinePlex Assistant</div>
            <div class="cb-status"><span class="live-dot" style="width:6px;height:6px"></span> Online</div>
          </div>
          <button id="cbClose" class="cb-close" aria-label="Close chat">✕</button>
        </div>
        <div id="cbMessages" class="cb-messages"></div>
        <div id="cbQuickReplies" class="cb-quick-replies"></div>
        <div class="cb-input-row">
          <input id="cbInput" type="text" class="cb-input" placeholder="Ask about movies, bookings, seats…" autocomplete="off"/>
          <button id="cbSend" class="cb-send" aria-label="Send">➤</button>
        </div>
      </div>
    `);
  },

  _bindEvents() {
    document.getElementById('cbLauncher').addEventListener('click', () => this.toggle());
    document.getElementById('cbClose').addEventListener('click', () => this.toggle(false));
    document.getElementById('cbSend').addEventListener('click', () => this._handleSend());
    document.getElementById('cbInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') this._handleSend();
    });
  },

  toggle(force) {
    this.open = force !== undefined ? force : !this.open;
    document.getElementById('cbPanel').classList.toggle('cb-open', this.open);
    document.getElementById('cbLauncher').classList.toggle('cb-launcher-hidden', this.open);
    if (this.open) document.getElementById('cbInput').focus();
  },

  _greet() {
    const user = (typeof Auth !== 'undefined' && Auth.isLoggedIn()) ? Auth.getUser() : null;
    const name = user?.name?.split(' ')[0];
    this._addBot(
      name ? `Hey ${name}! 👋 I'm your CinePlex assistant.` : `Hi there! 👋 I'm your CinePlex assistant.`,
      ["What's showing now?", "Help me book tickets", "Track my booking", "Payment help"]
    );
  },

  // ── Message rendering ──────────────────────────────
  _addBot(text, quickReplies = []) {
    this._append('bot', text);
    this._renderQuickReplies(quickReplies);
  },

  _addUser(text) {
    this._append('user', text);
    this._renderQuickReplies([]);
  },

  _append(who, text) {
    const wrap = document.getElementById('cbMessages');
    const bubble = document.createElement('div');
    bubble.className = `cb-msg cb-msg-${who}`;
    bubble.innerHTML = text; // text is always our own template strings — not raw user HTML
    wrap.appendChild(bubble);
    wrap.scrollTop = wrap.scrollHeight;
  },

  _typing(on) {
    const wrap = document.getElementById('cbMessages');
    let el = document.getElementById('cbTyping');
    if (on && !el) {
      el = document.createElement('div');
      el.id = 'cbTyping';
      el.className = 'cb-msg cb-msg-bot cb-typing';
      el.innerHTML = '<span></span><span></span><span></span>';
      wrap.appendChild(el);
      wrap.scrollTop = wrap.scrollHeight;
    } else if (!on && el) {
      el.remove();
    }
  },

  _renderQuickReplies(options) {
    const el = document.getElementById('cbQuickReplies');
    if (!options.length) { el.innerHTML = ''; el.style.display = 'none'; return; }
    el.style.display = 'flex';
    el.innerHTML = options.map(opt =>
      `<button class="cb-chip" data-text="${this._esc(opt)}">${opt}</button>`
    ).join('');
    el.querySelectorAll('.cb-chip').forEach(chip => {
      chip.addEventListener('click', () => this._send(chip.dataset.text));
    });
  },

  _esc(s) { return s.replace(/"/g, '&quot;'); },

  // ── Send flow ───────────────────────────────────────
  _handleSend() {
    const input = document.getElementById('cbInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    this._send(text);
  },

  async _send(text) {
    this._addUser(this._esc(text));
    this._typing(true);
    await new Promise(r => setTimeout(r, 500 + Math.random() * 400)); // feels like real thinking
    this._typing(false);
    const { reply, quickReplies } = await this._route(text);
    this._addBot(reply, quickReplies || []);
  },

  // ── Intent routing (local, rule-based) ─────────────
  async _route(rawText) {
    const text = rawText.toLowerCase();

    // ── Greeting ──
    if (/^(hi|hello|hey|yo)\b/.test(text)) {
      return { reply: "Hello! What can I help you with — finding a movie, picking seats, or tracking a booking?",
        quickReplies: ["What's showing now?", "Help me book tickets"] };
    }

    // ── Now showing / search movies ──
    if (/showing|now playing|movies?\b.*(now|today|available)|what.*watch/.test(text)) {
      return this._listNowShowing();
    }

    // ── Search a specific movie title ──
    const titleMatch = text.match(/(?:find|search|looking for|is)\s+["']?([a-z0-9 :'-]{3,40})["']?(?:\s+(?:playing|showing))?/);
    if (titleMatch && typeof TMDB !== 'undefined' && TMDB.hasKey()) {
      return this._searchMovie(titleMatch[1].trim());
    }

    // ── Cancellation (check before generic "booking" intent — both contain booking-ish words) ──
    if (/cancel|refund/.test(text)) {
      return {
        reply: "You can cancel anytime from <strong>My Bookings</strong> — just click Cancel on the booking. Refunds for test-mode payments are instant in this demo; real refunds typically take 3–5 business days.",
        quickReplies: ["Take me to My Bookings"],
      };
    }

    // ── Booking status / track (check before generic booking intent) ──
    if (/track|status|my booking|where.*ticket/.test(text)) {
      return this._trackBooking();
    }

    // ── Payment failure (check before generic payment intent) ──
    if (/payment fail|fail.*payment|payment.*declin|declin.*payment/.test(text)) {
      return { reply: "No worries — your seats aren't locked until payment confirms, so you can just try again. Nothing is charged on a failed attempt." };
    }

    // ── Booking help ──
    if (/book|ticket|reserve|seat/.test(text)) {
      return {
        reply: "Booking is easy: pick a movie → choose a date & showtime → select your seats → pay. Want me to take you to the movie list now?",
        quickReplies: ["Show me movies", "How do I cancel a booking?"],
      };
    }

    // ── Payment help ──
    if (/payment|pay|upi|card|razorpay|fail/.test(text)) {
      return {
        reply: "Payments run through Razorpay's secure test checkout — UPI, cards, and net banking are all supported. In test mode, use UPI ID <code>success@razorpay</code> or card <code>4111 1111 1111 1111</code> with any future expiry to simulate a successful payment.",
        quickReplies: ["What if payment fails?"],
      };
    }
    if (/what if payment fails/.test(text)) {
      return { reply: "No worries — your seats aren't locked until payment confirms, so you can just try again. Nothing is charged on a failed attempt." };
    }

    // ── Theaters / location ──
    if (/theater|theatre|cinema|nearby|near me|location|distance/.test(text)) {
      return {
        reply: "I can show you cinemas near your current location, sorted by distance — open any movie and tap <strong>\"Use my location\"</strong> on the theater list. Want to do that now?",
        quickReplies: ["Show me movies"],
      };
    }

    // ── Navigation triggers ──
    if (/take me to my bookings|show my bookings/.test(text)) {
      this._navigate('history.html');
      return { reply: "Heading to your bookings now…" };
    }
    if (/show me movies|browse movies|take me to movies/.test(text)) {
      this._navigate('index.html', true);
      return { reply: "Taking you to the movie list…" };
    }

    // ── Pricing ──
    if (/price|cost|how much|charges/.test(text)) {
      return { reply: "Prices vary by theater and seat type — Regular seats are usually the most affordable, Premium adds a bit more legroom, and Recliner is the top tier. Exact prices show up once you pick a showtime." };
    }

    // ── Human handoff ──
    if (/human|agent|support|help me|talk to someone/.test(text)) {
      return { reply: "I'm a demo assistant for this project, so I can't connect you to a live agent — but I can help with movies, bookings, seats, and payments right here. What do you need?" };
    }

    // ── Fallback ──
    return {
      reply: "I'm not totally sure about that one — but I can help with finding movies, booking tickets, seat selection, payments, or tracking your bookings.",
      quickReplies: ["What's showing now?", "Help me book tickets", "Track my booking"],
    };
  },

  // ── Action helpers (real, not just text) ───────────
  async _listNowShowing() {
    if (typeof TMDB === 'undefined' || !TMDB.hasKey()) {
      return { reply: "I'd normally list live now-showing titles here, but the demo doesn't have a TMDb key configured yet. You can still browse the sample movies on the homepage!",
        quickReplies: ["Show me movies"] };
    }
    try {
      const movies = await TMDB.nowPlaying();
      const top5 = movies.slice(0, 5);
      const list = top5.map(m => `• <strong>${m.title}</strong> ★ ${m.rating ?? 'N/A'}`).join('<br/>');
      return { reply: `Here's what's playing right now:<br/>${list}`,
        quickReplies: ["Help me book tickets", "Show me movies"] };
    } catch (e) {
      return { reply: "I couldn't fetch live listings just now — try the homepage directly." };
    }
  },

  async _searchMovie(query) {
    try {
      const results = await TMDB.search(query);
      if (!results.length) {
        return { reply: `I couldn't find "${query}" — want to see what's currently showing instead?`,
          quickReplies: ["What's showing now?"] };
      }
      const m = results[0];
      return { reply: `Found it — <strong>${m.title}</strong> (${(m.releaseDate||'').slice(0,4)}), rated ★ ${m.rating ?? 'N/A'}. Want to see showtimes?`,
        quickReplies: [`Book ${m.title}`, "Show me movies"] };
    } catch {
      return { reply: "Search isn't working right now — try the search bar on the homepage." };
    }
  },

  _trackBooking() {
    if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
      return { reply: "You'll need to sign in first to see your bookings.", quickReplies: ["Take me to sign in"] };
    }
    if (typeof Store === 'undefined') {
      return { reply: "Open <strong>My Bookings</strong> from the top menu to see your tickets." };
    }
    const user = Auth.getUser();
    const bookings = Store.myBookings(user.id).filter(b => b.status === 'CONFIRMED');
    if (!bookings.length) {
      return { reply: "You don't have any active bookings yet. Want to book your first ticket?",
        quickReplies: ["Show me movies"] };
    }
    const latest = bookings[0];
    return {
      reply: `Your latest booking: <strong>${latest.movieTitle}</strong> at ${latest.theaterName}, ${latest.showDate} ${latest.showTime}. Ref: <code>${latest.bookingRef}</code>`,
      quickReplies: ["Take me to My Bookings"],
    };
  },

  _navigate(page, fromPages) {
    setTimeout(() => {
      const depth = location.pathname.includes('/pages/') ? (fromPages ? '../' : '') : (fromPages ? '' : 'pages/');
      window.location.href = depth + page;
    }, 900);
  },
};

document.addEventListener('DOMContentLoaded', () => ChatBot.init());
