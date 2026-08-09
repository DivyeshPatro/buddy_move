// Razorpay checkout flow: create a server-side order, open the Razorpay modal,
// then verify the signature server-side (which activates the subscription).
// The global fetch interceptor (lib/api) attaches the JWT automatically.
import { ensureRazorpay } from './razorpay';

export interface CheckoutResult {
  success: boolean;
  subscription?: any;
  matches?: any[];
  error?: string;
}

interface CheckoutParams {
  planName: '7-Day Plan' | '15-Day Plan' | 'Monthly Plan';
  role: 'guest' | 'host';
  distanceKm?: number;
  // Subscription details passed through to /verify so the sub is created with the route:
  subDetails: Record<string, unknown>;
}

async function verify(orderId: string, paymentId: string, signature: string, params: CheckoutParams): Promise<CheckoutResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId, paymentId, signature,
        planName: params.planName, role: params.role, distanceKm: params.distanceKm,
        ...params.subDetails,
      }),
      signal: ctrl.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) return { success: false, error: body.error || 'Payment verification failed' };
    return { success: true, subscription: body.subscription, matches: body.matches };
  } catch (e: any) {
    if (e?.name === 'AbortError') return { success: false, error: 'Payment verification timed out — please try again' };
    return { success: false, error: e?.message || 'Payment verification failed' };
  } finally {
    clearTimeout(timer);
  }
}

export async function startCheckout(params: CheckoutParams): Promise<CheckoutResult> {
  // 1) Create the order (amount is computed server-side). Bounded: an
  // unreachable gateway must surface an error rather than hang the plan flow.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  let coRes: Response;
  try {
    coRes = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planName: params.planName, role: params.role, distanceKm: params.distanceKm }),
      signal: ctrl.signal,
    });
  } catch (e: any) {
    return {
      success: false,
      error: e?.name === 'AbortError'
        ? 'Payment gateway is not responding — please try again in a moment'
        : 'Could not reach the payment service',
    };
  } finally {
    clearTimeout(timer);
  }
  const order = await coRes.json().catch(() => ({}));
  if (!coRes.ok || !order.orderId) return { success: false, error: order.error || 'Could not start payment' };

  // Load the SDK on demand rather than trusting the static <script> tag, which
  // yields no window.Razorpay whenever the CDN request is blocked.
  const Razorpay = order.devMode ? null : await ensureRazorpay();

  // 2a) Dev fallback (no live keys / SDK) — verify directly so the flow still works.
  if (order.devMode || !Razorpay) {
    return verify(order.orderId, 'pay_dev_' + Date.now(), 'dev', params);
  }

  // 2b) Real Razorpay modal.
  return new Promise<CheckoutResult>((resolve) => {
    const rzp = new Razorpay({
      key: order.keyId,
      amount: Math.round(order.amount * 100),
      currency: order.currency,
      order_id: order.orderId,
      name: 'MoveBuddy',
      description: params.planName,
      prefill: { name: order.userName, email: order.userEmail, contact: order.userPhone },
      theme: { color: '#ffb300' },
      handler: async (resp: any) => {
        const v = await verify(resp.razorpay_order_id, resp.razorpay_payment_id, resp.razorpay_signature, params);
        resolve(v);
      },
      modal: { ondismiss: () => resolve({ success: false, error: 'Payment cancelled' }) },
    });
    rzp.on?.('payment.failed', (resp: any) =>
      resolve({ success: false, error: resp?.error?.description || 'Payment failed at Razorpay' }));
    try {
      rzp.open();
    } catch (e: any) {
      // Throwing inside the executor would reject with an opaque error and the
      // caller would see no overlay and no message. Surface it instead.
      resolve({ success: false, error: e?.message || 'Could not open Razorpay checkout' });
    }
  });
}
