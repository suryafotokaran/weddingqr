/**
 * Razorpay frontend utility
 * - Lazily loads the Razorpay checkout script from CDN
 * - Exposes openRazorpayCheckout() to open the payment popup
 */

/** Load Razorpay script once, return the global Razorpay constructor */
function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error('Failed to load Razorpay script'));
    document.body.appendChild(script);
  });
}

/**
 * Open Razorpay checkout popup.
 *
 * @param {object} opts
 * @param {string}   opts.orderId    – Razorpay order_id from Edge Function
 * @param {number}   opts.amount     – Amount in paise (₹ × 100)
 * @param {string}   opts.plan       – 'basic' | 'pro' | 'premium'
 * @param {number}   opts.quantity   – Number of events being purchased
 * @param {object}   opts.user       – Supabase auth user object
 * @param {Function} opts.onSuccess  – Called with { razorpay_payment_id, razorpay_order_id, razorpay_signature }
 * @param {Function} opts.onFailure  – Called with error message string
 */
export async function openRazorpayCheckout({ orderId, amount, plan, quantity, user, onSuccess, onFailure }) {
  try {
    const RazorpayCheckout = await loadRazorpayScript();

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount,
      currency: 'INR',
      name: 'WeddingQR',
      description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan × ${quantity} event${quantity > 1 ? 's' : ''}`,
      image: '/favicon.ico',
      order_id: orderId,
      prefill: {
        name:  user?.user_metadata?.full_name  || '',
        email: user?.email                      || '',
      },
      theme: {
        color: '#00685f',
      },
      handler: function (response) {
        // response = { razorpay_payment_id, razorpay_order_id, razorpay_signature }
        onSuccess(response);
      },
      modal: {
        ondismiss: function () {
          onFailure('Payment cancelled');
        },
      },
    };

    const rzp = new RazorpayCheckout(options);
    rzp.on('payment.failed', function (response) {
      onFailure(response.error?.description || 'Payment failed');
    });
    rzp.open();

  } catch (err) {
    onFailure(err.message || 'Failed to open payment window');
  }
}
