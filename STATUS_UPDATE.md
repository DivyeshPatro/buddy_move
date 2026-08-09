# MoveBuddy — Status on the three reported issues

_10 Aug 2026_

---

## 1. Maps: autocomplete and location display — **Fixed**

**What was wrong — two separate causes:**

- The Google Maps API key is **suspended by Google**. Verified directly in the browser:
  `Permission denied: Consumer 'api_key:AIzaSy...' has been suspended.`
  Both keys in the project fail identically, which means the suspension is at the
  Google Cloud **project** level (billing/ToS), not per-key.
- The OpenStreetMap fallback only triggered when Google threw an error — not when it
  returned an empty result, which is the common failure mode once a key is restricted.
  So the dropdown silently stayed empty.

**Fixed:**
- Falls back to OpenStreetMap/Nominatim on empty responses as well as errors.
- A typed address now resolves to coordinates on blur, so the map pins even if no
  suggestion was clicked. This was why the map stayed blank despite the field accepting input.
- The map no longer gives up permanently if the Leaflet script loads late.

**Verified in the browser:** suggestions appear while typing, the pin drops at the correct
coordinates, and the route line renders between origin and destination.

**Known limitation to be aware of:** OpenStreetMap maps areas, roads and landmarks — not
individual company names. Searching "Zessta Hyderabad" returns nothing; "Gachibowli" or
"Hitech City" work fine. This is inherent to moving off Google Places, not a defect. The
field now explains this instead of showing an empty dropdown. If office-level precision is
needed, the options are to restore the Google project, add the offices to OpenStreetMap, or
maintain a small internal list of common destinations.

---

## 2. Razorpay test payment panel — **Fixed and confirmed**

**What was wrong — and it was not Razorpay.** Razorpay creates orders correctly; a real
order (`order_TNnNfy...`) was created during testing. The problem was that
`/api/wallet/topup-order` wrote the **entire database** to Supabase before replying —
measured at **48 seconds**. The browser sat on a spinner the whole time and no payment
overlay ever opened.

A second, independent defect: the built-in test overlay was nested inside an element using
`backdrop-blur`, which creates a CSS stacking context. The overlay was rendering, but trapped
behind the wallet modal.

**Fixed:**
- Payment records now persist in the background instead of blocking the HTTP response.
- The test overlay renders through a portal, above all other layers.
- Request timeouts added on both client and server so this can never hang silently again.
- The checkout SDK is loaded on demand rather than relying solely on the static script tag.

**Confirmed working:** the live Razorpay checkout now opens on Add Funds, showing the full
payment sheet (UPI QR, cards, netbanking, wallets) against the test account.

---

## 3. Admin Panel — Ride Management not showing rides — **Fixed and confirmed**

**What was wrong.** The page never reaches the ride query — every admin endpoint returns
`403 Forbidden: not an admin account` first. The reason is in the database: the
`admin@movebuddy.com` account has `role = HOST` instead of `ADMIN`.

**How it happened.** The guest/host toggle in Settings calls an endpoint that overwrote
`user.role` with no guard for admin accounts. The toggle is shown to every signed-in user,
so a single click permanently demoted the admin — and locked away the admin panel, which was
the only route back.

**Fixed in code:**
- The endpoint now refuses to change the role of an admin account.
- The toggle is hidden for admin accounts.
- Two further bugs found and fixed in the ride query itself: a status-value mismatch that
  returned zero rows, and a date-conversion crash that caused the request to hang with no
  response.

**Data repair applied.** A script was added to correct the affected rows —

```
npx tsx scripts/restore-admin-role.ts          # dry run, reports only
npx tsx scripts/restore-admin-role.ts --apply  # applies the fix
```

**Confirmed working:** Ride Management now lists the connected rides. The script is kept in
the repo in case any other staff account was demoted the same way.

---

## Also found while investigating

Two pre-existing issues, unrelated to the three reports, worth scheduling:

- **Database writes are very slow.** Every data change rewrites the whole database to
  Supabase. This is `await`ed in 11 more places and will cause the same multi-second delays
  elsewhere. Worth changing to write only the changed record.
- **Stored ID documents cannot be decrypted.** The PII encryption key no longer matches what
  licence/Aadhaar numbers were encrypted with, so those fields fail to load on startup and
  will not display in KYC.

## Test coverage added

12 automated tests covering the address fallback, the map rendering, and the payment overlay.
Each one fails against the previous code and passes against the fix. Full suite: 92 passing.
