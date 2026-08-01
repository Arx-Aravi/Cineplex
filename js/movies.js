// ─── Movies Page — Live TMDb Data ───────────────────────
let allMovies = [];
let allUpcoming = [];
let activeGenre = '';
let genreNameToId = {};

const FALLBACK_MOVIES = [
  { id: 27205, title: 'Inception', description: 'A thief who steals corporate secrets through dream-sharing technology is given a chance at redemption.', posterPath: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', rating: 8.4, releaseDate: '2010-07-15', language: 'EN', genreIds: [28, 878], director: 'Christopher Nolan', cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page', 'Tom Hardy'] },
  { id: 155,   title: 'The Dark Knight', description: 'Batman raises the stakes in his war on crime against the Joker.', posterPath: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', rating: 8.5, releaseDate: '2008-07-16', language: 'EN', genreIds: [28, 80], director: 'Christopher Nolan', cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart', 'Michael Caine'] },
  { id: 157336,title: 'Interstellar', description: 'A team of explorers travel through a wormhole in space.', posterPath: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', rating: 8.4, releaseDate: '2014-11-05', language: 'EN', genreIds: [12, 18], director: 'Christopher Nolan', cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine'] },
  { id: 872585,title: 'Oppenheimer', description: 'The story of American scientist J. Robert Oppenheimer.', posterPath: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', rating: 8.1, releaseDate: '2023-07-19', language: 'EN', genreIds: [18, 36], director: 'Christopher Nolan', cast: ['Cillian Murphy', 'Emily Blunt', 'Matt Damon', 'Robert Downey Jr.'] },
];

function showApiKeyNotice() {
  const grid = document.getElementById('moviesGrid');
  if (!grid) return;
  grid.insertAdjacentHTML('beforebegin', `
    <div style="grid-column:1/-1;background:rgba(232,160,32,.08);border:1px solid var(--gold);border-radius:10px;padding:18px 22px;margin-bottom:24px;font-size:13px;color:var(--text)">
      <strong style="color:var(--gold)">⚠ Demo mode:</strong> Add a free TMDb API key in <code>js/tmdb.js</code> to load live posters, ratings &amp; trailers for movies currently in theaters.
      Showing a few sample titles for now. Get a key at
      <a href="https://www.themoviedb.org/settings/api" target="_blank" style="color:var(--gold)">themoviedb.org/settings/api</a>.
    </div>
  `);
}

function posterImg(movie) {
  const src = TMDB.poster(movie.posterPath, 'w500');
  if (src) {
    return `<img class="movie-poster" src="${src}" alt="${movie.title}" loading="lazy"/>`;
  }
  return `<div class="movie-poster-placeholder"><div style="text-align:center"><div style="font-size:56px;margin-bottom:8px">🎬</div></div></div>`;
}

function formatReleaseDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderMovies(movies, gridId = 'moviesGrid', { upcoming = false, emptyText = 'Try a different genre or search term.' } = {}) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  if (!movies.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🎬</div>
        <div class="empty-title">No Movies Found</div>
        <p>${emptyText}</p>
      </div>`;
    return;
  }

  grid.innerHTML = movies.map(movie => `
    <div class="movie-card" onclick="window.location.href='pages/movie.html?id=${movie.id}'">
      <div style="position:relative">
        ${posterImg(movie)}
        ${upcoming
          ? `<div class="play-badge" style="left:10px;right:auto;background:rgba(232,160,32,.9);border-radius:6px;padding:3px 8px;font-size:11px;font-weight:600;color:#111">Coming Soon</div>`
          : `<div class="play-badge">
               <div class="play-badge-icon" onclick="event.stopPropagation();openTrailer(${movie.id}, '${movie.title.replace(/'/g, "\\'")}')">▶</div>
             </div>`
        }
      </div>
      <div class="movie-info">
        <div class="movie-title">${movie.title}</div>
        <div class="movie-meta">
          <span>${genreNamesFor(movie.genreIds)}</span>
          <span>${movie.language || ''}</span>
        </div>
        ${(movie.director || (movie.cast && movie.cast.length))
          ? `<div class="movie-credits" style="font-size:12px;color:var(--text-muted);line-height:1.5;margin:2px 0 8px">
               ${movie.director ? `<div><strong style="color:var(--text)">Dir:</strong> ${movie.director}</div>` : ''}
               ${movie.cast && movie.cast.length ? `<div><strong style="color:var(--text)">Starring:</strong> ${movie.cast.join(', ')}</div>` : ''}
             </div>`
          : ''
        }
        <div class="flex-between">
          <span class="movie-rating">★ ${movie.rating ?? 'N/A'}</span>
          <span style="font-size:12px;color:var(--text-muted)">${upcoming ? formatReleaseDate(movie.releaseDate) : (movie.releaseDate || '').slice(0,4)}</span>
        </div>
        ${upcoming
          ? `<button class="btn-book" onclick="event.stopPropagation();openTrailer(${movie.id}, '${movie.title.replace(/'/g, "\\'")}')">Watch Trailer</button>`
          : `<button class="btn-book" onclick="event.stopPropagation();window.location.href='pages/movie.html?id=${movie.id}'">Book Now</button>`
        }
      </div>
    </div>
  `).join('');
}

function genreNamesFor(ids) {
  if (!ids || !ids.length) return '—';
  return ids.slice(0, 2).map(id => genreNameToId[id]).filter(Boolean).join('/') || '—';
}

function renderHeroReel(movies) {
  const reel = document.getElementById('heroReel');
  if (!reel) return;
  const sample = movies.slice(0, 5);
  reel.innerHTML = sample.map((m, i) => `
    <div style="flex-shrink:0;width:150px;transform:rotate(${(i % 2 === 0 ? -2 : 2)}deg);opacity:${0.45 + i * 0.13}">
      ${TMDB.poster(m.posterPath, 'w342')
        ? `<img src="${TMDB.poster(m.posterPath, 'w342')}" style="width:100%;border-radius:8px;border:1px solid var(--border)" alt="${m.title}"/>`
        : `<div style="width:100%;aspect-ratio:2/3;border-radius:8px;background:linear-gradient(135deg,#1C1C22,#2a2a35);border:1px solid var(--border)"></div>`
      }
    </div>
  `).join('');
}

function filterMovies() {
  const query = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const matches = m => {
    const matchesGenre = !activeGenre || (m.genreIds || []).includes(GENRE_NAME_TO_ID[activeGenre]);
    const matchesSearch = !query || m.title.toLowerCase().includes(query);
    return matchesGenre && matchesSearch;
  };
  renderMovies(allMovies.filter(matches), 'moviesGrid');
  renderMovies(allUpcoming.filter(matches), 'upcomingGrid', { upcoming: true, emptyText: 'No upcoming releases match that filter.' });
}

const GENRE_NAME_TO_ID = {
  'Action': 28, 'Sci-Fi': 878, 'Drama': 18, 'Comedy': 35, 'Thriller': 53, 'Horror': 27,
};

// ── Trailer modal ─────────────────────────────────────────
function ensureTrailerModal() {
  if (document.getElementById('trailerOverlay')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="trailer-overlay" id="trailerOverlay">
      <div class="trailer-box">
        <button class="trailer-close" onclick="closeTrailer()">✕</button>
        <div id="trailerFrame"></div>
      </div>
    </div>
  `);
  document.getElementById('trailerOverlay').addEventListener('click', e => {
    if (e.target.id === 'trailerOverlay') closeTrailer();
  });
}

