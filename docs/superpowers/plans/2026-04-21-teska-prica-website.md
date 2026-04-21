# Teška Priča Band Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the Claude Design bundle into the repo, wire content to editable JSON files, set up Decap CMS for a web-based editing UI, and configure Netlify for free hosting with a working booking form.

**Architecture:** Static CDN React app (no build step). Content lives in `content/*.json` files loaded at runtime via `fetch()`. Decap CMS at `/admin` provides a web UI for band members — edits commit JSON to GitHub which triggers Netlify auto-deploy. The booking form posts to Netlify Forms via a hidden detection form in `index.html`.

**Tech Stack:** React 18 (CDN production), Babel Standalone 7 (JSX), Decap CMS 3.x (CDN), Netlify (hosting + Identity + Forms), Google Fonts (Anton, Inter, JetBrains Mono, Bebas Neue)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `index.html` | Modify (from bundle) | HTML shell + all CSS; production CDN builds; hidden Netlify form |
| `app.jsx` | Modify (from bundle) | All React components; loads data from JSON; Netlify form submit |
| `content/gigs.json` | Create | Gig schedule — CMS managed |
| `content/members.json` | Create | Band member list — CMS managed |
| `content/settings.json` | Create | Contact info, blurb, past venues — CMS managed |
| `img/` | Extract from bundle | Band photos |
| `uploads/` | Extract from bundle | Gallery + partner logos |
| `admin/index.html` | Create | Decap CMS bootstrap |
| `admin/config.yml` | Create | CMS collection definitions |
| `netlify.toml` | Create | Publish dir + admin redirect |

---

## Task 1: Extract bundle files into the repo

The design bundle is a tar.gz at a known path. We extract `img/`, `uploads/`, `index.html`, and `app.jsx` from it into the repo root.

**Files:**
- Create: `img/` directory with all band photos
- Create: `uploads/` directory with gallery photos and partner logos
- Create: `index.html` (raw from bundle, will be modified in Task 3)
- Create: `app.jsx` (raw from bundle, will be modified in Task 4)

- [ ] **Step 1: Extract all project files from bundle**

```bash
BUNDLE="/home/igor/.claude/projects/-home-igor-var-teska-prica/b2daa397-8068-4b19-ae6d-105c0e53c2e7/tool-results/webfetch-1776782820214-gpzyif.bin"
REPO="/home/igor/var/teska-prica"

tar -xOf "$BUNDLE" teska-prica/project/index.html > "$REPO/index.html"
tar -xOf "$BUNDLE" teska-prica/project/app.jsx    > "$REPO/app.jsx"
```

- [ ] **Step 2: Extract image directories**

```bash
BUNDLE="/home/igor/.claude/projects/-home-igor-var-teska-prica/b2daa397-8068-4b19-ae6d-105c0e53c2e7/tool-results/webfetch-1776782820214-gpzyif.bin"
REPO="/home/igor/var/teska-prica"

# Extract all files, strip the leading path prefix
tar -xf "$BUNDLE" -C "$REPO" \
  --strip-components=2 \
  teska-prica/project/img \
  teska-prica/project/uploads
```

- [ ] **Step 3: Verify files landed correctly**

```bash
ls /home/igor/var/teska-prica/img/
ls /home/igor/var/teska-prica/uploads/
```

Expected output for `img/`: `accordion.jpg  band-bw.jpg  bass.jpg  drummer.jpg  duo.jpg  hero.jpg  partner-doncafe.png  partner-univerexport.webp  piano.jpg  poster-alt.jpg  poster.jpg  singer-1.jpg  singer-2.jpg  singer-f.jpg  stage-wide.jpg`

- [ ] **Step 4: Commit extracted files**

```bash
cd /home/igor/var/teska-prica
git add img/ uploads/ index.html app.jsx
git commit -m "feat: extract Claude Design bundle files"
```

---

## Task 2: Create content JSON files

Move all dynamic data (gigs, members, contact info) from hardcoded constants in `app.jsx` into standalone JSON files. Each file is wrapped in an `{ "items": [...] }` object so Decap CMS's list widget can manage the array.

**Files:**
- Create: `content/gigs.json`
- Create: `content/members.json`
- Create: `content/settings.json`

