import { useNavigate } from 'react-router-dom';

export default function AuthLayout({ children, title, subtitle }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-brand-surface flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-8 py-5 flex items-center justify-between bg-brand-surface-white/90 backdrop-blur-xl border-b border-brand-outline-variant/40">
        <button
          onClick={() => navigate('/')}
          className="text-xl font-bold tracking-tight text-brand-primary hover:opacity-80 transition-opacity"
        >
          WeddingQR
        </button>
      </header>

      {/* Card */}
      <main className="flex-1 flex items-center justify-center px-4 pt-24 pb-12">
        <div className="w-full max-w-md">
          {/* Card container */}
          <div className="bg-brand-surface-white rounded-3xl shadow-[0_24px_64px_rgba(0,104,95,0.10)] border border-brand-outline-variant/30 p-10">
            {/* Brand mark */}
            <div className="flex justify-center mb-8">
              <div className="w-14 h-14 rounded-2xl silk-gradient flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl font-black">W</span>
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-extrabold text-brand-on-surface tracking-tight">{title}</h1>
              {subtitle && (
                <p className="text-sm text-brand-on-surface-variant mt-2 font-medium">{subtitle}</p>
              )}
            </div>

            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
