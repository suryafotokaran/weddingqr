import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Check, Zap, Star, Crown, Loader2, HardDrive, CalendarDays, RefreshCw } from 'lucide-react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { supabase } from '../lib/supabase';
import Toast from '../components/Toast';
import { openRazorpayCheckout } from '../lib/razorpay';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// ── Per-event plan UI metadata ────────────────────────────────────────────────
const PLAN_UI = {
  basic: {
    key: 'basic', icon: Zap, popular: false,
    iconBg: '#eeeeee', iconColor: '#3d4947',
    checkBg: '#f3f3f4', checkColor: '#00685f',
    highlightColor: '#6d7a77', highlightCheck: '#00685f',
    btnBorder: '#bcc9c6', btnColor: '#00685f',
    features: ['Original Image Download', '30 Days Event Access'],
    highlights: ['Great for Intimate Events', 'High-Res Downloads'],
  },
  pro: {
    key: 'pro', icon: Star, popular: true,
    features: ['Original Image Download', '30 Days Event Access', 'Priority 24/7 Support'],
    highlights: ['Perfect for Full Weddings', 'Priority Assistance', 'Full Quality Assets'],
  },
  premium: {
    key: 'premium', icon: Crown, popular: false,
    iconBg: '#ffdbcf', iconColor: '#85513e',
    checkBg: '#ffdbcf', checkColor: '#85513e',
    highlightColor: '#85513e', highlightCheck: '#85513e',
    btnBorder: '#fdbaa2', btnColor: '#85513e',
    features: ['Original Image Download', '30 Days Event Access', 'Dedicated Event Manager'],
    highlights: ['Maximum Storage Capacity', 'VIP Management', 'Premium Experience'],
  },
};

// ── Monthly plan UI metadata ───────────────────────────────────────────────────
const MONTHLY_PLAN_UI = {
  monthly_starter: {
    icon: Zap, popular: false,
    iconBg: '#eeeeee', iconColor: '#3d4947',
    checkBg: '#f3f3f4', checkColor: '#00685f',
    btnBorder: '#bcc9c6', btnColor: '#00685f',
    features: ['Unlimited Events', 'Shared Storage Pool', 'Original Image Download'],
    highlights: ['Perfect for Small Studios', 'No per-event fee'],
  },
  monthly_pro: {
    icon: Star, popular: true,
    features: ['Unlimited Events', 'Shared Storage Pool', 'Priority 24/7 Support'],
    highlights: ['For Growing Studios', 'Priority Assistance'],
  },
  monthly_elite: {
    icon: Crown, popular: false,
    iconBg: '#ffdbcf', iconColor: '#85513e',
    checkBg: '#ffdbcf', checkColor: '#85513e',
    btnBorder: '#fdbaa2', btnColor: '#85513e',
    features: ['Unlimited Events', 'Massive Storage Pool', 'Dedicated Account Manager'],
    highlights: ['Maximum Capacity', 'VIP Management'],
  },
};

function buildPlan(dbRow, uiMap) {
  const ui = uiMap[dbRow.key] ?? uiMap[Object.keys(uiMap)[0]];
  return {
    ...ui,
    key:            dbRow.key,
    name:           dbRow.label,
    price:          Math.round(dbRow.amount_paise / 100),
    amountPaise:    dbRow.amount_paise,
    storageGb:      dbRow.storage_gb,
    maxImageSizeMb: dbRow.max_image_size_mb,
    tagline:        dbRow.tagline,
    quota:          `${dbRow.storage_gb} GB`,
    features: [
      `${dbRow.storage_gb} GB Shared Storage`,
      `Max ${dbRow.max_image_size_mb} MB per Photo`,
      ...(ui.features ?? []),
    ],
  };
}