- [ ] **Step 1: Create content directory and gigs.json**

```bash
mkdir -p /home/igor/var/teska-prica/content
```

Write `/home/igor/var/teska-prica/content/gigs.json`:

```json
{
  "items": [
    {
      "d": "19",
      "m": "APR",
      "y": "2026",
      "place": "Jadran",
      "city": "Subotica",
      "note": "Prvi solistički koncert · SOLD OUT",
      "tag": "PAST",
      "highlight": true
    },
    {
      "d": "02",
      "m": "MAJ",
      "y": "2026",
      "place": "Klub Barutana",
      "city": "Beograd",
      "note": "Live night",
      "tag": "UPCOMING",
      "highlight": false
    },
    {
      "d": "09",
      "m": "MAJ",
      "y": "2026",
      "place": "Restoran Aquarius",
      "city": "Novi Sad",
      "note": "Rezidencija · Subota veče",
      "tag": "UPCOMING",
      "highlight": false
    },
    {
      "d": "17",
      "m": "MAJ",
      "y": "2026",
      "place": "Hotel Galleria",
      "city": "Subotica",
      "note": "Gala večera",
      "tag": "UPCOMING",
      "highlight": false
    },
    {
      "d": "23",
      "m": "MAJ",
      "y": "2026",
      "place": "Lounge 27",
      "city": "Subotica",
      "note": "Weekend set",
      "tag": "UPCOMING",
      "highlight": false
    },
    {
      "d": "06",
      "m": "JUN",
      "y": "2026",
      "place": "Klub Tesla",
      "city": "Palić",
      "note": "Opening night",
      "tag": "UPCOMING",
      "highlight": false
    }
  ]
}
```

- [ ] **Step 2: Create members.json**

Write `/home/igor/var/teska-prica/content/members.json`:

```json
{
  "items": [
    { "name": "Lead Vokal",    "role": "Glas / Front",   "img": "img/singer-1.jpg" },
    { "name": "Prateći Vokal", "role": "Glas",           "img": "img/accordion.jpg" },
    { "name": "Klavijature",   "role": "Piano / Synth",  "img": "img/piano.jpg" },
    { "name": "Bas Gitara",    "role": "Bas / Ritam",    "img": "img/bass.jpg" },
    { "name": "Bubnjevi",      "role": "Drums",          "img": "img/duo.jpg" },
    { "name": "Harmonika",     "role": "Harmonika / Gost", "img": "img/stage-wide.jpg" }
  ]
}
```

- [ ] **Step 3: Create settings.json**

Write `/home/igor/var/teska-prica/content/settings.json`:

```json
{
  "blurb": "Sedmočlani live bend iz Subotice. Sviramo u klubovima, restoranima, hotelima i na privatnim događajima — bez playback-a, sa repertoarom koji podiže salu.",
  "phone": "+381 61 382 1712",
  "email": "booking@teskaprica.rs",
  "instagram": "_teska_prica",
  "base": "Subotica, Srbija · Nastupamo širom regiona",
  "pastVenues": [
    "Jadran, Subotica",
    "Hotel Galleria",
    "Lounge 27",
    "Klub Barutana",
    "Restoran Aquarius",
    "Dvorac Fantast",
    "Letnja Pozornica Palić",
    "Hotel Patria"
  ]
}
```

- [ ] **Step 4: Commit content files**

```bash
cd /home/igor/var/teska-prica
git add content/
git commit -m "feat: add content JSON files for CMS-managed data"
```

---

## Task 3: Update index.html

Three changes: swap dev CDN builds for production builds, add the hidden form Netlify needs to detect the booking form at deploy time, and remove the `TWEAK_DEFAULTS` script block (the Tweaks panel is removed in Task 4).

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Swap React CDN builds from development to production**

In `index.html`, find these three `<script>` tags (they reference `react.development.js` and `react-dom.development.js`):

```html
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
```

Replace with production builds:

```html
<script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js" crossorigin="anonymous"></script>
```

- [ ] **Step 2: Remove the TWEAK_DEFAULTS script block**

Find and remove this entire block:

```html
<script>
window.TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "mood": "midnight",
  "accent": "amber",
  "showMembers": true,
  "heroLayout": "left"
}/*EDITMODE-END*/;
</script>
```

