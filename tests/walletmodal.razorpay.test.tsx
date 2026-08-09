// Regression tests for the "Add Funds" Razorpay overlay.
//
// Two defects made the panel appear to do nothing:
//  1. window.Razorpay was read once; when the CDN script was blocked the branch
//     taken rendered no overlay at all.
//  2. The built-in test overlay was nested inside the wallet modal root, which
//     uses `backdrop-blur` — that element establishes a stacking context AND the
//     containing block for fixed-position descendants, trapping the overlay
//     behind the modal at the same z-50.
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import WalletModal from '../src/components/WalletModal';

const USER: any = { id: 'usr_1', name: 'Test', email: 't@e.com', phone: '+910000000000', role: 'guest' };

function mockApi(orderBody: any, status = 200) {
  const fetchMock = vi.fn(async (url: any) => {
    if (String(url).includes('/api/wallet/topup-order')) {
      return { ok: status < 400, status, json: async () => orderBody } as any;
    }
    if (String(url).includes('/api/wallet/topup-verify')) {
      return { ok: true, status: 200, json: async () => ({ success: true, wallet: { userId: 'usr_1', credits: 500, history: [] } }) } as any;
    }
    throw new Error('unexpected fetch ' + url);
  });
  (globalThis as any).fetch = fetchMock;
  return fetchMock;
}

const renderModal = () =>
  render(<WalletModal currentUser={USER} wallet={{ userId: 'usr_1', credits: 0, history: [] } as any} onClose={vi.fn()} onRefreshWallet={vi.fn()} />);

afterEach(() => {
  cleanup();
  delete (window as any).Razorpay;
  document.querySelectorAll('script').forEach(s => s.remove());
  vi.restoreAllMocks();
});

describe('WalletModal — Add Funds', () => {
  it('opens the test overlay when the backend reports devMode', async () => {
    mockApi({ orderId: 'order_dev_1', devMode: true, amount: 500, currency: 'INR' });
    renderModal();

    fireEvent.click(screen.getByText('Top Up'));

    await waitFor(() => expect(screen.getByText(/Razorpay Checkout/i)).toBeTruthy(), { timeout: 3000 });
  });

  it('renders that overlay OUTSIDE the backdrop-blur modal root (portal to body)', async () => {
    mockApi({ orderId: 'order_dev_1', devMode: true, amount: 500, currency: 'INR' });
    renderModal();

    fireEvent.click(screen.getByText('Top Up'));
    await waitFor(() => expect(screen.getByText(/Razorpay Checkout/i)).toBeTruthy(), { timeout: 3000 });

    const modalRoot = document.getElementById('wallet_modal_portal')!;
    expect(modalRoot).toBeTruthy();
    // backdrop-blur on the root is what created the trapping stacking context
    expect(modalRoot.className).toContain('backdrop-blur');

    const overlay = screen.getByText(/Razorpay Checkout/i).closest('div.fixed')!;
    expect(modalRoot.contains(overlay)).toBe(false);
    expect(document.body.contains(overlay)).toBe(true);
  });

  it('still shows an overlay when the Razorpay SDK cannot be loaded', async () => {
    // No window.Razorpay and the injected CDN <script> errors — as when an
    // ad-blocker or proxy drops checkout.js.
    mockApi({ orderId: 'order_live_1', devMode: false, keyId: 'rzp_test_x', amount: 500, currency: 'INR' });
    const origAppend = document.head.appendChild.bind(document.head);
    vi.spyOn(document.head, 'appendChild').mockImplementation((node: any) => {
      const res = origAppend(node);
      if (node.tagName === 'SCRIPT') setTimeout(() => node.dispatchEvent(new Event('error')), 0);
      return res;
    });

    renderModal();
    fireEvent.click(screen.getByText('Top Up'));

    await waitFor(() => expect(screen.getByText(/Razorpay Checkout/i)).toBeTruthy(), { timeout: 5000 });
  });

  it('opens the real Razorpay checkout when the SDK is present', async () => {
    const open = vi.fn();
    (window as any).Razorpay = vi.fn(function (this: any) { this.open = open; this.on = vi.fn(); });
    mockApi({ orderId: 'order_live_2', devMode: false, keyId: 'rzp_test_x', amount: 500, currency: 'INR' });

    renderModal();
    fireEvent.click(screen.getByText('Top Up'));

    await waitFor(() => expect(open).toHaveBeenCalled(), { timeout: 3000 });
    // the real gateway is used, so the simulation overlay must NOT appear
    expect(screen.queryByText(/Simulation Secure Link/i)).toBeNull();
  });
});
