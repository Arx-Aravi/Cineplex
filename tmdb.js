// ═══════════════════════════════════════════════════════
//  TMDb (The Movie Database) Integration
//  Free API — get your key at https://www.themoviedb.org/settings/api
// ═══════════════════════════════════════════════════════

const TMDB = {
  // ⚠️ PASTE YOUR FREE TMDB API KEY HERE ⚠️
  // Get one in 2 minutes: themoviedb.org → Settings → API → Create
  API_KEY: 'dcebe866f0f224c3fc26ecef5e290de1',  // ← replace this string with your real key, keep the quotes

  BASE_URL: 'https://api.themoviedb.org/3',
  IMG_BASE: 'https://image.tmdb.org/t/p',

  hasKey() {
    return this.API_KEY && this.API_KEY !== 'YOUR_TMDB_API_KEY_HERE';
  },

  poster(path, size = 'w500') {
    return path ? `${this.IMG_BASE}/${size}${path}` : null;
  },

  backdrop(path, size = 'w1280') {
    return path ? `${this.IMG_BASE}/${size}${path}` : null;
  },

  async _get(endpoint, params = {}) {
    const url = new URL(`${this.BASE_URL}${endpoint}`);
    url.searchParams.set('api_key', this.API_KEY);
    url.searchParams.set('language', 'en-US');
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`TMDb error ${res.status}`);
    return res.json();
  },

  // ── Now playing in theaters ───────────────────────
  async nowPlaying(page = 1) {
    const data = await this._get('/movie/now_playing', { page, region: 'IN' });
    return data.results.map(this._mapMovie);
  },

  // ── Popular movies (good fallback / variety) ──────
  async popular(page = 1) {
    const data = await this._get('/movie/popular', { page });
    return data.results.map(this._mapMovie);
  },

  // ── Upcoming / coming soon ─────────────────────────
  async upcoming(page = 1) {
    const data = await this._get('/movie/upcoming', { page, region: 'IN' });
    return data.results.map(this._mapMovie);
  },

  // ── Search ─────────────────────────────────────────
  async search(query) {
    if (!query.trim()) return [];
    const data = await this._get('/search/movie', { query });
    return data.results.map(this._mapMovie);
  },

  // ── Discover by genre ──────────────────────────────
  async byGenre(genreId, page = 1) {
    const data = await this._get('/discover/movie', { with_genres: genreId, page, sort_by: 'popularity.desc' });
    return data.results.map(this._mapMovie);
  },

  // ── Full detail incl. runtime ──────────────────────
  async details(id) {
    const data = await this._get(`/movie/${id}`, { append_to_response: 'credits' });
    return this._mapMovie(data, true);
  },

  // ── Trailer (YouTube key) ──────────────────────────
  async trailer(id) {
    const data = await this._get(`/movie/${id}/videos`);
    const vids = data.results || [];
    // Prefer official YouTube trailer, fallback to any YouTube video
    const trailer = vids.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official)
                 || vids.find(v => v.site === 'YouTube' && v.type === 'Trailer')
                 || vids.find(v => v.site === 'YouTube');
    return trailer ? trailer.key : null;
  },

  // ── Genre list (id ↔ name map) ─────────────────────
  async genreMap() {
    if (this._genreCache) return this._genreCache;
    const data = await this._get('/genre/movie/list');
    const map = {};
    data.genres.forEach(g => map[g.id] = g.name);
    this._genreCache = map;
    return map;
  },

  _mapMovie(m, full = false) {
    return {
      id: m.id,
      title: m.title,
      description: m.overview,
      posterPath: m.poster_path,
      backdropPath: m.backdrop_path,
      releaseDate: m.release_date,
      rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : null,
      genreIds: m.genre_ids || (m.genres ? m.genres.map(g => g.id) : []),
      genreNames: m.genres ? m.genres.map(g => g.name) : null,
      duration: m.runtime || null,
      language: (m.original_language || 'en').toUpperCase(),
      popularity: m.popularity,
    };
  },
};