- [ ] **Step 3: Add hidden Netlify Forms detection form**

Add this block directly before `<div id="root"></div>`. Netlify scans HTML at deploy time and registers the form; without it, React-rendered forms are invisible to Netlify.

```html
<!-- Netlify Forms detection — must be in raw HTML, not rendered by React -->
<form name="booking" data-netlify="true" netlify-honeypot="bot-field" hidden>
  <input name="name" />
  <input name="contact" />
  <input name="date" />
  <input name="city" />
  <select name="type"></select>
  <textarea name="msg"></textarea>
</form>
```

- [ ] **Step 4: Commit index.html changes**

```bash
cd /home/igor/var/teska-prica
git add index.html
git commit -m "feat: use production React CDN builds and add Netlify Forms detection"
```

---

## Task 4: Rewrite app.jsx

This is the largest change. We replace hardcoded data constants with a runtime `fetch()` call loading all three JSON files, update the `Booking` component to submit to Netlify, and strip the `Tweaks` component and all related state.

**Files:**
- Modify: `app.jsx`

Write the complete new `app.jsx` with all changes applied. Replace the entire file contents:

- [ ] **Step 1: Write the new app.jsx**

Write `/home/igor/var/teska-prica/app.jsx` with this complete content:

```jsx
const { useState, useEffect, useRef } = React;

/* ============ STATIC DATA (never needs CMS editing) ============ */
const VENUES = [
  { type: "Klubovi",          desc: "Petak i subota veče, rezidencije, special event nights." },
  { type: "Restorani",        desc: "Vikend programi, rezidencije, tematske večeri." },
  { type: "Hoteli",           desc: "Rezidencije, gala večere, sezonski aranžmani." },
  { type: "Svadbe",           desc: "Ceremonija, koktel, veče — pun program uživo." },
  { type: "Korporativne",     desc: "Dočeci, proslave, team-building događaji." },
  { type: "Privatne proslave",desc: "Rođendani, jubileji, kamerni događaji." },
];

/* ============ APP ============ */
function App() {
  const [content, setContent] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/content/gigs.json').then(r => r.json()),
      fetch('/content/members.json').then(r => r.json()),
      fetch('/content/settings.json').then(r => r.json()),
    ]).then(([gigsData, membersData, settings]) => {
      setContent({ gigs: gigsData.items, members: membersData.items, settings });
    }).catch(err => console.error('Failed to load content:', err));
  }, []);

  if (!content) return null;

  const { gigs, members, settings } = content;

  return (
    <>
      <Nav />
      <Hero />
      <Marquee />
      <About settings={settings} />
      <Venues />
      <Members members={members} />
      <Showcase />
      <Gigs gigs={gigs} settings={settings} />
      <Gallery />
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
      <nav data-screen-label="Nav" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '20px 48px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: scrolled ? 'rgba(7,8,13,0.85)' : 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--line)' : '1px solid transparent',
        color: '#ecebe6',
        transition: 'background 0.3s, backdrop-filter 0.3s',
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
          <div className="mono">● EST. 2024 · SUBOTICA</div>
          <div className="mono">SEZONA 2026 · BOOKING OTVOREN</div>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 5, paddingBottom: 64 }}>
        <div className="container">
          <div className="mono" style={{ marginBottom: 20, color: 'var(--accent)' }}>LIVE BAND · NO PLAYBACK</div>
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
              <div className="mono" style={{ marginBottom: 8 }}>ZA KLUBOVE · RESTORANE · HOTELE · PRIVATNE DOGAĐAJE</div>
              <div style={{ fontSize: 18, color: 'var(--fg)' }}>Sedmočlani bend za događaje koji se pamte.</div>
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
  const words = ["KLUBOVI", SEP, "RESTORANI", SEP, "HOTELI", SEP, "SVADBE", SEP, "KORPORATIVNO", SEP, "PRIVATNI DOGAĐAJI", SEP];
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
function About({ settings }) {
  return (
    <section id="about" style={{ padding: '140px 0' }} data-screen-label="About">
      <div className="container">
        <div className="grid-2">
          <div className="sticky-col" style={{ position: 'sticky', top: 120 }}>
            <div className="section-label">01 — Bend</div>
            <h2 style={{ fontSize: 'clamp(48px, 6vw, 96px)', letterSpacing: '-0.01em', marginBottom: 24 }}>
              Live band<br />koji puni<br /><span style={{ color: 'var(--accent)' }}>prostor.</span>
            </h2>
            <p className="mono">SUBOTICA · SRBIJA · EST. 2024</p>
          </div>
          <div>
            <p style={{ fontSize: 22, lineHeight: 1.5, marginBottom: 28, maxWidth: 580 }}>
              {settings.blurb}
            </p>
            <p style={{ color: 'var(--fg-dim)', maxWidth: 560, marginBottom: 48, fontSize: 17, lineHeight: 1.6 }}>
              Repertoar koji pokriva ex-YU klasike, balkanske hitove, latino i svetski pop —
              uvek u aranžmanima koje bend pravi sam. Naš fokus su prostori gde publika sedi blizu,
              a zvuk mora da bude precizan. Klubovi, restorani, hoteli — mesta gde svaka nota ima težinu.
            </p>
            <div className="grid-stats" style={{ paddingTop: 32, borderTop: '1px solid var(--line)' }}>
              <Stat n="07" l="Članova benda" />
              <Stat n="150+" l="Nastupa / god" />
              <Stat n="01" l="Solistički koncert" />
              <Stat n="100%" l="Uživo, bez playback" />
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
            Postava, trajanje i repertoar se prilagođavaju prostoru. Od trio formata
            za kamerne događaje do punog sedmočlanog sastava sa DJ segmentom.
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
          <p className="mono" style={{ maxWidth: 320 }}>SEDMORO MUZIČARA · PUN LIVE SET</p>
        </div>
        <div className="grid-3">
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
    <section data-screen-label="Showcase" style={{ position: 'relative', padding: '80px 0' }}>
      <div className="showcase-inner" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: '-15% 0',
          backgroundImage: "url('img/band-bw.jpg')",
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0 }}>
          <div className="container showcase-text-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div className="mono" style={{ color: 'var(--accent)', marginBottom: 8 }}>19.04.2026 · JADRAN · SUBOTICA</div>
              <div className="display" style={{ fontSize: 'clamp(40px, 5vw, 72px)', letterSpacing: '-0.01em' }}>
                Prvi solistički<br />koncert. <span style={{ color: 'var(--accent)' }}>Sold&nbsp;out.</span>
              </div>
            </div>
            <div className="mono" style={{ maxWidth: 280, textAlign: 'right' }}>
              Milestone na putu od lokalnih nastupa do velike scene.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============ GIGS ============ */
function Gigs({ gigs, settings }) {
  return (
    <section id="gigs" style={{ padding: '120px 0' }} data-screen-label="Gigs">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 64, flexWrap: 'wrap', gap: 24 }}>
          <div>
            <div className="section-label">04 — Nastupi</div>
            <h2 style={{ fontSize: 'clamp(48px, 7vw, 110px)' }}>RASPORED</h2>
          </div>
          <p className="mono" style={{ maxWidth: 320 }}>REZIDENCIJE · KONCERTI · DOGAĐAJI</p>
        </div>

        <div style={{ borderTop: '1px solid var(--line)' }}>
          {gigs.map((g, i) =>
            <div key={i} className="gig-row" style={{
              padding: '28px 0',
              borderBottom: '1px solid var(--line)',
              alignItems: 'center',
              background: g.highlight ? 'linear-gradient(90deg, rgba(255,200,100,0.04) 0%, transparent 60%)' : 'transparent',
            }}>
              <div>
                <div className="display" style={{ fontSize: 56, lineHeight: 0.9, color: g.highlight ? 'var(--accent)' : 'var(--fg)' }}>{g.d}</div>
                <div className="mono" style={{ marginTop: 4 }}>{g.m} · {g.y}</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>{g.place}</div>
                <div className="mono">{g.city.toUpperCase()}</div>
              </div>
              <div className="gig-note" style={{ color: 'var(--fg-dim)', fontSize: 14 }}>{g.note}</div>
              <div className="mono gig-tag" style={{
                padding: '6px 12px', border: '1px solid currentColor',
                color: g.tag === 'PAST' ? 'var(--fg-dim)' : 'var(--accent)',
              }}>{g.tag}</div>
            </div>
          )}
        </div>

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
function Gallery() {
  const tiles = [
    { src: 'img/hero.jpg',     span: '1 / span 2', ar: '3/2', label: 'JADRAN · 2026' },
    { src: 'img/singer-1.jpg', span: '3 / span 1', ar: '3/4', label: 'LIVE' },
    { src: 'img/duo.jpg',      span: '1 / span 1', ar: '1/1', label: 'BUBNJEVI' },
    { src: 'img/singer-f.jpg', span: '2 / span 1', ar: '1/1', label: 'BEND' },
    { src: 'img/singer-2.jpg', span: '3 / span 1', ar: '1/1', label: 'PRATEĆI VOKALI' },
  ];

  return (
    <section id="gallery" style={{ padding: '120px 0', background: 'var(--bg-2)' }} data-screen-label="Gallery">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, flexWrap: 'wrap', gap: 24 }}>
          <div>
            <div className="section-label">05 — Uživo</div>
            <h2 style={{ fontSize: 'clamp(48px, 7vw, 110px)' }}>GALERIJA</h2>
          </div>
          <a href="https://instagram.com/_teska_prica" className="mono" style={{ textDecoration: 'underline', textUnderlineOffset: 6 }}>@_TESKA_PRICA ↗</a>
        </div>
        <div className="grid-3">
          {tiles.map((t, i) =>
            <div key={i} className={`gallery-tile ${i === 0 ? 'gallery-tile-wide' : ''}`} style={{ gridColumn: t.span, aspectRatio: t.ar, position: 'relative', overflow: 'hidden', background: '#111' }}>
              <img src={t.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              />
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
  const [form, setForm] = useState({ name: '', contact: '', date: '', type: 'Klub / Restoran', city: '', msg: '' });

  const submit = (e) => {
    e.preventDefault();
    setSending(true);
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 'form-name': 'booking', ...form }).toString(),
    })
      .then(() => { setSent(true); setSending(false); })
      .catch(() => { setSent(true); setSending(false); });
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
              <span style={{ color: 'var(--accent)' }}>24 sata</span> sa slobodnim terminima,
              formatima postave i ponudom.
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
                {['Klub / Restoran', 'Hotel / Rezidencija', 'Svadba', 'Korporativna proslava', 'Privatni događaj', 'Koncert / Festival', 'Ostalo'].map(o =>
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
            <button type="submit" className="btn btn-accent" disabled={sending} style={{ marginTop: 32, fontSize: 13, padding: '18px 28px' }}>
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
        <div className="display footer-display" style={{ fontSize: 'clamp(80px, 20vw, 340px)', letterSpacing: '-0.02em', marginBottom: 48, lineHeight: 1.15 }}>
          TEŠKA<br /><span style={{ paddingLeft: '0.5em' }}>PRIČA</span>
        </div>

        <div style={{ paddingTop: 32, paddingBottom: 40, borderTop: '1px solid var(--line)' }}>
          <div className="mono" style={{ color: 'var(--fg-dim)', marginBottom: 24, textAlign: 'center', letterSpacing: '0.22em' }}>
            PRIJATELJI &amp; PARTNERI
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 'clamp(32px, 6vw, 72px)' }}>
            <img src="img/partner-univerexport.webp" alt="Univerexport"
              style={{ height: 'clamp(28px, 4vw, 44px)', width: 'auto', opacity: 0.7, filter: 'grayscale(100%) brightness(1.1)', transition: 'opacity 0.2s, filter 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.filter = 'grayscale(0%)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.filter = 'grayscale(100%) brightness(1.1)'; }}
            />
            <img src="img/partner-doncafe.png" alt="Don Café"
              style={{ height: 'clamp(36px, 5vw, 56px)', width: 'auto', opacity: 0.7, filter: 'grayscale(100%) brightness(1.1)', transition: 'opacity 0.2s, filter 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.filter = 'grayscale(0%)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.filter = 'grayscale(100%) brightness(1.1)'; }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, paddingTop: 32, borderTop: '1px solid var(--line)' }}>
          <div className="mono">© 2026 TEŠKA PRIČA · SUBOTICA, SRBIJA · ALL RIGHTS RESERVED</div>
          <div style={{ display: 'flex', gap: 24 }} className="mono">
            <a href={`https://instagram.com/${settings.instagram}`}>INSTAGRAM</a>
            <a href="#">YOUTUBE</a>
            <a href="#">TIKTOK</a>
            <a href="#">SPOTIFY</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
