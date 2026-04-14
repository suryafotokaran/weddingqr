import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Check, Zap, Star, Crown, Loader2, CalendarDays, Images } from 'lucide-react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { supabase } from '../lib/supabase';
import Toast from '../components/Toast';
import { openRazorpayCheckout } from '../lib/razorpay';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// ── Plan UI metadata ─────────────────────────────────────────────────────────
const PLAN_UI = {
  starter: {
    icon: Zap, popular: false,
    iconBg: '#eeeeee', iconColor: '#3d4947',
    checkBg: '#f3f3f4', checkColor: '#00685f',
    highlightColor: '#6d7a77', highlightCheck: '#00685f',
    btnBorder: '#bcc9c6', btnColor: '#00685f',
    features: ['Original Image Download', 'Full QR Guest Upload', '1-Year Access'],
    highlights: ['Great for Intimate Events', 'High-Res Downloads'],
  },
  pro: {
    icon: Star, popular: true,
    features: ['Original Image Download', 'Full QR Guest Upload', '1-Year Access', 'Priority 24/7 Support'],
    highlights: ['Perfect for Full Weddings', 'Priority Assistance', 'Full Quality Assets'],
  },
  premium: {
    icon: Crown, popular: false,
    iconBg: '#ffdbcf', iconColor: '#85513e',
    checkBg: '#ffdbcf', checkColor: '#85513e',
    highlightColor: '#85513e', highlightCheck: '#85513e',
    btnBorder: '#fdbaa2', btnColor: '#85513e',
    features: ['Original Image Download', 'Full QR Guest Upload', '1-Year Access', 'Dedicated Event Manager'],
    highlights: ['Maximum Photo Capacity', 'VIP Management', 'Premium Experience'],
  },
};

function buildPlan(dbRow) {
  const ui = PLAN_UI[dbRow.key] ?? PLAN_UI.starter;
  return {
    ...ui,
    key:            dbRow.key,
    name:           dbRow.label,
    price:          Math.round(dbRow.amount_paise / 100),
    amountPaise:    dbRow.amount_paise,
    photosLimit:    dbRow.photos_limit,
    maxImageSizeMb: dbRow.max_image_size_mb,
    durationDays:   dbRow.duration_days,
    tagline:        dbRow.tagline,
    features: [
      `${dbRow.photos_limit.toLocaleString()} Total Photos`,
      `Max ${dbRow.max_image_size_mb} MB per Photo`,
      ...(ui.features ?? []),
    ],
  };
}

// ── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({ plan, onBuy, loadingKey, purchased }) {
  const isLoading  = loadingKey === plan.key;
  const isDisabled = !!loadingKey || purchased;

  if (plan.popular) {
    return (
      <div
        className="rounded-2xl overflow-hidden flex flex-col shadow-xl scale-[1.03] transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
        style={{
          background: purchased ? 'linear-gradient(145deg, #a0a0a0 0%, #b8b8b8 100%)' : 'linear-gradient(145deg, #00685f 0%, #008378 100%)',
          border: '2px solid #00685f',
          filter: purchased ? 'blur(0px)' : 'none',
          opacity: purchased ? 0.7 : 1,
        }}
      >
        <div className="p-7 flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.18)' }}>
              <Star size={20} style={{ color: '#89f5e7' }} />
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: '#89f5e7', color: '#00685f' }}>
              {purchased ? 'Plan Purchased' : 'Most Popular'}
            </span>
          </div>
          <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#89f5e7' }}>{plan.name}</p>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-4xl font-extrabold text-white">₹{plan.price.toLocaleString()}</span>
            <span className="text-sm text-green-200">/ year</span>
          </div>
          <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: '#89f5e7' }}>
            <Images size={12} /> {plan.photosLimit.toLocaleString()} photos · {plan.durationDays} days
          </p>
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
          <button
            onClick={() => !isDisabled && onBuy(plan)}
            disabled={isDisabled}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95 hover:bg-zinc-100 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: purchased ? '#d0d0d0' : '#ffffff', color: '#00685f', border: 'none' }}
          >
            {isLoading ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Processing…</span>
              : purchased ? 'Plan Purchased' : 'Choose Plan'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl bg-white"
      style={{ border: '2px solid #e2e2e2', opacity: purchased ? 0.6 : 1, filter: purchased ? 'blur(1.5px)' : 'none' }}
    >
      <div className="p-7 flex flex-col h-full">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: plan.iconBg }}>
          <plan.icon size={20} style={{ color: plan.iconColor }} />
        </div>
        <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: plan.highlightColor ?? '#6d7a77' }}>{plan.name}</p>
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-4xl font-extrabold" style={{ color: '#1a1c1c' }}>₹{plan.price.toLocaleString()}</span>
          <span className="text-sm" style={{ color: '#6d7a77' }}>/ year</span>
        </div>
        <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: plan.highlightColor ?? '#6d7a77' }}>
          <Images size={12} /> {plan.photosLimit.toLocaleString()} photos · {plan.durationDays} days
        </p>
        <p className="text-sm mb-5" style={{ color: '#6d7a77' }}>{plan.tagline}</p>
        <div className="h-px mb-5" style={{ background: '#e2e2e2' }} />
        <ul className="space-y-2 mb-5 flex-1">
          {plan.features.map(f => (
            <li key={f} className="flex items-center gap-2 text-sm" style={{ color: '#3d4947' }}>
              <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: plan.checkBg ?? '#f3f3f4' }}>
                <Check size={10} strokeWidth={3} style={{ color: plan.checkColor ?? '#00685f' }} />
              </span>
              {f}
            </li>
          ))}
        </ul>
        <ul className="space-y-1 mb-6">
          {plan.highlights.map(h => (
            <li key={h} className="flex items-center gap-2 text-xs font-medium" style={{ color: plan.highlightColor ?? '#6d7a77' }}>
              <Check size={12} strokeWidth={2.5} style={{ color: plan.highlightCheck ?? '#00685f' }} /> {h}
            </li>
          ))}
        </ul>
        <button
          onClick={() => !isDisabled && onBuy(plan)}
          disabled={isDisabled}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95 hover:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ border: `2px solid ${plan.btnBorder ?? '#bcc9c6'}`, color: plan.btnColor ?? '#00685f', background: 'transparent' }}
        >
          {isLoading ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Processing…</span>
            : purchased ? 'Plan Purchased' : 'Choose Plan'}
        </button>
      </div>
    </div>
  );
}

