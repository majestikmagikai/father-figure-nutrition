# 🚀 Production Launch Checklist

## Stripe

- [ ] Swap `VITE_STRIPE_PUBLISHABLE_KEY` to the live `pk_live_...` key in Cloudflare
- [ ] Swap `STRIPE_SECRET_KEY` to the live `sk_live_...` key in Supabase secrets
- [ ] Create a live mode webhook in Stripe Dashboard pointing to the same Supabase URL
- [ ] Set `STRIPE_WEBHOOK_SECRET` to the live `whsec_...` in Supabase secrets

## Supabase / Cloudflare

- [ ] Set `ALLOWED_ORIGIN` to the production domain:
  ```bash
  supabase secrets set ALLOWED_ORIGIN=https://yourdomain.com
  ```
- [ ] Add the production reset password URL to Supabase Auth redirect URLs

## Code Changes Completed ✅

- Secrets removed from `.env`, admin emails out of client bundle
- Admin roles set via `app_metadata` in Supabase SQL
- DOMPurify sanitization on all rich text output
- CORS locked to `ALLOWED_ORIGIN` on all edge functions
- Stripe error details no longer leaked to client
- Checkout PaymentIntent gated on shipping rates loading
- `order_items` UPDATE RLS policy added
- All `as any` casts removed
