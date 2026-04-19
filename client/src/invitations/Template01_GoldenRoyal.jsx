import { useEffect, useRef } from 'react';

/* ─────────────────────────────────────────────────────────────────
   Template 01 — GOLDEN ROYAL
   Converted from template.html — all animations preserved.

   Props:
     data = {
       groomName, brideName,
       groomFatherName, brideFatherName,
       groomDesc, brideDesc,
       weddingDate,        // ISO string e.g. "2026-02-15T08:00:00"
       venueName, venueAddress,
       groomPhoto,         // URL string or null
       bridePhoto,
       heroPhoto,          // URL string or null (hero background)
       events: [{ icon, title, date, time, place, image, tag }],
       galleries: [{ url, caption }],
       rsvpPhone1, rsvpPhone2,
       hiddenSections,     // Set of section keys to hide
     }
───────────────────────────────────────────────────────────────── */

const DEFAULT_HERO   = 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=1600&q=85';
const DEFAULT_GROOM  = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80';
const DEFAULT_BRIDE  = 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80';

function isHidden(hiddenSections, key) {
  if (!hiddenSections) return false;
  return hiddenSections instanceof Set ? hiddenSections.has(key) : hiddenSections.includes(key);
}

export default function Template01_GoldenRoyal({ data = {} }) {
  const {
    groomName       = 'Arjun',
    brideName       = 'Priya',
    groomFatherName = 'Mr. & Mrs. Rajesh Sharma',
    brideFatherName = 'Mr. & Mrs. Suresh Nair',
    groomDesc       = 'A passionate architect who believes beauty lies in the details — whether designing skylines or planning the perfect date.',
    brideDesc       = 'A gifted classical dancer and doctor by day, Priya brings grace to every step she takes.',
    weddingDate     = '2026-02-15T08:00:00',
    venueName       = 'The Leela Palace',
    venueAddress    = '23, Old Airport Road, Bengaluru, Karnataka 560008',
    groomPhoto      = null,
    bridePhoto      = null,
    heroPhoto       = null,
    events          = [],
    galleries       = [],
    rsvpPhone1      = '+91 98765 43210',
    rsvpPhone2      = '+91 91234 56789',
    hiddenSections  = new Set(),
  } = data;

  const containerRef = useRef(null);
  const animatedRef  = useRef(false);

  /* ── Format wedding date for display ─────────────────────── */
  const dateObj    = new Date(weddingDate);
  const displayDate = dateObj.toLocaleDateString('en-IN', {
    day: 'ordinal' in Intl.DateTimeFormat.prototype ? 'numeric' : 'numeric',
    month: 'long',
    year: 'numeric',
  });

  /* ── Run all JS effects inside the template ─────────────── */
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    /* ─ Scroll animations ─ */
    const scrollEls = root.querySelectorAll('[data-scroll]');
    scrollEls.forEach(el => el.classList.add('out-below'));

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const el = entry.target;
        if (entry.isIntersecting) {
          el.classList.add('in-view');
          el.classList.remove('out-above', 'out-below');
        } else {
          el.classList.remove('in-view');
          const rect = el.getBoundingClientRect();
          if (rect.top < 0) {
            el.classList.add('out-above');
            el.classList.remove('out-below');
          } else {
            el.classList.remove('out-above');
            el.classList.add('out-below');
          }
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    scrollEls.forEach(el => io.observe(el));

    /* ─ Stars ─ */
    function makeStars(id, n) {
      const el = root.querySelector(`#${id}`);
      if (!el) return;
      el.innerHTML = '';
      for (let i = 0; i < n; i++) {
        const s = document.createElement('div');
        s.className = 'inv-star';
        const size = (Math.random() * 2.5 + 0.5).toFixed(1);
        s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;width:${size}px;height:${size}px;animation-duration:${(Math.random()*3+2).toFixed(1)}s;animation-delay:${(Math.random()*5).toFixed(1)}s;`;
        el.appendChild(s);
      }
    }
    makeStars('inv-sf1', 90);
    makeStars('inv-sf2', 60);

    /* ─ Countdown ─ */
    function tick() {
      const target = new Date(weddingDate);
      const diff = target - new Date();
      const pad = n => String(Math.floor(Math.abs(n))).padStart(2, '0');
      if (diff <= 0) {
        ['inv-cd-d','inv-cd-h','inv-cd-m','inv-cd-s'].forEach(id => {
          const el = root.querySelector(`#${id}`);
          if (el) el.textContent = '00';
        });
        return;
      }
      const ids = ['inv-cd-d','inv-cd-h','inv-cd-m','inv-cd-s'];
      const vals = [diff/86400000, (diff%86400000)/3600000, (diff%3600000)/60000, (diff%60000)/1000];
      ids.forEach((id, i) => {
        const el = root.querySelector(`#${id}`);
        if (el) el.textContent = pad(vals[i]);
      });
    }
    tick();
    const cdInterval = setInterval(tick, 1000);

    /* ─ Scroll progress ─ */
    const progressBar = root.querySelector('#inv-progress-bar');
    const scrollContainer = root.closest('.inv-scroll-host') || root;
    const onScroll = () => {
      if (!progressBar) return;
      const el = root;
      const scrolled = ((window.scrollY || el.scrollTop || 0) /
        (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      progressBar.style.width = Math.min(100, scrolled) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ─ Petals ─ */
    const emojis = ['🌸','🌺','🌹','✿','❀','💮','🌼'];
    const petalContainer = root.querySelector('#inv-petals');
    function spawnPetal() {
      if (!petalContainer) return;
      const p = document.createElement('div');
      p.className = 'inv-petal-el';
      p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      const dur = (Math.random() * 6 + 5).toFixed(1);
      const size = (Math.random() * 14 + 10).toFixed(0);
      p.style.cssText = `left:${Math.random()*100}%;animation-duration:${dur}s;font-size:${size}px;`;
      petalContainer.appendChild(p);
      setTimeout(() => p.remove(), parseFloat(dur) * 1000 + 200);
    }
    const petalInterval = setInterval(spawnPetal, 700);

    return () => {
      io.disconnect();
      clearInterval(cdInterval);
      clearInterval(petalInterval);
      window.removeEventListener('scroll', onScroll);
    };
  }, [weddingDate, hiddenSections]);

  /* ── Default events if none provided ─────────────────────── */
  const eventList = events.length > 0 ? events : [
    {
      icon: '🌿', tag: 'Day 1',
      title: 'Mehendi & Sangeet',
      date: '13th February 2026', time: '6:00 PM onwards',
      place: 'Sharma Residence',
      desc: 'Celebrate with music, dance & beautiful henna art at Sharma Residence',
      image: 'https://images.unsplash.com/photo-1610173826608-b52d17f38b9c?w=600&q=80',
    },
    {
      icon: '🌼', tag: 'Day 2',
      title: 'Haldi Ceremony',
      date: '14th February 2026', time: '10:00 AM onwards',
      place: venueName,
      desc: 'A joyous turmeric blessing ceremony for prosperity and radiant glow',
      image: 'https://images.unsplash.com/photo-1617029735951-5baf979b4c88?w=600&q=80',
    },
    {
      icon: '🪔', tag: 'Main Event',
      title: 'Wedding & Reception',
      date: displayDate, time: '8:00 AM · Vivah Muhurtam',
      place: venueName,
      desc: `${venueName} · Reception at 7:00 PM`,
      image: 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=600&q=80',
      isMain: true,
    },
  ];

  const galleryList = galleries.length > 0 ? galleries : [
    { url: 'https://images.unsplash.com/photo-1610073562806-2041bef97012?w=600&q=80', caption: 'Golden Hour' },
    { url: 'https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=800&q=80', caption: 'Sacred Moments' },
    { url: 'https://images.unsplash.com/photo-1627662235991-c5a1d5c46f5b?w=800&q=80', caption: 'Wedding Decor' },
    { url: 'https://images.unsplash.com/photo-1621786030484-4c855eed6974?w=500&q=80', caption: 'Forever Love' },
    { url: 'https://images.unsplash.com/photo-1598897516650-6a988e6cf21b?w=500&q=80', caption: 'Marigold Dreams' },
    { url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=500&q=80', caption: 'Celebrations' },
  ];

  const heroBg = heroPhoto || DEFAULT_HERO;

  return (
    <div ref={containerRef} className="inv-root" style={{ fontFamily: "'Cormorant Garamond', serif", background: '#080200', color: '#e8d5a3', overflowX: 'hidden', position: 'relative' }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,300;0,500;1,400&family=Dancing+Script:wght@600;700&display=swap');

        .inv-root { --gold:#f5a623; --gold-dark:#c5700a; --gold-light:#ffd980; --bg:#080200; --bg2:#0f0400; --bg3:#120600; }

        /* Scroll animation engine */
        .inv-root [data-scroll] { transition-property:opacity,transform,filter; transition-timing-function:cubic-bezier(0.16,1,0.3,1); transition-duration:0.85s; will-change:opacity,transform; }
        .inv-root [data-scroll="up"]    { opacity:0; transform:translateY(70px); }
        .inv-root [data-scroll="up"].in-view   { opacity:1; transform:translateY(0); }
        .inv-root [data-scroll="up"].out-above { opacity:0; transform:translateY(-50px); }
        .inv-root [data-scroll="down"]  { opacity:0; transform:translateY(-70px); }
        .inv-root [data-scroll="down"].in-view   { opacity:1; transform:translateY(0); }
        .inv-root [data-scroll="down"].out-below { opacity:0; transform:translateY(50px); }
        .inv-root [data-scroll="left"]  { opacity:0; transform:translateX(-80px); }
        .inv-root [data-scroll="left"].in-view   { opacity:1; transform:translateX(0); }
        .inv-root [data-scroll="left"].out-above { opacity:0; transform:translateX(80px); }
        .inv-root [data-scroll="right"] { opacity:0; transform:translateX(80px); }
        .inv-root [data-scroll="right"].in-view   { opacity:1; transform:translateX(0); }
        .inv-root [data-scroll="right"].out-above { opacity:0; transform:translateX(-80px); }
        .inv-root [data-scroll="scale"] { opacity:0; transform:scale(0.7) rotate(-3deg); }
        .inv-root [data-scroll="scale"].in-view   { opacity:1; transform:scale(1) rotate(0deg); }
        .inv-root [data-scroll="scale"].out-above { opacity:0; transform:scale(1.15) rotate(3deg); }
        .inv-root [data-scroll="flip"]  { opacity:0; transform:perspective(600px) rotateX(30deg); filter:blur(4px); }
        .inv-root [data-scroll="flip"].in-view   { opacity:1; transform:perspective(600px) rotateX(0deg); filter:blur(0); }
        .inv-root [data-scroll="flip"].out-above { opacity:0; transform:perspective(600px) rotateX(-30deg); filter:blur(4px); }
        .inv-root [data-scroll="rotate"] { opacity:0; transform:rotate(-15deg) scale(0.8); }
        .inv-root [data-scroll="rotate"].in-view { opacity:1; transform:rotate(0deg) scale(1); }
        .inv-root [data-scroll="rotate"].out-above { opacity:0; transform:rotate(15deg) scale(0.8); }
        .inv-root [data-delay="1"] { transition-delay:.1s; }
        .inv-root [data-delay="2"] { transition-delay:.2s; }
        .inv-root [data-delay="3"] { transition-delay:.3s; }
        .inv-root [data-delay="4"] { transition-delay:.4s; }
        .inv-root [data-delay="5"] { transition-delay:.5s; }
        .inv-root [data-delay="6"] { transition-delay:.6s; }
        .inv-root [data-delay="7"] { transition-delay:.7s; }
        .inv-root [data-delay="8"] { transition-delay:.8s; }

        /* Keyframes */
        @keyframes inv-float { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-14px) rotate(2deg)} }
        @keyframes inv-glow-pulse { 0%,100%{text-shadow:0 0 20px #f5a623,0 0 40px #e8890c} 50%{text-shadow:0 0 35px #f5a623,0 0 70px #e8890c,0 0 100px #c5700a} }
        @keyframes inv-spin-cw  { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes inv-spin-ccw { from{transform:rotate(360deg)} to{transform:rotate(0)} }
        @keyframes inv-shimmer  { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes inv-border-glow { 0%,100%{box-shadow:0 0 12px #f5a623aa,inset 0 0 12px #f5a62311} 50%{box-shadow:0 0 30px #f5a623cc,inset 0 0 25px #f5a62333} }
        @keyframes inv-twinkle { 0%,100%{opacity:.2;transform:scale(1)} 50%{opacity:1;transform:scale(1.6)} }
        @keyframes inv-petal-fall { 0%{transform:translateY(-30px) rotate(0) scale(1);opacity:1} 100%{transform:translateY(105vh) rotate(800deg) scale(.5);opacity:0} }
        @keyframes inv-bounce-y { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes inv-wave { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.8)} }
        @keyframes inv-gradient-x { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }

        /* Utility classes */
        .inv-shimmer { background:linear-gradient(90deg,#c5700a 0%,#f5a623 30%,#fff8d0 50%,#f5a623 70%,#c5700a 100%);background-size:300% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:inv-shimmer 4s linear infinite; }
        .inv-gold-hr { height:1px;background:linear-gradient(90deg,transparent,#f5a623 30%,#fff8d0 50%,#f5a623 70%,transparent); }
        .inv-g-card  { border:1px solid rgba(245,166,35,.5);box-shadow:0 0 18px rgba(245,166,35,.15),inset 0 0 18px rgba(245,166,35,.05);animation:inv-border-glow 3s ease-in-out infinite; }
        .inv-om      { animation:inv-glow-pulse 2s ease-in-out infinite,inv-float 4s ease-in-out infinite; }
        .inv-ring-cw  { animation:inv-spin-cw 22s linear infinite; }
        .inv-ring-ccw { animation:inv-spin-ccw 16s linear infinite; }
        .inv-ph { overflow:hidden; position:relative; }
        .inv-ph img { transition:transform .7s cubic-bezier(.25,.8,.25,1);display:block;width:100%;height:100%;object-fit:cover; }
        .inv-ph:hover img { transform:scale(1.09); }
        .inv-ph-ov { position:absolute;inset:0;background:linear-gradient(to top,rgba(8,2,0,.85),transparent);opacity:0;transition:opacity .4s;display:flex;align-items:flex-end;padding:12px; }
        .inv-ph:hover .inv-ph-ov { opacity:1; }
        .inv-star { position:absolute;border-radius:50%;background:#fff;animation:inv-twinkle ease-in-out infinite; }
        .inv-petal-el { position:fixed;top:-40px;pointer-events:none;z-index:9990;animation:inv-petal-fall linear forwards; }
        .inv-wave-bar { display:inline-block;width:3px;background:#f5a623;border-radius:2px;margin:0 1px;animation:inv-wave 1.2s ease-in-out infinite; }
        .inv-cd-box { background:linear-gradient(135deg,rgba(245,166,35,.08),rgba(197,112,10,.04));border:1px solid rgba(245,166,35,.3);backdrop-filter:blur(12px); }
        .inv-tl-item { position:relative; }
        .inv-tl-item::before { content:'';position:absolute;left:-22px;top:10px;width:12px;height:12px;border-radius:50%;background:#f5a623;box-shadow:0 0 0 4px rgba(245,166,35,.2),0 0 12px #f5a623; }
        .inv-tl-item::after  { content:'';position:absolute;left:-17px;top:22px;width:2px;height:calc(100% + 28px);background:linear-gradient(180deg,#f5a623,transparent); }
        .inv-rsvp-input { width:100%;background:transparent;border:1px solid rgba(245,166,35,.25);border-radius:4px;padding:12px 16px;color:#e8d5a3;font-family:'Cormorant Garamond',serif;font-size:15px;outline:none;transition:border-color .3s,box-shadow .3s; }
        .inv-rsvp-input:focus { border-color:#f5a623;box-shadow:0 0 0 3px rgba(245,166,35,.12); }
        .inv-rsvp-input::placeholder { color:rgba(245,166,35,.3); }
        .inv-max-w { max-width:1100px;margin:0 auto; }
        .inv-px { padding-left:24px;padding-right:24px; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-track { background:#080200; }
        ::-webkit-scrollbar-thumb { background:#f5a623;border-radius:2px; }
      `}</style>

      {/* Progress bar */}
      <div id="inv-progress-bar" style={{ position:'fixed',top:0,left:0,height:'2px',zIndex:2000,background:'linear-gradient(90deg,#c5700a,#f5a623,#ffd980)',boxShadow:'0 0 8px #f5a623',width:'0%',transition:'width .1s linear' }} />

      {/* Petal container */}
      <div id="inv-petals" />

      {/* ══════════ NAV ══════════ */}
      <nav style={{ position:'fixed',top:0,left:0,right:0,zIndex:1000,background:'rgba(8,2,0,.88)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(245,166,35,.18)' }}>
        <div className="inv-max-w inv-px" style={{ display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:'14px',paddingBottom:'14px' }}>
          <div className="inv-shimmer" style={{ fontFamily:"'Playfair Display',serif",fontWeight:700,letterSpacing:'.15em',fontSize:'14px' }}>✦ {groomName} & {brideName} ✦</div>
          <div style={{ display:'flex',gap:'28px',fontSize:'11px',letterSpacing:'.3em',textTransform:'uppercase',color:'rgba(197,160,85,.8)' }}>
            {['Home','Couple','Events','Gallery','RSVP'].map(label => (
              <a key={label} href={`#inv-s-${label.toLowerCase()}`} style={{ color:'inherit',textDecoration:'none',cursor:'pointer',transition:'color .3s' }}
                 onMouseOver={e => e.target.style.color='#f5a623'} onMouseOut={e => e.target.style.color='rgba(197,160,85,.8)'}>{label}</a>
            ))}
          </div>
        </div>
      </nav>

      {/* ══════════ HERO ══════════ */}
      {!isHidden(hiddenSections, 'hero') && (
        <section id="inv-s-home" style={{
          minHeight:'100vh',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',position:'relative',overflow:'hidden',
          background:`linear-gradient(to bottom,rgba(8,2,0,.88) 0%,rgba(8,2,0,.45) 40%,rgba(8,2,0,.72) 80%,rgba(8,2,0,1) 100%),url('${heroBg}') center 30% / cover fixed`
        }}>
          <div id="inv-sf1" style={{ position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none' }} />

          {/* Mandala rings */}
          <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none' }}>
            <div className="inv-ring-cw" style={{ width:'420px',height:'420px',borderRadius:'50%',border:'1px solid rgba(245,166,35,.08)' }} />
            <div className="inv-ring-ccw" style={{ position:'absolute',width:'340px',height:'340px',borderRadius:'50%',border:'1px solid rgba(245,166,35,.12)' }} />
            <div className="inv-ring-cw" style={{ position:'absolute',width:'260px',height:'260px',borderRadius:'50%',border:'1px solid rgba(245,166,35,.07)' }} />
          </div>

          <div style={{ textAlign:'center',position:'relative',zIndex:10,padding:'100px 24px' }}>
            <div className="inv-om" style={{ fontSize:'68px',color:'#f5a623',marginBottom:'16px',display:'block' }}>ॐ</div>

            <div data-scroll="up" style={{ display:'flex',alignItems:'center',gap:'16px',justifyContent:'center',marginBottom:'20px' }}>
              <div className="inv-gold-hr" style={{ flex:1,maxWidth:'80px' }} />
              <span style={{ fontSize:'10px',letterSpacing:'.5em',textTransform:'uppercase',color:'rgba(245,166,35,.65)' }}>With Divine Blessings</span>
              <div className="inv-gold-hr" style={{ flex:1,maxWidth:'80px' }} />
            </div>

            <p data-scroll="up" data-delay="1" style={{ fontSize:'11px',letterSpacing:'.45em',textTransform:'uppercase',color:'rgba(245,166,35,.7)',marginBottom:'12px' }}>Together with their families</p>

            <h1 data-scroll="scale" data-delay="2" className="inv-shimmer" style={{ fontFamily:"'Playfair Display',serif",fontSize:'clamp(64px,10vw,110px)',fontWeight:700,lineHeight:1,marginBottom:'8px' }}>{groomName}</h1>

            <div data-scroll="scale" data-delay="3" style={{ fontFamily:"'Dancing Script',cursive",fontSize:'40px',color:'rgba(245,166,35,.55)',marginBottom:'8px' }}>&amp;</div>

            <h1 data-scroll="scale" data-delay="4" className="inv-shimmer" style={{ fontFamily:"'Playfair Display',serif",fontSize:'clamp(64px,10vw,110px)',fontWeight:700,lineHeight:1,marginBottom:'32px' }}>{brideName}</h1>

            <div className="inv-gold-hr" data-scroll="up" data-delay="5" style={{ maxWidth:'280px',margin:'0 auto 28px' }} />

            <p data-scroll="up" data-delay="5" style={{ fontFamily:"'Dancing Script',cursive",fontSize:'24px',color:'rgba(197,160,85,.8)',marginBottom:'20px' }}>request the pleasure of your company</p>

            <div data-scroll="flip" data-delay="6" className="inv-g-card" style={{ display:'inline-block',padding:'14px 40px',borderRadius:'2px',marginBottom:'60px' }}>
              <p className="inv-shimmer" style={{ fontFamily:"'Playfair Display',serif",fontSize:'17px',fontWeight:700,letterSpacing:'.2em',textTransform:'uppercase' }}>{displayDate}</p>
            </div>

            <div data-scroll="up" data-delay="8" style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'10px',color:'rgba(245,166,35,.45)' }}>
              <span style={{ fontSize:'10px',letterSpacing:'.4em',textTransform:'uppercase' }}>Scroll to explore</span>
              <div style={{ width:'1px',height:'50px',background:'linear-gradient(to bottom,rgba(245,166,35,.6),transparent)' }} />
              <div style={{ width:'5px',height:'5px',borderRadius:'50%',background:'#f5a623',animation:'inv-bounce-y 1.5s ease-in-out infinite' }} />
            </div>
          </div>
        </section>
      )}

      {/* ══════════ COUNTDOWN ══════════ */}
      {!isHidden(hiddenSections, 'countdown') && (
        <section id="inv-s-countdown" style={{ padding:'80px 24px',background:'linear-gradient(to bottom,#080200,#120600,#080200)' }}>
          <div className="inv-max-w" style={{ textAlign:'center' }}>
            <div data-scroll="down" style={{ marginBottom:'40px' }}>
              <div className="inv-gold-hr" style={{ maxWidth:'100px',margin:'0 auto 16px' }} />
              <p style={{ fontSize:'11px',letterSpacing:'.45em',textTransform:'uppercase',color:'rgba(245,166,35,.55)' }}>Days until we become one</p>
              <div className="inv-gold-hr" style={{ maxWidth:'100px',margin:'16px auto 0' }} />
            </div>

            <div style={{ display:'flex',justifyContent:'center',gap:'16px',flexWrap:'wrap' }}>
              {[['inv-cd-d','Days'],['inv-cd-h','Hours'],['inv-cd-m','Mins'],['inv-cd-s','Secs']].map(([cdId, label], i) => (
                <div key={cdId} data-scroll="scale" data-delay={String(i+1)} className="inv-cd-box" style={{ borderRadius:'8px',padding:'24px 32px',textAlign:'center',minWidth:'90px' }}>
                  <div id={cdId} style={{ fontFamily:"'Playfair Display',serif",fontSize:'48px',fontWeight:700,color:'#f5a623',lineHeight:1 }}>00</div>
                  <div style={{ fontSize:'10px',letterSpacing:'.35em',textTransform:'uppercase',color:'rgba(245,166,35,.5)',marginTop:'6px' }}>{label}</div>
                </div>
              ))}
            </div>

            <div data-scroll="up" data-delay="5" style={{ marginTop:'32px',display:'flex',alignItems:'center',justifyContent:'center',gap:'12px',color:'rgba(245,166,35,.45)',fontSize:'12px',letterSpacing:'.2em',textTransform:'uppercase' }}>
              <div style={{ display:'flex',alignItems:'flex-end',height:'16px',gap:'2px' }}>
                {[8,14,6,12,10].map((h,i) => <div key={i} className="inv-wave-bar" style={{ height:`${h}px`,animationDelay:`${i*0.15}s` }} />)}
              </div>
              Live celebration playing
              <div style={{ display:'flex',alignItems:'flex-end',height:'16px',gap:'2px' }}>
                {[10,6,14,8,12].map((h,i) => <div key={i} className="inv-wave-bar" style={{ height:`${h}px`,animationDelay:`${i*0.15+0.05}s` }} />)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══════════ COUPLE STORY ══════════ */}
      {!isHidden(hiddenSections, 'couple') && (
        <section id="inv-s-couple" style={{
          padding:'100px 24px',
          background:`linear-gradient(to bottom,rgba(8,2,0,.95),rgba(8,2,0,.75),rgba(8,2,0,.95)),url('https://images.unsplash.com/photo-1627662235991-c5a1d5c46f5b?w=1400&q=80') center / cover fixed`
        }}>
          <div className="inv-max-w">
            <div style={{ textAlign:'center',marginBottom:'70px' }}>
              <p data-scroll="down" style={{ fontSize:'11px',letterSpacing:'.5em',textTransform:'uppercase',color:'rgba(245,166,35,.55)',marginBottom:'10px' }}>Our Love Story</p>
              <h2 data-scroll="up" style={{ fontFamily:"'Playfair Display',serif",fontSize:'clamp(32px,5vw,52px)',color:'#f5a623',fontWeight:700 }}>Two Souls, One Journey</h2>
              <div className="inv-gold-hr" data-scroll="up" data-delay="2" style={{ maxWidth:'160px',margin:'20px auto 0' }} />
            </div>

            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'64px',alignItems:'start',marginBottom:'80px' }}>
              {/* Groom */}
              <div style={{ textAlign:'center' }}>
                <div data-scroll="left" className="inv-ph inv-g-card" style={{ borderRadius:'50%',width:'200px',height:'200px',margin:'0 auto 24px',overflow:'hidden' }}>
                  <img src={groomPhoto || DEFAULT_GROOM} alt="Groom" style={{ width:'100%',height:'100%',objectFit:'cover' }} />
                  <div className="inv-ph-ov" />
                </div>
                <div data-scroll="left" data-delay="2">
                  <p style={{ fontSize:'10px',letterSpacing:'.4em',textTransform:'uppercase',color:'rgba(245,166,35,.5)',marginBottom:'6px' }}>The Groom</p>
                  <h3 style={{ fontFamily:"'Playfair Display',serif",fontSize:'32px',color:'#f5a623',marginBottom:'6px' }}>{groomName}</h3>
                  <p style={{ fontStyle:'italic',fontSize:'14px',color:'rgba(245,166,35,.45)',marginBottom:'14px' }}>Son of {groomFatherName}</p>
                  <div className="inv-gold-hr" style={{ maxWidth:'80px',margin:'0 auto 16px' }} />
                  <p style={{ fontSize:'15px',lineHeight:1.8,color:'rgba(232,213,163,.65)' }}>{groomDesc}</p>
                </div>
              </div>

              {/* Bride */}
              <div style={{ textAlign:'center' }}>
                <div data-scroll="right" className="inv-ph inv-g-card" style={{ borderRadius:'50%',width:'200px',height:'200px',margin:'0 auto 24px',overflow:'hidden' }}>
                  <img src={bridePhoto || DEFAULT_BRIDE} alt="Bride" style={{ width:'100%',height:'100%',objectFit:'cover' }} />
                  <div className="inv-ph-ov" />
                </div>
                <div data-scroll="right" data-delay="2">
                  <p style={{ fontSize:'10px',letterSpacing:'.4em',textTransform:'uppercase',color:'rgba(245,166,35,.5)',marginBottom:'6px' }}>The Bride</p>
                  <h3 style={{ fontFamily:"'Playfair Display',serif",fontSize:'32px',color:'#f5a623',marginBottom:'6px' }}>{brideName}</h3>
                  <p style={{ fontStyle:'italic',fontSize:'14px',color:'rgba(245,166,35,.45)',marginBottom:'14px' }}>Daughter of {brideFatherName}</p>
                  <div className="inv-gold-hr" style={{ maxWidth:'80px',margin:'0 auto 16px' }} />
                  <p style={{ fontSize:'15px',lineHeight:1.8,color:'rgba(232,213,163,.65)' }}>{brideDesc}</p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div style={{ textAlign:'center',marginBottom:'48px' }}>
              <h3 data-scroll="rotate" style={{ fontFamily:"'Playfair Display',serif",fontSize:'28px',color:'#f5a623',fontStyle:'italic' }}>✦ How It All Began ✦</h3>
            </div>
            <div style={{ position:'relative',borderLeft:'1px solid rgba(245,166,35,.25)',marginLeft:'32px',paddingLeft:'40px' }}>
              {[
                { date:'February 2022', title:'First Meeting', desc:"A chance encounter at a cultural festival in Bengaluru — their eyes met across a sea of marigolds and jasmine strings." },
                { date:'Diwali 2022', title:'The First Date', desc:"Under a sky full of fireworks, they worked up the courage. She said yes before the sentence was finished." },
                { date:'January 2025', title:'The Proposal', desc:"At the Mysore Palace, with rose petals and a ring — she said yes before he even finished the question!" },
                { date: displayDate, title:'Forever Begins 💛', desc:"And now, they invite you to witness and celebrate the beginning of their forever." },
              ].map((item, i) => (
                <div key={i} data-scroll="left" data-delay={String(i+1)} className="inv-tl-item" style={{ marginBottom:'44px',paddingBottom:'4px' }}>
                  <p style={{ fontSize:'10px',letterSpacing:'.35em',textTransform:'uppercase',color:'rgba(245,166,35,.45)',marginBottom:'4px' }}>{item.date}</p>
                  <h4 style={{ fontFamily:"'Playfair Display',serif",fontSize:'22px',color:'#f5a623',marginBottom:'8px' }}>{item.title}</h4>
                  <p style={{ fontSize:'15px',lineHeight:1.8,color:'rgba(232,213,163,.6)' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════ EVENTS ══════════ */}
      {!isHidden(hiddenSections, 'events') && (
        <section id="inv-s-events" style={{
          padding:'100px 24px',
          background:`linear-gradient(135deg,rgba(8,2,0,.98),rgba(15,5,0,.9),rgba(8,2,0,.98)),url('https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1400&q=80') center / cover fixed`
        }}>
          <div id="inv-sf2" style={{ position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none' }} />
          <div className="inv-max-w" style={{ position:'relative',zIndex:2 }}>
            <div style={{ textAlign:'center',marginBottom:'64px' }}>
              <p data-scroll="down" style={{ fontSize:'11px',letterSpacing:'.5em',textTransform:'uppercase',color:'rgba(245,166,35,.55)',marginBottom:'10px' }}>Join Us For</p>
              <h2 data-scroll="flip" style={{ fontFamily:"'Playfair Display',serif",fontSize:'clamp(32px,5vw,52px)',color:'#f5a623' }}>Wedding Celebrations</h2>
              <div className="inv-gold-hr" data-scroll="up" data-delay="2" style={{ maxWidth:'160px',margin:'20px auto 0' }} />
            </div>

            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'20px',marginBottom:'32px' }}>
              {eventList.map((ev, i) => (
                <div key={i} data-scroll="up" data-delay={String(i*2+1)}
                  className={ev.isMain ? '' : 'inv-g-card'}
                  style={{
                    borderRadius:'10px',overflow:'hidden',
                    ...(ev.isMain ? { border:'1px solid #f5a623',boxShadow:'0 0 30px rgba(245,166,35,.3),inset 0 0 30px rgba(245,166,35,.06)',animation:'inv-border-glow 2s ease-in-out infinite' } : {})
                  }}>
                  <div className="inv-ph" style={{ height:'220px',position:'relative' }}>
                    <img src={ev.image} alt={ev.title} />
                    <div className="inv-ph-ov"><span style={{ fontSize:'11px',color:'rgba(255,240,200,.7)',letterSpacing:'.2em',textTransform:'uppercase' }}>{ev.tag}</span></div>
                    {ev.isMain && (
                      <div style={{ position:'absolute',bottom:'12px',left:'12px',background:'rgba(245,166,35,.85)',color:'#1a0600',fontSize:'10px',fontWeight:700,letterSpacing:'.2em',textTransform:'uppercase',padding:'4px 12px',borderRadius:'20px' }}>Main Event</div>
                    )}
                  </div>
                  <div style={{ padding:'24px',textAlign:'center',background:'rgba(12,4,0,.9)' }}>
                    <div style={{ fontSize:'28px',marginBottom:'12px' }}>{ev.icon}</div>
                    <h3 style={{ fontFamily:"'Playfair Display',serif",fontSize:'20px',color:'#f5a623',marginBottom:'6px' }}>{ev.title}</h3>
                    <div className="inv-gold-hr" style={{ maxWidth:'50px',margin:'12px auto' }} />
                    <p style={{ fontSize:'11px',letterSpacing:'.25em',textTransform:'uppercase',color:'rgba(245,166,35,.5)',marginBottom:'4px' }}>{ev.date}</p>
                    <p style={{ fontSize:'14px',color:'rgba(232,213,163,.55)',marginBottom:'10px' }}>{ev.time}</p>
                    <p style={{ fontSize:'13px',lineHeight:1.7,color:'rgba(232,213,163,.45)' }}>{ev.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Venue card */}
            <div data-scroll="scale" className="inv-g-card" style={{ borderRadius:'10px',padding:'40px',textAlign:'center',background:'rgba(8,2,0,.85)' }}>
              <div style={{ fontSize:'24px',marginBottom:'12px' }}>📍</div>
              <h3 style={{ fontFamily:"'Playfair Display',serif",fontSize:'26px',color:'#f5a623',marginBottom:'8px' }}>{venueName}</h3>
              <p style={{ fontSize:'14px',color:'rgba(232,213,163,.55)',marginBottom:'20px' }}>{venueAddress}</p>
              <div className="inv-gold-hr" style={{ maxWidth:'120px',margin:'0 auto 24px' }} />
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'20px' }}>
                {[['🍽️','Grand Feast'],['🎶','Live Music'],['🅿️','Valet Parking']].map(([icon, label]) => (
                  <div key={label}>
                    <div style={{ fontSize:'22px' }}>{icon}</div>
                    <p style={{ fontSize:'12px',color:'rgba(232,213,163,.45)',marginTop:'6px' }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══════════ QUOTE DIVIDER ══════════ */}
      {!isHidden(hiddenSections, 'quote') && (
        <section style={{ padding:'80px 24px',textAlign:'center',background:'linear-gradient(135deg,#080200,#120600,#080200)' }}>
          <div className="inv-max-w" style={{ maxWidth:'700px' }}>
            <div data-scroll="scale" style={{ fontSize:'80px',color:'rgba(245,166,35,.2)',lineHeight:1,fontFamily:"'Playfair Display',serif",marginBottom:'8px' }}>"</div>
            <blockquote data-scroll="flip" style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:'clamp(18px,3vw,26px)',fontStyle:'italic',lineHeight:1.8,color:'rgba(232,213,163,.65)',marginBottom:'16px' }}>
              Where there is love, there is life. And where there is this love — there is an eternity of joy waiting to unfold.
            </blockquote>
            <p data-scroll="up" data-delay="2" style={{ fontSize:'12px',letterSpacing:'.3em',color:'rgba(245,166,35,.45)' }}>— Mahatma Gandhi</p>
            <div className="inv-gold-hr" data-scroll="up" data-delay="3" style={{ maxWidth:'100px',margin:'24px auto 0' }} />
          </div>
        </section>
      )}

      {/* ══════════ GALLERY ══════════ */}
      {!isHidden(hiddenSections, 'gallery') && (
        <section id="inv-s-gallery" style={{
          padding:'100px 24px',
          background:`linear-gradient(to bottom,rgba(8,2,0,.92),rgba(8,2,0,.72),rgba(8,2,0,.92)),url('https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=1400&q=80') center / cover fixed`
        }}>
          <div className="inv-max-w">
            <div style={{ textAlign:'center',marginBottom:'64px' }}>
              <p data-scroll="down" style={{ fontSize:'11px',letterSpacing:'.5em',textTransform:'uppercase',color:'rgba(245,166,35,.55)',marginBottom:'10px' }}>Pre-Wedding</p>
              <h2 data-scroll="up" style={{ fontFamily:"'Playfair Display',serif",fontSize:'clamp(32px,5vw,52px)',color:'#f5a623' }}>Our Moments Together</h2>
              <div className="inv-gold-hr" data-scroll="up" data-delay="2" style={{ maxWidth:'160px',margin:'20px auto 0' }} />
            </div>

            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px' }}>
              {galleryList.map((img, i) => (
                <div key={i} data-scroll={['left','up','up','right','left','up','right'][i % 7]} data-delay={String((i % 5) + 1)}
                  className="inv-ph inv-g-card"
                  style={{ borderRadius:'8px',overflow:'hidden',height: i===1||i===2 ? '260px' : '220px', gridColumn: (i===1||i===2) ? 'span 2' : undefined }}>
                  <img src={img.url} alt={img.caption} />
                  <div className="inv-ph-ov"><p style={{ fontSize:'12px',fontStyle:'italic',color:'rgba(255,245,210,.8)' }}>{img.caption}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════ RSVP ══════════ */}
      {!isHidden(hiddenSections, 'rsvp') && (
        <section id="inv-s-rsvp" style={{ padding:'100px 24px',background:'linear-gradient(to bottom,#080200,#0f0400)' }}>
          <div className="inv-max-w" style={{ maxWidth:'580px' }}>
            <div style={{ textAlign:'center',marginBottom:'52px' }}>
              <p data-scroll="down" style={{ fontSize:'11px',letterSpacing:'.5em',textTransform:'uppercase',color:'rgba(245,166,35,.55)',marginBottom:'10px' }}>We would be honoured</p>
              <h2 data-scroll="flip" style={{ fontFamily:"'Playfair Display',serif",fontSize:'clamp(36px,5vw,56px)',color:'#f5a623' }}>RSVP</h2>
              <div className="inv-gold-hr" data-scroll="up" data-delay="2" style={{ maxWidth:'80px',margin:'20px auto' }} />
            </div>

            <div data-scroll="scale" className="inv-g-card" style={{ borderRadius:'12px',padding:'40px',background:'linear-gradient(135deg,rgba(245,166,35,.06),rgba(197,112,10,.03))' }}>
              <div style={{ display:'flex',flexDirection:'column',gap:'20px' }}>
                <div>
                  <label style={{ display:'block',fontSize:'10px',letterSpacing:'.35em',textTransform:'uppercase',color:'rgba(245,166,35,.6)',marginBottom:'8px' }}>Your Full Name</label>
                  <input type="text" placeholder="e.g. Ravi & Anita Menon" className="inv-rsvp-input" />
                </div>
                <div>
                  <label style={{ display:'block',fontSize:'10px',letterSpacing:'.35em',textTransform:'uppercase',color:'rgba(245,166,35,.6)',marginBottom:'8px' }}>Number of Guests</label>
                  <select className="inv-rsvp-input" style={{ cursor:'pointer',background:'#0f0400' }}>
                    <option>Select guests</option>
                    {['1 guest','2 guests','3 guests','4+ guests'].map(o => <option key={o} style={{ background:'#0f0400' }}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display:'block',fontSize:'10px',letterSpacing:'.35em',textTransform:'uppercase',color:'rgba(245,166,35,.6)',marginBottom:'8px' }}>Your Blessings</label>
                  <textarea placeholder="Write your heartfelt wishes..." rows={4} className="inv-rsvp-input" style={{ resize:'none' }} />
                </div>
                <button style={{ width:'100%',padding:'16px',border:'none',borderRadius:'4px',background:'linear-gradient(90deg,#c5700a,#f5a623,#c5700a)',backgroundSize:'300% 300%',color:'#1a0600',fontFamily:"'Playfair Display',serif",fontSize:'15px',fontWeight:700,letterSpacing:'.2em',textTransform:'uppercase',cursor:'pointer',animation:'inv-gradient-x 3s ease infinite' }}>
                  Send Blessings 🙏
                </button>
              </div>
            </div>

            <div data-scroll="up" data-delay="2" style={{ textAlign:'center',marginTop:'32px' }}>
              <p style={{ fontSize:'12px',color:'rgba(245,166,35,.4)',marginBottom:'6px' }}>For queries, please contact</p>
              <p style={{ fontSize:'14px',color:'rgba(245,166,35,.65)' }}>📞 {rsvpPhone1} · {rsvpPhone2}</p>
            </div>
          </div>
        </section>
      )}

      {/* ══════════ FOOTER ══════════ */}
      <footer style={{ padding:'64px 24px',textAlign:'center',borderTop:'1px solid rgba(245,166,35,.15)',background:'#040100' }}>
        <div data-scroll="scale">
          <div className="inv-om" style={{ fontSize:'44px',color:'#f5a623',marginBottom:'16px',display:'block' }}>ॐ</div>
          <p className="inv-shimmer" style={{ fontFamily:"'Playfair Display',serif",fontSize:'26px',fontWeight:700,marginBottom:'8px' }}>{groomName} ∞ {brideName}</p>
          <p style={{ fontSize:'11px',letterSpacing:'.4em',textTransform:'uppercase',color:'rgba(245,166,35,.35)',marginBottom:'20px' }}>{displayDate} · {venueName}</p>
          <div className="inv-gold-hr" style={{ maxWidth:'120px',margin:'0 auto 20px' }} />
          <p style={{ fontSize:'12px',color:'rgba(245,166,35,.25)' }}>Crafted with 💛 for a lifetime of togetherness</p>
        </div>
      </footer>
    </div>
  );
}
