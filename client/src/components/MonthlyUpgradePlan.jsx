import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { openRazorpayCheckout } from '../lib/razorpay';
import { Loader2, Zap, Star, Crown, Check, ArrowUp, HardDrive, RefreshCw } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const PLAN_META = {
  monthly_starter: { icon: Zap,   iconBg: '#f3f3f4', iconColor: '#3d4947' },
  monthly_pro:     { icon: Star,  iconBg: '#89f5e7', iconColor: '#00685f' },
  monthly_elite:   { icon: Crown, iconBg: '#ffdbcf', iconColor: '#85513e' },
};

/**
 * MonthlyUpgradePlan
 *
 * Props:
 *  - subscription  : the user's active subscription row { plan_key, storage_gb, amount_paise, id, ... }
 *  - user          : current user object
 *  - onUpgraded    : (newStorageGb) => void  — called after successful upgrade
 *  - onClose       : () => void
 */
export default function MonthlyUpgradePlan({ subscription, user, onUpgraded, onClose }) {
  const [plans, setPlans]         = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selected, setSelected]   = useState(null);
  const [loadingKey, setLoadingKey] = useState(null);
  const [error, setError]         = useState(null);

  // Fetch active monthly plan configs, sorted cheapest → most expensive
  useEffect(() => {
    supabase
      .from('monthly_plan_configs')
      .select('*')
      .eq('is_active', true)
      .order('amount_paise')
      .then(({ data }) => {
        setPlans(data ?? []);
        setLoadingPlans(false);
      });
  }, []);

  const currentPlanIdx = plans.findIndex(p => p.key === subscription?.plan_key);
  const currentPlan    = plans[currentPlanIdx] ?? null;

  const activePlan = plans.find(p => p.key === selected) ?? null;

  // Price diff and GB diff vs current subscription
  const priceDiff = activePlan && currentPlan
    ? (activePlan.amount_paise - currentPlan.amount_paise) / 100
    : 0;

  const gbDiff = activePlan && currentPlan
    ? activePlan.storage_gb - currentPlan.storage_gb
    : 0;

  const upgradeAmountPaise = activePlan && currentPlan
    ? activePlan.amount_paise - currentPlan.amount_paise
    : 0;

  const handleUpgrade = async () => {
    if (!activePlan || !user || !subscription) return;
    setError(null);
    setLoadingKey(selected);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in again.');

      // Step 1: Create Razorpay order — stamps razorpay_order_id on the EXISTING sub row
      const orderRes = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plan:                   activePlan.key,
          amountPaise:            upgradeAmountPaise,   // diff amount
          storageGb:              activePlan.storage_gb,
          maxImageSizeMb:         activePlan.max_image_size_mb,
          orderType:              'subscription_upgrade',
          existingSubscriptionId: subscription.id,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      await openRazorpayCheckout({
        orderId: orderData.orderId,
        amount:  orderData.amount,
        plan:    activePlan.key,
        quantity: 1,
        user,
        onSuccess: async (response) => {
          try {
            // Step 2: Verify — updates existing sub row in-place with new plan details
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
                orderType:           'subscription_upgrade',
                newPlanKey:          activePlan.key,
                newStorageGb:        activePlan.storage_gb,
                newAmountPaise:      activePlan.amount_paise,
                newMaxImageSizeMb:   activePlan.max_image_size_mb,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed');

            setLoadingKey(null);
            onUpgraded(activePlan.storage_gb);
          } catch (err) {
            setError(err.message);
            setLoadingKey(null);
          }
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

  if (loadingPlans) {
    return (
      <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.08)] border border-teal-100 p-7 mb-6 flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-teal-600" size={28} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.08)] border border-teal-100 p-7 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl silk-gradient flex items-center justify-center">
            <RefreshCw size={17} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Monthly Plan Upgrade</p>
            <h3 className="text-lg font-extrabold text-zinc-900">Choose Higher Plan</h3>
          </div>
        </div>
        <button onClick={onClose} className="text-red-400 hover:text-red-600 text-xs font-bold transition-colors">
          Dismiss
        </button>
      </div>

      <p className="text-sm text-zinc-500 mb-6">
        You're on the <strong>{currentPlan?.label ?? subscription?.plan_key}</strong> plan ({subscription?.storage_gb} GB shared pool).
        Upgrade to a higher plan to expand your pool.
      </p>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {plans.map((plan, idx) => {
          const meta       = PLAN_META[plan.key] ?? PLAN_META.monthly_starter;
          const Icon       = meta.icon;
          const isCurrent  = plan.key === subscription?.plan_key;
          const isLower    = idx < currentPlanIdx;
          const isDisabled = isCurrent || isLower;
          const isSelected = selected === plan.key;
          const planPriceDiff = currentPlan
            ? (plan.amount_paise - currentPlan.amount_paise) / 100
            : plan.amount_paise / 100;
          const planGbDiff = currentPlan
            ? plan.storage_gb - currentPlan.storage_gb
            : plan.storage_gb;

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
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: meta.iconBg }}>
                  <Icon size={16} style={{ color: meta.iconColor }} />
                </div>
                {isCurrent && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 flex items-center gap-1 border border-teal-200 shadow-sm">
                    <Check size={10} strokeWidth={3} /> Active
                  </span>
                )}
              </div>

              <p className="text-xs font-bold text-zinc-500 uppercase tracking-tight">{plan.label}</p>
              <p className="text-xl font-extrabold text-zinc-900 mt-0.5">
                {isDisabled
                  ? `₹${Math.round(plan.amount_paise / 100)}`
                  : `+₹${planPriceDiff}`
                }
              </p>
              <div className="flex flex-col mt-2">
                {!isDisabled ? (
                  <p className="text-[11px] font-bold text-teal-600 flex items-center gap-1">
                    <HardDrive size={10} /> +{planGbDiff} GB
                  </p>
                ) : (
                  <p className="text-[11px] font-bold text-zinc-500">{plan.storage_gb} GB total</p>
                )}
                {isCurrent && (
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Current Plan</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {error && <p className="text-xs text-red-500 mt-3 font-medium">{error}</p>}

      {/* Action button */}
      <div className="mt-6 flex items-center justify-between pt-4 border-t border-zinc-50">
        <div className="text-xs text-zinc-400">
          {activePlan
            ? `New pool: ${activePlan.storage_gb} GB (+${gbDiff} GB) · +₹${priceDiff}/month`
            : 'Select a plan to upgrade'
          }
        </div>
        <button
          disabled={!activePlan || !!loadingKey}
          onClick={handleUpgrade}
          className="flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-sm silk-gradient text-white shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loadingKey
            ? <><Loader2 size={16} className="animate-spin" /> Processing…</>
            : <><ArrowUp size={16} /> {activePlan ? `Upgrade to ${activePlan.label} · +₹${priceDiff}/mo` : 'Upgrade to …'}</>
          }
        </button>
      </div>
    </div>
  );
}
