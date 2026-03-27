import { CheckCircle, XCircle } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;
  const isSuccess = toast.type === 'success';
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl max-w-sm animate-in slide-in-from-bottom-4 duration-300"
      style={{ background: isSuccess ? '#f0fdf9' : '#fff5f5', border: `1.5px solid ${isSuccess ? '#89f5e7' : '#fdbaa2'}` }}
    >
      {isSuccess
        ? <CheckCircle size={20} style={{ color: '#00685f', flexShrink: 0 }} />
        : <XCircle size={20} style={{ color: '#924628', flexShrink: 0 }} />
      }
      <div className="flex-1">
        <p className="text-sm font-bold" style={{ color: isSuccess ? '#00685f' : '#924628' }}>
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-xs mt-0.5" style={{ color: '#6d7a77' }}>{toast.message}</p>
        )}
      </div>
      <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors ml-1">×</button>
    </div>
  );
}
