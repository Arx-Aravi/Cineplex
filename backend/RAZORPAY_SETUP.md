# Razorpay Test Mode Setup

This backend creates Razorpay orders server-side (required — the Key Secret
must never be in browser JavaScript) and verifies payment signatures after
checkout completes. No real money moves in test mode.

## 1. Get test keys (free, ~3 minutes)

1. Sign up at https://dashboard.razorpay.com/signup
2. You'll land in **Test Mode** by default (toggle top-right confirms this)
3. Go to **Settings → API Keys → Generate Test Key**
4. Copy the **Key Id** (starts `rzp_test_...`) and **Key Secret**

## 2. Add them to the backend

In `src/main/resources/application.properties`:

```properties
razorpay.key.id=rzp_test_xxxxxxxxxxxxx
razorpay.key.secret=xxxxxxxxxxxxxxxxxxxxxxxx
```

Never commit real keys to a public repo — even test keys. Use environment
variables in production:
```properties
razorpay.key.id=${RAZORPAY_KEY_ID}
razorpay.key.secret=${RAZORPAY_KEY_SECRET}
```

## 3. How the flow works

```
Browser                          Spring Boot Backend              Razorpay
   │                                     │                            │
   │  POST /api/payments/create-order    │                            │
   │ ───────────────────────────────────>│                            │
   │                                     │  create order (Key Secret) │
   │                                     │ ──────────────────────────>│
   │                                     │ <──────────────────────────│
   │  { orderId, keyId, amount }         │                            │
   │ <───────────────────────────────────│                            │
   │                                                                  │
   │  opens Razorpay Checkout.js modal using orderId + keyId          │
   │ ────────────────────────────────────────────────────────────────>
   │  user pays with TEST card/UPI (mock bank page, Success/Failure)  │
   │ <────────────────────────────────────────────────────────────────
   │  { razorpay_payment_id, razorpay_order_id, razorpay_signature }  │
   │                                     │                            │
   │  POST /api/payments/verify          │                            │
   │ ───────────────────────────────────>│                            │
   │                                     │  verify HMAC signature     │
   │                                     │  (Key Secret, no network)  │
   │  { verified: true }                 │                            │
   │ <───────────────────────────────────│                            │
   │                                                                  │
   │  only NOW does the frontend confirm the booking in the database  │
```

## 4. Test credentials (Test Mode only)

| Method | Value |
|---|---|
| Card number | `4111 1111 1111 1111` (any future expiry, any CVV) |
| UPI | `success@razorpay` (always succeeds) or `failure@razorpay` (always fails) |
| Netbanking | Pick any bank → mock page → click **Success** |

These only work with `rzp_test_...` keys. Full list: https://razorpay.com/docs/payments/payment-gateway/test-card-upi-details/

## 5. Going live later

Razorpay requires business KYC (PAN, bank account, business proof) before
issuing Live Mode keys — this is an Anthropic-can't-do-this-for-you step,
specific to whoever owns the business entity accepting payments.
