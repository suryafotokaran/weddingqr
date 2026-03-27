import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Check, Zap, Star, Crown, Loader2 } from 'lucide-react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { supabase } from '../lib/supabase';
import Toast from '../components/Toast';
import { openRazorpayCheckout } from '../lib/razorpay';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const plans = [
  {
    key: 'basic',
    icon: Zap,
    name: 'Starter Plan',
    price: 149,
    amountPaise: 14900,
    photosLimit: 500,
    storageGb: 5,
    tagline: 'Perfect for small events & trials',
    features: [
      'Up to 500 Photos',
      'Max 50MB per Photo',
      '30 Days Event Access',
      'Original Image Download',
    ],
    highlights: ['Great for Intimate Events', 'High-Res Downloads'],
    quota: '500 photos',
    popular: false,
    iconBg: '#eeeeee',
    iconColor: '#3d4947',
    checkBg: '#f3f3f4',
    checkColor: '#00685f',
    highlightColor: '#6d7a77',
    highlightCheck: '#00685f',
    btnBorder: '#bcc9c6',
    btnColor: '#00685f',
  },
  {
    key: 'pro',
    icon: Star,
    name: 'Professional Plan',
    badge: 'Most Popular',
    price: 199,
    amountPaise: 19900,
    photosLimit: 1000,
    storageGb: 10,
    tagline: 'Best for weddings & social events',
    features: [
      'Up to 1000 Photos',
      'Max 50MB per Photo',
      '30 Days Event Access',
      'Original Image Download',
      'Priority 24/7 Support',
    ],
    highlights: ['Perfect for Full Weddings', 'Priority Assistance', 'Full Quality Assets'],
    quota: '1000 photos',
    popular: true,
  },
  {
    key: 'premium',
    icon: Crown,
    name: 'Elite Plan',
    price: 249,
    amountPaise: 24900,
    photosLimit: 2000,
    storageGb: 20,
    tagline: 'Ultimate coverage for large scale events',
    features: [
      'Up to 2000 Photos',
      'Max 50MB per Photo',
      '30 Days Event Access',
      'Original Image Download',
      'Dedicated Event Manager',
    ],
    highlights: ['Max Photo Capacity', 'VIP Management', 'Premium Experience'],
    quota: '2000 photos',
    popular: false,
    iconBg: '#ffdbcf',
    iconColor: '#85513e',
    checkBg: '#ffdbcf',
    checkColor: '#85513e',
    highlightColor: '#85513e',
    highlightCheck: '#85513e',
    btnBorder: '#fdbaa2',
    btnColor: '#85513e',
  },
];

// ── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({ plan, onBuy, loadingKey }) {
  const isLoading = loadingKey === plan.key;

  const BuyButton = ({ style, className, children }) => (
    <button
      onClick={() => onBuy(plan)}
      disabled={!!loadingKey}
      className={className}
      style={style}
    >
      {isLoading
        ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Processing…</span>
        : children
      }
    </button>
  );

  if (plan.popular) {
    return (
      <div
        className="rounded-2xl overflow-hidden flex flex-col shadow-xl scale-[1.03] transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
        style={{ background: 'linear-gradient(145deg, #00685f 0%, #008378 100%)', border: '2px solid #00685f' }}
      >
        <div className="p-7 flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.18)' }}>
              <Star size={20} style={{ color: '#89f5e7' }} />
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: '#89f5e7', color: '#00685f' }}>
              Most Popular
            </span>
          </div>

          <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#89f5e7' }}>{plan.name}</p>

          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-4xl font-extrabold text-white">₹{plan.price.toLocaleString()}</span>
            <span className="text-sm text-green-200">/ event</span>
          </div>

          <p className="text-xs font-semibold mb-1" style={{ color: '#89f5e7' }}>📸 {plan.quota}</p>
          <p className="text-sm mb-5" style={{ color: '#6bd8cb' }}>{plan.tagline}</p>
          <div className="h-px mb-5" style={{ background: 'rgba(255,255,255,0.2)' }} />

          <ul className="space-y-2 mb-5 flex-1">
            {plan.features.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-white">
                <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <Check size={10} strokeWidth={3} className="text-white" />
                </span>
                {f}
              </li>
            ))}
          </ul>

          <ul className="space-y-1 mb-6">
            {plan.highlights.map(h => (
              <li key={h} className="flex items-center gap-2 text-xs font-medium" style={{ color: '#89f5e7' }}>
                <Check size={12} strokeWidth={2.5} style={{ color: '#89f5e7' }} /> {h}
              </li>
            ))}
          </ul>

          <BuyButton
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95 hover:bg-zinc-100 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: '#ffffff', color: '#00685f', border: 'none' }}
          >
            Choose Plan
          </BuyButton>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl bg-white"
      style={{ border: '2px solid #e2e2e2' }}
    >
      <div className="p-7 flex flex-col h-full">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: plan.iconBg }}>
          <plan.icon size={20} style={{ color: plan.iconColor }} />
        </div>

        <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: plan.highlightColor }}>{plan.name}</p>

        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-4xl font-extrabold" style={{ color: '#1a1c1c' }}>₹{plan.price.toLocaleString()}</span>
          <span className="text-sm" style={{ color: '#6d7a77' }}>/ event</span>
        </div>

        <p className="text-xs font-semibold mb-1" style={{ color: plan.highlightColor }}>📸 {plan.quota}</p>
        <p className="text-sm mb-5" style={{ color: '#6d7a77' }}>{plan.tagline}</p>
        <div className="h-px mb-5" style={{ background: '#e2e2e2' }} />

        <ul className="space-y-2 mb-5 flex-1">
          {plan.features.map(f => (
            <li key={f} className="flex items-center gap-2 text-sm" style={{ color: '#3d4947' }}>
              <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: plan.checkBg }}>
                <Check size={10} strokeWidth={3} style={{ color: plan.checkColor }} />
              </span>
              {f}
            </li>
          ))}
        </ul>

        <ul className="space-y-1 mb-6">
          {plan.highlights.map(h => (
            <li key={h} className="flex items-center gap-2 text-xs font-medium" style={{ color: plan.highlightColor }}>
              <Check size={12} strokeWidth={2.5} style={{ color: plan.highlightCheck }} /> {h}
            </li>
          ))}
        </ul>

        <BuyButton
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95 hover:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ border: `2px solid ${plan.btnBorder}`, color: plan.btnColor, background: 'transparent' }}
        >
          Choose Plan
        </BuyButton>
      </div>
    </div>
  );
}

