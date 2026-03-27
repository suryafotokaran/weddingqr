import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { openRazorpayCheckout } from '../lib/razorpay';
import { Loader2, Zap, Star, Crown, Check, ArrowUp } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const PLANS = [
  {
    key: 'basic',
    icon: Zap,
    name: 'Starter Plan',
    price: 149,
    amountPaise: 14900,
    photosLimit: 500,
    storageGb: 5,
    iconBg: '#f3f3f4',
    iconColor: '#3d4947',
    tagline: 'Total 500 Photos',
  },
  {
    key: 'pro',
    icon: Star,
    name: 'Professional Plan',
    price: 199,
    amountPaise: 19900,
    photosLimit: 1000,
    storageGb: 10,
    iconBg: '#89f5e7',
    iconColor: '#00685f',
    tagline: 'Total 1000 Photos',
  },
  {
    key: 'premium',
    icon: Crown,
    name: 'Elite Plan',
    price: 249,
    amountPaise: 24900,
    photosLimit: 2000,
    storageGb: 20,
    iconBg: '#ffdbcf',
    iconColor: '#85513e',
    tagline: 'Total 2000 Photos',
  },
];

export default function UpgradePlan({ event, user, onUpgraded, onClose }) {
  const [selected, setSelected]     = useState(null);
  const [loadingKey, setLoadingKey]  = useState(null);
  const [error, setError]            = useState(null);

  // Determine current plan based on photos_limit or plan_name
  const currentPlanKey = PLANS.find(p => 
    p.photosLimit === event.photos_limit || 
    p.key === event.plan_name
  )?.key || 'basic';

  const currentPlan = PLANS.find(p => p.key === currentPlanKey);
  const currentPlanIdx = PLANS.findIndex(p => p.key === currentPlanKey);
  const isLastPlan     = currentPlanIdx === PLANS.length - 1;

  const activePlan = PLANS.find(p => p.key === selected) ?? null;
  const upgradePrice = activePlan && currentPlan ? activePlan.price - currentPlan.price : 0;
  const upgradeAmountPaise = activePlan && currentPlan ? activePlan.amountPaise - currentPlan.amountPaise : 0;

  const handleUpgrade = async () => {
    if (!activePlan || !user || !event) return;
    setError(null);
    setLoadingKey(selected);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in again.');

      const planKey = activePlan.key;

      // Create Razorpay order
      const orderRes = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plan:        planKey,
          amountPaise: upgradeAmountPaise, // Charge difference only
          photosLimit: activePlan.photosLimit,
          eventId:     event.id,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      // Open Razorpay checkout
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
              photosLimit:         activePlan.photosLimit,
            }),
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed');

          setLoadingKey(null);
          onUpgraded(activePlan.photosLimit);
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
            <h3 className="text-lg font-extrabold text-zinc-900">Choose Higher Plan</h3>
          </div>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-xs font-medium transition-colors">
          Dismiss
        </button>
      </div>

      <p className="text-sm text-zinc-500 mb-6">
        Your event is currently on the <span className="font-bold text-zinc-700 capitalize">{currentPlanKey} Plan</span> ({event.photos_limit} photos). 
        Upgrade to a higher tier to increase your quota and storage.
      </p>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {PLANS.map(plan => {
          const Icon        = plan.icon;
          const isCurrent   = plan.key === currentPlanKey;
          const isLower     = PLANS.findIndex(p => p.key === plan.key) < currentPlanIdx;
          const isDisabled  = isCurrent || isLower;
          const isSelected  = selected === plan.key;
          const priceDiff   = plan.price - (currentPlan?.price || 0);

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
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: plan.iconBg }}>
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
                  <p className="text-[11px] font-bold text-teal-600">
                    +{plan.photosLimit - currentPlan.photosLimit} Photos
                  </p>
                ) : (
                  <p className="text-[11px] font-bold text-zinc-500">{plan.photosLimit} Photos Total</p>
                )}
                {isCurrent && <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Plan Already Paid</p>}
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-3 font-medium">{error}</p>
      )}

      {/* Action button */}
      <div className="mt-6 flex items-center justify-between pt-4 border-t border-zinc-50">
        <div className="text-xs text-zinc-400">
          {activePlan
            ? `New limit: ${activePlan.photosLimit} photos`
            : isLastPlan 
              ? 'You are on our highest plan' 
              : 'Select a plan to upgrade'}
        </div>
        <button
          disabled={!activePlan || !!loadingKey}
          onClick={handleUpgrade}
          className="flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-sm silk-gradient text-white shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loadingKey
            ? <><Loader2 size={16} className="animate-spin" /> Processing…</>
            : <><ArrowUp size={16} /> Upgrade to {activePlan?.name || '...'} · ₹{upgradePrice}</>
          }
        </button>
      </div>
    </div>
);
}
