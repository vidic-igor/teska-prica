const { useState, useEffect, useRef } = React;

/* ============ STATIC DATA (never needs CMS editing) ============ */
const VENUES = [
  { type: "Klubovi",           desc: "Petak i subota veče, posebne večeri." },
  { type: "Restorani",         desc: "Vikend programi, tematske večeri." },
  { type: "Hoteli",            desc: "Gala večere, sezonski aranžmani." },
  { type: "Svadbe",            desc: "Ceremonija, koktel, veče — pun program uživo." },
  { type: "Korporativne",      desc: "Dočeci, proslave, team-building događaji." },
  { type: "Privatne proslave", desc: "Rođendani, jubileji, porodične proslave." },
];

/* ============ APP ============ */

/* build.js inlines the content into index.html, so the first render already
   has it and the four fetches below never run. The fetch path stays as the
   fallback for builds that skip the injection, such as Netlify's
   `npm run build`. */
const INLINE_CONTENT = typeof window !== 'undefined' ? window.__CONTENT__ : null;

/* Booking form relay. Netlify Forms only works on Netlify, so submissions go
   to Web3Forms instead. The access key is a submit-only endpoint id meant to
   ship in the page, not a secret. */
const WEB3FORMS_KEY = '80d7bb74-9e68-455b-9bfb-f704db73d96c';

function App() {
  const [content, setContent] = useState(INLINE_CONTENT || null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (INLINE_CONTENT) return;
    Promise.all([
      fetch('/content/gigs.json').then(r => r.json()),
      fetch('/content/members.json').then(r => r.json()),
      fetch('/content/settings.json').then(r => r.json()),
      fetch('/content/venues.json').then(r => r.json()),
    ]).then(([gigsData, membersData, settings, venuesData]) => {
      setContent({ gigs: gigsData.items, members: membersData.items, settings, venues: venuesData.items });
    }).catch(() => setLoadError(true));
  }, []);

  if (loadError) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', color: '#8a8e99', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: 48, marginBottom: 16, fontFamily: 'Anton, sans-serif', color: '#ecebe6' }}>TEŠKA PRIČA</div>
        <p>Greška pri učitavanju sajta. Pokušajte ponovo.</p>
      </div>
    </div>
  );

  if (!content) return null;

  const { gigs, members, settings, venues } = content;

  return (
    <>
      <Nav />
      <Hero />
      <Marquee />
      <About settings={settings} members={members} />
      <Venues />
      <Members members={members} />
      <Showcase />
      <Gigs gigs={gigs} settings={settings} venues={venues} />
      <Gallery settings={settings} />
      <Booking settings={settings} />
      <Footer settings={settings} />
    </>
  );
}

/* ============ NAV ============ */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', on);
    return () => window.removeEventListener('scroll', on);
  }, []);

  const links = [
    { href: '#about',   label: 'O bendu' },
    { href: '#venues',  label: 'Gde sviramo' },
    { href: '#members', label: 'Sastav' },
    { href: '#gigs',    label: 'Nastupi' },
    { href: '#gallery', label: 'Galerija' },
  ];

  return (
    <>
      <div className={'nav-scrim' + (scrolled ? ' is-scrolled' : '')} aria-hidden="true" />
      <nav className="nav" data-screen-label="Nav" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'transparent',
        color: '#ecebe6',
      }}>
        <a href="#top" style={{ fontFamily: "'Anton', sans-serif", fontSize: 18, letterSpacing: '0.05em', color: 'inherit', textDecoration: 'none' }}>
          TEŠKA&nbsp;PRIČA
        </a>
        <div className="nav-links">
          {links.map(l => <a key={l.href} href={l.href}>{l.label}</a>)}
          <a href="#booking" className="nav-cta">Booking →</a>
        </div>
        <button className="mobile-menu-btn" onClick={() => setMenuOpen(true)}>MENI</button>
      </nav>
      {menuOpen && (
        <div className="mobile-menu">
          <button className="mobile-menu-close" onClick={() => setMenuOpen(false)}>✕</button>
          {links.map(l => <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>{l.label}</a>)}
          <a href="#booking" onClick={() => setMenuOpen(false)} style={{ color: 'var(--accent)' }}>Booking →</a>
        </div>
      )}
    </>
  );
}