// ── Main Pricing Page ────────────────────────────────────────────────────────
export default function Pricing() {
  const navigate = useNavigate();
  const [loadingKey, setLoadingKey] = useState(null);
  const [toast, setToast] = useState(null);
  const { data: userData } = useCurrentUser();
  const user = userData?.user;

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleBuy = async (plan) => {
    if (!user) {
      showToast('error', 'Not logged in', 'Please sign in to proceed.');
      return;
    }

    setLoadingKey(plan.key);
    try {
      // 1. Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      // 2. Create Razorpay order via Edge Function
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plan:        plan.key,
          amountPaise: plan.amountPaise,
          photosLimit: plan.photosLimit,
        }),
      });

      const orderData = await res.json();
      if (!res.ok) throw new Error(orderData.error || 'Failed to create order');

      // 3. Open Razorpay checkout
      await openRazorpayCheckout({
        orderId:  orderData.orderId,
        amount:   orderData.amount,
        plan:     plan.key,
        quantity: 1,
        user,
        onSuccess: async (response) => {
          try {
            // 4. Verify payment via Edge Function
            const verifyRes = await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_signature:  response.razorpay_signature,
                plan:                plan.key,
                amountPaise:         plan.amountPaise,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || 'Payment verification failed');

            // 5. Store purchase info in sessionStorage and navigate
            sessionStorage.setItem('pendingPurchase', JSON.stringify({
              purchaseId:  verifyData.purchaseId,
              plan:        plan.key,
              photosLimit: verifyData.photosLimit,
              storageGb:   verifyData.storageGb,
            }));

            showToast('success', 'Payment Successful!', 'Redirecting to create your event…');
            setTimeout(() => navigate('/createevent'), 1200);
          } catch (err) {
            showToast('error', 'Verification Failed', err.message);
            setLoadingKey(null);
          }
        },
        onFailure: (msg) => {
          if (msg !== 'Payment cancelled') {
            showToast('error', 'Payment Failed', msg);
          }
          setLoadingKey(null);
        },
      });
    } catch (err) {
      showToast('error', 'Error', err.message);
      setLoadingKey(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-10 px-2">

        {/* Header */}
        <div className="text-center mb-10">
          <span
            className="inline-block px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
            style={{ background: '#89f5e7', color: '#00685f' }}
          >
            Step 1: Choose Plan
          </span>
          <h1 className="text-4xl font-bold tracking-tight mb-3" style={{ color: '#1a1c1c' }}>
            Choose Your Event Plan
          </h1>
          <p className="max-w-xl mx-auto text-sm leading-relaxed" style={{ color: '#6d7a77' }}>
            Each plan unlocks one event slot with a dedicated photo quota. Pay once, create your event instantly.
          </p>
        </div>

        {/* Stepper */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-0 mb-16 relative">
          <div className="flex flex-col items-center text-center px-6 relative z-10">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-lg"
              style={{ background: '#00685f', color: '#89f5e7' }}>
              <Star size={20} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1a1c1c' }}>1. Choose Plan</p>
          </div>
          <div className="hidden md:block h-px w-20 bg-zinc-200 mt-[-20px]" />
          <div className="flex flex-col items-center text-center px-6 relative z-10">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-md"
              style={{ background: '#ffffff', color: '#00685f', border: '2px solid #e2e2e2' }}>
              <Zap size={20} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1a1c1c' }}>2. Pay Securely</p>
          </div>
          <div className="hidden md:block h-px w-20 bg-zinc-200 mt-[-20px]" />
          <div className="flex flex-col items-center text-center px-6 relative z-10">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-md"
              style={{ background: '#ffffff', color: '#00685f', border: '2px solid #e2e2e2' }}>
              <Crown size={20} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1a1c1c' }}>3. Create Event</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mt-10">
          {plans.map(plan => (
            <PlanCard
              key={plan.key}
              plan={plan}
              onBuy={handleBuy}
              loadingKey={loadingKey}
            />
          ))}
        </div>

        <p className="text-center text-xs mt-10" style={{ color: '#bcc9c6' }}>
          Need a custom enterprise plan or bulk event credits?{' '}
          <a href="mailto:support@weddingqr.app" style={{ color: '#00685f' }} className="hover:underline">Contact us</a>
        </p>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </DashboardLayout>
  );
}
