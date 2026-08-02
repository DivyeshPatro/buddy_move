import React, { useState, useEffect } from 'react';
import { User, SupportTicket } from '../types';
import { X, LifeBuoy, Send, ShieldAlert, CheckCircle, Info, Loader } from 'lucide-react';

interface SupportModalProps {
  currentUser: User;
  onClose: () => void;
}

export default function SupportModal({ currentUser, onClose }: SupportModalProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchTickets = async () => {
    try {
      const res = await fetch(`/api/support/tickets/${currentUser.id}`);
      const data = await res.json();
      setTickets(data);
    } catch (e) {
      console.error("Support ticketing failure", e);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [currentUser.id]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setErr('');
    if (!subject || !text) {
      setErr('Subject and details are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          subject,
          text,
          senderName: currentUser.name
        })
      });
      const data = await res.json();
      if (data.id) {
        setMsg('Support ticket registered! Customer desk will reply shortly.');
        setSubject('');
        setText('');
        fetchTickets();
      } else {
        setErr('Failed submitting ticket.');
      }
    } catch {
      setErr('Ticketing server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="support_portal_dialog" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div id="support_dialog_box" className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col md:flex-row h-[520px]">
        
        {/* Left column guide */}
        <div className="md:w-[35%] bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 justify-between flex flex-col relative overflow-hidden">
          <div className="space-y-4">
            <div className="bg-white/10 p-2 rounded-xl w-fit">
              <LifeBuoy className="w-5 h-5 text-teal-400" />
            </div>
            <h3 className="font-display font-black text-xl">Safety & Support Hub</h3>
            <p className="text-[10px] text-slate-300 leading-normal">
              Commuter coordination, refund adjustments, identity validation, or emergency notifications. We safeguard your daily commuter circle!
            </p>
          </div>

          <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-[10px] leading-relaxed text-rose-300">
            ⚠️ <span className="font-bold">SOS dispatch rule:</span> Click the Emergency SOS button inside match rides to instantly trigger safety relays.
          </div>
        </div>

        {/* Right column ledger list/entries */}
        <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-3">
            <span className="font-display font-bold text-xs text-slate-800 uppercase tracking-widest">Support Enquiries Desk</span>
            <button id="close_support_btn" onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {err && <div className="p-2.5 bg-rose-50 border border-rose-150 text-rose-700 text-xs font-semibold rounded-xl mb-2">{err}</div>}
          {msg && <div className="p-2.5 bg-emerald-50 border border-emerald-150 text-emerald-700 text-xs font-semibold rounded-xl mb-2">{msg}</div>}

          <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1 mb-3">
            
            {/* Create ticket form */}
            <form onSubmit={handleCreateTicket} className="space-y-2.5 text-xs">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">File a new ticket / dispute</h4>
              <input
                type="text"
                required
                placeholder="Dispute subject (e.g. Pass top-up did not execute)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-teal-500 text-slate-800 focus:bg-white text-xs font-semibold"
              />
              <textarea
                required
                placeholder="Detailed explanations what occurred..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-teal-500 text-slate-800 focus:bg-white text-xs h-16 leading-relaxed"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader className="w-4 h-4 animate-spin text-white" /> : 'Log Dispute Action Ticket'}
              </button>
            </form>

            {/* List historic tickets */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">History Logs tickets ({tickets.length})</h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1 text-[10px]">
                {tickets.map((tk) => (
                  <div key={tk.id} className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg space-y-1.5">
                    <div className="flex justify-between items-center bg-white p-1 rounded border border-slate-150">
                      <span className="font-bold text-slate-700 line-clamp-1">{tk.subject}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono font-bold ${
                        tk.status === 'resolved' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                      }`}>
                        {tk.status}
                      </span>
                    </div>
                    {tk.messages.map((m, mIdx) => (
                      <p key={mIdx} className="text-slate-600 font-medium">
                        <strong>{m.sender}:</strong> {m.text} <span className="text-slate-400 font-normal">({m.time})</span>
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
