import { useState } from 'react'

function App() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white font-sans">
      <div className="w-20 h-20 rounded-3xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-6">
        <div className="w-10 h-10 rounded-2xl bg-teal-500 flex items-center justify-center shadow-lg shadow-teal-500/40">
          <span className="text-2xl">⚡️</span>
        </div>
      </div>
      <h1 className="text-4xl font-black mb-2 tracking-tight">Admin Console</h1>
      <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px]">WeddingQR Registry</p>
      
      <div className="mt-12 p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-xl max-w-sm w-full text-center">
        <p className="text-sm text-zinc-400 leading-relaxed">
          The main client application has been moved to the <code className="text-teal-400">/client</code> folder. This root application is now reserved for administrative tasks.
        </p>
        <button 
          onClick={() => window.location.href = '/client/'}
          className="mt-8 w-full py-3 rounded-xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95"
        >
          Go to Client App
        </button>
      </div>
      
      <footer className="mt-auto py-8">
        <p className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.5em]">System Ready · All Dependencies Synced</p>
      </footer>
    </div>
  )
}

export default App