```

- [ ] **Step 2: Commit app.jsx**

```bash
cd /home/igor/var/teska-prica
git add app.jsx
git commit -m "feat: load content from JSON, wire Netlify form, remove Tweaks panel"
```

---

## Task 5: Create Decap CMS admin files

Decap CMS runs entirely in the browser from a CDN. We need two files: an HTML bootstrap and a YAML config that tells the CMS which files to manage and what fields each has.

**Files:**
- Create: `admin/index.html`
- Create: `admin/config.yml`

- [ ] **Step 1: Create admin/index.html**

```bash
mkdir -p /home/igor/var/teska-prica/admin
```

Write `/home/igor/var/teska-prica/admin/index.html`:

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Teška Priča — Admin</title>
</head>
<body>
  <script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
  <script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create admin/config.yml**

Write `/home/igor/var/teska-prica/admin/config.yml`:

```yaml
backend:
  name: git-gateway
  branch: main

media_folder: uploads
public_folder: /uploads

collections:
  - name: content
    label: Sadržaj sajta
    files:

      - name: gigs
        label: Nastupi
        file: content/gigs.json
        fields:
          - name: items
            label: Nastupi
            widget: list
            fields:
              - { name: d,         label: Dan (broj),    widget: string }
              - { name: m,         label: Mesec (skr.),  widget: string, hint: "npr. APR, MAJ, JUN" }
              - { name: y,         label: Godina,        widget: string }
              - { name: place,     label: Venue,         widget: string }
              - { name: city,      label: Grad,          widget: string }
              - { name: note,      label: Napomena,      widget: string }
              - { name: tag,       label: Status,        widget: select, options: [UPCOMING, PAST] }
              - { name: highlight, label: Istaknuto,     widget: boolean, default: false }

      - name: members
        label: Članovi benda
        file: content/members.json
        fields:
          - name: items
            label: Članovi
            widget: list
            fields:
              - { name: name, label: Ime,      widget: string }
              - { name: role, label: Uloga,    widget: string }
              - { name: img,  label: Fotografija, widget: image }

      - name: settings
        label: Podešavanja i kontakt
        file: content/settings.json
        fields:
          - { name: blurb,       label: Opis benda,     widget: text }
          - { name: phone,       label: Telefon,        widget: string }
          - { name: email,       label: E-mail,         widget: string }
          - { name: instagram,   label: Instagram (bez @), widget: string }
          - { name: base,        label: Baza / region,  widget: string }
          - name: pastVenues
            label: Mesta gde smo svirali
            widget: list