/* ============ HERO ============ */
function Hero() {
  const bgRef = useRef(null);
  const titleRef = useRef(null);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (bgRef.current) bgRef.current.style.transform = `translate3d(0, ${y * 0.35}px, 0) scale(${1 + y * 0.0003})`;
        if (titleRef.current) titleRef.current.style.transform = `translate3d(0, ${y * -0.12}px, 0)`;
        raf = 0;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header id="top" data-screen-label="Hero" style={{
      position: 'relative', minHeight: '100vh',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      overflow: 'hidden',
    }}>
      <div ref={bgRef} className="hero-bg" style={{
        position: 'absolute', top: -40, left: 0, right: 0, bottom: -80,
        backgroundImage: "url('img/hero.jpg')",
        backgroundSize: 'cover',
        zIndex: 0,
        willChange: 'transform',
      }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 40%, rgba(7,8,13,0.6) 75%, var(--bg) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.4) 0%, transparent 50%)' }} />

      <div style={{ position: 'absolute', top: 92, left: 0, right: 0, zIndex: 5 }}>
        <div className="container top-chrome" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div className="mono">● SUBOTICA</div>
          <div className="mono">SEZONA {new Date().getFullYear()} · BOOKING OTVOREN</div>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 5, paddingBottom: 64 }}>
        <div className="container">
          <div className="mono" style={{ marginBottom: 48, color: 'var(--accent)' }}>AKUSTIČNI BEND · SVE UŽIVO</div>
          <h1 ref={titleRef} className="display" style={{
            willChange: 'transform',
            letterSpacing: '-0.01em',
            textAlign: 'left',
            lineHeight: 1.1,
            fontSize: 'clamp(80px, 16vw, 200px)',
          }}>
            TEŠKA<br />PRIČA
          </h1>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            marginTop: 32, gap: 24, flexWrap: 'wrap',
            borderTop: '1px solid var(--line)', paddingTop: 24,
          }}>
            <div style={{ maxWidth: 420 }} className="hero-tagline-row">
              <div className="mono" style={{ marginBottom: 8 }}>ZA SVE VRSTE PROSLAVA · KLUBOVE · RESTORANE · HOTELE</div>
              <div style={{ fontSize: 18, color: 'var(--fg)' }}>Teška priča da ćete se loše provesti uz nas.</div>
            </div>
            <div style={{ display: 'flex', gap: 12 }} className="hero-cta-row">
              <a href="#booking" className="btn btn-accent">Rezervišite bend &nbsp;→</a>
              <a href="#gallery" className="btn">Pogledajte uživo</a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ============ MARQUEE ============ */
function Marquee() {
  const SEP = "◆";
  const words = ["PROSLAVE", SEP, "KLUBOVI", SEP, "RESTORANI", SEP, "HOTELI", SEP, "SVADBE", SEP, "KORPORATIVNO", SEP, "PRIVATNI DOGAĐAJI", SEP];
  const content = [...words, ...words, ...words];
  return (
    <section className="marquee" style={{ padding: '28px 0', borderBottom: '1px solid var(--line)' }}>
      <div className="marquee-track">
        {content.map((w, i) =>
          <span key={i} className="display" style={{
            fontSize: w === SEP ? 'clamp(18px, 2.4vw, 32px)' : 'clamp(32px, 5vw, 64px)',
            color: w === SEP ? 'var(--accent)' : 'var(--fg)',
            opacity: w === SEP ? 0.55 : 0.9,
            transform: w === SEP ? 'translateY(-8px)' : 'none',
            letterSpacing: w === SEP ? '0' : '-0.02em',
          }}>{w}</span>
        )}
      </div>
    </section>
  );
}

