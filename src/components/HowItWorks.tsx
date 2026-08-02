import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle } from 'lucide-react';

// ─── Mockup sub-components ───────────────────────────────────────────────────

function MockupSearch({ active }: { active: boolean }) {
  return (
    <div className={`mockup-base ${active ? 'mockup-on' : 'mockup-off'}`}>
      <div className="h-[5px] rounded-full bg-[#ffb300]/55 mb-2" style={{ width: '65%' }} />
      <div className="h-[5px] rounded-full bg-[#ffb300]/16 mb-3" style={{ width: '38%' }} />
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {[0, 1].map(i => (
          <div key={i} className="bg-[#ffb300]/7 border border-[#ffb300]/15 rounded-md p-2">
            <div className="w-[14px] h-[14px] rounded-full bg-[#ffb300]/20 mb-1.5" />
            <div className="h-[3px] rounded-full bg-[#e9eaec]/12 mb-1" />
            <div className="h-[3px] rounded-full bg-[#e9eaec]/12" style={{ width: '55%' }} />
          </div>
        ))}
      </div>
      <div className="bg-[#ffb300] rounded-md px-2 py-[5px] flex items-center gap-1.5">
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="#2a2e34" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span className="text-[9px] font-black text-[#2a2e34] uppercase tracking-wider font-mono">Find Riders</span>
      </div>
    </div>
  );
}

function MockupPartner({ active }: { active: boolean }) {
  return (
    <div className={`mockup-base ${active ? 'mockup-on' : 'mockup-off'}`}>
      <div className="h-[5px] rounded-full bg-[#ffb300]/16 mb-2" style={{ width: '52%' }} />
      <div className="h-[3.5px] rounded-full bg-[#e9eaec]/11 mb-3" style={{ width: '78%' }} />
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {[true, false].map((accent, i) => (
          <div key={i} className="bg-[#ffb300]/7 border border-[#ffb300]/15 rounded-md p-2">
            <div className={`w-[14px] h-[14px] rounded-full mb-1.5 ${accent ? 'bg-[#ffb300]/45' : 'bg-[#ffb300]/20'}`} />
            <div className="h-[3px] rounded-full bg-[#e9eaec]/12 mb-1" style={{ width: '75%' }} />
            <div className="h-[3px] rounded-full bg-[#e9eaec]/12" style={{ width: '55%' }} />
          </div>
        ))}
      </div>
      <div className="bg-[#ffb300] rounded-md px-2 py-[5px] flex items-center gap-1.5">
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="#2a2e34" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
          <rect x="9" y="11" width="14" height="10" rx="2"/>
        </svg>
        <span className="text-[9px] font-black text-[#2a2e34] uppercase tracking-wider font-mono">Lock Partner</span>
      </div>
    </div>
  );
}

function MockupPass({ active }: { active: boolean }) {
  return (
    <div className={`mockup-base ${active ? 'mockup-on' : 'mockup-off'}`}>
      <div className="h-[5px] rounded-full bg-[#ffb300]/55 mb-3" style={{ width: '68%' }} />
      <div className="flex flex-col gap-1.5 mb-3">
        {[
          { label: '7 Day',  price: '₹299', sel: false },
          { label: '15 Day', price: '₹549', sel: true  },
          { label: '30 Day', price: '₹999', sel: false },
        ].map(p => (
          <div key={p.label}
            className={`rounded-md px-2 py-[5px] flex justify-between items-center border
              ${p.sel
                ? 'border-[#ffb300] bg-[#ffb300]/17'
                : 'border-[#ffb300]/16 bg-[#ffb300]/7'}`}>
            <span className="text-[9px] font-bold text-[#ffb300] font-mono">{p.label}</span>
            <span className="text-[9px] text-[#e9eaec]/60 font-mono">{p.price}</span>
          </div>
        ))}
      </div>
      <div className="bg-[#ffb300] rounded-md px-2 py-[5px] flex items-center gap-1.5">
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="#2a2e34" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span className="text-[9px] font-black text-[#2a2e34] uppercase tracking-wider font-mono">Activate Now</span>
      </div>
    </div>
  );
}

// ─── Inline top-down bike SVG ─────────────────────────────────────────────────

