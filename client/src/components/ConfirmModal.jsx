import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Delete', isDestructive = true }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 min-h-screen">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-teal-50 text-teal-500'}`}>
              <AlertTriangle size={24} />
            </div>
            <button 
              onClick={onCancel}
              className="text-zinc-400 hover:text-zinc-600 transition-colors bg-zinc-50 hover:bg-zinc-100 rounded-full p-2"
            >
              <X size={16} />
            </button>
          </div>
          
          <h3 className="text-xl font-bold text-zinc-900 mb-2 tracking-tight">{title}</h3>
          <p className="text-sm text-zinc-500 leading-relaxed mb-8 whitespace-pre-wrap">
            {message}
          </p>

          <div className="flex items-center gap-3 w-full">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
              }}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold text-white transition-all active:scale-95 shadow-lg ${
                isDestructive 
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' 
                  : 'bg-teal-600 hover:bg-teal-700 shadow-teal-500/20'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