// ── Reusable Plan Card ─────────────────────────────────────────────────────────
function PlanCard({ plan, onBuy, loadingKey, billingLabel = '/ event', disabled = false, disabledLabel = null, buttonLabel = null }) {
  const isLoading = loadingKey === plan.key;

  const defaultBtnText = billingLabel === '/ month' ? 'Subscribe Now' : 'Choose Plan';
  const btnText = buttonLabel ?? defaultBtnText;

  const BuyButton = ({ style, className }) => (
    <button
      onClick={() => !disabled && onBuy(plan)}
      disabled={!!loadingKey || disabled}
      className={className}
      style={style}
    >
      {isLoading
        ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Processing…</span>
        : disabled && disabledLabel
        ? disabledLabel
        : btnText
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
            <span className="text-sm text-green-200">{billingLabel}</span>
          </div>
          <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: '#89f5e7' }}><HardDrive size={12} /> {plan.quota}</p>
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
            style={{ background: disabled ? '#b8e8e3' : '#ffffff', color: '#00685f', border: 'none' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl bg-white"
      style={{ border: `2px solid ${disabled ? '#e2e2e2' : '#e2e2e2'}`, opacity: disabled ? 0.85 : 1 }}
    >
      <div className="p-7 flex flex-col h-full">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: plan.iconBg }}>
          <plan.icon size={20} style={{ color: plan.iconColor }} />
        </div>
        <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: plan.highlightColor ?? '#6d7a77' }}>{plan.name}</p>
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-4xl font-extrabold" style={{ color: '#1a1c1c' }}>₹{plan.price.toLocaleString()}</span>
          <span className="text-sm" style={{ color: '#6d7a77' }}>{billingLabel}</span>
        </div>
        <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: plan.highlightColor ?? '#6d7a77' }}><HardDrive size={12} /> {plan.quota}</p>
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
        <BuyButton
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95 hover:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ border: `2px solid ${plan.btnBorder ?? '#bcc9c6'}`, color: plan.btnColor ?? '#00685f', background: 'transparent' }}
        />
      </div>
    </div>
  );
}

