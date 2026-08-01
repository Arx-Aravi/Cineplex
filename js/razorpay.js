// ═══════════════════════════════════════════════════════
//  Razorpay Checkout — Test Mode Integration
//  Order creation happens on the Spring Boot backend
//  (POST /api/payments/create-order) because the Key Secret
//  must never live in browser JS. This file only talks to
//  our own backend + Razorpay's public Checkout.js widget.
// ═══════════════════════════════════════════════════════

const RazorpayPay = {
  CHECKOUT_SCRIPT: 'https://checkout.razorpay.com/v1/checkout.js',
  _scriptLoaded: false,

  async _ensureScriptLoaded() {
    if (this._scriptLoaded || window.Razorpay) { this._scriptLoaded = true; return; }
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = this.CHECKOUT_SCRIPT;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load Razorpay Checkout. Check your internet connection.'));
      document.head.appendChild(script);
    });
    this._scriptLoaded = true;
  },

  /**
   * Full test-mode payment flow:
   *  1. Ask our backend to create a Razorpay order (uses Key Secret server-side)
   *  2. Open Razorpay Checkout with that order_id
   *  3. On success, send the signature back to our backend to verify
   * Returns { success, paymentId, orderId } or throws on failure/cancel.
   */
  async pay({ amountRupees, receipt, name, description, prefillEmail, prefillName, prefillPhone }) {
    await this._ensureScriptLoaded();

    // Step 1 — create order server-side
    let order;
    try {
      order = await Api.request('POST', '/payments/create-order', { amount: amountRupees, receipt });
    } catch (err) {
      throw new Error(`Could not start payment: ${err.message}`);
    }

    // Backend unreachable → Api.js already substituted a simulated order.
    // Skip the real Razorpay widget (it needs a real key) and fake the flow
    // so the demo still works end-to-end without the Java backend running.
    if (order._simulated) {
      return this._simulatedCheckout({ amountRupees, order });
    }

    // Step 2 — open Checkout
    return new Promise((resolve, reject) => {
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: name || 'CinePlex',
        description: description || 'Movie ticket booking',
        prefill: {
          name: prefillName || '',
          email: prefillEmail || '',
          contact: prefillPhone || '',
        },
        theme: { color: '#E8A020' },
        handler: async (response) => {
          // Step 3 — verify signature with our backend before trusting the payment
          try {
            const verifyRes = await Api.request('POST', '/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            if (verifyRes.verified) {
              resolve({ success: true, paymentId: response.razorpay_payment_id, orderId: response.razorpay_order_id });
            } else {
              reject(new Error('Payment signature could not be verified. Please contact support.'));
            }
          } catch (err) {
            reject(new Error(`Payment made but verification failed: ${err.message}`));
          }
        },
        modal: {
          ondismiss: () => reject(new Error('Payment cancelled.')),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        reject(new Error(resp.error?.description || 'Payment failed. Please try again.'));
      });
      rzp.open();
    });
  },

  /**
   * Used only when the Spring Boot backend isn't reachable — keeps the
   * frontend demo-able on its own while making it unmistakably clear
   * (in the UI and console) that this isn't a real Razorpay transaction.
   */
  async _simulatedCheckout({ amountRupees, order }) {
    await new Promise(r => setTimeout(r, 1600)); // feels like a real round trip
    return {
      success: true,
      paymentId: 'pay_SIMULATED_' + Date.now(),
      orderId: order.orderId,
      simulated: true,
    };
  },
};