/* ============ ABOUT ============ */
function About({ settings, members }) {
  return (
    <section id="about" style={{ padding: '140px 0' }} data-screen-label="About">
      <div className="container">
        <div className="grid-2">
          <div className="sticky-col" style={{ position: 'sticky', top: 120 }}>
            <div className="section-label">01 — Bend</div>
            <h2 style={{ fontSize: 'clamp(48px, 6vw, 96px)', letterSpacing: '-0.01em', marginBottom: 24 }}>
              Akustični bend<br />koji puni<br /><span style={{ color: 'var(--accent)' }}>prostor.</span>
            </h2>
            <p className="mono">SUBOTICA · SRBIJA · EST. 2024</p>
          </div>
          <div>
            <p style={{ fontSize: 22, lineHeight: 1.5, marginBottom: 28, maxWidth: 580 }}>
              {settings.blurb}
            </p>
            <p style={{ color: 'var(--fg-dim)', maxWidth: 560, marginBottom: 48, fontSize: 17, lineHeight: 1.6 }}>
              Repertoar pokriva ex-YU klasike i balkanske hitove — uvek u aranžmanima
              koje bend pravi sam. Negde publika sedi za stolom, negde se igra do jutra.
              U oba slučaja zvuk mora da bude precizan.
            </p>
            <div className="grid-stats" style={{ paddingTop: 32, borderTop: '1px solid var(--line)' }}>
              <Stat n={String((members || []).length).padStart(2, '0')} l="Članova benda" />
              <Stat n="150+" l="Nastupa / god" />
              <Stat n="01" l="Solistički koncert" />
              <Stat n="100%" l="Uživo" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ n, l }) {
  return (
    <div>
      <div className="display" style={{ fontSize: 'clamp(36px,4vw,56px)' }}>{n}</div>
      <div className="mono" style={{ marginTop: 6 }}>{l}</div>
    </div>
  );
}