function BikeIcon() {
  return (
    <svg width="44" height="72" viewBox="0 0 44 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* rear wheel */}
      <ellipse cx="22" cy="63" rx="8" ry="5" fill="#1a1d21" stroke="#ffb300" strokeWidth="1.5"/>
      <ellipse cx="22" cy="63" rx="4" ry="2.5" fill="#2a2e34"/>
      {/* front wheel */}
      <ellipse cx="22" cy="9" rx="8" ry="5" fill="#1a1d21" stroke="#ffb300" strokeWidth="1.5"/>
      <ellipse cx="22" cy="9" rx="4" ry="2.5" fill="#2a2e34"/>
      {/* frame */}
      <rect x="17" y="13" width="10" height="46" rx="5" fill="#1a1d21" stroke="#ffb300" strokeWidth="1.2"/>
      {/* fuel tank */}
      <rect x="16" y="26" width="12" height="14" rx="4" fill="#ffb300"/>
      {/* handlebars */}
      <rect x="8" y="12" width="28" height="4" rx="2" fill="#2a2e34" stroke="#ffb300" strokeWidth="1"/>
      {/* helmet */}
      <ellipse cx="22" cy="37" rx="9" ry="11" fill="#2a2e34" stroke="#ffb300" strokeWidth="1.2"/>
      {/* visor */}
      <ellipse cx="22" cy="32" rx="5.5" ry="3.5" fill="#ffb300" opacity={0.85}/>
      {/* shoulders */}
      <ellipse cx="13" cy="41" rx="4" ry="3" fill="#2a2e34" stroke="#ffb300" strokeWidth="1"/>
      <ellipse cx="31" cy="41" rx="4" ry="3" fill="#2a2e34" stroke="#ffb300" strokeWidth="1"/>
      {/* arms */}
      <line x1="13" y1="39" x2="13" y2="15" stroke="#2a2e34" strokeWidth="3" strokeLinecap="round"/>
      <line x1="31" y1="39" x2="31" y2="15" stroke="#2a2e34" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

// ─── Steps data ───────────────────────────────────────────────────────────────

const STEPS = [
  {
    label: 'Step 01',
    title: 'Discover Hosts',
    desc: 'Enter your origin and destination. Move Buddy maps certified nearby bike riders filtered by route overlap, timing, and safety score.',
  },
  {
    label: 'Step 02',
    title: 'Lock Bike Partner',
    desc: 'Choose your host by Buddy Score, bike model, and rating. Send a request — once accepted, your daily commute circle is formed.',
  },
  {
    label: 'Step 03',
    title: 'Activate Pass Plan',
    desc: 'Pick a 7, 15, or 30-day commute pass to lock your rider as a private partner. Pay once, ride daily.',
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HowItWorks() {
  const [active, setActive] = useState(0);
  const outerRef = useRef<HTMLDivElement>(null);
  const bikeRef  = useRef<HTMLDivElement>(null);
  const fillRef  = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rowRefs  = useRef<(HTMLDivElement | null)[]>([]);
  const initialized = useRef(false);

  // Place bike at step 0 on mount (no transition)
  useEffect(() => {
    const place = () => {
      const node  = nodeRefs.current[0];
      const outer = outerRef.current;
      const bike  = bikeRef.current;
      const fill  = fillRef.current;
      if (!node || !outer || !bike || !fill) return;
      const or = outer.getBoundingClientRect();
      const nr = node.getBoundingClientRect();
      const cy = (nr.top + nr.height / 2) - or.top;
      bike.style.transition = 'none';
      fill.style.transition  = 'none';
      bike.style.top = `${cy - 36}px`;
      fill.style.height = `${cy}px`;
      setTimeout(() => {
        if (bike) bike.style.transition = 'top 0.6s cubic-bezier(.4,0,.2,1)';
        if (fill) fill.style.transition  = 'height 0.6s ease';
        initialized.current = true;
      }, 80);
    };
    setTimeout(place, 120);
  }, []);

  // Scroll handler
  useEffect(() => {
    const onScroll = () => {
      const mid = window.innerHeight / 2 + 100;
      let best = 0;
      rowRefs.current.forEach((row, i) => {
        if (!row) return;
        const r = row.getBoundingClientRect();
        if (r.top + r.height / 2 < mid) best = i;
      });
      if (best === active) return;
      setActive(best);

      const node  = nodeRefs.current[best];
      const outer = outerRef.current;
      const bike  = bikeRef.current;
      const fill  = fillRef.current;
      if (!node || !outer || !bike || !fill) return;
      const or = outer.getBoundingClientRect();
      const nr = node.getBoundingClientRect();
      const cy = (nr.top + nr.height / 2) - or.top;
      bike.style.top    = `${cy - 36}px`;
      fill.style.height = `${cy}px`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [active]);

  const mockups = [
    <MockupSearch  key={0} active={active >= 0} />,
    <MockupPartner key={1} active={active >= 1} />,
    <MockupPass    key={2} active={active >= 2} />,
  ];

  return (
    <>
      <style>{`
        .mockup-base {
          background: #2a2e34;
          border-radius: 12px;
          padding: 11px;
          text-align: left;
          transition: all 0.5s ease;
        }
        .mockup-on  { border: 1.5px solid rgba(255,179,0,0.38); opacity: 1;    transform: translateY(0)   scale(1);    width: 216px; }
        .mockup-off { border: 1.5px solid rgba(255,179,0,0.13); opacity: 0.30; transform: translateY(6px) scale(0.97); width: 198px; }
      `}</style>

      <section
        id="how-it-works"
        className="py-16 sm:py-20 bg-[#e9eaec] text-[#2a2e34] border-t border-[#2a2e34]/15 overflow-hidden"
      >
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto px-4 mb-14">
          <p className="text-[11px] font-bold tracking-[.14em] uppercase text-[#ffb300] font-mono mb-2">
            A step-by-step approach
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#2a2e34]">
            How It Works
          </h2>
          <p className="mt-2 text-[11px] font-bold tracking-[.1em] uppercase text-[#2a2e34] font-mono">
            Lock in your dedicated bike commute companion in three steps.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative max-w-[680px] mx-auto px-4" ref={outerRef}>

          {/* ── Road ── */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-12 pointer-events-none z-[1]">
            {/* asphalt */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-7 bg-[#2a2e34] opacity-[.13]" />
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-4 bg-[#2a2e34] opacity-[.18]" />
            {/* edge lines */}
            <div className="absolute top-0 bottom-0 bg-white/[.18]" style={{ left: 'calc(50% - 14px)', width: 2 }} />
            <div className="absolute top-0 bottom-0 bg-white/[.18]" style={{ left: 'calc(50% + 12px)', width: 2 }} />
            {/* dashed centre */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[2.5px] overflow-hidden">
              <div className="absolute inset-0"
                style={{ background: 'repeating-linear-gradient(to bottom,#ffb300 0,#ffb300 18px,transparent 18px,transparent 32px)' }}
              />
            </div>
            {/* yellow progress fill */}
            <div
              ref={fillRef}
              className="absolute left-1/2 -translate-x-1/2 top-0 w-[2.5px] bg-[#ffb300]"
              style={{ height: 0 }}
            />
          </div>

          {/* ── Bike ── */}
          <div
            ref={bikeRef}
            className="absolute z-[5] drop-shadow-md"
            style={{ left: '50%', marginLeft: -22, top: 0 }}
          >
            <BikeIcon />
          </div>

          {/* ── Rows ── */}
          <div className="relative z-[2]">
            {STEPS.map((step, i) => {
              const isLeft = i % 2 === 0;

              const CardEl = (
                <div className={`transition-all duration-500 rounded-2xl border-2 p-[14px] text-left
                  ${active >= i
                    ? 'bg-[#2a2e34] border-[#ffb300]/70 opacity-100 translate-y-0 scale-100'
                    : 'bg-[#2a2e34] border-[#ffb300]/18 opacity-[.38] translate-y-[6px] scale-[.97]'}
                  ${active >= i ? 'w-[258px]' : 'w-[240px]'}`}
                >
                  <p className="text-[9px] font-bold tracking-[.14em] uppercase text-[#ffb300]/55 font-mono mb-1">
                    {step.label}
                  </p>
                  <h4 className="text-[12px] font-black uppercase tracking-[.05em] text-[#ffb300] mb-2">
                    {step.title}
                  </h4>
                  <p className="text-[11px] text-[#e9eaec]/78 leading-relaxed">{step.desc}</p>
                </div>
              );

              return (
                <div
                  key={i}
                  ref={el => { rowRefs.current[i] = el; }}
                  className="grid items-center py-5"
                  style={{ gridTemplateColumns: '1fr 48px 1fr' }}
                >
                  {isLeft ? (
                    <>
                      <div className="pr-3.5 flex justify-end">{CardEl}</div>
                      {/* empty centre — road + bike live here */}
                      <div ref={el => { nodeRefs.current[i] = el; }} className="w-12" />
                      <div className="pl-3.5 flex justify-start">{mockups[i]}</div>
                    </>
                  ) : (
                    <>
                      <div className="pr-3.5 flex justify-end">{mockups[i]}</div>
                      <div ref={el => { nodeRefs.current[i] = el; }} className="w-12" />
                      <div className="pl-3.5 flex justify-start">{CardEl}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* End badge */}
        <div className="text-center mt-10 pt-6 border-t border-[#2a2e34]/13 mx-4">
          <p className="text-[11px] font-bold tracking-[.1em] uppercase text-[#2a2e34]/40 font-mono flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" />
            You're all set. Ride daily, commute smart.
          </p>
        </div>
      </section>
    </>
  );
}
