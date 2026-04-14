import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DashboardLayout from '../components/DashboardLayout';
import { CreditCard, CalendarDays, Receipt } from 'lucide-react';
import Toast from '../components/Toast';

export default function Payments() {
  const { data: userData } = useCurrentUser();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchPayments = async () => {
      const user = userData?.user;
      if (!user) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('user_plans')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPayments(data ?? []);
      } catch (err) {
        console.error(err);
        setToast({ type: 'error', title: 'Error', message: 'Failed to load payment history.' });
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [userData]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    switch ((status ?? '').toLowerCase()) {
      case 'active':  return 'bg-teal-50 text-teal-800 border border-teal-200';
      case 'expired': return 'bg-zinc-100 text-zinc-600 border border-zinc-200';
      case 'pending': return 'bg-amber-50 text-amber-800 border border-amber-200';
      default:        return 'bg-zinc-100 text-zinc-800 border border-zinc-200';
    }
  };

  const formatPlanKey = (key) => {
    if (!key) return '—';
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-10 px-2">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 mb-2">Payment History</h1>
          <p className="text-sm text-zinc-500">View all your plan purchases and their current status.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] border border-zinc-50 overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-zinc-50 rounded-xl animate-pulse" />)}
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
              <Receipt size={48} className="mb-4 opacity-20" />
              <p className="font-semibold text-zinc-600 mb-1">No payments yet</p>
              <p className="text-sm text-zinc-400">Once you purchase a plan, it will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Date</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Plan</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Photos</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Duration</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Amount</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Expires</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500">Status</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-zinc-500 text-right">Tx ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-zinc-600">
                          <CalendarDays size={14} className="text-zinc-400" />
                          {formatDate(p.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-zinc-900">{formatPlanKey(p.plan_key)}</p>
                        <p className="text-xs text-zinc-400">Yearly Plan</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-zinc-900">{p.photos_limit?.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-zinc-600">{p.duration_days} days</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-zinc-900">
                          {p.amount_paise === 0 ? 'Free' : `₹${(p.amount_paise / 100).toLocaleString()}`}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-zinc-600">{formatDate(p.end_date)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 text-xs font-medium text-zinc-400 font-mono">
                          {p.razorpay_payment_id?.substring(0, 14) || '—'}
                          {p.razorpay_payment_id && <CreditCard size={12} className="opacity-50" />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </DashboardLayout>
  );
}
