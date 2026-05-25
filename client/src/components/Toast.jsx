import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;
  const isSuccess = toast.type === 'success';
  const isLoading = toast.type === 'loading';

  const bg = isSuccess ? '#f0fdf9' : isLoading ? '#eef2ff' : '#fff5f5';
  const border = isSuccess ? '#89f5e7' : isLoading ? '#c7d2fe' : '#fdbaa2';
  const color = isSuccess ? '#00685f' : isLoading ? '#4338ca' : '#924628';

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl max-w-sm animate-in slide-in-from-bottom-4 duration-300"
      style={{ background: bg, border: `1.5px solid ${border}` }}
    >
      {isSuccess
        ? <CheckCircle size={20} style={{ color, flexShrink: 0 }} />
        : isLoading
        ? <Loader2 size={20} style={{ color, flexShrink: 0 }} className="animate-spin" />
        : <XCircle size={20} style={{ color, flexShrink: 0 }} />
      }
      <div className="flex-1">
        <p className="text-sm font-bold" style={{ color }}>
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-xs mt-0.5" style={{ color: '#6d7a77' }}>{toast.message}</p>
        )}
      </div>
      {!isLoading && (
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors ml-1">×</button>
      )}
    </div>
  );
}