// ── Main Pricing Page ──────────────────────────────────────────────────────────
export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'monthly' ? 'monthly' : 'event');
  const [loadingKey, setLoadingKey] = useState(null);
  const [toast, setToast] = useState(null);

  // Per-event plans
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);

  // Monthly plans
  const [monthlyPlans, setMonthlyPlans] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(true);

  // Active subscription check
  const [activeSub, setActiveSub] = useState(null);
  const [subLoading, setSubLoading] = useState(true);

  const { data: userData } = useCurrentUser();
  const user = userData?.user;

  // Fetch per-event plans
  useEffect(() => {
    supabase.from('plan_configs').select('*').eq('is_active', true).order('amount_paise')
      .then(({ data }) => {
        setPlans((data ?? []).map(r => buildPlan(r, PLAN_UI)));
        setPlansLoading(false);
      });
  }, []);

  // Fetch monthly plans
  useEffect(() => {
    supabase.from('monthly_plan_configs').select('*').eq('is_active', true).order('amount_paise')
      .then(({ data }) => {
        setMonthlyPlans((data ?? []).map(r => buildPlan(r, MONTHLY_PLAN_UI)));
        setMonthlyLoading(false);
      });
  }, []);

  // Check for active subscription
  useEffect(() => {
    if (!user) { setSubLoading(false); return; }
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('end_date', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setActiveSub(data?.[0] ?? null);
        setSubLoading(false);
      });
  }, [user]);

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  };

  // ── Buy per-event plan ───────────────────────────────────────────────────────
  const handleBuy = async (plan) => {
    if (!user) { showToast('error', 'Not logged in', 'Please sign in to proceed.'); return; }
    setLoadingKey(plan.key);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan: plan.key, amountPaise: plan.amountPaise, storageGb: plan.storageGb, orderType: 'event' }),
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
                orderType: 'event',
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed');

            sessionStorage.setItem('pendingPurchase', JSON.stringify({
              purchaseId:     verifyData.purchaseId,
              plan:           plan.key,
              storageGb:      plan.storageGb,
              maxImageSizeMb: plan.maxImageSizeMb,
            }));
            showToast('success', 'Payment Successful!', 'Redirecting to create your event…');
            setTimeout(() => navigate('/createevent'), 1200);
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

  // ── Subscribe monthly ────────────────────────────────────────────────────────
  const handleSubscribe = async (plan) => {
    if (!user) { showToast('error', 'Not logged in', 'Please sign in to proceed.'); return; }

    // Block if same or lower plan
    if (activeSub) {
      const currentIdx = monthlyPlans.findIndex(p => p.key === activeSub.plan_key);
      const targetIdx  = monthlyPlans.findIndex(p => p.key === plan.key);
      if (targetIdx <= currentIdx) {
        showToast('error', 'Cannot downgrade', 'You can only upgrade to a higher monthly plan.');
        return;
      }
    }

    setLoadingKey(plan.key);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          plan:           plan.key,
          amountPaise:    plan.amountPaise,
          storageGb:      plan.storageGb,
          maxImageSizeMb: plan.maxImageSizeMb,
          orderType:      'subscription',
        }),
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
                orderType: 'subscription',
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed');

            // Store subscription info in sessionStorage — CreateEvent will use it
            sessionStorage.setItem('activeSubscription', JSON.stringify({
              subscriptionId: verifyData.subscriptionId,
              planKey:        verifyData.planKey,
              storageGb:      verifyData.storageGb,
              endDate:        verifyData.endDate,
            }));

            showToast('success', 'Subscribed!', 'Monthly plan activated. Redirecting to dashboard…');
            setTimeout(() => navigate('/studio'), 1200);
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

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-10 px-2">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-3" style={{ color: '#1a1c1c' }}>
            Choose Your Plan
          </h1>
          <p className="max-w-xl mx-auto text-sm leading-relaxed" style={{ color: '#6d7a77' }}>
            Pay per event, or subscribe monthly for unlimited events in a shared storage pool.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center justify-center mb-10">
          <div className="flex items-center bg-zinc-100 rounded-2xl p-1.5 gap-1">
            <button
              onClick={() => setTab('event')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                tab === 'event'
                  ? 'bg-white text-zinc-900 shadow-md'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <CalendarDays size={14} className="inline mr-1.5" />
              Per Event
            </button>
            <button
              onClick={() => setTab('monthly')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                tab === 'monthly'
                  ? 'bg-white text-zinc-900 shadow-md'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <RefreshCw size={14} className="inline mr-1.5" />
              Monthly
              <span className="ml-2 px-2 py-0.5 text-[10px] font-black rounded-full bg-teal-100 text-teal-700">NEW</span>
            </button>
          </div>
        </div>

        {/* Active Subscription Banner (Monthly tab) */}
        {tab === 'monthly' && !subLoading && activeSub && (
          <div className="mb-8 flex items-center gap-4 bg-teal-50 border border-teal-200 rounded-2xl px-6 py-4">
            <div className="w-10 h-10 rounded-xl silk-gradient flex items-center justify-center shrink-0">
              <RefreshCw size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-teal-800">Active Monthly Subscription</p>
              <p className="text-xs text-teal-600 mt-0.5">
                {activeSub.storage_gb} GB shared pool · Expires {formatDate(activeSub.end_date)}
              </p>
            </div>
            <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-teal-600 text-white">Active</span>
          </div>
        )}

        {/* Plan Cards */}
        {tab === 'event' ? (
          <>
            <div className="text-center mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">One-time payment · One event slot · Your own storage</p>
            </div>

            {/* Disable per-event if user has active monthly sub */}
            {!subLoading && activeSub && (
              <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
                <RefreshCw size={15} className="text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800 font-medium">
                  You have an active monthly subscription — per-event plans are unavailable while your subscription is active.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {plansLoading
                ? [1,2,3].map(i => <div key={i} className="rounded-2xl bg-zinc-100 animate-pulse h-96" />)
                : plans.map(plan => (
                    <PlanCard
                      key={plan.key}
                      plan={plan}
                      onBuy={handleBuy}
                      loadingKey={loadingKey}
                      billingLabel="/ event"
                      disabled={!subLoading && !!activeSub}
                      disabledLabel="Monthly plan active"
                    />
                  ))
              }
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Renews monthly · Unlimited events · Shared storage pool</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {monthlyLoading
                ? [1,2,3].map(i => <div key={i} className="rounded-2xl bg-zinc-100 animate-pulse h-96" />)
                : (() => {
                    // Compute current plan index (for tier comparison)
                    const currentIdx = activeSub
                      ? monthlyPlans.findIndex(p => p.key === activeSub.plan_key)
                      : -1;

                    return monthlyPlans.map((plan, idx) => {
                      const isCurrent  = activeSub && plan.key === activeSub.plan_key;
                      const isLower    = activeSub && idx < currentIdx;
                      const isDisabled = isCurrent || isLower;
                      const label      = isCurrent ? 'Current Plan' : null; // no text for lower plans
                      const btnLabel   = (!isDisabled && activeSub) ? 'Upgrade' : null;

                      return (
                        <PlanCard
                          key={plan.key}
                          plan={plan}
                          onBuy={handleSubscribe}
                          loadingKey={loadingKey}
                          billingLabel="/ month"
                          disabled={isDisabled}
                          disabledLabel={label}
                          buttonLabel={btnLabel}
                        />
                      );
                    });
                  })()
              }
            </div>
          </>
        )}

        <p className="text-center text-xs mt-10" style={{ color: '#bcc9c6' }}>
          Need a custom enterprise plan?{' '}
          <a href="mailto:support@weddingqr.app" style={{ color: '#00685f' }} className="hover:underline">Contact us</a>
        </p>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </DashboardLayout>
  );
}