/* ============ VENUES ============ */
function Venues() {
  return (
    <section id="venues" style={{ padding: '120px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }} data-screen-label="Venues">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 64, flexWrap: 'wrap', gap: 24 }}>
          <div>
            <div className="section-label">02 — Gde sviramo</div>
            <h2 style={{ fontSize: 'clamp(48px, 7vw, 110px)' }}>FORMAT<br />NASTUPA</h2>
          </div>
          <p style={{ maxWidth: 360, color: 'var(--fg-dim)' }}>
            Sviramo u stalnoj postavi — dva vokala, gitara i bubnjevi.
            Trajanje i repertoar se prilagođavaju prostoru.
          </p>
        </div>
        <div className="grid-venues" style={{ borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)' }}>
          {VENUES.map((v, i) =>
            <div key={v.type} style={{
              borderRight: '1px solid var(--line)', borderBottom: '1px solid var(--line)',
              padding: '40px 32px', background: 'rgba(7,8,13,0.3)',
              transition: 'background 0.3s',
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(7,8,13,0.3)'}
            >
              <div className="mono" style={{ color: 'var(--accent)', marginBottom: 16 }}>0{i + 1}</div>
              <h3 style={{ fontSize: 32, marginBottom: 12 }}>{v.type}</h3>
              <p style={{ color: 'var(--fg-dim)', fontSize: 15, lineHeight: 1.5 }}>{v.desc}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============ MEMBERS ============ */
function Members({ members }) {
  return (
    <section id="members" style={{ padding: '140px 0' }} data-screen-label="Members">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 64, flexWrap: 'wrap', gap: 24 }}>
          <div>
            <div className="section-label">03 — Sastav</div>
            <h2 style={{ fontSize: 'clamp(48px, 7vw, 110px)' }}>BEND</h2>
          </div>
          <p className="mono" style={{ maxWidth: 320 }}>AKUSTIČNI SASTAV</p>
        </div>
        <div className="grid-members">
          {members.map((m, i) =>
            <article key={i} style={{ position: 'relative', aspectRatio: '3/4', overflow: 'hidden', background: '#111' }}>
              <img src={m.img} alt={m.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(5%) contrast(1.05)', transition: 'transform 0.6s' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              />
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                padding: 24,
                background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.85) 100%)',
              }}>
                <div className="mono" style={{ color: 'var(--accent)', marginBottom: 8 }}>{String(i + 1).padStart(2, '0')}</div>
                <div style={{ fontSize: 24, fontWeight: 500, marginBottom: 4 }}>{m.name}</div>
                <div className="mono">{m.role}</div>
              </div>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============ SHOWCASE ============ */
function Showcase() {
  return (
    <section data-screen-label="Showcase" style={{ padding: '40px 0' }}>
      <div className="container">
        <div className="grid-showcase" style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '72px 0' }}>
          <div>
            <div className="mono" style={{ color: 'var(--accent)', marginBottom: 14 }}>AKUSTIČNI SASTAV · SUBOTICA</div>
            <h2 style={{ fontSize: 'clamp(40px, 5vw, 72px)', letterSpacing: '-0.01em', lineHeight: 1.16, marginBottom: 20 }}>
              Sviraćemo i na<br />vašoj <span style={{ color: 'var(--accent)' }}>proslavi.</span>
            </h2>
            <p className="mono" style={{ maxWidth: 360, lineHeight: 1.8, marginBottom: 36 }}>
              Dva vokala, gitara i bubnjevi.
            </p>
            <a href="#booking" className="btn btn-accent">Rezervišite bend &nbsp;→</a>
          </div>
          <div className="showcase-photo" style={{ aspectRatio: '3/4', overflow: 'hidden', background: '#111' }}>
            <img src="img/band-group.jpg" alt="Teška Priča — bend"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============ GIGS ============ */
const MESECI = ['JAN', 'FEB', 'MAR', 'APR', 'MAJ', 'JUN', 'JUL', 'AVG', 'SEP', 'OKT', 'NOV', 'DEC'];

/* Derives the status and the display date from the stored ISO date,
   so the schedule stays correct without anyone editing it. */
/* Opens the visitor's map app at the venue. A Google Maps link pasted into the
   catalogue wins — whoever copied it saw the place on screen, so it cannot be
   wrong. Otherwise we search the same string a person would type. */
function safeUrl(u) {
  return /^https:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '';
}

function mapUrlFor(name, city, address, mapUrl) {
  const pasted = String(mapUrl || '').trim();
  if (/^https:\/\//i.test(pasted)) return pasted;
  const q = [name, address, city].filter(Boolean).join(', ');
  return q ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q) : '';
}

function prepareGigs(gigs, venues) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  /* A gig points at the venue catalogue by name; free-text place/city stay
     as a fallback for one-off venues that are not worth cataloguing. */
  const catalog = new Map((venues || []).map(v => [v.name, v]));

  const rows = (gigs || []).map(g => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(g.date || '').trim());
    const dt = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
    const v = catalog.get(g.venue);
    return {
      ...g,
      place: v ? v.name : (g.venue || g.place || ''),
      city: v ? v.city : (g.city || ''),
      address: v ? (v.address || '') : '',
      phone: v ? (v.phone || '') : '',
      /* a private booking has no venue and no city — nothing to point a map at */
      mapUrl: (v || g.city) ? mapUrlFor(v ? v.name : (g.venue || g.place || ''), v ? v.city : (g.city || ''), v && v.address, v && v.mapUrl) : '',
      dt,
      past: dt ? dt < today : false,
      d: dt ? String(dt.getDate()).padStart(2, '0') : '--',
      m: dt ? MESECI[dt.getMonth()] : '',
      y: dt ? String(dt.getFullYear()) : '',
    };
  });

  return {
    upcoming: rows.filter(r => !r.past).sort((a, b) => (a.dt && b.dt ? a.dt - b.dt : 0)),
    past: rows.filter(r => r.past).sort((a, b) => b.dt - a.dt),
  };
}

/* How many past gigs show before the list is collapsed. The full history stays
   on the page as a credential, but it must not bury the booking form. */
const PAST_VISIBLE = 3;

function Gigs({ gigs, settings, venues }) {
  const { upcoming, past } = prepareGigs(gigs, venues);
  const [showAllPast, setShowAllPast] = useState(false);
  const shownPast = showAllPast ? past : past.slice(0, PAST_VISIBLE);
  return (
    <section id="gigs" style={{ padding: '120px 0' }} data-screen-label="Gigs">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 64, flexWrap: 'wrap', gap: 24 }}>
          <div>
            <div className="section-label">04 — Nastupi</div>
            <h2 style={{ fontSize: 'clamp(48px, 7vw, 110px)' }}>RASPORED</h2>
          </div>
          <p className="mono" style={{ maxWidth: 320 }}>PROSLAVE · KONCERTI · DOGAĐAJI</p>
        </div>

        <div style={{ borderTop: '1px solid var(--line)' }}>
          {upcoming.concat(shownPast).map((g, i) =>
            <React.Fragment key={i}>
            {g.past && i === upcoming.length && upcoming.length > 0 &&
              <div className="mono" style={{ padding: '36px 0 14px', color: 'var(--fg-mute)' }}>RANIJI NASTUPI</div>}
            <div className="gig-row" style={{
              padding: '28px 0',
              borderBottom: '1px solid var(--line)',
              alignItems: 'center',
              background: g.highlight ? 'linear-gradient(90deg, rgba(255,200,100,0.04) 0%, transparent 60%)' : 'transparent',
            }}>
              <div>
                <div className="display" style={{ fontSize: 56, lineHeight: 0.9, color: g.highlight ? 'var(--accent)' : 'var(--fg)' }}>{g.d}</div>
                <div className="mono" style={{ marginTop: 4 }}>{g.m} · {g.y}</div>
                {g.time && <div className="mono" style={{ marginTop: 2, color: 'var(--accent)' }}>{g.time}</div>}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>{g.place}</div>
                <div className="mono">{[(g.city || '').toUpperCase(), g.address].filter(Boolean).join(' · ')}</div>
                {g.mapUrl &&
                  <a className="mono" href={g.mapUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-block', marginTop: 10, color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 4 }}>
                    Kako doći ↗
                  </a>}
              </div>
              <div className="gig-note" style={{ color: 'var(--fg-dim)', fontSize: 14 }}>
                {g.note}
                {!g.past && (g.noReservation
                  ? <div className="mono" style={{ marginTop: 10 }}>Bez rezervacije</div>
                  : (g.phone || safeUrl(g.reservationUrl)) &&
                    <div className="mono" style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
                      {String(g.phone || '').split('/').map(n => n.trim()).filter(Boolean).map((n, k) =>
                        <a key={k} href={'tel:' + n.replace(/[^+\d]/g, '')} style={{ color: 'var(--accent)' }}>{n}</a>)}
                      {safeUrl(g.reservationUrl) &&
                        <a href={safeUrl(g.reservationUrl)} target="_blank" rel="noopener noreferrer"
                          style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 4 }}>Rezervacije ↗</a>}
                    </div>)}
              </div>
              <div className="mono gig-tag" style={{
                padding: '6px 12px', border: '1px solid currentColor',
                color: g.past ? 'var(--fg-dim)' : 'var(--accent)',
              }}>{g.past ? 'ODRŽANO' : 'USKORO'}</div>
            </div>
            </React.Fragment>
          )}
        </div>

        {past.length > PAST_VISIBLE &&
          <button className="mono" onClick={() => setShowAllPast(v => !v)}
            style={{ marginTop: 24, padding: '12px 20px', border: '1px solid var(--line)', color: 'var(--accent)', cursor: 'pointer' }}>
            {showAllPast ? 'Prikaži manje' : `Prikaži sve nastupe (${past.length})`}
          </button>}

        <div style={{ marginTop: 80, paddingTop: 40, borderTop: '1px solid var(--line)' }}>
          <div className="mono" style={{ marginBottom: 24 }}>ODABRANA MESTA GDE SMO SVIRALI</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 40px' }}>
            {settings.pastVenues.map((p, i) =>
              <div key={i} style={{
                fontSize: 'clamp(20px, 2.5vw, 32px)',
                fontFamily: "'Anton', sans-serif",
                textTransform: 'uppercase',
                letterSpacing: '0.01em',
                padding: '8px 0',
                color: i % 2 === 0 ? 'var(--fg)' : 'var(--fg-dim)',
              }}>
                {p} <span style={{ color: 'var(--accent)', margin: '0 8px' }}>·</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============ GALLERY ============ */
/* A short silent clip in place of one gallery photo. It costs a poster image
   until the tile is actually scrolled into view: preload="none" means no video
   bytes are fetched before then. Sound is off until the viewer asks for it. */
function VideoTile({ src, poster, label }) {
  const ref = useRef(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = true;                                  // the attribute alone is unreliable
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) el.play().catch(() => {});
      else el.pause();
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
    el.play().catch(() => {});
  };

  return (
    <>
      <video ref={ref} src={src} poster={poster} loop playsInline preload="none" muted
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      <button onClick={toggle} className="mono" aria-label={muted ? 'Uključi ton' : 'Isključi ton'}
        style={{
          position: 'absolute', top: 14, right: 14, zIndex: 2,
          background: 'rgba(7,8,13,0.72)', border: '1px solid var(--line)',
          padding: '7px 11px', color: muted ? 'var(--fg)' : 'var(--accent)',
        }}>
        {muted ? 'Uključi ton' : 'Ton uključen'}
      </button>
    </>
  );
}

function Gallery({ settings }) {
  const video = (settings && settings.video) || '';
  const tiles = [
    { src: 'img/hero.jpg',     span: '1 / span 2', ar: '3/2', label: 'JADRAN · 2026' },
    video
      ? { video, poster: (settings && settings.videoPoster) || 'img/singer-1.jpg', span: '3 / span 1', ar: '3/4', label: 'SNIMAK' }
      : { src: 'img/singer-1.jpg', span: '3 / span 1', ar: '3/4', label: 'UŽIVO' },
    { src: 'img/duo.jpg',      span: '1 / span 1', ar: '1/1', label: 'BUBNJEVI' },
    { src: 'img/singer-f.jpg', span: '2 / span 1', ar: '1/1', label: 'BEND' },
    { src: 'img/singer-2.jpg', span: '3 / span 1', ar: '1/1', label: 'VOKALI' },
  ];

  return (
    <section id="gallery" style={{ padding: '120px 0', background: 'var(--bg-2)' }} data-screen-label="Gallery">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, flexWrap: 'wrap', gap: 24 }}>
          <div>
            <div className="section-label">05 — Uživo</div>
            <h2 style={{ fontSize: 'clamp(48px, 7vw, 110px)' }}>GALERIJA</h2>
          </div>
          <a href="https://instagram.com/_teska_prica_acoustic" className="mono" style={{ textDecoration: 'underline', textUnderlineOffset: 6 }}>@_TESKA_PRICA_ACOUSTIC ↗</a>
        </div>
        <div className="grid-3">
          {tiles.map((t, i) =>
            <div key={i} className={`gallery-tile ${i === 0 ? 'gallery-tile-wide' : ''}`} style={{ gridColumn: t.span, aspectRatio: t.ar, position: 'relative', overflow: 'hidden', background: '#111' }}>
              {t.video
                ? <VideoTile src={t.video} poster={t.poster} />
                : <img src={t.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  />}
              <div style={{ position: 'absolute', bottom: 16, left: 16 }} className="mono">{t.label}</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============ BOOKING ============ */
const INP_STYLE = {
  width: '100%', background: 'transparent', border: 0, color: 'var(--fg)',
  fontSize: 19, padding: '8px 0', fontFamily: 'Inter', outline: 'none',
};

function Field({ label, v, on, type = 'text' }) {
  return (
    <label style={{ display: 'block', padding: '22px 0', borderBottom: '1px solid var(--line)' }}>
      <div className="mono">{label}</div>
      <input type={type} required value={v} onChange={(e) => on(e.target.value)} style={INP_STYLE} />
    </label>
  );
}

function Booking({ settings }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [form, setForm] = useState({ name: '', contact: '', date: '', type: 'Klub / Restoran', city: '', msg: '' });

  const submit = (e) => {
    e.preventDefault();
    setSending(true);
    setSendError(false);
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: `Upit za nastup — ${form.name || 'bez imena'}`,
        from_name: 'Teška Priča — sajt',
        /* Honeypot. Web3Forms drops the submission if a bot fills this. */
        botcheck: '',
        /* Reply straight to the sender when they left an e-mail. */
        ...(form.contact.includes('@') ? { replyto: form.contact } : {}),
        /* Keys become the labels in the e-mail, so they are written out. */
        'Ime / kontakt osoba': form.name,
        'Telefon ili e-mail': form.contact,
        'Datum': form.date || '—',
        'Tip događaja': form.type,
        'Grad': form.city || '—',
        'Poruka': form.msg || '—',
      }),
    })
      .then(r => r.json())
      .then(d => {
        if (!d.success) throw new Error(d.message || 'submit failed');
        setSent(true); setSending(false);
      })
      .catch(() => { setSendError(true); setSending(false); });
  };

  return (
    <section id="booking" style={{ padding: '140px 0', borderTop: '1px solid var(--line)', background: 'var(--bg)' }} data-screen-label="Booking">
      <div className="container">
        <div className="section-label">06 — Kontakt</div>
        <h2 style={{ fontSize: 'clamp(64px, 10vw, 180px)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 48 }}>
          ZAKAŽITE<br /><span style={{ color: 'var(--accent)' }}>NASTUP.</span>
        </h2>

        <div className="grid-booking">
          <div>
            <p style={{ fontSize: 19, color: 'var(--fg)', marginBottom: 40, maxWidth: 420, lineHeight: 1.5 }}>
              Pišite nam o vašem prostoru ili događaju. Odgovaramo u roku od{' '}
              <span style={{ color: 'var(--accent)' }}>24 sata</span> sa slobodnim terminima
              i ponudom.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingTop: 32, borderTop: '1px solid var(--line)' }}>
              <div>
                <div className="mono">BOOKING</div>
                <a href={`tel:${settings.phone.replace(/\s/g, '')}`} style={{ fontSize: 26, display: 'block', marginTop: 6 }}>{settings.phone}</a>
              </div>
              <div>
                <div className="mono">E-MAIL</div>
                <a href={`mailto:${settings.email}`} style={{ fontSize: 26, display: 'block', marginTop: 6 }}>{settings.email}</a>
              </div>
              <div>
                <div className="mono">INSTAGRAM</div>
                <a href={`https://instagram.com/${settings.instagram}`} style={{ fontSize: 26, display: 'block', marginTop: 6 }}>@{settings.instagram}</a>
              </div>
              <div style={{ paddingTop: 24, borderTop: '1px solid var(--line)' }}>
                <div className="mono">BAZA</div>
                <div style={{ fontSize: 18, marginTop: 6 }}>{settings.base}</div>
              </div>
            </div>
          </div>

          <form onSubmit={submit}>
            <input type="hidden" name="form-name" value="booking" />
            <input type="hidden" name="bot-field" />
            <Field label="IME / KONTAKT OSOBA"  v={form.name}    on={(v) => setForm({ ...form, name: v })} />
            <Field label="TELEFON ILI E-MAIL"   v={form.contact} on={(v) => setForm({ ...form, contact: v })} />
            <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: '1px solid var(--line)' }}>
              <label style={{ padding: '22px 0' }}>
                <div className="mono">DATUM</div>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={INP_STYLE} />
              </label>
              <label className="form-col-2" style={{ padding: '22px 0', borderLeft: '1px solid var(--line)', paddingLeft: 20 }}>
                <div className="mono">GRAD</div>
                <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} style={INP_STYLE} placeholder="npr. Beograd" />
              </label>
            </div>
            <label style={{ display: 'block', padding: '22px 0', borderBottom: '1px solid var(--line)' }}>
              <div className="mono">TIP DOGAĐAJA</div>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={INP_STYLE}>
                {['Klub / Restoran', 'Hotel', 'Svadba', 'Korporativna proslava', 'Privatni događaj', 'Koncert / Festival', 'Ostalo'].map(o =>
                  <option key={o} style={{ background: 'var(--bg-2)' }}>{o}</option>
                )}
              </select>
            </label>
            <label style={{ display: 'block', padding: '22px 0', borderBottom: '1px solid var(--line)' }}>
              <div className="mono">DETALJI</div>
              <textarea rows={4} value={form.msg} onChange={(e) => setForm({ ...form, msg: e.target.value })}
                style={{ ...INP_STYLE, resize: 'vertical', fontSize: 17 }}
                placeholder="Prostor, očekivani broj gostiju, trajanje..."
              />
            </label>
            {sendError && (
              <p style={{ color: 'oklch(0.68 0.19 25)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.14em', marginTop: 16 }}>
                GREŠKA SLANJA · POKUŠAJTE PONOVO ILI POZOVITE DIREKTNO
              </p>
            )}
            <button type="submit" className="btn btn-accent" disabled={sending} style={{ marginTop: 16, fontSize: 13, padding: '18px 28px' }}>
              {sent ? 'UPIT POSLAT ✓' : sending ? 'SLANJE...' : 'POŠALJI UPIT'} &nbsp;→
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

/* ============ FOOTER ============ */
function Footer({ settings }) {
  return (
    <footer style={{ padding: '80px 0 40px', borderTop: '1px solid var(--line)', background: 'var(--bg-2)' }}>
      <div className="container">
        <div style={{ paddingBottom: 40 }}>
          <div className="mono" style={{ color: 'var(--fg-dim)', marginBottom: 24, textAlign: 'center', letterSpacing: '0.22em' }}>
            PRIJATELJI &amp; PARTNERI
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 'clamp(32px, 6vw, 72px)' }}>
            <a href="https://www.univerexport.rs" target="_blank" rel="noopener noreferrer">
              <img src="img/partner-univerexport.webp" alt="Univerexport"
                style={{ height: 'clamp(28px, 4vw, 44px)', width: 'auto', opacity: 0.7, filter: 'grayscale(100%) brightness(1.1)', transition: 'opacity 0.2s, filter 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.filter = 'grayscale(0%)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.filter = 'grayscale(100%) brightness(1.1)'; }}
              />
            </a>
            <a href="https://www.doncaffe.rs/" target="_blank" rel="noopener noreferrer">
              <img src="img/partner-doncafe.png" alt="Don Café"
                style={{ height: 'clamp(36px, 5vw, 56px)', width: 'auto', opacity: 0.7, filter: 'grayscale(100%) brightness(1.1)', transition: 'opacity 0.2s, filter 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.filter = 'grayscale(0%)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.filter = 'grayscale(100%) brightness(1.1)'; }}
              />
            </a>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, paddingTop: 32, borderTop: '1px solid var(--line)' }}>
          <div className="mono">© {new Date().getFullYear()} TEŠKA PRIČA · SUBOTICA, SRBIJA · SVA PRAVA ZADRŽANA</div>
          <div style={{ display: 'flex', gap: 24 }} className="mono">
            <a href={`https://instagram.com/${settings.instagram}`}>INSTAGRAM</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
