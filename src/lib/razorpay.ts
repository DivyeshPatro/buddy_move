// Guarantees the Razorpay Checkout SDK is available before we try to open the
// payment overlay.
//
// The SDK is normally delivered by a <script src="https://checkout.razorpay.com/v1/checkout.js">
// tag in index.html. Relying on that tag alone is fragile:
//   * the tag only exists in the two index.html files — any other host page
//     (embed, storybook, a stale dist/index.html) has no Razorpay at all;
//   * if the CDN request is blocked (offline, ad-blocker, corporate proxy,
//     tracking-protection) the tag fails silently and window.Razorpay is simply
//     never defined;
//   * a classic <script> that 404s produces no error the app can react to.
//
// Callers previously read window.Razorpay once and, when it was missing, took a
// branch that never rendered anything — which is why "Add Funds" appeared to do
// nothing at all. ensureRazorpay() re-injects the script on demand and resolves
// to null (rather than hanging) when the SDK genuinely cannot be loaded, so the
// caller can fall back to the built-in simulation overlay.

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
const LOAD_TIMEOUT_MS = 8000;

let pending: Promise<any | null> | null = null;

export function razorpayReady(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Razorpay;
}

export function ensureRazorpay(): Promise<any | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if ((window as any).Razorpay) return Promise.resolve((window as any).Razorpay);
  if (pending) return pending;

  pending = new Promise<any | null>((resolve) => {
    const done = (v: any | null) => {
      // A failed load must not poison the singleton — the next click retries.
      if (!v) pending = null;
      resolve(v);
    };

    const settleFromWindow = () => done((window as any).Razorpay || null);

    // Reuse the tag from index.html if it is still in flight rather than
    // injecting a duplicate SDK.
    const existing = document.querySelector<HTMLScriptElement>(`script[src^="${CHECKOUT_SRC}"]`);
    const script = existing || document.createElement('script');

    const timer = window.setTimeout(settleFromWindow, LOAD_TIMEOUT_MS);
    const cleanup = () => window.clearTimeout(timer);

    script.addEventListener('load', () => { cleanup(); settleFromWindow(); }, { once: true });
    script.addEventListener('error', () => { cleanup(); done(null); }, { once: true });

    if (!existing) {
      script.src = CHECKOUT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return pending;
}
