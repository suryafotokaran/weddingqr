import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { openRazorpayCheckout } from '../lib/razorpay';
import { Loader2, Zap, Star, Crown, Pencil, ArrowUp } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Predefined add-on tiers
const ADD_ON_TIERS = [
  { key: 'addon_starter', photos: 500,  price: 149, amountPaise: 14900, label: 'Starter Add-on',  icon: Zap,    iconColor: '#3d4947', bg: '#f3f3f4' },
  { key: 'addon_pro',     photos: 1000, price: 249, amountPaise: 24900, label: 'Pro Add-on',      icon: Star,   iconColor: '#00685f', bg: '#d9fdf9' },
  { key: 'addon_elite',   photos: 1500, price: 349, amountPaise: 34900, label: 'Elite Add-on',    icon: Crown,  iconColor: '#85513e', bg: '#ffdbcf' },
];

/**
 * Given a custom photo count, return the matching add-on tier.
 * Snaps upward to the nearest tier threshold.
 */
function resolveCustomTier(count) {
  if (count <= 500)  return ADD_ON_TIERS[0]; // ₹149
  if (count <= 1000) return ADD_ON_TIERS[1]; // ₹249
  return ADD_ON_TIERS[2];                    // ₹349 (1001–1500+)
}

/**
 * UpgradePlan — shown on EventDetail when quota is near/full.
 * Props:
 *   event       — current event object
 *   user        — current user
 *   onUpgraded  — callback(additionalPhotos) after successful upgrade
 *   onClose     — callback to dismiss this panel
 */
export default function UpgradePlan({ event, user, onUpgraded, onClose }) {
  const [selected, setSelected]     = useState(null); // key of selected tier
  const [customCount, setCustomCount] = useState('');  // custom photo count input
  const [loadingKey, setLoadingKey]  = useState(null);
  const [error, setError]            = useState(null);

  // Resolve custom tier based on typed count
  const customTier = customCount && parseInt(customCount, 10) > 0
    ? resolveCustomTier(parseInt(customCount, 10))
    : null;

  const activeTier =
    selected === 'custom'
      ? (customTier ? { ...customTier, photos: parseInt(customCount, 10) } : null)
      : ADD_ON_TIERS.find(t => t.key === selected) ?? null;

  const handleUpgrade = async () => {
    if (!activeTier || !user || !event) return;
    setError(null);
    setLoadingKey(selected ?? 'custom');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in again.');

      const planKey     = 'custom';
      const customLabel = activeTier.label;
      const additional  = activeTier.photos;

      // Create Razorpay order
      const orderRes = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plan:        planKey,
          amountPaise: activeTier.amountPaise,
          photosLimit: additional,
          customLabel,
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
              amountPaise:         activeTier.amountPaise,
              customLabel,
              eventId:             event.id,
              additionalPhotos:    additional,
            }),
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed');

          setLoadingKey(null);
          onUpgraded(additional);
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Add More Photos</p>
            <h3 className="text-lg font-extrabold text-zinc-900">Upgrade Plan</h3>
          </div>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-xs font-medium transition-colors">
          Dismiss
        </button>
      </div>

      <p className="text-sm text-zinc-500 mb-5">
        Current limit: <span className="font-bold text-zinc-700">{event.photos_limit} photos</span>. Choose an add-on to increase your quota.
      </p>

      {/* Tier cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {ADD_ON_TIERS.map(tier => {
          const Icon = tier.icon;
          const isActive = selected === tier.key;
          return (
            <button
              key={tier.key}
              onClick={() => { setSelected(tier.key); setCustomCount(''); }}
              className={`flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                isActive
                  ? 'border-teal-500 bg-teal-50 shadow-md scale-[1.02]'
                  : 'border-zinc-200 bg-white hover:border-teal-300 hover:bg-teal-50/40'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: tier.bg }}>
                  <Icon size={15} style={{ color: tier.iconColor }} />
                </div>
                <span className="text-xs font-bold text-zinc-600">{tier.label}</span>
              </div>
              <p className="text-2xl font-extrabold text-zinc-900">+{tier.photos.toLocaleString()}</p>
              <p className="text-xs text-zinc-400 mt-0.5">photos</p>
              <p className="text-base font-bold text-teal-700 mt-2">₹{tier.price}</p>
            </button>
          );
        })}
      </div>

      {/* Custom input */}
      <div
        className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-xl border-2 transition-all duration-150 ${
          selected === 'custom'
            ? 'border-teal-500 bg-teal-50'
            : 'border-zinc-200 bg-zinc-50 hover:border-teal-300'
        }`}
      >
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
            <Pencil size={13} className="text-amber-600" />
          </div>
          <span className="text-xs font-bold text-zinc-600">Custom Amount</span>
        </div>

        <input
          type="number"
          min="1"
          max="1500"
          placeholder="Type photo count…"
          value={customCount}
          onChange={(e) => {
            setCustomCount(e.target.value);
            setSelected('custom');
          }}
          onFocus={() => setSelected('custom')}
          className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white placeholder-zinc-300 transition-all w-full sm:w-auto"
        />

        {/* Auto-resolved tier preview */}
        {selected === 'custom' && customTier && customCount && (
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: customTier.bg, color: customTier.iconColor }}
            >
              → {customTier.label}
            </div>
            <span className="text-base font-extrabold text-teal-700">₹{customTier.price}</span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-3 font-medium">{error}</p>
      )}

      {/* Action button */}
      <div className="mt-5 flex items-center justify-between">
        <div className="text-xs text-zinc-400">
          {activeTier
            ? `After upgrade: ${event.photos_limit + activeTier.photos} total photos`
            : 'Select an add-on above'}
        </div>
        <button
          disabled={!activeTier || !!loadingKey}
          onClick={handleUpgrade}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm silk-gradient text-white shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loadingKey
            ? <><Loader2 size={15} className="animate-spin" /> Processing…</>
            : <><ArrowUp size={15} /> Upgrade · {activeTier ? `₹${activeTier.price}` : '—'}</>
          }
        </button>
      </div>
    </div>
  );
}
