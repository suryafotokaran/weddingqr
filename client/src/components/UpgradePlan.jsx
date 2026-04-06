import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { openRazorpayCheckout } from '../lib/razorpay';
import { Loader2, Zap, Star, Crown, Check, ArrowUp, HardDrive } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const PLANS = [
  {
    key: 'basic',
    icon: Zap,
    name: 'Starter Plan',
    price: 149,
    amountPaise: 14900,
    storageGb: 25,
    iconBg: '#f3f3f4',
    iconColor: '#3d4947',
    tagline: '25 GB Storage',
  },
  {
    key: 'pro',
    icon: Star,
    name: 'Professional Plan',
    price: 199,
    amountPaise: 19900,
    storageGb: 40,
    iconBg: '#89f5e7',
    iconColor: '#00685f',
    tagline: '40 GB Storage',
  },
  {
    key: 'premium',
    icon: Crown,
    name: 'Elite Plan',
    price: 249,
    amountPaise: 24900,
    storageGb: 75,
    iconBg: '#ffdbcf',
    iconColor: '#85513e',
    tagline: '75 GB Storage',
  },
];

const PRICE_PER_GB = 5; // ₹5 per extra GB

export default function UpgradePlan({ event, user, onUpgraded, onClose }) {
  const [selected, setSelected]     = useState(null);
  const [loadingKey, setLoadingKey]  = useState(null);
  const [error, setError]            = useState(null);
  const [customGb, setCustomGb]      = useState(10); // minimum 10 GB add-on

  // Determine current plan based on storage_gb
  const currentPlanKey = PLANS.find(p =>
    p.storageGb === event.storage_gb || p.key === event.plan_name
  )?.key || (event.storage_gb >= 75 ? 'premium' : event.storage_gb >= 40 ? 'pro' : 'basic');

  const currentPlan    = PLANS.find(p => p.key === currentPlanKey);
  const currentPlanIdx = PLANS.findIndex(p => p.key === currentPlanKey);
  const isLastPlan     = currentPlanKey === 'premium';

  const activePlan = !isLastPlan ? (PLANS.find(p => p.key === selected) ?? null) : null;

  // Final target storage & price
  const targetStorageGb = isLastPlan
    ? event.storage_gb + customGb
    : (activePlan?.storageGb || event.storage_gb);

  const upgradeAmountPaise = isLastPlan
    ? (customGb * PRICE_PER_GB * 100)
    : (activePlan && currentPlan ? (activePlan.amountPaise - currentPlan.amountPaise) : 0);

  const upgradePrice = upgradeAmountPaise / 100;

  const handleUpgrade = async () => {
    if ((!activePlan && !isLastPlan) || !user || !event) return;
    setError(null);
    setLoadingKey(isLastPlan ? 'custom' : selected);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in again.');

      const planKey = isLastPlan ? 'premium' : activePlan.key;

      // Create Razorpay order
      const orderRes = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plan:        planKey,
          amountPaise: upgradeAmountPaise,
          storageGb:   targetStorageGb,
          eventId:     event.id,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      await openRazorpayCheckout({
        orderId:  orderData.orderId,
        amount:   orderData.amount,
        plan:     planKey,
        quantity: 1,
        user,
        onSuccess: async (response) => {
          const verifyRes = await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
            method: 'POST',
            headers: {
              'Content-Type':  'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_signature:  response.razorpay_signature,
              plan:                planKey,
              eventId:             event.id,
              storageGb:           targetStorageGb,
            }),
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed');

          setLoadingKey(null);
          onUpgraded(targetStorageGb); // pass GB back to EventDetail
        },
        onFailure: (msg) => {
          if (msg !== 'Payment cancelled') setError(msg);
          setLoadingKey(null);
        },
      });
    } catch (err) {
      setError(err.message);
      setLoadingKey(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.08)] border border-teal-100 p-7 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl silk-gradient flex items-center justify-center">
            <ArrowUp size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Upgrade Required</p>
            <h3 className="text-lg font-extrabold text-zinc-900">{isLastPlan ? 'Add Extra Storage' : 'Choose Higher Plan'}</h3>
          </div>
        </div>
        <button onClick={onClose} className="text-red-400 hover:text-red-600 text-xs font-bold transition-colors">
          Dismiss
        </button>
      </div>

      <p className="text-sm text-zinc-500 mb-6">
        {isLastPlan
          ? `You are on the Elite Plan (${event.storage_gb} GB). Add more storage below.`
          : `Your event has ${event.storage_gb} GB storage. Upgrade to a higher tier for more capacity.`
        }
      </p>

      {/* Plan Selection or Custom GB Input */}
      {isLastPlan ? (
        <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-8 mb-6">
          <div className="flex flex-col items-center text-center">
            <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-2">Add Extra Storage</h4>
            <p className="text-xs text-zinc-500 mb-8 max-w-xs mx-auto">Add more GB to your current Elite event seamlessly.</p>

            <div className="flex items-center gap-8 mb-8 select-none">
              <button
                onClick={() => setCustomGb(Math.max(10, customGb - 5))}
                className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white border-2 border-zinc-200 text-zinc-400 hover:border-teal-500 hover:text-teal-600 transition-all active:scale-90"
              >
                <span className="text-3xl font-light">−</span>
              </button>

              <div className="text-center min-w-[140px]">
                <p className="text-[10px] font-black text-teal-600 uppercase tracking-tighter mb-1">Extra GB Added</p>
                <div className="flex items-baseline justify-center gap-1 group">
                  <input
                    type="number"
                    value={customGb}
                    onChange={(e) => setCustomGb(Math.max(5, parseInt(e.target.value) || 5))}
                    className="w-24 bg-transparent text-5xl font-black text-zinc-900 leading-none text-center outline-none focus:text-teal-600 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-2xl font-black text-zinc-400">GB</span>
                </div>
              </div>

              <button
                onClick={() => setCustomGb(Math.min(500, customGb + 5))}
                className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white border-2 border-zinc-200 text-zinc-400 hover:border-teal-500 hover:text-teal-600 transition-all active:scale-90"
              >
                <span className="text-3xl font-light">+</span>
              </button>
            </div>

            <div className="w-full h-px bg-zinc-200 mb-6" />

            <div className="flex items-center gap-10">
              <div className="text-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">New Total Storage</p>
                <p className="text-lg font-bold text-zinc-700">{event.storage_gb + customGb} GB</p>
              </div>
              <div className="w-px h-8 bg-zinc-200" />
              <div className="text-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Add-on Price</p>
                <p className="text-2xl font-black text-teal-700">₹{upgradePrice.toFixed(2)}</p>
                <p className="text-[10px] text-teal-600 font-bold mt-1 uppercase tracking-tighter text-center">₹{PRICE_PER_GB}/GB</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {PLANS.map(plan => {
            const Icon       = plan.icon;
            const isCurrent  = plan.key === currentPlanKey;
            const isLower    = PLANS.findIndex(p => p.key === plan.key) < currentPlanIdx;
            const isDisabled = isCurrent || isLower;
            const isSelected = selected === plan.key;
            const priceDiff  = plan.price - (currentPlan?.price || 0);

            return (
              <button
                key={plan.key}
                disabled={isDisabled}
                onClick={() => setSelected(plan.key)}
                className={`flex flex-col items-start p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-teal-500 bg-teal-50 shadow-md scale-[1.02]'
                    : isDisabled
                      ? 'border-zinc-100 bg-zinc-50 opacity-60 cursor-not-allowed'
                      : 'border-zinc-100 bg-white hover:border-teal-300 hover:bg-teal-50/20'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: plan.iconBg }}>
                    <Icon size={16} style={{ color: plan.iconColor }} />
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 flex items-center gap-1 border border-teal-200 shadow-sm">
                      <Check size={10} strokeWidth={3} /> Active
                    </span>
                  )}
                </div>

                <p className="text-xs font-bold text-zinc-500 uppercase tracking-tight">{plan.name}</p>
                <p className="text-xl font-extrabold text-zinc-900 mt-0.5">₹{isCurrent || isLower ? plan.price : priceDiff}</p>
                <div className="flex flex-col mt-2">
                  {!isDisabled ? (
                    <p className="text-[11px] font-bold text-teal-600 flex items-center gap-1">
                      <HardDrive size={10} /> +{plan.storageGb - currentPlan.storageGb} GB
                    </p>
                  ) : (
                    <p className="text-[11px] font-bold text-zinc-500">{plan.storageGb} GB total</p>
                  )}
                  {isCurrent && <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Current Plan</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 mt-3 font-medium">{error}</p>
      )}

      {/* Action button */}
      <div className="mt-6 flex items-center justify-between pt-4 border-t border-zinc-50">
        <div className="text-xs text-zinc-400">
          {isLastPlan
            ? `New total: ${targetStorageGb} GB storage`
            : activePlan
              ? `New limit: ${activePlan.storageGb} GB storage`
              : 'Select a plan to upgrade'
          }
        </div>
        <button
          disabled={(!activePlan && !isLastPlan) || !!loadingKey}
          onClick={handleUpgrade}
          className="flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-sm silk-gradient text-white shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loadingKey
            ? <><Loader2 size={16} className="animate-spin" /> Processing…</>
            : (
              <>
                <ArrowUp size={16} />
                {isLastPlan
                  ? `Add ${customGb} GB · ₹${upgradePrice.toFixed(2)}`
                  : `Upgrade to ${activePlan?.name || '...'} · ₹${upgradePrice.toFixed(2)}`}
              </>
            )
          }
        </button>
      </div>
    </div>
  );
}
