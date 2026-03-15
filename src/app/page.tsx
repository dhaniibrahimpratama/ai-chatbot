'use client';

import { useChat } from '@ai-sdk/react';
import { useRef, useState, useEffect, useCallback } from 'react';
import MarkdownRenderer from '@/components/MarkdownRenderer';

type DBMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  sessionId: string;
};

type Session = {
  id: string;
  title: string;
  createdAt: string;
};

const SUGGESTIONS = [
  'Jelaskan konsep AI chatbot',
  'Bantu debug kode saya',
  'Buatkan contoh kode python sederhana',
  'Tips belajar programming',
  'Apa itu AI?',
];

export default function Chat() {
  const [currentSessionId, setCurrentSessionId] = useState(crypto.randomUUID());
  const [input, setInput] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [historyMessages, setHistoryMessages] = useState<DBMessage[] | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      if (typeof input === 'string' && input.includes('/api/chat') && init?.body) {
        const body = JSON.parse(init.body as string);
        return originalFetch(input, {
          ...init,
          body: JSON.stringify({ ...body, sessionId: currentSessionId }),
        });
      }
      return originalFetch(input, init);
    };
    return () => { window.fetch = originalFetch; };
  }, [currentSessionId]);

  const { messages, setMessages, sendMessage, status } = useChat();
  const isLoading = status === 'streaming' || status === 'submitted';

  const fetchSessions = useCallback(async () => {
    const res = await fetch('/api/sessions');
    const data = await res.json();
    setSessions(data);
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant') fetchSessions();
  }, [messages, fetchSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, historyMessages]);

  async function loadSession(id: string) {
    setActiveSessionId(id);
    const res = await fetch(`/api/messages?sessionId=${id}`);
    const data = await res.json();
    setHistoryMessages(data);
  }

  function newChat() {
    setActiveSessionId(null);
    setHistoryMessages(null);
    setMessages([]);
    setCurrentSessionId(crypto.randomUUID());
  }

  return (
    <div className="flex h-screen bg-[#0f0f10] text-[#ececec]">

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} flex-shrink-0 flex flex-col transition-all duration-300 overflow-hidden bg-[#161617] border-r border-white/5`}>

        <div className="p-3 border-b border-white/5">
          <button
            onClick={newChat}
            title="Chat baru"
            aria-label="Chat baru"
            className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/8 rounded-xl text-sm font-medium transition-all"
          >
            + Chat Baru
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-[10px] text-[#444] px-3 py-2 uppercase tracking-widest font-medium">
            Riwayat Obrolan
          </p>
          {sessions.map(session => (
            <button
              key={session.id}
              onClick={() => loadSession(session.id)}
              title={session.title}
              aria-label={`Buka: ${session.title}`}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm mb-0.5 transition-all ${
                activeSessionId === session.id
                  ? 'bg-white/10 text-[#ececec]'
                  : 'text-[#777] hover:bg-white/5 hover:text-[#ececec]'
              }`}
            >
              <div className="truncate font-medium text-[13px]">{session.title}</div>
              <div className="text-[11px] text-[#444] mt-0.5">
                {new Date(session.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
            aria-label={sidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-[#666] hover:text-[#ececec] flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className="flex-1 text-center font-semibold text-[15px]">MagangBot</span>
          <div className="w-8" />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Welcome screen */}
          {messages.length === 0 && !historyMessages && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 pb-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-6 shadow-xl shadow-violet-900/30">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                </svg>
              </div>
              <h1 className="text-3xl font-semibold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent mb-4 pb-2">
                Halo, selamat datang!
              </h1>
              <p className="text-[#555] text-sm max-w-sm leading-relaxed">
                Saya MagangBot, asisten AI yang siap membantu Anda. Mulai percakapan atau pilih topik di bawah.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-8 max-w-lg">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="px-4 py-2 rounded-full border border-white/10 text-sm text-[#888] hover:bg-white/5 hover:text-[#ececec] hover:border-white/20 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {historyMessages ? (
            historyMessages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5 ${
                  msg.role === 'user'
                    ? 'bg-white/10 border border-white/10 text-[#aaa]'
                    : 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white'
                }`}>
                  {msg.role === 'user' ? 'U' : 'M'}
                </div>
                <div className={`max-w-[75%] text-[15px] leading-loose rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-white/8 border border-white/8 rounded-tr-sm text-[#e0e0e0]'
                    : 'bg-transparent text-[#d0d0d0]'
                }`}>
                  <MarkdownRenderer content={msg.content} />
                </div>
              </div>
            ))
          ) : (
            messages.map(message => (
              <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5 ${
                  message.role === 'user'
                    ? 'bg-white/10 border border-white/10 text-[#aaa]'
                    : 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white'
                }`}>
                  {message.role === 'user' ? 'U' : 'M'}
                </div>
                <div className={`max-w-[75%] text-[15px] leading-loose rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-white/8 border border-white/8 rounded-tr-sm text-[#e0e0e0]'
                    : 'bg-transparent text-[#d0d0d0]'
                }`}>
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case 'text':
                        return <MarkdownRenderer key={i} content={part.text} />;
                      default:
                        return null;
                    }
                  })}
                </div>
              </div>
            ))
          )}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                M
              </div>
              <div className="flex items-center gap-1.5 px-4 py-3">
                <span className="w-1.5 h-1.5 bg-[#555] rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-[#555] rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-[#555] rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        {!historyMessages ? (
          <div className="px-4 pb-6 pt-3 border-t border-white/5">
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!input.trim()) return;
                sendMessage({ text: input });
                setInput('');
              }}
              className="flex gap-2 bg-[#1a1a1b] border border-white/8 rounded-2xl px-4 py-3 focus-within:border-violet-500/40 transition-colors"
            >
              <input
                className="flex-1 bg-transparent text-sm text-[#ececec] placeholder-[#444] focus:outline-none disabled:opacity-40"
                value={input}
                placeholder={isLoading ? 'MagangBot sedang mengetik...' : 'Ketik pesanmu di sini...'}
                onChange={e => setInput(e.currentTarget.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                title="Kirim pesan"
                aria-label="Kirim pesan"
                disabled={isLoading || !input.trim()}
                className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 disabled:from-transparent disabled:to-transparent disabled:bg-white/5 disabled:text-[#444] text-white transition-all flex-shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="19" x2="12" y2="5"/>
                  <polyline points="5 12 12 5 19 12"/>
                </svg>
              </button>
            </form>
            <p className="text-[11px] text-[#333] text-center mt-2">
              Enter kirim · Shift+Enter baris baru
            </p>
          </div>
        ) : (
          <div className="p-4 border-t border-white/5 text-center">
            <button
              onClick={newChat}
              title="Mulai chat baru"
              aria-label="Mulai chat baru"
              className="px-6 py-2.5 rounded-full border border-white/10 text-sm text-[#888] hover:bg-white/5 hover:text-[#ececec] transition-all"
            >
              + Mulai Chat Baru
            </button>
          </div>
        )}
      </div>
    </div>
  );
}