```

- [ ] **Step 3: Add Netlify Identity widget to index.html**

The identity widget must also be included on the main site so band members can log in and be redirected to `/admin` after authentication. Add this script tag right before `</body>` in `index.html`:

```html
<script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
<script>
  if (window.netlifyIdentity) {
    window.netlifyIdentity.on("init", user => {
      if (!user) {
        window.netlifyIdentity.on("login", () => {
          document.location.href = "/admin/";
        });
      }
    });
  }
</script>
```

- [ ] **Step 4: Commit admin files and identity widget**

```bash
cd /home/igor/var/teska-prica
git add admin/ index.html
git commit -m "feat: add Decap CMS admin and Netlify Identity widget"
```

---

## Task 6: Create netlify.toml

Tells Netlify where the published files are and adds a redirect so `/admin` works as a URL.

**Files:**
- Create: `netlify.toml`

- [ ] **Step 1: Write netlify.toml**

Write `/home/igor/var/teska-prica/netlify.toml`:

```toml
[build]
  publish = "."

[[redirects]]
  from = "/admin"
  to   = "/admin/index.html"
  status = 200
```

- [ ] **Step 2: Commit**

```bash
cd /home/igor/var/teska-prica
git add netlify.toml
git commit -m "feat: add Netlify configuration"
```

---

## Task 7: Verify locally

The site uses `fetch()` for JSON, so it must run behind an HTTP server — opening `index.html` directly as a `file://` URL will fail CORS. Use a local server.

