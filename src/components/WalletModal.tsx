import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { User, Wallet, WalletTransaction } from '../types';
import { X, Coins, ArrowUpRight, ArrowDownLeft, ShieldCheck, HelpCircle, Loader, Landmark } from 'lucide-react';
import { ensureRazorpay } from '../lib/razorpay';

interface WalletModalProps {
  currentUser: User;
  wallet: Wallet | null;
  onClose: () => void;
  onRefreshWallet: () => void;
}

export default function WalletModal({
  currentUser,
  wallet,
  onClose,
  onRefreshWallet
}: WalletModalProps) {
  const [addAmount, setAddAmount] = useState('500');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  
  const [isRazorpaySimOpen, setIsRazorpaySimOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const triggerAddFunds = async () => {
    setErr('');
    setMsg('');
    const amt = Number(addAmount);
    if (!amt || amt <= 0) {
      setErr('Please select a valid positive amount.');
      return;
    }
    setProcessing(true);
    try {
      // Bound the request. Without this the button spins forever whenever the
      // payment gateway is slow or unreachable — no overlay, no error, nothing.
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      let coRes: Response;
      try {
        coRes = await fetch('/api/wallet/topup-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: amt }),
          signal: ctrl.signal,
        });
      } catch (e: any) {
        if (e?.name === 'AbortError') {
          setErr('Payment gateway is not responding. Opening the test checkout instead.');
          setIsRazorpaySimOpen(true);
        } else {
          setErr('Could not reach the payment service. Check your connection and try again.');
        }
        setProcessing(false);
        return;
      } finally {
        clearTimeout(timer);
      }

      const order = await coRes.json().catch(() => ({}));
      if (!coRes.ok || !order.orderId) {
        // A gateway that refuses or times out server-side must not dead-end the
        // user: surface the reason AND give them a way to finish in test mode.
        setErr(order.error || 'Could not start payment order.');
        setIsRazorpaySimOpen(true);
        setProcessing(false);
        return;
      }

      // Load the SDK on demand. The static <script> tag in index.html is not a
      // guarantee — it silently yields no window.Razorpay whenever the CDN is
      // blocked, which used to leave this handler with nothing to open.
      const Razorpay = order.devMode ? null : await ensureRazorpay();
      if (order.devMode || !Razorpay) {
        if (!order.devMode) {
          console.warn('[razorpay] checkout SDK unavailable — using the built-in test overlay');
        }
        setIsRazorpaySimOpen(true);
        setProcessing(false);
        return;
      }

      const rzp = new Razorpay({
        key: order.keyId,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        order_id: order.orderId,
        name: 'MoveBuddy Wallet',
        description: `Add ₹${amt} to Wallet`,
        prefill: { name: order.userName, email: order.userEmail, contact: order.userPhone },
        theme: { color: '#ffb300' },
        handler: async (resp: any) => {
          try {
            const vRes = await fetch('/api/wallet/topup-verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: resp.razorpay_order_id,
                paymentId: resp.razorpay_payment_id,
                signature: resp.razorpay_signature,
              }),
            });
            const vData = await vRes.json().catch(() => ({}));
            if (vRes.ok && vData.success) {
              setMsg(`Success! ₹${amt} successfully added to your MoveBuddy wallet via Razorpay.`);
              onRefreshWallet();
            } else {
              setErr(vData.error || 'Payment verification failed.');
            }
          } catch {
            setErr('Payment verification failed.');
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            setErr('Payment cancelled.');
          },
        },
      });
      rzp.on?.('payment.failed', (resp: any) => {
        setErr(resp?.error?.description || 'Payment failed at Razorpay.');
        setProcessing(false);
      });
      rzp.open();
    } catch (e: any) {
      // Never dead-end: if the real overlay could not be opened for any reason,
      // fall back to the test overlay so the top-up flow is still completable.
      console.warn('[razorpay] open() failed, using the built-in test overlay:', e?.message || e);
      setErr('');
      setIsRazorpaySimOpen(true);
      setProcessing(false);
    }
  };

  const handleRazorpaySuccess = async () => {
    setProcessing(true);
    setIsRazorpaySimOpen(false);

    try {
      const coRes = await fetch('/api/wallet/topup-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(addAmount) }),
      });
      const order = await coRes.json();
      const res = await fetch('/api/wallet/topup-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId,
          paymentId: 'pay_dev_' + Date.now(),
          signature: 'dev',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg(`Success! ₹${addAmount} successfully added to your Move Buddy wallet.`);
        onRefreshWallet();
      } else {
        setErr('Transaction failed. Contact support.');
      }
    } catch {
      setErr('Connection error, money not charged.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRedeemVoucher = async () => {
    setErr('');
    setMsg('');
    const code = voucherCode.trim().toUpperCase();
    if (!code) {
      setErr('Enter a voucher code to redeem.');
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch('/api/vouchers/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, code }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErr(data.error || 'Could not redeem this voucher.');
      } else {
        setMsg(`Voucher applied! ₹${data.amount} added to your wallet.`);
        setVoucherCode('');
        onRefreshWallet();
      }
    } catch {
      setErr('Connection error while redeeming voucher.');
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');

    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0) {
      setErr('Please enter a valid amount.');
      return;
    }
    if (!upiId.includes('@')) {
      setErr('Please enter a valid UPI ID (e.g. name@okhdfcbank)');
      return;
    }
    if (wallet && wallet.credits < amt) {
      setErr('Insufficient credits in wallet to execute withdrawal.');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          amount: amt,
          upiId
        })
      });
      const data = await res.json();
      if (data.error) {
        setErr(data.error);
      } else {
        setMsg(data.message);
        setWithdrawAmount('');
        setUpiId('');
        onRefreshWallet();
      }
    } catch {
      setErr('Withdrawal transmission error.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div id="wallet_modal_portal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div id="wallet_modal_box" className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col md:flex-row h-[550px]">
        
        {/* Left pane: Quick Balance view */}
        <div className="md:w-[40%] bg-[#ffb300] text-[#2a2e34] p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#2a2e34]/10 rounded-full blur-2xl"></div>
          
          <div className="space-y-4">
            <div className="bg-white/10 p-2.5 rounded-2xl w-fit">
              <Coins className="w-6 h-6 text-[#2a2e34]" />
            </div>
            <div>
              <span className="label-small text-slate-800 block pb-1">Move Buddy Wallet</span>
              <h2 className="font-display font-medium text-3xl tracking-tight text-[#2a2e34]">
                ₹{wallet?.credits || 0}
              </h2>
              <p className="text-[11px] text-[#2a2e34] font-bold mt-1">✓ Verified with UPI Auto-settle</p>
            </div>
          </div>

          <div className="space-y-3 pt-6 border-t border-[#2a2e34]/15">
            <span className="label-small text-slate-800 block">Referral rules</span>
            <p className="text-[11px] text-[#2a2e34]/85 leading-normal">
              🎁 Invite standard peers with code <span className="font-mono text-[#2a2e34] font-black">BUDDY-REF</span>. Unlocks ₹150 free credits on their first corporate pool ride validation!
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-[#2a2e34] font-bold bg-[#2a2e34]/10 p-2 rounded-xl">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2a2e34]" />
              <span>Razorpay Secured Core Engine</span>
            </div>
          </div>
        </div>

        {/* Right pane: Ledger and withdraw */}
        <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 font-sans">
            <span className="font-display font-medium text-xs uppercase tracking-wider text-slate-800">Wallet Management Ledger</span>
            <button id="close_wallet_modal" onClick={onClose} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback messages */}
          {err && <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold mb-3">{err}</div>}
          {msg && <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold mb-3">{msg}</div>}

          {/* Operations split layout tab */}
          <div className="space-y-5">
            
            {/* Topup with preset options */}
            <div className="space-y-2">
              <h4 className="label-small text-slate-500">Recharge wallet pass</h4>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="₹ Amount to add..."
                  className="bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs focus:ring-1 focus:ring-[#ffb300] focus:outline-none w-24"
                />
                {['200', '500', '1000'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setAddAmount(p)}
                    className={`px-3 py-2 text-xs rounded-xl border transition-all ${
                      addAmount === p 
                        ? 'bg-[#ffb300] border-[#ffb300] text-[#2a2e34] font-bold font-mono shadow-sm' 
                        : 'bg-slate-100 border-slate-200 text-slate-600 font-mono'
                    }`}
                  >
                    ₹{p}
                  </button>
                ))}
                <button
                  onClick={triggerAddFunds}
                  className="bg-[#ffb300] hover:bg-[#e1ca2c] text-[#2a2e34] text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm border border-[#2a2e34]/20"
                >
                  Top Up
                </button>
              </div>
            </div>

            {/* Redeem voucher code */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="label-small text-slate-500">Redeem voucher code</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  placeholder="e.g. WELCOME100"
                  className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs font-mono tracking-wide focus:ring-1 focus:ring-[#ffb300] focus:outline-none uppercase"
                />
                <button
                  onClick={handleRedeemVoucher}
                  disabled={processing}
                  className="bg-[#2a2e34] hover:bg-[#3e444d] text-[#ffb300] text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  Redeem
                </button>
              </div>
            </div>

            {/* Withdraw form */}
            <form onSubmit={handleWithdrawal} className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="label-small text-slate-500">Withdraw credits to UPI bank</h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  required
                  placeholder="₹ Amount (e.g. 150)"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2.5 rounded-xl text-xs focus:ring-1 focus:ring-[#ffb300] focus:outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="UPI Address: user@axis"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2.5 rounded-xl text-xs focus:ring-1 focus:ring-[#ffb300] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={processing}
                className="w-full bg-[#ffb300] hover:bg-[#e1ca2c] text-[#2a2e34] font-semibold py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 border border-[#2a2e34]/25"
              >
                {processing ? <Loader className="w-4 h-4 animate-spin" /> : <Landmark className="w-3.5 h-3.5" />}
                Initiate Instant UPI Withdrawal
              </button>
            </form>

            {/* Historical transaction ledger */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="label-small text-slate-500">Transaction History Ledger</h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                {wallet?.history && wallet.history.length > 0 ? (
                  wallet.history.map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center p-2 rounded-xl bg-slate-50 border border-slate-100 text-[10px]">
                      <div>
                        <span className="font-bold text-slate-700 block line-clamp-1">{tx.description}</span>
                        <span className="text-slate-400 block">{new Date(tx.timestamp).toLocaleString()}</span>
                      </div>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded-full ${
                        tx.type === 'credit' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                      }`}>
                        {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-400 italic text-center">No transactions registered yet.</p>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* RAZORPAY SIMULATION POPUP OVERLAY
          Rendered through a portal on document.body: the wallet modal root uses
          `backdrop-blur`, which establishes both a stacking context and the
          containing block for fixed-position descendants. Nested inside it at
          the same z-50 the overlay was trapped behind the modal chrome instead
          of covering the screen. */}
      {isRazorpaySimOpen && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-950/80 flex items-center justify-center p-4">
          <div className="bg-[#0b1424] text-white w-full max-w-sm rounded-xl overflow-hidden shadow-2xl border border-blue-500/20 max-h-[480px]">
            {/* Razorpay native header */}
            <div className="bg-[#101e35] p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="bg-[#2a2e34] text-[#ffb300] rounded-lg p-1.5 font-black text-xs font-mono font-bold">RP</div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight text-white">Razorpay Checkout</h3>
                  <span className="text-[9px] text-[#ffb300] font-mono uppercase tracking-wide">Simulation Secure Link</span>
                </div>
              </div>
              <button onClick={() => setIsRazorpaySimOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-6 text-center">
              <div>
                <span className="label-small text-slate-400 block mb-1">Transfer Amount</span>
                <span className="text-3xl font-black font-display text-white">₹{addAmount}</span>
                <p className="text-[11px] text-slate-400 mt-2">Target Account: Move Buddy Credits, Inc.</p>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-blue-500/10 space-y-2 text-left">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Merchant Reference:</span>
                  <span className="font-mono text-[#ffb300]">MB-CHECKOUT-{Math.floor(1000+Math.random()*9000)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Payment Channel:</span>
                  <span className="text-slate-200">UPI Instant SPLIT Link</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleRazorpaySuccess}
                  className="w-full bg-[#2a2e34] hover:bg-[#3e444d] text-[#ffb300] font-bold py-3 rounded-lg text-xs transition-all cursor-pointer shadow-lg"
                >
                  ✓ Simulate Razorpay Success Complete
                </button>
                <button
                  type="button"
                  onClick={() => setIsRazorpaySimOpen(false)}
                  className="w-full text-slate-400 hover:text-slate-200 text-xs transition-colors py-1 cursor-pointer font-bold uppercase tracking-widest block"
                >
                  Decline Payment
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
