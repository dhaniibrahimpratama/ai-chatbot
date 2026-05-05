'use client';

import { useChat } from '@ai-sdk/react';
import { useRef, useState, useEffect, useCallback } from 'react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { logout } from '@/app/actions';
import Link from 'next/link';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [ragEnabled, setRagEnabled] = useState(true);
  const [ragSources, setRagSources] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      if (typeof input === 'string' && input.includes('/api/chat') && init?.body) {
        const body = JSON.parse(init.body as string);
        const response = await originalFetch(input, {
          ...init,
          body: JSON.stringify({ ...body, sessionId: currentSessionId, ragEnabled }),
        });

        const sources = response.headers.get('X-RAG-Sources');
        if (sources) setRagSources(sources.split(',').filter(Boolean));
        else setRagSources([]);
        return response;
      }
      return originalFetch(input, init);
    };
    return () => { window.fetch = originalFetch; };
  }, [currentSessionId, ragEnabled]);

  const { messages, setMessages, sendMessage, status } = useChat();
  const isLoading = status === 'streaming' || status === 'submitted';

  const fetchSessions = useCallback(async () => {
    const res = await fetch('/api/sessions');
    const data = await res.json();
    setSessions(data);
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  useEffect(() => {
    if (status === 'ready') {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'assistant') fetchSessions();
    }
  }, [status, fetchSessions, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, historyMessages]);

  async function loadSession(id: string) {
    setActiveSessionId(id);
    setCurrentSessionId(id);
    const res = await fetch(`/api/messages?sessionId=${id}`);
    const data = await res.json();
    const formattedMessages = data.map((msg: any) => ({
      id: msg.id, role: msg.role, content: msg.content,
      parts: [{ type: 'text', text: msg.content }]
    }));
    setMessages(formattedMessages as any);
    setHistoryMessages(null);
  }

  function newChat() {
    setActiveSessionId(null);
    setHistoryMessages(null);
    setMessages([]);
    setRagSources([]);
    setCurrentSessionId(crypto.randomUUID());
  }

  async function deleteSession(id: string) {
    await fetch('/api/sessions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (activeSessionId === id) newChat();
    fetchSessions();
  }

  async function renameSession(id: string) {
    if (!editingTitle.trim()) return;
    await fetch('/api/sessions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, title: editingTitle }) });
    setEditingId(null);
    setEditingTitle('');
    fetchSessions();
  }

  function exportChat() {
    const currentMessages = historyMessages ?? messages.map(m => ({
      role: m.role,
      content: m.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') ?? '',
    }));
    if (currentMessages.length === 0) return;

    const text = currentMessages.map((m: any) =>
      `[${m.role === 'user' ? 'Kamu' : 'MagangBot'}]\n${m.content}\n`
    ).join('\n---\n\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-screen bg-[#0f0f10] text-[#ececec] relative overflow-hidden">

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-72 md:w-64 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:w-0'}
        absolute md:relative z-50 h-full flex-shrink-0 flex flex-col transition-all duration-300 overflow-hidden bg-[#161617] border-r border-white/5`}>

        <div className="p-3 border-b border-white/5">
          <button onClick={newChat} title="Chat baru" aria-label="Chat baru"
            className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/8 rounded-xl text-sm font-medium transition-all">
            + Chat Baru
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-[10px] text-[#444] px-3 py-2 uppercase tracking-widest font-medium">Riwayat Obrolan</p>
          {sessions.map(session => (
            <div key={session.id} className={`group relative flex items-center rounded-xl mb-0.5 transition-all ${activeSessionId === session.id ? 'bg-white/10' : 'hover:bg-white/5'}`}>
              {editingId === session.id ? (
                <div className="flex-1 flex items-center gap-1 px-2 py-1.5">
                  <input autoFocus value={editingTitle} onChange={e => setEditingTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') renameSession(session.id); if (e.key === 'Escape') setEditingId(null); }}
                    className="flex-1 bg-white/10 text-[#ececec] text-[13px] px-2 py-1 rounded-lg focus:outline-none border border-violet-500/40"
                    aria-label="Edit judul" title="Edit judul" />
                  <button onClick={() => renameSession(session.id)} title="Simpan" aria-label="Simpan" className="p-1 hover:text-violet-400 text-[#777]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                  <button onClick={() => setEditingId(null)} title="Batal" aria-label="Batal" className="p-1 hover:text-red-400 text-[#777]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ) : (
                <>
                  <button onClick={() => loadSession(session.id)} title={session.title} aria-label={`Buka: ${session.title}`}
                    className="flex-1 text-left px-3 py-2.5 text-sm min-w-0 pr-14">
                    <div className={`truncate font-medium text-[13px] ${activeSessionId === session.id ? 'text-[#ececec]' : 'text-[#777] group-hover:text-[#ececec]'}`}>
                      {session.title}
                    </div>
                    <div className="text-[11px] text-[#444] mt-0.5">
                      {new Date(session.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </button>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5">
                    <button onClick={() => { setEditingId(session.id); setEditingTitle(session.title); }}
                      title="Rename" aria-label="Rename" className="p-1.5 hover:bg-white/10 rounded-lg text-[#555] hover:text-[#ececec]">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button onClick={() => deleteSession(session.id)}
                      title="Hapus" aria-label="Hapus" className="p-1.5 hover:bg-red-500/10 rounded-lg text-[#555] hover:text-red-400">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Sidebar bottom: profil + dokumen + logout */}
        <div className="p-3 border-t border-white/5 space-y-1">
          <Link href="/profile"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors text-[#777] hover:text-[#ececec] text-sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Profil Saya
          </Link>
          <Link href="/upload"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors text-[#777] hover:text-[#ececec] text-sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Kelola Dokumen
          </Link>
          <form action={logout}>
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-red-500/10 transition-colors text-[#555] hover:text-red-400 text-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Keluar
            </button>
          </form>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-violet-500/10 blur-[130px] rounded-full pointer-events-none z-0" />

        {/* Header */}
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 relative z-10">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
            aria-label={sidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-[#666] hover:text-[#ececec] flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className="flex-1 text-center font-semibold text-[15px]">MagangBot</span>

          {/* Export button */}
          <button onClick={exportChat} title="Export chat" aria-label="Export chat"
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-[#666] hover:text-[#ececec]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>

          {/* RAG toggle */}
          <button onClick={() => setRagEnabled(!ragEnabled)}
            title={ragEnabled ? 'RAG aktif — klik untuk nonaktifkan' : 'RAG nonaktif — klik untuk aktifkan'}
            aria-label={ragEnabled ? 'Nonaktifkan RAG' : 'Aktifkan RAG'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
              ragEnabled
                ? 'bg-violet-500/15 border-violet-500/30 text-violet-400 hover:bg-violet-500/25'
                : 'bg-white/5 border-white/10 text-[#555] hover:bg-white/8'
            }`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            {ragEnabled ? 'RAG ON' : 'RAG OFF'}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Welcome screen */}
          {messages.length === 0 && !historyMessages && (
            <div className="animate-slide-up flex flex-col items-center justify-center h-full text-center px-6 pb-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-6 shadow-xl shadow-violet-900/30">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                </svg>
              </div>
              <h1 className="text-3xl font-semibold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent mb-4 pb-2">
                Halo, selamat datang!
              </h1>
              <p className="text-[#555] text-sm max-w-sm leading-relaxed">
                Saya MagangBot, asisten AI yang siap membantu. Mulai percakapan atau pilih topik di bawah.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-8 max-w-lg">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="px-4 py-2 rounded-full border border-white/10 text-sm text-[#888] hover:bg-white/5 hover:text-[#ececec] hover:border-white/20 transition-all">
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
                  msg.role === 'user' ? 'bg-white/10 border border-white/10 text-[#aaa]' : 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white'
                }`}>{msg.role === 'user' ? 'U' : 'M'}</div>
                <div className={`max-w-[75%] text-[15px] leading-loose rounded-2xl px-4 py-3 ${
                  msg.role === 'user' ? 'bg-white/8 border border-white/8 rounded-tr-sm text-[#e0e0e0]' : 'bg-transparent text-[#d0d0d0]'
                }`}>
                  <MarkdownRenderer content={msg.content} />
                </div>
              </div>
            ))
          ) : (
            messages.map((message, idx) => (
              <div key={message.id}>
                <div className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5 ${
                    message.role === 'user' ? 'bg-white/10 border border-white/10 text-[#aaa]' : 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white'
                  }`}>{message.role === 'user' ? 'U' : 'M'}</div>
                  <div className={`max-w-[75%] text-[15px] leading-loose rounded-2xl px-4 py-3 ${
                    message.role === 'user' ? 'bg-white/8 border border-white/8 rounded-tr-sm text-[#e0e0e0]' : 'bg-transparent text-[#d0d0d0]'
                  }`}>
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case 'text': return <MarkdownRenderer key={i} content={part.text} />;
                        default: return null;
                      }
                    })}
                  </div>
                </div>

                {/* RAG source indicator — tampil di bawah pesan AI terakhir */}
                {message.role === 'assistant' && idx === messages.length - 1 && ragSources.length > 0 && (
                  <div className="ml-10 mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-[#444]">Sumber:</span>
                    {ragSources.map(src => (
                      <span key={src} className="text-[10px] bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full">
                        📄 {src}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Typing indicator */}
          {isLoading && (
            <div className="animate-slide-up flex gap-3 pl-[40px]">
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
              className="flex gap-2 bg-white/5 backdrop-blur-md shadow-2xl border border-white/10 rounded-2xl px-4 py-3 focus-within:border-violet-500/50 transition-all z-10 relative"
            >
              <input
                className="flex-1 bg-transparent text-sm text-[#ececec] placeholder-[#444] focus:outline-none disabled:opacity-40"
                value={input}
                placeholder={isLoading ? 'MagangBot sedang mengetik...' : 'Ketik pesanmu di sini...'}
                onChange={e => setInput(e.currentTarget.value)}
                disabled={isLoading}
              />
              <button type="submit" title="Kirim pesan" aria-label="Kirim pesan"
                disabled={isLoading || !input.trim()}
                className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 disabled:from-transparent disabled:to-transparent disabled:bg-white/5 disabled:text-[#444] text-white transition-all flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="19" x2="12" y2="5"/>
                  <polyline points="5 12 12 5 19 12"/>
                </svg>
              </button>
            </form>
            <p className="text-[11px] text-[#333] text-center mt-2">
              Enter kirim · Shift+Enter baris baru
              {input.length > 0 && (
                <span className={`ml-3 ${input.length > 800 ? 'text-red-500' : 'text-[#444]'}`}>
                  {input.length} karakter
                </span>
              )}
            </p>
          </div>
        ) : (
          <div className="p-4 border-t border-white/5 text-center">
            <button onClick={newChat} title="Mulai chat baru" aria-label="Mulai chat baru"
              className="px-6 py-2.5 rounded-full border border-white/10 text-sm text-[#888] hover:bg-white/5 hover:text-[#ececec] transition-all">
              + Mulai Chat Baru
            </button>
          </div>
        )}
      </div>
    </div>
  );
}