**No traditional unit tests apply here; verification is visual + network inspection.**

- [ ] **Step 1: Start a local HTTP server**

```bash
cd /home/igor/var/teska-prica
npx serve . --listen 8080
```

If `serve` isn't available: `python3 -m http.server 8080`

- [ ] **Step 2: Open in browser and check all sections load**

Open `http://localhost:8080` in a browser. Verify:
- Hero photo loads, parallax scrolls on scroll
- Scrolling marquee runs
- About section shows band blurb from `settings.json`
- Venues grid shows 6 format cards
- Members grid shows 6 photos with names from `members.json`
- Showcase section shows wide concert photo
- Gigs list shows all entries from `gigs.json` with PAST/UPCOMING tags
- "Mesta gde smo svirali" section shows past venue names from `settings.json`
- Gallery mosaic loads all photos
- Booking section shows phone/email from `settings.json`
- Footer renders large TEŠKA PRIČA typography and partner logos

- [ ] **Step 3: Check browser console for errors**

Open DevTools → Console. Expected: no errors. If `fetch` fails for JSON files, check that the server is serving from the repo root.

- [ ] **Step 4: Test booking form submission locally**

Fill in the booking form and click "Pošalji upit". Expected: button shows "UPIT POSLAT ✓". The `fetch` POST to `/` will 404 locally (Netlify isn't intercepting it), but the UI success state should still show because the `catch` handler also calls `setSent(true)`.

Note: real form submission only works when deployed to Netlify.

- [ ] **Step 5: Verify mobile layout**

In DevTools, switch to a 375px mobile viewport. Check:
- Nav collapses to hamburger menu button
- Hero text scales down, CTAs stack vertically
- Members grid shows 2 columns → 1 column on very small screens
- Gigs table reflows correctly

---

## Task 8: Deploy to Netlify

Covers the one-time Netlify setup. After this, every `git push` auto-deploys.

- [ ] **Step 1: Push repo to GitHub**

If the repo isn't on GitHub yet:
```bash
# Create repo on GitHub first (via github.com or `gh repo create`)
gh repo create teska-prica --public --source=. --remote=origin --push
```

If it already has a remote:
```bash
git push origin main
```

- [ ] **Step 2: Connect repo to Netlify**

1. Go to [app.netlify.com](https://app.netlify.com) → "Add new site" → "Import an existing project"
2. Choose GitHub → select the `teska-prica` repo
3. Build settings: leave build command blank, set publish directory to `.`
4. Click "Deploy site"

- [ ] **Step 3: Enable Netlify Identity**

In the Netlify dashboard for the site:
1. Site configuration → Identity → Enable Identity
2. Under "Registration", set to "Invite only" (so random people can't sign up)
3. Under "Services" → Git Gateway → Enable Git Gateway

- [ ] **Step 4: Enable Netlify Forms**

Netlify auto-detects the hidden `<form name="booking" data-netlify="true">` on deploy. To verify:
1. Go to Site → Forms in the Netlify dashboard
2. After first deploy, "booking" form should appear in the list

- [ ] **Step 5: Invite yourself to the CMS**

In the Netlify dashboard → Identity → Invite users → enter your email. You'll receive an invite link. Click it, set a password, and you'll be redirected to `/admin`.

- [ ] **Step 6: Verify CMS works end-to-end**

1. Go to `https://<your-site>.netlify.app/admin`
2. Log in with your Netlify Identity credentials
3. Open "Nastupi" → edit one gig (e.g., change a venue name) → click "Publish"
4. Wait ~30 seconds for Netlify to rebuild
5. Reload the main site — the updated gig name should appear

---

## Placeholders to Update Before Going Live

These are placeholder values in `content/settings.json` that need real data:

| Field | Current value | Action needed |
|-------|--------------|---------------|
| `phone` | `+381 61 382 1712` | Replace with real booking phone |
| `email` | `booking@teskaprica.rs` | Replace with real email (or create this alias) |
| Member names | "Lead Vokal", "Prateći Vokal", etc. | Update in CMS once real names are confirmed |
| Gig dates | Example May–June 2026 dates | Update in CMS with real upcoming shows |
| YouTube/TikTok/Spotify footer links | `#` | Update in `app.jsx` Footer component when accounts exist |
