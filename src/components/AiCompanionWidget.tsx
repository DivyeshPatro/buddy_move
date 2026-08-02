import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, X, Bot, RefreshCw, User as UserIcon } from 'lucide-react';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

export default function AiCompanionWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Message[]>([
    { sender: 'assistant', text: 'Hey commuter! I am your Move Buddy AI Companion. How can I help optimize your ride pool or subscriptions today?' }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const rawMsg = textToSend || message;
    if (!rawMsg.trim()) return;

    const userMsg: Message = { sender: 'user', text: rawMsg };
    setChatHistory(prev => [...prev, userMsg]);
    if (!textToSend) setMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: rawMsg })
      });
      const data = await response.json();
      setChatHistory(prev => [...prev, { sender: 'assistant', text: data.reply || "I am processing. How else can I assist your commute circles?" }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { sender: 'assistant', text: "I'm offline, but I can tell you that joining a commute circle saves up to ₹2500 monthly. Let's get moving!" }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "How do Commute Passes work?",
    "How do I unlock Women Only mode?",
    "AI fare optimization calculation math"
  ];

  return (
    <>
      {/* Floating Chat Trigger Button */}
      <button
        id="ai_companion_floating_btn"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-40 bg-[#ffb300] hover:bg-[#e09d00] text-[#2a2e34] rounded-full p-3.5 shadow-xl hover:shadow-2xl flex items-center gap-2 hover:-translate-y-1 transition-all cursor-pointer font-display font-bold text-sm border border-[#2a2e34]/15"
        aria-label="Move Buddy AI"
      >
        <Sparkles className="w-5 h-5 animate-pulse text-[#2a2e34]" />
        <span className="hidden sm:inline">Move Buddy AI</span>
      </button>

      {/* Slide-out Sidebar or Overlay Panel */}
      {isOpen && (
        <div id="ai_companion_pannel" className="fixed bottom-24 right-3 left-3 sm:left-auto sm:right-6 z-50 w-auto sm:w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-slate-100 bg-white flex flex-col h-[70vh] sm:h-[520px] transition-all animate-fade-in-up">
          {/* Header */}
          <div className="bg-[#ffb300] text-[#2a2e34] p-4 flex items-center justify-between border-b border-[#2a2e34]/15">
            <div className="flex items-center gap-2.5">
              <div className="bg-[#2a2e34]/10 p-1.5 rounded-lg">
                <Bot className="w-5 h-5 text-[#2a2e34]" />
              </div>
              <div>
                <h4 className="font-display font-black text-sm text-[#2a2e34]">Move Buddy Copilot</h4>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2a2e34] animate-ping"></span>
                  <span className="text-[10px] text-[#2a2e34] font-black font-mono">Gemini 3.5 Engine</span>
                </div>
              </div>
            </div>
            <button
              id="close_ai_btn"
              onClick={() => setIsOpen(false)}
              className="text-[#2a2e34]/70 hover:text-[#2a2e34] rounded-lg p-1 hover:bg-[#2a2e34]/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages lists scroll container */}
          <div
            id="chat_list_box"
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 custom-scrollbar"
          >
            {chatHistory.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2 max-w-[85%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div className={`p-1.5 rounded-lg flex items-center justify-center self-start ${
                  m.sender === 'user' ? 'bg-slate-200 text-slate-700' : 'bg-teal-500/10 text-teal-700'
                }`}>
                  {m.sender === 'user' ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-gradient-to-tr from-slate-700 to-slate-800 text-white rounded-tr-none'
                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 mr-auto max-w-[80%] animate-pulse">
                <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="p-3 text-xs text-slate-500 bg-white border border-slate-100 rounded-2xl rounded-tl-none">
                  Move Buddy AI is generating recommendations...
                </div>
              </div>
            )}
          </div>

          {/* Quick suggestions shortcut pill elements */}
          {chatHistory.length === 1 && (
            <div className="p-3 bg-slate-50 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">Ask Suggestion</span>
              <div className="flex flex-col gap-1.5">
                {suggestions.map((s, idx) => (
  <button
    key={idx}
    type="button"
    onClick={() => handleSend(s)}
    className="text-left text-xs bg-white hover:bg-slate-100 text-[#2a2e34] p-2 rounded-xl border border-slate-200/80 transition-colors font-medium cursor-pointer"
  >
                    💡 {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat input box footer */}
          <div className="p-3 border-t border-slate-100 bg-white">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="Type your safety or passing questions..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#ffb300] text-slate-800"
              />
              <button
                type="submit"
                id="send_msg_btn"
                className="bg-[#ffb300] hover:bg-[#e09d00] text-[#2a2e34] p-2.5 rounded-xl cursor-pointer transition-colors border border-[#2a2e34]/15"
                disabled={loading || !message.trim()}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