async function openTrailer(movieId, title) {
  ensureTrailerModal();
  const overlay = document.getElementById('trailerOverlay');
  const frame = document.getElementById('trailerFrame');
  frame.innerHTML = `<div class="loading" style="background:#000;border-radius:10px;height:100%"><div class="spinner"></div> Loading trailer…</div>`;
  overlay.classList.add('open');

  try {
    const key = TMDB.hasKey() ? await TMDB.trailer(movieId) : null;
    if (key) {
      frame.innerHTML = `<iframe src="https://www.youtube.com/embed/${key}?autoplay=1" title="${title} trailer" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    } else {
      frame.innerHTML = `<iframe src="https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(title + ' official trailer')}&autoplay=1" title="${title} trailer" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    }
  } catch (e) {
    frame.innerHTML = `<div class="loading" style="background:#000;border-radius:10px;height:100%">Trailer unavailable.</div>`;
  }
}

function closeTrailer() {
  const overlay = document.getElementById('trailerOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    setTimeout(() => { document.getElementById('trailerFrame').innerHTML = ''; }, 250);
  }
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTrailer(); });

// ── Cast & director enrichment ─────────────────────────────
// TMDb's list endpoints (now_playing/popular/upcoming) don't include
// credits, so this fetches /movie/{id}/credits per movie. Capped at
// 6 concurrent requests so a page of ~36 movies doesn't fire 36
// simultaneous requests at once.
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function withCredits(movies) {
  return mapWithConcurrency(movies, 6, async m => {
    try {
      const { director, cast } = await TMDB.credits(m.id);
      return { ...m, director, cast };
    } catch {
      return { ...m, director: null, cast: [] };
    }
  });
}

// ── Init ───────────────────────────────────────────────────
async function initMoviesPage() {
  const grid = document.getElementById('moviesGrid');
  if (!grid) return;

  grid.innerHTML = '<div class="loading"><div class="spinner"></div> Loading now-showing movies…</div>';

  try {
    if (!TMDB.hasKey()) {
      allMovies = FALLBACK_MOVIES;
      allUpcoming = [];
      renderMovies(allMovies);
      renderMovies(allUpcoming, 'upcomingGrid', { upcoming: true, emptyText: 'Add a TMDb API key to load upcoming releases.' });
      renderHeroReel(allMovies);
      showApiKeyNotice();
      return;
    }

    genreNameToId = Object.fromEntries(
      Object.entries(await TMDB.genreMap())
    );

    const [nowPlaying, popular, upcoming] = await Promise.all([
      TMDB.nowPlaying(),
      TMDB.popular(),
      TMDB.upcoming(),
    ]);

    // Merge & dedupe, now-playing first
    const seen = new Set();
    allMovies = [...nowPlaying, ...popular].filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    }).slice(0, 24);

    // Upcoming releases shouldn't also appear in "Now Showing"
    allUpcoming = upcoming.filter(m => !seen.has(m.id)).slice(0, 12);

    renderMovies(allMovies);
    renderMovies(allUpcoming, 'upcomingGrid', { upcoming: true, emptyText: 'No upcoming releases found right now.' });
    renderHeroReel(allMovies);

    // Cast/director load slightly after — re-render once they land
    // so the initial grid still appears fast.
    const [moviesWithCredits, upcomingWithCredits] = await Promise.all([
      withCredits(allMovies),
      withCredits(allUpcoming),
    ]);
    allMovies = moviesWithCredits;
    allUpcoming = upcomingWithCredits;
    filterMovies();
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⚠️</div><div class="empty-title">Could not load movies</div><p>${err.message}</p></div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('genrePills')?.addEventListener('click', e => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activeGenre = pill.dataset.genre;
    filterMovies();
  });

  document.getElementById('searchInput')?.addEventListener('input', filterMovies);

  initMoviesPage();
});
