import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-brand-surface flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-8 py-5 flex items-center justify-between bg-brand-surface-white/90 backdrop-blur-xl shadow-[0_2px_24px_rgba(0,104,95,0.07)] border-b border-brand-outline-variant/40">
        <span className="text-xl font-bold tracking-tight text-brand-primary">
          WeddingQR
        </span>
        <button
          onClick={() => navigate('/signin')}
          className="silk-gradient text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg hover:opacity-90 active:scale-95 transition-all duration-200"
        >
          Sign In
        </button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Eyebrow */}
          <p className="text-brand-tertiary font-bold tracking-[0.12em] text-xs uppercase">
            Wedding Photography · Redefined
          </p>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-brand-on-surface leading-[1.05]">
            Every moment,{' '}
            <span className="text-brand-primary">perfectly</span>{' '}
            delivered.
          </h1>

          {/* Subtext */}
          <p className="text-lg md:text-xl text-brand-on-surface-variant font-medium max-w-xl mx-auto leading-relaxed">
            Let your guests instantly access, view, and relive your wedding memories — through a single, beautiful QR experience.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button
              onClick={() => navigate('/signin')}
              className="silk-gradient text-white px-10 py-4 rounded-2xl text-base font-bold shadow-xl hover:opacity-95 active:scale-95 transition-all duration-200"
            >
              Get Started
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="bg-brand-surface-white text-brand-primary border-2 border-brand-primary px-10 py-4 rounded-2xl text-base font-bold hover:bg-brand-surface-low transition-all duration-200 active:scale-95"
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="mt-20 flex flex-wrap gap-4 justify-center max-w-2xl">
          {[
            '📸 Instant QR Access',
            '🔒 Secure Galleries',
            '✨ Curated Selection',
            '☁️ Cloud Delivery',
            '💌 Guest Sharing',
          ].map((f) => (
            <span
              key={f}
              className="px-5 py-2.5 rounded-full bg-brand-surface-white border border-brand-outline-variant text-brand-on-surface-variant text-sm font-medium shadow-sm"
            >
              {f}
            </span>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-brand-outline-variant/40">
        <p className="text-xs text-brand-outline font-medium">
          © 2025 WeddingQR. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
