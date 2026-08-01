// ═══════════════════════════════════════════════════════
//  Real Theaters via Google Places API (New) + Geolocation
//  Get a free key (with billing enabled — free tier covers
//  this project's usage): console.cloud.google.com
// ═══════════════════════════════════════════════════════

const PlacesAPI = {
  // ⚠️ PASTE YOUR GOOGLE PLACES API KEY HERE ⚠️
  // 1. console.cloud.google.com → New Project
  // 2. Enable "Places API (New)"
  // 3. Credentials → Create API Key
  // 4. Restrict it: Application restrictions → Websites → add your domain
  //    (use http://localhost:8080/* and http://127.0.0.1:8080/* while testing)
  // 5. API restrictions → restrict to "Places API (New)"
  API_KEY: 'AIzaSyBF9CNVz4C2M5p_s6kxMyQbary9b_T6GJs',

  hasKey() {
    return this.API_KEY && this.API_KEY !== 'YOUR_GOOGLE_PLACES_API_KEY_HERE';
  },

  _FIELD_MASK: [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.location',
    'places.rating',
    'places.userRatingCount',
    'places.currentOpeningHours.openNow',
    'places.googleMapsUri',
  ].join(','),

  /**
   * searchNearby restricted to the official `movie_theater` type.
   * Good for multiplex chains (PVR, INOX, Cinepolis) which Google
   * reliably tags correctly.
   */
  async _searchNearbyTyped(lat, lng, radiusMeters) {
    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.API_KEY,
        'X-Goog-FieldMask': this._FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes: ['movie_theater'],
        maxResultCount: 20,
        locationRestriction: {
          circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
        },
        rankPreference: 'DISTANCE',
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Places API error ${res.status}`);
    }
    const data = await res.json();
    return data.places || [];
  },

  /**
   * searchText with a loose "cinema/theater" query, biased to the
   * location. This catches small single-screen and local theaters
   * that Google sometimes files under a generic category instead
   * of `movie_theater`, so they'd otherwise never show up.
   */
  async _searchTextLoose(lat, lng, radiusMeters) {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.API_KEY,
        'X-Goog-FieldMask': this._FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: 'movie theater cinema',
        maxResultCount: 20,
        locationBias: {
          circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
        },
      }),
    });
    if (!res.ok) return []; // text search is a bonus pass — fail quietly, typed search already has results
    const data = await res.json();
    return data.places || [];
  },

  /**
   * Finds real movie theaters within `radiusMeters` of (lat, lng),
   * including small/local/independent theaters — not just chains.
   * Runs a typed search and a loose text search in parallel, merges
   * and dedupes by place ID, then sorts by actual distance.
   */
  async nearbyTheaters(lat, lng, radiusMeters = 20000) {
    const [typed, loose] = await Promise.all([
      this._searchNearbyTyped(lat, lng, radiusMeters),
      this._searchTextLoose(lat, lng, radiusMeters).catch(() => []),
    ]);

    const byId = new Map();
    [...typed, ...loose].forEach(p => {
      if (p.id && !byId.has(p.id)) byId.set(p.id, p);
    });

    const theaters = Array.from(byId.values()).map(p => ({
      placeId: p.id,
      name: p.displayName?.text || 'Cinema',
      address: p.formattedAddress || '',
      lat: p.location?.latitude,
      lng: p.location?.longitude,
      rating: p.rating ?? null,
      ratingCount: p.userRatingCount ?? 0,
      openNow: p.currentOpeningHours?.openNow ?? null,
      mapsUrl: p.googleMapsUri || null,
    }));

    // Sort by real great-circle distance from the user — merging two
    // queries means the API's own DISTANCE ranking no longer holds.
    theaters.forEach(t => {
      t.distanceKm = (t.lat != null && t.lng != null)
        ? Geo.distanceKm(lat, lng, t.lat, t.lng)
        : Infinity;
    });
    theaters.sort((a, b) => a.distanceKm - b.distanceKm);

    return theaters;
  },

  /**
   * Geocodes a free-text city/area name to lat/lng using Places Text Search
   * (New) — used when the user types a city instead of sharing GPS.
   */
  async geocodeCity(query) {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.API_KEY,
        'X-Goog-FieldMask': 'places.location,places.formattedAddress,places.displayName',
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
    });
    if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) throw new Error('City not found.');
    return {
      lat: place.location.latitude,
      lng: place.location.longitude,
      label: place.displayName?.text || query,
    };
  },
};

// ═══════════════════════════════════════════════════════
//  Geolocation — browser GPS + distance math
// ═══════════════════════════════════════════════════════

const Geo = {
  /** One raw call to the browser's geolocation API with given options. */
  _rawPosition(options) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        pos => resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy ?? null,
        }),
        reject,
        options
      );
    });
  },

  /**
   * Resolves { lat, lng, accuracyMeters } from the browser, or rejects
   * with a clear reason. Tries a short high-accuracy (GPS) request
   * first for the tightest fix; if that's denied outright we stop
   * immediately, but if it merely times out or reports "unavailable"
   * (common on desktops/laptops with no GPS chip, or indoors) we
   * retry once with relaxed settings — Wi-Fi/IP based, longer
   * timeout, cached fix allowed — rather than failing the user.
   */
  async getCurrentPosition(timeoutMs = 8000) {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser.');
    }

    const messages = {
      1: 'Location permission denied. You can pick your city manually instead.',
      2: 'Location unavailable right now.',
      3: 'Location request timed out.',
    };

    try {
      return await this._rawPosition({
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      });
    } catch (err) {
      if (err.code === 1) {
        // Permission denied — retrying won't help, surface it immediately.
        throw new Error(messages[1]);
      }
      // Timed out or position unavailable — retry with relaxed,
      // lower-power settings before giving up.
      try {
        return await this._rawPosition({
          enableHighAccuracy: false,
          timeout: Math.max(timeoutMs * 2, 15000),
          maximumAge: 5 * 60 * 1000,
        });
      } catch (err2) {
        throw new Error(messages[err2.code] || 'Could not get your location.');
      }
    }
  },

  /** Haversine formula — great-circle distance in km between two coordinates. */
  distanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth radius, km
    const dLat = this._toRad(lat2 - lat1);
    const dLng = this._toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  _toRad(deg) { return (deg * Math.PI) / 180; },

  formatDistance(km) {
    if (km < 1) return `${Math.round(km * 1000)} m away`;
    return `${km.toFixed(1)} km away`;
  },
};

// ═══════════════════════════════════════════════════════
//  Major Indian cities — fallback list for manual selection
//  (used when the person doesn't want to share GPS)
// ═══════════════════════════════════════════════════════
const INDIAN_CITIES = [
  { name: 'Chennai',    lat: 13.0827, lng: 80.2707 },
  { name: 'Mumbai',     lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi',      lat: 28.7041, lng: 77.1025 },
  { name: 'Bengaluru',  lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad',  lat: 17.3850, lng: 78.4867 },
  { name: 'Kolkata',    lat: 22.5726, lng: 88.3639 },
  { name: 'Pune',       lat: 18.5204, lng: 73.8567 },
  { name: 'Ahmedabad',  lat: 23.0225, lng: 72.5714 },
  { name: 'Jaipur',     lat: 26.9124, lng: 75.7873 },
  { name: 'Kochi',      lat:  9.9312, lng: 76.2673 },
  { name: 'Coimbatore', lat: 11.0168, lng: 76.9558 },
  { name: 'Lucknow',    lat: 26.8467, lng: 80.9462 },
];
