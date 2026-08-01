// ═══════════════════════════════════════════════════════
//  Local "Backend" Simulation Layer
//  Persists to localStorage so the whole app works live,
//  in the browser, with no server needed for the demo.
//  Swap any of these for real fetch() calls to your Java
//  backend later — the function signatures match the API.
// ═══════════════════════════════════════════════════════

const Store = {
  // ── Keys ───────────────────────────────────────────
  KEYS: {
    USERS:    'cp_users',
    SESSION:  'cp_session',
    BOOKINGS: 'cp_bookings',
    SEATS:    'cp_seat_state',   // per show seat locks
  },

  THEATERS: [
    { id: 1, name: 'PVR Cinemas',     location: '100 Feet Road, Velachery', city: 'Chennai' },
    { id: 2, name: 'INOX Multiplex',  location: 'Express Avenue Mall',      city: 'Chennai' },
    { id: 3, name: 'Sathyam Cinemas', location: 'Royapettah High Road',     city: 'Chennai' },
  ],

  SHOW_TIMES: ['10:00 AM', '1:30 PM', '4:45 PM', '7:30 PM', '10:15 PM'],

  // ── init ───────────────────────────────────────────
  _read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  _write(key, val) { localStorage.setItem(key, JSON.stringify(val)); },

  // ═══════════════ AUTH ═══════════════════════════════
  users() { return this._read(this.KEYS.USERS, []); },

  async register({ name, email, password, phone }) {
    const users = this.users();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email already exists.');
    }
    const user = {
      id: Date.now(),
      name, email, phone: phone || null,
      password,             // demo only — never store plaintext in real apps
      role: email.toLowerCase() === 'admin@cineplex.com' ? 'ADMIN' : 'USER',
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    this._write(this.KEYS.USERS, users);
    return this._session(user);
  },

  async login({ email, password }) {
    const users = this.users();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.password !== password) {
      throw new Error('Invalid email or password.');
    }
    return this._session(user);
  },

  _session(user) {
    const token = btoa(`${user.email}:${Date.now()}`);
    this._write(this.KEYS.SESSION, { token, userId: user.id });
    return {
      token,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  },

  // Seed a default admin so admin.html is reachable on first run
  ensureSeedAdmin() {
    const users = this.users();
    if (!users.find(u => u.email === 'admin@cineplex.com')) {
      users.push({
        id: 1, name: 'Admin', email: 'admin@cineplex.com',
        password: 'admin123', phone: null, role: 'ADMIN',
        createdAt: new Date().toISOString(),
      });
      this._write(this.KEYS.USERS, users);
    }
  },

  // ═══════════════ SHOWS (deterministic, generated from movie id) ════
  // Generates realistic showtimes/prices per theater for a given TMDb movie id + date
  showsFor(movieId, dateISO) {
    const seedBase = movieId * 7 + dateISO.split('-').join('') * 1;
    const shows = [];
    let sid = 1;
    this.THEATERS.forEach((theater, ti) => {
      const numShows = 2 + ((seedBase + ti) % 2); // 2-3 shows per theater
      for (let i = 0; i < numShows; i++) {
        const timeIdx = (seedBase + ti * 2 + i) % this.SHOW_TIMES.length;
        const basePrice = 150 + (ti * 30) + ((seedBase + i) % 4) * 10;
        shows.push({
          id: `${movieId}_${dateISO}_${theater.id}_${i}`,
          movieId,
          showDate: dateISO,
          showTime: this.SHOW_TIMES[timeIdx],
          theaterId: theater.id,
          theaterName: theater.name,
          theaterLocation: theater.location,
          screenName: `Screen ${(i % 3) + 1}`,
          priceRegular: basePrice,
          pricePremium: basePrice + 100,
          priceRecliner: basePrice + 250,
        });
        sid++;
      }
    });
    return shows.sort((a, b) => a.theaterName.localeCompare(b.theaterName));
  },

  /**
   * Generates showtimes for ANY theater — including real ones fetched live
   * from Google Places. theaterKey can be a Places place_id or any stable
   * string; combined with movieId+date it deterministically seeds the
   * same showtimes/prices on every visit (so refreshing doesn't shuffle
   * a theater's showtimes around).
   */
  showsForTheater(movieId, dateISO, theaterKey, theaterIndex = 0) {
    const keyHash = this._hashString(String(theaterKey));
    const seedBase = movieId * 7 + parseInt(dateISO.split('-').join('')) + keyHash;
    const numShows = 2 + (seedBase % 3); // 2-4 shows
    const shows = [];
    for (let i = 0; i < numShows; i++) {
      const timeIdx = (seedBase + i * 3) % this.SHOW_TIMES.length;
      const basePrice = 150 + (theaterIndex * 25) + ((seedBase + i) % 4) * 10;
      shows.push({
        id: `${movieId}_${dateISO}_${theaterKey}_${i}`,
        movieId,
        showDate: dateISO,
        showTime: this.SHOW_TIMES[timeIdx],
        theaterKey,
        screenName: `Screen ${(i % 3) + 1}`,
        priceRegular: basePrice,
        pricePremium: basePrice + 100,
        priceRecliner: basePrice + 250,
      });
    }
    return shows.sort((a, b) => this.SHOW_TIMES.indexOf(a.showTime) - this.SHOW_TIMES.indexOf(b.showTime));
  },

  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  },

  // ═══════════════ SEATS ═══════════════════════════════
  // 8 rows × 10 seats. Rows A-B = recliner, C-D = premium, E-H = regular.
  generateSeatLayout() {
    const rows = ['A','B','C','D','E','F','G','H'];
    const seats = [];
    rows.forEach(row => {
      const type = row <= 'B' ? 'RECLINER' : row <= 'D' ? 'PREMIUM' : 'REGULAR';
      for (let n = 1; n <= 10; n++) {
        seats.push({ id: `${row}${n}`, rowLabel: row, seatNumber: n, seatType: type });
      }
    });
    return seats;
  },

  _seatState() { return this._read(this.KEYS.SEATS, {}); },

  getSeatStatus(showId) {
    const layout = this.generateSeatLayout();
    const state = this._seatState();
    const bookedForShow = state[showId] || {};

    return layout.map(s => {
      const price = s.seatType === 'RECLINER' ? null : null; // filled by caller w/ show prices
      return {
        seatId: s.id,
        rowLabel: s.rowLabel,
        seatNumber: s.seatNumber,
        seatType: s.seatType,
        status: bookedForShow[s.id] ? 'BOOKED' : 'AVAILABLE',
      };
    });
  },

  lockSeats(showId, seatIds, bookingRef) {
    const state = this._seatState();
    if (!state[showId]) state[showId] = {};
    seatIds.forEach(id => { state[showId][id] = bookingRef; });
    this._write(this.KEYS.SEATS, state);
  },

  releaseSeats(showId, seatIds) {
    const state = this._seatState();
    if (state[showId]) {
      seatIds.forEach(id => delete state[showId][id]);
      this._write(this.KEYS.SEATS, state);
    }
  },

  // ═══════════════ BOOKINGS ════════════════════════════
  bookings() { return this._read(this.KEYS.BOOKINGS, []); },

  createBooking({ userId, show, seats, totalAmount, paymentMethod }) {
    const ref = 'BK' + Date.now();
    const booking = {
      id: Date.now(),
      bookingRef: ref,
      userId,
      showId: show.id,
      movieId: show.movieId,
      movieTitle: show.movieTitle,
      moviePoster: show.moviePoster,
      theaterName: show.theaterName,
      screenName: show.screenName,
      showDate: show.showDate,
      showTime: show.showTime,
      seats,
      totalAmount,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      paymentMethod,
      bookedAt: new Date().toISOString(),
    };
    const all = this.bookings();
    all.unshift(booking);
    this._write(this.KEYS.BOOKINGS, all);
    this.lockSeats(show.id, seats.map(s => s.seatId), ref);
    return booking;
  },

  myBookings(userId) {
    return this.bookings().filter(b => b.userId === userId);
  },

  cancelBooking(ref) {
    const all = this.bookings();
    const b = all.find(x => x.bookingRef === ref);
    if (!b) throw new Error('Booking not found.');
    if (b.status === 'CANCELLED') throw new Error('Already cancelled.');
    b.status = 'CANCELLED';
    b.paymentStatus = 'REFUNDED';
    this._write(this.KEYS.BOOKINGS, all);
    this.releaseSeats(b.showId, b.seats.map(s => s.seatId));
    return b;
  },

  // ═══════════════ ADMIN REPORTS ═══════════════════════
  dashboardStats() {
    const bookings = this.bookings().filter(b => b.status === 'CONFIRMED');
    const today = new Date().toISOString().split('T')[0];
    const todaysBookings = bookings.filter(b => b.bookedAt.startsWith(today));
    return {
      totalUsers: this.users().length,
      totalBookings: bookings.length,
      totalRevenue: bookings.reduce((s, b) => s + b.totalAmount, 0),
      todaysBookings: todaysBookings.length,
      todaysRevenue: todaysBookings.reduce((s, b) => s + b.totalAmount, 0),
    };
  },
};

Store.ensureSeedAdmin();
