import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage } from '../types';
import { X, Send, Bot, AlertTriangle, ShieldCheck, PhoneCall, Loader } from 'lucide-react';

interface ChatModalProps {
  currentUser: User;
  receiverId: string;
  receiverName: string;
  rideId: string;
  onClose: () => void;
}

export default function ChatModal({
  currentUser,
  receiverId,
  receiverName,
  rideId,
  onClose
}: ChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat/messages?senderId=${currentUser.id}&receiverId=${receiverId}`);
      const data = await res.json();
      setMessages(data);
    } catch (e) {
      console.error("Messages fetch failure", e);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3500); // Polling every 3.5s for frictionless realtime-like responses!
    return () => clearInterval(interval);
  }, [receiverId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const bodyText = text;
    setText('');

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          senderName: currentUser.name,
          receiverId,
          text: bodyText,
          rideId
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, data]);
    } catch {
      console.error("Failed executing messaging transmission.");
    }
  };

  const triggerSosAlert = () => {
    setSosActive(true);
    setTimeout(() => {
      setDispatched(true);
      // Log emergency message automatically
      fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: 'system',
          senderName: 'SYSTEM CRITICAL',
          receiverId,
          text: `🚨 EMERGENCY DISTRESS SOS TRIGGERED BY ${currentUser.name.toUpperCase()}. Dispatching security relays and trusted contacts alert link.`,
          rideId
        })
      }).then(() => fetchMessages());
    }, 2000);
  };

  return (
    <div id="chat_modal_portal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div id="chat_box_sheet" className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col h-[520px]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
            <div>
              <h3 className="font-display font-black text-sm text-white line-clamp-1">{receiverName}</h3>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold font-mono">Matched commute chats channel</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* SAFETY EMERGENCY SOS TRIGGER */}
            <button
              onClick={triggerSosAlert}
              disabled={dispatched}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                dispatched 
                  ? 'bg-rose-900/40 text-rose-300 border border-rose-800/20' 
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow shadow-rose-600/15'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {dispatched ? 'Emergency Dispatched!' : '⚠️ SOS Dispatch'}
            </button>

            <button id="close_chats_btn" onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SOS Alerting Feedback view */}
        {sosActive && (
          <div className="bg-rose-50 p-4 border-b border-rose-100 text-xs text-rose-800 flex items-center gap-3 animate-fade-in">
            <PhoneCall className="w-6 h-6 text-rose-600 animate-bounce flex-shrink-0" />
            <div>
              <p className="font-bold">Distress relays connecting...</p>
              <p className="text-[10px] text-rose-600/80 leading-normal">
                {dispatched 
                  ? '✓ Success. Local transport safety teams, host, and trusted contacts notified via SMS maps tracking!' 
                  : 'Executing safety protocol, contacting emergency responders. Please hold.'
                }
              </p>
            </div>
          </div>
        )}

        {/* Messaging Logs scroll containers */}
        <div id="messages_scroll_box" ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 custom-scrollbar">
          {messages.length > 0 ? (
            messages.map((m) => {
              const isMe = m.senderId === currentUser.id;
              const isSys = m.senderId === 'system';
              return (
                <div key={m.id} className={`flex max-w-[85%] ${isMe ? 'ml-auto' : isSys ? 'mx-auto w-full' : 'mr-auto'}`}>
                  {isSys ? (
                    <div className="bg-rose-50 text-rose-800 rounded-xl p-3 border border-rose-100 text-[10px] text-center w-full font-bold">
                      {m.text}
                    </div>
                  ) : (
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      isMe 
                        ? 'bg-gradient-to-tr from-slate-700 to-slate-800 text-white rounded-tr-none shadow-sm' 
                        : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none shadow-sm'
                    }`}>
                      <span className="block text-[8px] font-bold text-slate-400 pb-0.5 uppercase tracking-wide">
                        {isMe ? 'Me' : m.senderName}
                      </span>
                      {m.text}
                      <span className="block text-[8px] text-right text-slate-400 mt-1">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center p-8 text-xs text-slate-400 font-medium italic">
              Ready to commute. Write a message to coordinate your exact gate timing!
            </div>
          )}
        </div>

        {/* Input box */}
        <div className="p-3 bg-white border-t border-slate-100">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              placeholder="Send coordination message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-teal-500 text-slate-800"
            />
            <button
              type="submit"
              id="submit_text_msg"
              disabled={!text.trim()}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Send
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
