# Saga X Ventures Space

Isolated workspace for the `space.sagaxventures.com` booking flow.

- `local.env` holds the local env values for bookings, Resend, and Billplz.
- `admin.html` and `admin.js` provide the admin dashboard for promo pricing and booking edits.
- `space-booking-plan.md` holds the booking copy, flow, and layout direction.
- `server.js` runs the local booking server and Billplz / Resend wiring.

This folder is separate from `work2u-crm` so Saga X booking changes stay isolated.

## API endpoints

| Method | Path                          | Purpose                                                                 |
| ------ | ----------------------------- | ----------------------------------------------------------------------- |
| GET    | `/api/public-config`          | Site name, bank details, and package offers for the booking form.       |
| GET    | `/api/availability`           | Calendar month view of available vs fully-booked days. Optional `?month=YYYY-MM`. |
| POST   | `/api/bookings`               | Create a booking; returns the Billplz payment URL when payment_method is `billplz`. |
| GET    | `/api/bookings/[reference]`   | Read a single booking (admin only).                                     |
| PATCH  | `/api/bookings/[reference]`   | Update a booking (admin only).                                          |
| POST   | `/api/bookings/[reference]/resend` | Resend the invoice email (admin only).                              |
| GET    | `/api/admin/bookings`         | List all bookings (admin only).                                         |
| GET/PATCH | `/api/admin/settings`      | Read/update package overrides (admin only).                             |
| POST   | `/api/billplz/callback`       | Billplz webhook receiver.                                               |
| GET    | `/api/billplz/redirect`       | Billplz redirect target after payment.                                  |

All admin endpoints require an `x-admin-key` header (or `Authorization: Bearer ...`)
matching `ADMIN_ACCESS_KEY` from `local.env`.

## Local run

1. Fill in `local.env`.
2. Add your verified Resend sender domain values.
3. Set `BOOKING_PUBLIC_URL` when you want Billplz callback and redirect URLs to point to a public domain or tunnel.
4. Use `ADMIN_ACCESS_KEY` to unlock the admin dashboard at `/admin`.
5. Run `npm start`.
