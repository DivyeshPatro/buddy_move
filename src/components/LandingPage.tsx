import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bike, 
  Zap, 
  Search, 
  PlusCircle, 
  Sparkles, 
  Calculator, 
  Clock, 
  ShieldCheck,
  Compass,
  ArrowRight
} from 'lucide-react';
import HowItWorks from './HowItWorks';

interface LandingPageProps {
  onStartAuth: (role: 'guest' | 'host') => void;
}

export default function LandingPage({ onStartAuth }: LandingPageProps) {
  const animatedWords = ["Smarter.", "Faster.", "Safer.", "Cheaper.", "Greener."];
  const [wordIndex, setWordIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % animatedWords.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="landing_wrapper" className="bg-[#e9eaec] text-[#2a2e34] min-h-screen transition-colors duration-300">
      
      {/* Hero Section (full-screen, two-column) */}
      <section className="relative px-4 sm:px-6 pt-20 pb-12 sm:py-20 min-h-[90vh] flex items-center justify-center bg-[#e9eaec] overflow-hidden text-[#2a2e34] border-b border-[#2a2e34]/15 transition-colors duration-300">
        
        {/* Dot grid pattern using brand yellow */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,179,0,0.12)_1px,transparent_1px)] bg-[size:16px_16px] opacity-75"></div>
        
        {/* Radial color blobs using only brand yellow */}
        <div className="absolute -bottom-10 left-10 w-72 h-72 sm:w-96 sm:h-96 rounded-full filter blur-[100px] bg-[#ffb300]/15 opacity-70"></div>
        <div className="absolute -top-10 right-10 w-72 h-72 sm:w-[450px] sm:h-[450px] rounded-full filter blur-[120px] bg-[#ffb300]/10 opacity-45"></div>
 
         <div className="relative max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10 px-2">
          
          {/* Left Column */}
          <div className="lg:col-span-6 space-y-6 sm:space-y-7 text-left">

            <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#2a2e34] leading-tight tracking-tight">
              Your Daily Commute,<br />
              <span className="relative inline-flex items-center justify-start h-[1.5em] overflow-hidden select-none align-middle mt-1">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={animatedWords[wordIndex]}
                    initial={{ y: "-100%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                    className="text-[#ffb300] bg-[#2a2e34] px-3 py-1 rounded-xl font-black relative inline-block border border-[#ffb300]/15 whitespace-nowrap"
                  >
                    {animatedWords[wordIndex]}
                    <span className="absolute left-0 bottom-0.5 w-full h-[6px] bg-[#ffb300]/35 rounded-full select-none"></span>
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>
            
             <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={() => onStartAuth('guest')}
                id="cta_find_ride_hero"
                className="bg-[#ffb300] hover:bg-[#ffb300]/90 text-[#2a2e34] font-black py-4.5 px-8 sm:px-10 rounded-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] cursor-pointer shadow-lg font-display text-sm sm:text-base md:text-lg border-2 border-[#2a2e34] uppercase tracking-wider w-full sm:w-auto"
              >
                <Search className="w-5 h-5 stroke-[2.5]" />
                Find a Ride
              </button>
              <button
                onClick={() => onStartAuth('host')}
                id="cta_offer_ride_hero"
                className="bg-[#2a2e34] hover:bg-[#2a2e34]/90 text-[#ffb300] font-black py-4.5 px-8 sm:px-10 rounded-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] cursor-pointer shadow-lg font-display text-sm sm:text-base md:text-lg border-2 border-[#ffb300] tracking-wide w-full sm:w-auto"
              >
                <PlusCircle className="w-5 h-5 text-[#ffb300] stroke-[2.5]" />
                Offer a Ride
              </button>
            </div>
 
             {/* Stat Row */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-6 border-t border-[#2a2e34]/15 max-w-lg">
              <div>
                <strong className="block text-base sm:text-lg font-bold font-display text-[#2a2e34]">10K+</strong>
                <span className="text-[8px] sm:text-[10px] text-[#2a2e34]/70 font-semibold uppercase tracking-wider">Active Riders</span>
              </div>
              <div className="border-l border-[#2a2e34]/15 pl-2 sm:pl-4">
                <strong className="block text-base sm:text-lg font-bold font-display text-[#2a2e34]">₹500</strong>
                <span className="text-[8px] sm:text-[10px] text-[#2a2e34]/70 font-semibold uppercase tracking-wider">Avg. Savings</span>
              </div>
              <div className="border-l border-[#2a2e34]/15 pl-2 sm:pl-4">
                <strong className="block text-base sm:text-lg font-bold font-display text-[#2a2e34]">4.9★</strong>
                <span className="text-[8px] sm:text-[10px] text-[#2a2e34]/70 font-semibold uppercase tracking-wider">App Rating</span>
              </div>
            </div>
          </div>

          {/* Right Column - Phone Mockup in strict palette colors */}
          <div className="lg:col-span-6 relative flex justify-center items-center py-6 sm:py-0">
            {/* Radial yellow glow */}
            <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-[#ffb300]/20 filter blur-3xl animate-pulse"></div>
            
            {/* Elegant Phone Mockup frame */}
            <div className="relative w-64 h-[460px] sm:w-72 sm:h-[550px] bg-[#2a2e34] border-4 sm:border-8 border-[#e9eaec]/20 rounded-[36px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col p-2 sm:p-3 z-10">
              {/* Speaker Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-3.5 bg-[#e9eaec]/10 rounded-full z-20 flex items-center justify-center">
                <div className="w-6 h-1 bg-[#2a2e34] rounded-full"></div>
              </div>
              
              {/* Internal Screen Content */}
              <div className="flex-1 bg-[#e9eaec] rounded-[24px] sm:rounded-[28px] overflow-hidden p-2.5 sm:p-3 mt-1.5 relative flex flex-col justify-between text-[#2a2e34]">
                {/* Simulated Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#2a2e34]/15">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-[#2a2e34] flex items-center justify-center p-1 text-[#e9eaec]">
                      <Bike className="w-3 h-3 text-[#ffb300]" />
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-black tracking-tighter uppercase text-[#2a2e34]">Move Buddy</span>
                  </div>
                  <span className="bg-[#2a2e34] text-[#ffb300] text-[6px] sm:text-[7px] font-black px-1.5 py-0.5 rounded-full">LIVE TRACKING</span>
                </div>

                {/* Match Bubble Visuals */}
                <div className="space-y-3 my-auto">
                  <div className="bg-[#e9eaec] p-2 sm:p-2.5 rounded-xl border border-[#2a2e34]/30 shadow-sm space-y-1.5">
                    <div className="flex justify-between items-center bg-[#ffb300]/30 p-1 rounded font-mono text-[6px] sm:text-[8px]">
                      <span className="text-[#2a2e34]/70 font-bold">BIKE MATCH SCORE</span>
                      <span className="font-extrabold text-[#2a2e34]">98% Route Match</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-[#2a2e34]/20" alt="Saurav Host" />
                      <div>
                        <h4 className="text-[8px] sm:text-[9px] font-bold text-[#2a2e34] flex items-center gap-0.5">
                          Saurav Sharma
                          <span className="w-2.5 h-2.5 bg-[#ffb300] text-[#2a2e34] rounded-full text-[6px] font-bold inline-flex items-center justify-center" title="verified client">✓</span>
                        </h4>
                        <p className="text-[6px] sm:text-[7px] text-[#2a2e34]/70 font-bold font-mono">Yamaha FZ • WB-02-AK-5544</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#2a2e34] text-[#e9eaec] p-2 sm:p-2.5 rounded-xl shadow-sm space-y-1 border border-[#ffb300]/20">
                    <div className="flex justify-between items-center text-[7px] text-[#ffb300] font-black font-mono">
                      <span>BIKE PARTNER LOCKED</span>
                      <span>15-Day Commuter Plan</span>
                    </div>
                    <p className="text-[8px] sm:text-[9px] font-bold leading-tight text-[#e9eaec]">
                      Saurav is your dedicated commuter partner. Locks coordinates safely with double-helmet protection.
                    </p>
                  </div>
                </div>

                {/* Mini Stats Card inside phone screen */}
                <div className="bg-[#e9eaec] border border-[#2a2e34]/30 rounded-xl p-2 text-center shadow-sm">
                  <span className="text-[6px] sm:text-[7px] text-[#2a2e34]/70 uppercase tracking-widest block font-bold">Verified monthly savings</span>
                  <strong className="text-[#2a2e34] text-xs font-black">₹1,850 saved/mo via Bike Share</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Animated Scroll Hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 select-none opacity-80 cursor-pointer">
          <span className="text-[8px] sm:text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold animate-pulse">Scroll to Explore</span>
          <div className="relative w-[2px] h-8 sm:h-10 bg-slate-700/50 rounded-full overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-[#ffb300] rounded-full animate-[scroll_2s_infinite]"></div>
          </div>
        </div>
      </section>

      {/* Style overrides for custom scroll animation */}
      <style>{`
        @keyframes scroll {
          0% { transform: translateY(-100%); }
          80% { transform: translateY(100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
      `}</style>

      {/* Features Section (strict palette colors - bg-[#2a2e34] for high contrast block alternate) */}
      <section id="features" className="py-16 sm:py-20 bg-[#2a2e34] text-[#e9eaec] border-y border-[#ffb300]/15 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12 sm:mb-16">
            <span className="text-xs font-bold text-[#2a2e34] tracking-widest uppercase font-mono bg-[#ffb300] px-3 py-1 rounded-full">
              Simplify Your Daily Journey
            </span>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[#ffb300] tracking-tight">
              Ecosystem Crafted for Seamless Bike Rides
            </h2>
            <p className="text-[#e9eaec]/85 text-xs sm:text-sm">
              Stop stressing over volatile taxi surge rates or last-minute auto cancellations. Join Kolkata's premium two-wheeler peer subscription system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Card 1: Smart Matching (AI algorithm - styled as elegant silver pop card) */}
            <div className="group hover:scale-[1.02] transform transition-all cursor-pointer bg-[#e9eaec] border border-[#2a2e34]/20 p-6 rounded-2xl shadow-lg text-[#2a2e34]">
              <div className="bg-[#2a2e34] text-[#ffb300] p-3 rounded-xl w-fit mb-4 group-hover:bg-[#ffb300] group-hover:text-[#2a2e34] transition-colors border border-[#e9eaec]/10">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="font-display font-bold text-base sm:text-lg text-[#2a2e34] mb-2">Smart Matching</h3>
              <p className="text-xs text-[#2a2e34]/85 leading-relaxed font-semibold">
                Our smart routing algorithm pairs verified office colleagues or campus peers sharing similar timing corridors and destinations.
              </p>
            </div>

            {/* Card 2: Live Expense Calc (styled as elegant silver pop card) */}
            <div className="group hover:scale-[1.02] transform transition-all cursor-pointer bg-[#e9eaec] border border-[#2a2e34]/20 p-6 rounded-2xl shadow-lg text-[#2a2e34]">
              <div className="bg-[#2a2e34] text-[#ffb300] p-3 rounded-xl w-fit mb-4 group-hover:bg-[#ffb300] group-hover:text-[#2a2e34] transition-colors border border-[#e9eaec]/10">
                <Calculator className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="font-display font-bold text-base sm:text-lg text-[#2a2e34] mb-2">Live Expense Calc</h3>
              <p className="text-xs text-[#2a2e34]/85 leading-relaxed font-semibold">
                Fare optimization displays transparent, optimized fare structures. Splitting costs is performed automatically based on route distances.
              </p>
            </div>

            {/* Card 3: Flexible Plans (styled as elegant silver pop card) */}
            <div className="group hover:scale-[1.02] transform transition-all cursor-pointer bg-[#e9eaec] border border-[#2a2e34]/15 p-6 rounded-2xl shadow-lg text-[#2a2e34]">
              <div className="bg-[#2a2e34] text-[#ffb300] p-3 rounded-xl w-fit mb-4 group-hover:bg-[#ffb300] group-hover:text-[#2a2e34] transition-colors border border-[#e9eaec]/10">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="font-display font-bold text-base sm:text-lg text-[#2a2e34] mb-2">Flexible Plans</h3>
              <p className="text-xs text-[#2a2e34]/85 leading-relaxed font-semibold">
                Choose structured commuter pass plans (7, 15, or 30 days) to lock in massive discounts and guarantee daily commute availability.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* How It Works — vertical timeline (themed: #ffb300 / #2a2e34 / #e9eaec) */}
      <HowItWorks />

      {/* CTA Section (strict palette colors) */}
      <section id="cta-section" className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="relative rounded-[28px] sm:rounded-[32px] overflow-hidden bg-[#2a2e34] text-[#e9eaec] p-6 sm:p-14 text-center border-2 border-[#ffb300]/40 shadow-xl transition-colors duration-300">
          
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-[#ffb300]/10 blur-[80px]"></div>
          
          <div className="relative z-10 max-w-3xl mx-auto space-y-5 sm:space-y-6">
            <h2 className="font-display text-xl sm:text-4xl lg:text-5xl font-black text-[#ffb300] leading-tight">
              Ready to Upgrade Your Daily Commute?
            </h2>
            <p className="text-[#e9eaec]/85 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto text-center font-normal">
              Join thousands of daily riders locking in reliable, certified commutes with friendly neighborhood companions. Reduce carbon emissions, split expenses rationally, and commuting becomes seamless.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-3">
              <button
                type="button"
                onClick={() => onStartAuth('guest')}
                className="bg-[#ffb300] hover:bg-[#ffb300]/95 text-[#2a2e34] font-extrabold py-3 px-6 sm:px-8 rounded-xl transition-all hover:scale-[1.02] cursor-pointer text-xs sm:text-sm uppercase tracking-wider shadow border border-[#2a2e34]/20"
              >
                Get Started Free
              </button>
              <button
                type="button"
                onClick={() => onStartAuth('host')}
                className="bg-transparent hover:bg-[#e9eaec]/10 text-[#e9eaec] font-bold py-3 px-6 sm:px-8 rounded-xl transition-all hover:scale-[1.02] cursor-pointer text-xs sm:text-sm border-2 border-[#e9eaec]/60 tracking-wide"
              >
                Become a Partner Host
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer (strict palette colors) */}
      <footer className="bg-[#2a2e34] text-[#e9eaec] pt-10 pb-6 border-t border-[#ffb300]/15 text-xs text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="bg-[#ffb300] p-1.5 rounded-lg text-[#2a2e34]">
                <Bike className="w-4 h-4 text-[#2a2e34]" />
              </div>
              <span className="font-display font-black tracking-tighter text-base text-[#e9eaec]">Move Buddy</span>
            </div>
            <p className="text-[11px] text-[#e9eaec]/80 leading-relaxed">
              Kolkata's top student & corporate bike commute companion platform. Connecting guests securely with one-to-one dedicated motorcycle riders for smooth daily transit.
            </p>
          </div>
          <div>
            <h4 className="font-display font-bold text-[11px] text-[#ffb300] uppercase tracking-wide mb-3">Office Corridors</h4>
            <ul className="space-y-1.5 text-[#e9eaec]/70 font-medium">
              <li>• Sector V IT Zone, Salt Lake</li>
              <li>• New Town DLF / Ecospace Corridors</li>
              <li>• Medical College & College Street Campus</li>
              <li>• Jadavpur and South Kolkata Areas</li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-bold text-[11px] text-[#ffb300] uppercase tracking-wide mb-3">Safety & Protocols</h4>
            <ul className="space-y-1.5 text-[#e9eaec]/70 font-medium">
              <li>• Locked-in Ride Partners</li>
              <li>• Double Helmet Guarantee (Rider + Guest)</li>
              <li>• Instant SOS Emergency Dispatch</li>
              <li>• Real-Time GPS Bike Tracking</li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-bold text-[11px] text-[#ffb300] uppercase tracking-wide mb-3">Subscription Plans</h4>
            <ul className="space-y-1.5 text-[#e9eaec]/70 font-medium">
              <li>• 7-Day Commuter Essentials</li>
              <li>• 15-Day Campus Pass</li>
              <li>• Monthly Premium Corporate Pass</li>
              <li>• Secure Razorpay Simulation</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 border-t border-[#e9eaec]/10 text-center text-[10px] text-[#e9eaec]/50 font-semibold font-mono">
          Move Buddy Subscription Transit Network © 2026. Designed for sustainable two-wheeler travel. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}
