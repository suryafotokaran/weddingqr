import { useEffect, useRef, useState } from 'react';

/* ─────────────────────────────────────────────────────────────────
   Template 02 — ROSE & PURPLE ROYALE
   Converted from secondtemplate.html — all animations preserved.

   Features:
   - Heart Canvas Background
   - Custom Cursor with Heart Trail
   - Floating Hero Hearts
   - Bidirectional Scroll Reveal
   - Countdown Timer
───────────────────────────────────────────────────────────────── */

const DEFAULT_HERO   = 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80';
const DEFAULT_COUPLE = 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80';

function isHidden(hiddenSections, key) {
  if (!hiddenSections) return false;
  return hiddenSections instanceof Set ? hiddenSections.has(key) : hiddenSections.includes(key);
}

export default function Template02_RosePurple({ data = {} }) {
  const {
    groomName       = 'Arjun',
    brideName       = 'Priya',
    groomFatherName = 'Mr. & Mrs. Father Name',
    brideFatherName = 'Mr. & Mrs. Father Name',
    groomDesc       = 'What began as a chance encounter blossomed into something beautiful.',
    brideDesc       = 'Ready for the grandest adventure of all — forever.',
    weddingDate     = '2025-12-14T15:00:00',
    venueName       = 'ITC Grand Chola',
    venueAddress    = 'Chennai, India',
    heroPhoto       = null,
    galleries       = [],
    events          = [],
    rsvpPhone1      = '+91 98765 43210',
    rsvpPhone2      = '+91 91234 56789',
    hiddenSections  = new Set(),
  } = data;

  const containerRef = useRef(null);
  const canvasRef    = useRef(null);
  const curRef       = useRef(null);
  const cur2Ref      = useRef(null);

  /* ── Format Date ── */
  const dateObj = new Date(weddingDate);
  const displayDate = dateObj.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    /* ─── CUSTOM CURSOR ─── */
    const cur = curRef.current;
    const cur2 = cur2Ref.current;
    let hearts = [];

    const onMouseMove = (e) => {
      const cx = e.clientX;
      const cy = e.clientY;
      if (cur) {
        cur.style.left = cx + 'px';
        cur.style.top = cy + 'px';
      }
      if (cur2) {
        setTimeout(() => {
          cur2.style.left = cx + 'px';
          cur2.style.top = cy + 'px';
        }, 80);
      }

      // Trail hearts
      if (Math.random() < 0.2) {
        spawnHeart(cx, cy, false);
      }
    };

    const onClick = (e) => spawnHeart(e.clientX, e.clientY, true);
    
    root.addEventListener('mousemove', onMouseMove);
    root.addEventListener('click', onClick);

    /* ─── HEART CANVAS SYSTEM ─── */
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    function spawnHeart(x, y, fromClick) {
      const count = fromClick ? 6 : 1;
      const rect = root.getBoundingClientRect();
      const rectWidth = rect.width;
      const rectHeight = rect.height;

      for (let i = 0; i < count; i++) {
        const angle = fromClick ? (Math.PI * 2 * i / count) : (Math.random() * Math.PI * 2);
        hearts.push({
          x: x + (fromClick ? 0 : Math.random() * rectWidth),
          y: y + (fromClick ? 0 : rectHeight + 20),
          vx: fromClick ? Math.cos(angle) * 3 : ((Math.random() - .5) * 1.5),
          vy: fromClick ? Math.sin(angle) * 3 : -(Math.random() * 2 + 0.5),
          size: fromClick ? (Math.random() * 18 + 10) : (Math.random() * 14 + 6),
          alpha: fromClick ? .95 : .7,
          decay: fromClick ? .014 : .008,
          hue: Math.random() > 0.5 ? '#E8627A' : '#D4AF6A',
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - .5) * .1,
          pulse: Math.random() * Math.PI * 2,
          scale: 1,
          fromClick
        });
      }
    }

    let animationFrameId;
    const render = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Ambient spawn
      if (Math.random() < 0.15 && hearts.length < 80) spawnHeart(0, 0, false);

      hearts = hearts.filter(h => {
        h.x += h.vx; h.y += h.vy; h.alpha -= h.decay;
        h.rotation += h.rotSpeed;
        h.pulse += 0.1;
        const pScale = h.fromClick ? (1 + Math.sin(h.pulse) * 0.06) : 1;
        
        if (h.alpha <= 0) return false;
        
        ctx.save();
        ctx.globalAlpha = Math.max(0, h.alpha);
        ctx.fillStyle = h.hue;
        ctx.translate(h.x, h.y);
        ctx.rotate(h.rotation);
        ctx.scale(pScale, pScale);
        ctx.beginPath();
        ctx.moveTo(0, -h.size * .35);
        ctx.bezierCurveTo(h.size * .5, -h.size * .95, h.size * 1.1, -h.size * .1, 0, h.size * .55);
        ctx.bezierCurveTo(-h.size * 1.1, -h.size * .1, -h.size * .5, -h.size * .95, 0, -h.size * .35);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        return true;
      });
      animationFrameId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      const rect = root.getBoundingClientRect();
      if (canvas) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    render();

    /* ─── SCROLL REVEAL ─── */
    const revEls = root.querySelectorAll('.inv2-rv, .inv2-rv-l, .inv2-rv-r, .inv2-rv-scale');
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('in');
        else e.target.classList.remove('in');
      });
    }, { threshold: 0.12, root: root });
    revEls.forEach(el => io.observe(el));

    /* ─── NAV SCROLL ─── */
    const nav = root.querySelector('#inv2-nav');
    const prog = root.querySelector('#inv2-prog');
    const onScroll = () => {
      const scrollPos = root.scrollTop;
      if (nav) nav.classList.toggle('inv2-nav-sc', scrollPos > 50);
      if (prog) {
        const p = (scrollPos / (root.scrollHeight - root.clientHeight)) * 100;
        prog.style.width = p + '%';
      }
    };
    root.addEventListener('scroll', onScroll);

    /* ─── COUNTDOWN ─── */
    const tick = () => {
      const target = new Date(weddingDate);
      const now = new Date();
      const t = target - now;
      const ids = ['inv2-cd-d', 'inv2-cd-h', 'inv2-cd-m', 'inv2-cd-s'];
      
      if (t < 0) {
        ids.forEach(id => {
          const el = root.querySelector(`#${id}`);
          if (el) el.textContent = '00';
        });
        return;
      }
      
      const values = [
        Math.floor(t / 86400000),
        Math.floor((t % 86400000) / 3600000),
        Math.floor((t % 3600000) / 60000),
        Math.floor((t % 60000) / 1000)
      ];
      
      ids.forEach((id, i) => {
        const el = root.querySelector(`#${id}`);
        if (el) el.textContent = String(values[i]).padStart(2, '0');
      });
    };
    tick();
    const cdInterval = setInterval(tick, 1000);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(animationFrameId);
      io.disconnect();
      clearInterval(cdInterval);
    };
  }, [weddingDate, hiddenSections]);

  const heroBg = heroPhoto || DEFAULT_HERO;

  // Default events for cards
  const eventList = events.length > 0 ? events : [
    { icon: '💍', tag: 'Ceremony', title: 'Wedding Ceremony', time: '11:00 AM onwards', place: venueName },
    { icon: '🌹', tag: 'Reception', title: 'Grand Reception', time: '7:00 PM onwards', place: 'Leela Palace' },
    { icon: '🎶', tag: 'Sangeet', title: 'Sangeet Night', time: '6:00 PM', place: 'Saturday Evening' },
    { icon: '🎊', tag: 'Mehendi', title: 'Mehendi Ceremony', time: '11:00 AM', place: 'Friday Morning' },
  ];

  const galleryList = galleries.length > 0 ? galleries : [
    { url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80', caption: 'Captured Moments' },
    { url: 'https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=800&q=80', caption: 'Deep Love' },
    { url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80', caption: 'Forever Together' },
    { url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80', caption: 'Blessings' },
    { url: 'https://images.unsplash.com/photo-1511285560929-80b456503681?w=800&q=80', caption: 'Joyful Day' },
    { url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80', caption: 'Eternal Bond' },
  ];

  return (
    <div ref={containerRef} className="inv2-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Cinzel:wght@400;600&family=Raleway:wght@300;400;500&display=swap');

        .inv2-root {
          --gold: #D4AF6A; --gold2: #F0D49A; --rose: #E8627A; --rose2: #FF9AAE;
          --deep: #0D0510; --mid: #1A0D1E; --cream: #FFF8F0; --purple: #6B2FA0; --purple2: #9B59B6;
          background: var(--deep); color: var(--cream); font-family: 'Raleway', sans-serif;
          overflow-x: hidden; position: relative; cursor: none !important;
        }

        .inv2-root #cur {
          width: 10px; height: 10px; background: var(--rose); border-radius: 50%;
          position: absolute; pointer-events: none; z-index: 9999; transform: translate(-50%, -50%);
          transition: transform .2s, background .3s;
        }
        .inv2-root #cur2 {
          width: 28px; height: 28px; border: 1.5px solid rgba(212, 175, 106, .5); border-radius: 50%;
          position: absolute; pointer-events: none; z-index: 9998; transform: translate(-50%, -50%);
          transition: left .1s ease, top .1s ease;
        }

        #heartCanvas { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
        #inv2-prog { position: absolute; top: 0; left: 0; height: 3px; background: linear-gradient(90deg, var(--purple), var(--rose), var(--gold)); z-index: 2000; width: 0; transition: width .05s; }

        nav#inv2-nav { position: absolute; top: 0; left: 0; right: 0; z-index: 1500; padding: 1.2rem 3rem; display: flex; justify-content: space-between; align-items: center; transition: all .4s; }
        nav#inv2-nav.inv2-nav-sc { background: rgba(13, 5, 16, .88); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(212, 175, 106, .15); }
        .inv2-nlogo { font-family: 'Great Vibes', cursive; font-size: 1.8rem; color: var(--gold); text-decoration: none; }
        .inv2-nlinks { display: flex; gap: 2rem; list-style: none; }
        .inv2-nlinks a { font-size: .68rem; letter-spacing: .35em; text-transform: uppercase; color: rgba(240, 212, 154, .6); text-decoration: none; transition: color .3s; }
        .inv2-nlinks a:hover { color: var(--gold); }

        section.inv2-s { position: relative; min-height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; }

        /* HERO */
        #inv2-hero { flex-direction: column; text-align: center; }
        .inv2-hero-bg { position: absolute; inset: 0; background: url('${heroBg}') center/cover; opacity: .12; filter: sepia(30%); }
        .inv2-hero-overlay { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(107,47,160,.25) 0%, rgba(13,5,16,1) 80%); }
        .inv2-hero-content { position: relative; z-index: 2; padding: 2rem; }
        .inv2-hero-eyebrow { font-size: .7rem; letter-spacing: .6em; text-transform: uppercase; color: var(--gold); opacity: 0; animation: inv2-slideDown .9s .4s forwards; }
        .inv2-names-wrap { margin: 1.5rem 0; }
        .inv2-name-a { font-family: 'Great Vibes', cursive; font-size: clamp(5rem, 14vw, 11rem); color: var(--cream); opacity: 0; animation: inv2-slideRight 1.2s .6s forwards; display: block; line-height: 1; }
        .inv2-amp { font-family: 'Great Vibes', cursive; font-size: clamp(2.5rem, 8vw, 5.5rem); color: var(--rose); opacity: 0; animation: inv2-popIn .7s 1.2s forwards; display: block; line-height: 1; }
        .inv2-name-b { font-family: 'Great Vibes', cursive; font-size: clamp(5rem, 14vw, 11rem); color: var(--cream); opacity: 0; animation: inv2-slideLeft 1.2s .6s forwards; display: block; line-height: 1; }
        .inv2-hero-date { font-family: 'Cinzel', serif; font-size: .85rem; letter-spacing: .4em; color: var(--gold2); opacity: 0; animation: inv2-fadeUp .8s 1.8s forwards; margin-top: 1.5rem; }
        .inv2-shimmer-line { width: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--gold), var(--rose), var(--gold), transparent); margin: 1.5rem auto; opacity: 0; animation: inv2-expandLine 1.2s 1.5s forwards; }
        
        .inv2-pulse-ring { position: absolute; width: 320px; height: 320px; border-radius: 50%; border: 1px solid rgba(212,175,106,.15); animation: inv2-pulseOut 2.8s ease-out infinite; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }
        .inv2-pulse-ring:nth-child(2) { animation-delay: .9s }
        .inv2-pulse-ring:nth-child(3) { animation-delay: 1.8s }

        /* STORY */
        #inv2-story { background: linear-gradient(135deg, #0D0510 0%, #1A0A25 50%, #0D0510 100%); flex-direction: column; padding: 8rem 2rem; gap: 5rem; }
        .inv2-story-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 6rem; max-width: 1100px; width: 100%; align-items: center; }
        .inv2-story-img-wrap { position: relative; }
        .inv2-story-img-wrap img { width: 100%; height: 520px; object-fit: cover; display: block; filter: sepia(10%); border-radius: 4px; }
        .inv2-img-border { position: absolute; inset: -14px; border: 1px solid rgba(212, 175, 106, .3); pointer-events: none; }
        .inv2-img-border2 { position: absolute; inset: -28px; border: 1px solid rgba(212, 175, 106, .12); pointer-events: none; }
        .inv2-sec-tag { font-size: .67rem; letter-spacing: .55em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.2rem; display: block; }
        .inv2-sec-h { font-family: 'Great Vibes', cursive; font-size: clamp(3rem, 6vw, 4.5rem); line-height: 1.2; color: var(--cream); margin-bottom: 1rem; }
        .inv2-sec-h em { color: var(--rose2); font-style: normal; }
        .inv2-gold-rule { width: 50px; height: 2px; background: var(--gold); border: none; margin: 1.2rem 0; }
        .inv2-story-p { font-size: 1rem; line-height: 1.9; color: rgba(255, 248, 240, .65); font-weight: 300; margin-bottom: 1rem; }

        /* VENUE */
        #inv2-venue { padding: 8rem 2rem; flex-direction: column; gap: 4rem; text-align: center; }
        .inv2-cards-wrap { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; max-width: 1100px; width: 100%; margin: 0 auto; }
        .inv2-vcard { position: relative; border: 1px solid rgba(212, 175, 106, .12); padding: 2.5rem; overflow: hidden; background: rgba(255, 255, 255, .02); transition: transform .4s, border-color .4s; backdrop-filter: blur(4px); text-align: left; }
        .inv2-vcard:hover { transform: translateY(-6px); border-color: rgba(212, 175, 106, .5); }
        .inv2-vcard-top-line { position: absolute; top:0; left:0; right:0; height:2px; background: linear-gradient(90deg, var(--purple), var(--rose), var(--gold)); transform: scaleX(0); transform-origin: left; transition: transform .5s; }
        .inv2-vcard:hover .inv2-vcard-top-line { transform: scaleX(1); }
        .inv2-vcard-icon { font-size: 1.5rem; margin-bottom: 1.2rem; }
        .inv2-vcard h3 { font-family: 'Cinzel', serif; font-size: .8rem; letter-spacing: .25em; color: var(--gold); margin-bottom: .8rem; font-weight: 400; }
        .inv2-vcard p { font-family: 'Great Vibes', cursive; font-size: 1.6rem; color: var(--cream); line-height: 1.3; }

        /* GALLERY */
        #inv2-gallery { flex-direction: column; padding: 8rem 2rem; gap: 4rem; }
        .inv2-gal-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; max-width: 1100px; width: 100%; }
        .inv2-gal-item { overflow: hidden; position: relative; }
        .inv2-gal-item::after { content: ''; position: absolute; inset:0; background: linear-gradient(135deg, rgba(107,47,160,.2), rgba(232,98,122,.15)); opacity:0; transition: opacity .5s; }
        .inv2-gal-item:hover::after { opacity: 1; }
        .inv2-gal-item img { width: 100%; height: 220px; object-fit: cover; display: block; transition: transform .9s; filter: brightness(.85); }
        .inv2-gal-item:hover img { transform: scale(1.1); }
        .inv2-gal-item:nth-child(1), .inv2-gal-item:nth-child(4) { grid-row: span 2; }
        .inv2-gal-item:nth-child(1) img, .inv2-gal-item:nth-child(4) img { height: 100%; min-height: 460px; }
        .inv2-gal-heart { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0); font-size: 2rem; z-index: 2; transition: transform .3s cubic-bezier(.34, 1.56, .64, 1); pointer-events: none; }
        .inv2-gal-item:hover .inv2-gal-heart { transform: translate(-50%, -50%) scale(1); }

        /* COUNTDOWN */
        #inv2-countdown { flex-direction: column; gap: 4rem; text-align: center; background: url('https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1600&q=80') center/cover fixed; }
        #inv2-countdown::before { content: ''; position: absolute; inset: 0; background: rgba(13, 5, 16, .85); }
        .inv2-cd-wrap { display: flex; gap: 3rem; justify-content: center; flex-wrap: wrap; position: relative; z-index: 1; }
        .inv2-cd-num { font-family: 'Great Vibes', cursive; font-size: clamp(4rem, 10vw, 7.5rem); color: var(--gold2); line-height: 1; min-width: 120px; }

        /* RSVP */
        #inv2-rsvp { padding: 8rem 2rem; flex-direction: column; }
        .inv2-rsvp-box { max-width: 580px; width: 100%; border: 1px solid rgba(212, 175, 106, .15); padding: 4rem; position: relative; background: rgba(255, 255, 255, .02); text-align: center; }
        .inv2-fg { display: flex; flex-direction: column; gap: .45rem; text-align: left; margin-bottom: 1.5rem; }
        .inv2-fg label { font-size: .67rem; letter-spacing: .4em; text-transform: uppercase; color: rgba(212, 175, 106,.8); }
        .inv2-fg input, .inv2-fg select { background: transparent; border: none; border-bottom: 1px solid rgba(212, 175, 106, .25); padding: .7rem 0; font-size: 1rem; color: var(--cream); outline: none; width: 100%; }
        .inv2-btn-submit { background: transparent; border: 1px solid rgba(212, 175, 106,-4); color: var(--gold); font-family: 'Cinzel', serif; padding: 1.1rem 3.5rem; cursor: pointer; text-transform: uppercase; letter-spacing: .3em; transition: all .4s; }
        .inv2-btn-submit:hover { background: var(--gold); color: var(--deep); }

        /* REVEAL PRESETS */
        .inv2-rv { opacity: 0; transform: translateY(40px); transition: all 1s cubic-bezier(0.16,1,0.3,1); }
        .inv2-rv.in { opacity: 1; transform: translateY(0); }
        .inv2-rv-l { opacity: 0; transform: translateX(-60px); transition: all 1s ease; }
        .inv2-rv-l.in { opacity: 1; transform: translateX(0); }
        .inv2-rv-r { opacity: 0; transform: translateX(60px); transition: all 1s ease; }
        .inv2-rv-r.in { opacity: 1; transform: translateX(0); }

        @keyframes inv2-slideDown { from { opacity: 0; transform: translateY(-24px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes inv2-slideRight { from { opacity: 0; transform: translateX(-60px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes inv2-slideLeft { from { opacity: 0; transform: translateX(60px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes inv2-popIn { from { opacity: 0; transform: scale(.4) } to { opacity: 1; transform: scale(1) } }
        @keyframes inv2-fadeUp { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes inv2-expandLine { from { width: 0; opacity: 0 } to { width: 280px; opacity: 1 } }
        @keyframes inv2-pulseOut { 0% { transform: translate(-50%, -50%) scale(.3); opacity: .8 } 100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0 } }
        @keyframes inv2-shimmer { 0% { background-position: 200% center } 100% { background-position: -200% center } }

        .inv2-shimmer-text {
          background: linear-gradient(90deg, var(--gold), var(--rose), var(--purple2), var(--rose), var(--gold));
          background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; animation: inv2-shimmer 4s linear infinite;
        }

        @media(max-width:768px) {
          .inv2-story-inner { grid-template-columns: 1fr; gap: 3rem; }
          .inv2-story-img-wrap { display: none; }
          .inv2-gal-grid { grid-template-columns: repeat(2, 1fr); }
          .inv2-gal-item:nth-child(1), .inv2-gal-item:nth-child(4) { grid-row: span 1; }
          .inv2-gal-item img { height: 160px !important; min-height: 160px !important; }
          nav#inv2-nav { padding: 1rem 1.5rem; }
          .inv2-nlinks { display: none; }
        }
      `}</style>

      <div ref={curRef} id="cur" />
      <div ref={cur2Ref} id="cur2" />
      <div id="inv2-prog" />
      <canvas ref={canvasRef} id="heartCanvas" />

      {/* NAV */}
      <nav id="inv2-nav">
        <a href="#inv2-hero" className="inv2-nlogo">{groomName[0]} & {brideName[0]}</a>
        <ul className="inv2-nlinks">
          <li><a href="#inv2-story">Story</a></li>
          <li><a href="#inv2-venue">Venue</a></li>
          <li><a href="#inv2-gallery">Gallery</a></li>
          <li><a href="#inv2-countdown">Countdown</a></li>
          <li><a href="#inv2-rsvp">RSVP</a></li>
        </ul>
      </nav>

      {/* HERO */}
      {!isHidden(hiddenSections, 'hero') && (
        <section id="inv2-hero" className="inv2-s">
          <div className="inv2-hero-bg" />
          <div className="inv2-hero-overlay" />
          
          <div className="inv2-pulse-ring" />
          <div className="inv2-pulse-ring" />
          <div className="inv2-pulse-ring" />

          <div className="inv2-hero-content">
            <p className="inv2-hero-eyebrow">Together with their families · request your presence</p>
            <div className="inv2-names-wrap">
              <span className="inv2-name-a">{groomName}</span>
              <span className="inv2-amp inv2-shimmer-text">&amp;</span>
              <span className="inv2-name-b">{brideName}</span>
            </div>
            <div className="inv2-shimmer-line" />
            <p className="inv2-hero-date">{displayDate} &nbsp;—&nbsp; {venueAddress}</p>
          </div>
        </section>
      )}

      {/* STORY */}
      {!isHidden(hiddenSections, 'couple') && (
        <section id="inv2-story" className="inv2-s">
          <div className="inv2-story-inner">
            <div className="inv2-story-img-wrap inv2-rv-l">
              <img src={DEFAULT_COUPLE} alt="Couple" />
              <div className="inv2-img-border" />
              <div className="inv2-img-border2" />
            </div>
            <div className="inv2-story-txt">
              <span className="inv2-sec-tag inv2-rv">Our Love Story</span>
              <h2 className="inv2-sec-h inv2-rv">Two hearts,<br /><em>one beautiful journey</em></h2>
              <hr className="inv2-gold-rule inv2-rv" />
              <p className="inv2-story-p inv2-rv">{groomDesc}</p>
              <p className="inv2-story-p inv2-rv">{brideDesc}</p>
            </div>
          </div>
        </section>
      )}

      {/* VENUE / EVENTS */}
      {!isHidden(hiddenSections, 'events') && (
        <section id="inv2-venue" className="inv2-s">
          <div style={{ maxWidth: '700px', margin: '0 auto 4rem' }}>
            <span className="inv2-sec-tag inv2-rv">Celebrations</span>
            <h2 className="inv2-sec-h inv2-rv">Where love <em>unfolds</em></h2>
          </div>
          <div className="inv2-cards-wrap">
            {eventList.map((ev, i) => (
              <div key={i} className="inv2-vcard inv2-rv">
                <div className="inv2-vcard-top-line" />
                <div className="inv2-vcard-icon">{ev.icon || '💍'}</div>
                <h3>{ev.tag || 'Event'}</h3>
                <p>{ev.title}</p>
                <small style={{ display: 'block', marginTop: '10px', fontSize: '.75rem', color: 'rgba(255,255,255,0.4)' }}>
                  {ev.place} · {ev.time}
                </small>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* GALLERY */}
      {!isHidden(hiddenSections, 'gallery') && (
        <section id="inv2-gallery" className="inv2-s">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span className="inv2-sec-tag inv2-rv">Captured Moments</span>
            <h2 className="inv2-sec-h inv2-rv">Memories we <em>hold forever</em></h2>
          </div>
          <div className="inv2-gal-grid">
            {galleryList.map((g, i) => (
              <div key={i} className="inv2-gal-item inv2-rv">
                <img src={g.url} alt="Gallery" />
                <div className="inv2-gal-heart">💕</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* COUNTDOWN */}
      {!isHidden(hiddenSections, 'countdown') && (
        <section id="inv2-countdown" className="inv2-s" style={{ padding: '8rem 2rem' }}>
          <div style={{ position: 'relative', zIndex: 1, marginBottom: '4rem' }}>
            <span className="inv2-sec-tag inv2-rv">The big day</span>
            <h2 className="inv2-sec-h inv2-rv" style={{ fontSize: 'clamp(2rem,5vw,3.5rem)' }}>Counting to <em>forever</em></h2>
          </div>
          <div className="inv2-cd-wrap">
            {[
              { id: 'inv2-cd-d', label: 'Days' },
              { id: 'inv2-cd-h', label: 'Hours' },
              { id: 'inv2-cd-m', label: 'Minutes' },
              { id: 'inv2-cd-s', label: 'Seconds' }
            ].map((unit, i) => (
              <div key={unit.id} className="inv2-cd-unit inv2-rv">
                <div id={unit.id} className="inv2-cd-num">00</div>
                <div style={{ fontSize: '.7rem', letterSpacing: '.4em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>{unit.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* RSVP */}
      {!isHidden(hiddenSections, 'rsvp') && (
        <section id="inv2-rsvp" className="inv2-s">
          <div className="inv2-rsvp-box inv2-rv">
            <div style={{ marginBottom: '3rem' }}>
              <span className="inv2-sec-tag">Kindly Reply By Nov 30</span>
              <h2 className="inv2-sec-h" style={{ fontSize: 'clamp(2.5rem,6vw,4rem)' }}>Join us in <em>celebration</em></h2>
            </div>
            <form className="inv2-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="inv2-fg"><label>First Name</label><input type="text" placeholder="Your name" /></div>
                <div className="inv2-fg"><label>Last Name</label><input type="text" placeholder="Surname" /></div>
              </div>
              <div className="inv2-fg"><label>Email</label><input type="email" placeholder="you@email.com" /></div>
              <div className="inv2-fg">
                <label>Attending?</label>
                <select><option>Joyfully accepts</option><option>Regretfully declines</option></select>
              </div>
              <button type="button" className="inv2-btn-submit">Send RSVP</button>
            </form>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer style={{ background: 'var(--deep)', textAlign: 'center', padding: '6rem 2rem', position: 'relative' }}>
         <p className="inv2-nlogo" style={{ fontSize: '3.5rem' }}>{groomName} & {brideName}</p>
         <p style={{ color: 'var(--gold)', letterSpacing: '.5em', textTransform: 'uppercase', fontSize: '.7rem', marginTop: '1rem' }}>{displayDate} · {venueName}</p>
         <p style={{ marginTop: '2.5rem', fontFamily: 'Great Vibes, cursive', fontSize: '1.4rem', color: 'rgba(212,175,106,.3)' }}>"Two souls, one forever"</p>
      </footer>
    </div>
  );
}
