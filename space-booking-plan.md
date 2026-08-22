# Saga X Space Booking Plan

Rujukan ringkas untuk `space.sagaxventures.com` supaya booking hall rental, invoicing, dan payment flow kekal konsisten dengan brand Saga X.

## 1. Payment Section Copy

Use this copy on the booking page:

> Book your space, pay your way.
> Choose Billplz FPX for instant online payment, or use bank transfer and QR if you prefer manual payment.
> Your invoice will be sent automatically after booking.

### Payment options

- FPX via Billplz
- Manual bank transfer
- QR payment
- Invoice by email through Resend
- WhatsApp notification to `60137732703`

### Display details

- Company: Saga X Ventures
- Bank: Hong Leong Bank
- Account name: Saga X Ventures
- Account number: `3440 1065 516`

## 2. Booking and Invoice Flow

Recommended flow for V1:

1. Customer opens `space.sagaxventures.com`
2. Customer selects package:
   - `1 Hour - RM60`
   - `4 Hours - RM180`
   - `Full Day - RM300`
3. Customer picks date and time
4. System checks availability
5. Customer submits booking details
6. System creates an invoice
7. Customer chooses payment method:
   - Billplz FPX
   - bank transfer
   - QR payment
8. If FPX is chosen, redirect to Billplz checkout
9. If manual payment is chosen, show bank details and QR image
10. Customer uploads proof of payment if needed
11. Admin verifies payment
12. Booking status changes to confirmed
13. Invoice or receipt is emailed automatically

### Suggested booking statuses

- draft
- pending_payment
- pending_review
- confirmed
- cancelled
- completed

### Notes

- Billplz should be the source of truth for FPX payment status
- manual transfer should stay in `pending_review` until admin verification
- Resend should handle invoice and receipt emails
- WhatsApp can be used for booking alerts and admin notification

## 3. Layout and UI Direction

Keep the same Saga X theme, but make the page feel more like a booking system than a marketing site.

### Visual direction

- keep the existing Saga X blue accent
- use a clean white or off-white background
- use bold typography for package prices
- keep cards simple and spacious
- use the real hall photos heavily
- avoid clutter and long marketing paragraphs

### Suggested page order

1. Hero section with one main CTA
2. Package cards
3. Hall photos and highlights
4. Availability calendar
5. Booking form
6. Payment choice section
7. Invoice / receipt explanation
8. FAQ
9. Contact bar

### Mobile rules

- keep `Book Now` visible as early as possible
- make price and package choice obvious
- keep the form short
- use a sticky bottom CTA on mobile if needed

### Visual tone

- premium
- calm
- trustworthy
- practical
- ready for conversion