// ── Main Pricing Page ────────────────────────────────────────────────────────
export default function Pricing() {
  const navigate = useNavigate();
  const [loadingKey, setLoadingKey] = useState(null);
  const [toast, setToast] = useState(null);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [hasPurchase, setHasPurchase] = useState(false);
  const [planLoading, setPlanLoading] = useState(true);

  const { data: userData } = useCurrentUser();
  const user = userData?.user;

  // Fetch yearly plans
  useEffect(() => {
    supabase.from('yearly_plan_configs').select('*').eq('is_active', true).order('amount_paise')
      .then(({ data }) => {
        setPlans((data ?? []).map(r => buildPlan(r)));
        setPlansLoading(false);
      });
  }, []);

  // Check if user already bought a plan
  useEffect(() => {
    if (!user) { setPlanLoading(false); return; }
    supabase
      .from('user_plans')
      .select('id')
      .eq('user_id', user.id)
      .neq('plan_key', 'free_trial')
      .limit(1)
      .then(({ data }) => {
        setHasPurchase((data?.length ?? 0) > 0);
        setPlanLoading(false);
      });
  }, [user]);

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleBuy = async (plan) => {
    if (!user) { showToast('error', 'Not logged in', 'Please sign in to proceed.'); return; }
    if (hasPurchase) { showToast('error', 'Already purchased', 'You already have a yearly plan.'); return; }
    setLoadingKey(plan.key);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan: plan.key, amountPaise: plan.amountPaise }),
      });
      const orderData = await res.json();
      if (!res.ok) throw new Error(orderData.error || 'Failed to create order');

      await openRazorpayCheckout({
        orderId: orderData.orderId, amount: orderData.amount, plan: plan.key, quantity: 1, user,
        onSuccess: async (response) => {
          try {
            const verifyRes = await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_signature:  response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed');

            showToast('success', 'Payment Successful!', 'Your yearly plan is now active. Redirecting…');
            setHasPurchase(true);
            setTimeout(() => navigate('/studio'), 1500);
          } catch (err) {
            showToast('error', 'Verification Failed', err.message);
            setLoadingKey(null);
          }
        },
        onFailure: (msg) => {
          if (msg !== 'Payment cancelled') showToast('error', 'Payment Failed', msg);
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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-3" style={{ color: '#1a1c1c' }}>
            Yearly Plans
          </h1>
          <p className="max-w-xl mx-auto text-sm leading-relaxed" style={{ color: '#6d7a77' }}>
            One-time purchase. Unlimited events. Shared photo quota across all your events.
          </p>
        </div>

        {/* Already purchased banner */}
        {!planLoading && hasPurchase && (
          <div className="mb-8 flex items-center gap-4 bg-teal-50 border border-teal-200 rounded-2xl px-6 py-4">
            <div className="w-10 h-10 rounded-xl silk-gradient flex items-center justify-center shrink-0">
              <Check size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-teal-800">Yearly Plan Active</p>
              <p className="text-xs text-teal-600 mt-0.5">You already have a yearly plan. Only one purchase is allowed per account.</p>
            </div>
            <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-teal-600 text-white">Purchased</span>
          </div>
        )}

        {/* Subtitle */}
        <div className="text-center mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center justify-center gap-2">
            <CalendarDays size={13} /> One-time payment · Multiple events · Shared photo quota
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plansLoading || planLoading
            ? [1, 2, 3].map(i => <div key={i} className="rounded-2xl bg-zinc-100 animate-pulse h-96" />)
            : plans.map(plan => (
                <PlanCard
                  key={plan.key}
                  plan={plan}
                  onBuy={handleBuy}
                  loadingKey={loadingKey}
                  purchased={hasPurchase}
                />
              ))
          }
        </div>

        <p className="text-center text-xs mt-10" style={{ color: '#bcc9c6' }}>
          Need a custom enterprise plan?{' '}
          <a href="mailto:support@weddingqr.app" style={{ color: '#00685f' }} className="hover:underline">Contact us</a>
        </p>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </DashboardLayout>
  );
}
