# CinePlex — Live Movie Ticket Booking System

A fully working movie ticket booking web app with **real, live integrations**:
real movie data, real nearby theaters sorted by distance from your GPS
location, and real Razorpay test-mode payments — plus a booking-aware
chatbot. The frontend runs standalone (no backend needed for browsing/booking);
the Spring Boot backend is only required for the real Razorpay payment flow.

## ✨ What's live and how

| Feature | Powered by | Needs a key? |
|---|---|---|
| Posters, ratings, descriptions, backdrops | **TMDb API** | Yes (free) |
| Trailers | **YouTube** via TMDb's video data | Same TMDb key |
| Real theater names, addresses, ratings | **Google Places API (New)** | Yes (free tier) |
| "X km away", sorted nearest-first | Browser **Geolocation API** + Haversine distance | No — just a permission prompt |
| Payments (UPI / Card / Net Banking) | **Razorpay Checkout, Test Mode** | Yes (free), needs the Java backend running |
| Showtimes/screens/seat maps | Generated deterministically per real theater | No |
| Login / bookings / cancellations | `localStorage` via `js/store.js` | No |
| Chatbot | Local rule-based assistant, reads real app state | No |

Nothing here charges real money or costs money to run at this scale — TMDb,
Places, and Razorpay Test Mode are all free.

## 🚀 Setup (three keys, ~10 minutes total)

### 1. TMDb (movie posters/trailers) — same as before
`js/tmdb.js` → paste your key into `API_KEY`. Get one at
https://www.themoviedb.org/settings/api.

### 2. Google Places API (real theaters)

1. Go to **https://console.cloud.google.com/** → create a project (or pick an existing one)
2. **APIs & Services → Library** → search "Places API (New)" → **Enable**
3. **Billing** must be enabled on the project (Google requires a card on file,
   but the free monthly credit comfortably covers this project's usage —
   you will not be charged for normal testing/demo use)
4. **APIs & Services → Credentials → Create Credentials → API Key**
5. Click the new key → **Restrict key**:
   - Application restrictions → **Websites** → add `http://localhost:8765/*`
     (or whatever port you serve the frontend on) plus your real domain later
   - API restrictions → restrict to **Places API (New)**
6. Paste the key into `js/places.js` → `API_KEY`

Without this key, the app falls back to the same 3 generated Chennai theaters
as before — still fully functional, just not "real."

**Distance/location** needs no key — it's the browser's built-in Geolocation
API. The first time someone opens a movie page and clicks **"Use my
location"**, the browser will show its native permission prompt.

### 3. Razorpay (real test-mode payments) — needs the backend running

1. Sign up free at **https://dashboard.razorpay.com/signup**
2. You land in **Test Mode** automatically
3. **Settings → API Keys → Generate Test Key** → copy the Key ID and Key Secret
4. Paste into `backend/src/main/resources/application.properties`:
   ```properties
   razorpay.key.id=rzp_test_xxxxxxxxxxxxx
   razorpay.key.secret=xxxxxxxxxxxxxxxxxxxxxxxx
   ```
5. Also set your MySQL credentials in the same file, then run the backend:
   ```bash
   cd backend
   mysql -u root -p < sql/schema.sql
   mvn spring-boot:run
   ```
   Full details: `backend/RAZORPAY_SETUP.md`

**Without the backend running**, the seat-selection page still works end to
end — `js/api.js` detects the backend is unreachable and transparently falls
back to a clearly-labeled simulated payment (you'll see "(simulated — backend
offline)" on the booking and a console warning). This means you can demo the
whole app from the frontend alone; the backend is only needed for genuine
Razorpay test transactions with real test cards/UPI IDs.

## 🏃 Run it

```bash
cd movie-booking-live
python3 -m http.server 8765
```
Open **http://localhost:8765**. (Can't use `file://` directly — geolocation,
fetch, and the Places API all require a proper origin.)

If you also want real payments, in a second terminal:
```bash
cd movie-booking-live/backend
mvn spring-boot:run
```
The frontend talks to it automatically at `http://localhost:8080/api`.

## 🎬 Try the full flow

1. **Browse** live now-playing movies on the homepage
2. **Click a poster's ▶** to watch the real trailer
3. **Click "Book Now"** → on the movie page, click **"Use my location"**
   (allow the permission prompt) — real cinemas near you load, sorted by
   distance, with ratings and "Open Now" status from Google
4. Pick a date → pick a showtime at any nearby theater
5. **Sign up**, or use the seeded admin (`admin@cineplex.com` / `admin123`)
6. **Select seats** → click **"Pay with Razorpay"**
   - With the backend running: Razorpay's real Checkout modal opens. Use
     test UPI `success@razorpay` or test card `4111 1111 1111 1111`
     (any future expiry/CVV) — no real money moves
   - Without the backend: a clearly-labeled simulated payment completes instead
7. View your booking in **My Bookings**, with the real Razorpay payment ID
   attached, or cancel it (seats are released)
8. Open the **chatbot** (bottom-right bubble) and ask things like *"what's
   showing now?"*, *"how do I cancel a booking?"*, or *"track my booking"* —
   it reads your real booking data and can navigate you around the app

## 📁 Structure

```
movie-booking-live/
├── index.html, css/style.css
├── js/
│   ├── tmdb.js          TMDb client — posters, trailers, search, genres
│   ├── places.js         Google Places (New) client + Geolocation + Haversine distance
│   ├── store.js          Client-side data layer — auth, shows, seats, bookings
│   ├── api.js             Backend client for payments, with offline simulation fallback
│   ├── razorpay.js       Razorpay Checkout.js integration
│   ├── auth.js            Session helpers, navbar, toasts
│   ├── movies.js          Homepage rendering + trailer modal
│   └── chatbot.js         Rule-based assistant, reads real app state
├── pages/
│   ├── login.html / register.html
│   ├── movie.html         Location bar (GPS or pick-a-city), real theaters, showtimes
│   ├── seats.html         Seat map + Razorpay payment
│   ├── history.html       Booking history with cancel
│   └── admin.html         Dashboard: revenue, bookings, users
└── backend/                Spring Boot + MySQL — only needed for real Razorpay orders
    ├── RAZORPAY_SETUP.md
    ├── pom.xml
    ├── sql/schema.sql
    └── src/main/java/com/moviebooking/
        ├── controller/PaymentController.java   ← new: create-order, verify
        ├── service/RazorpayService.java         ← new: order creation + signature check
        └── ...(auth, movies, bookings, security — unchanged)
```

## ⚠️ Notes & honest limitations

- **Theaters are real, showtimes are not.** No public/free API lists actual
  PVR/INOX showtimes — those generate deterministically per real theater so
  they're consistent across visits, but they aren't pulled from a live
  booking system.
- **Razorpay stays in Test Mode.** Going live requires the business owner to
  complete KYC (PAN, bank account, business proof) directly with Razorpay —
  that step is specific to whoever owns the business entity and can't be
  done on your behalf.
- **Geolocation accuracy** depends on the device/browser — usually very good
  on mobile (GPS), coarser on desktop (Wi-Fi/IP-based).
- **Google Places requires billing enabled** on the Cloud project, even
  though normal demo/testing usage stays within the free monthly credit.
