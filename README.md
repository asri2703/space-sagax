# Saga X Ventures Space

Isolated workspace for the `space.sagaxventures.com` booking flow.

- `local.env` holds the local env values for bookings, Resend, and Billplz.
- `admin.html` and `admin.js` provide the admin dashboard for promo pricing and booking edits.
- `space-booking-plan.md` holds the booking copy, flow, and layout direction.
- `server.js` runs the local booking server and Billplz / Resend wiring.

This folder is separate from `work2u-crm` so Saga X booking changes stay isolated.

## Local run

1. Fill in `local.env`.
2. Add your verified Resend sender domain values.
3. Set `BOOKING_PUBLIC_URL` when you want Billplz callback and redirect URLs to point to a public domain or tunnel.
4. Use `ADMIN_ACCESS_KEY` to unlock the admin dashboard at `/admin`.
5. Run `npm start`.
