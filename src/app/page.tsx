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

export default function Chat() {
  const [currentSessionId, setCurrentSessionId] = useState(crypto.randomUUID());
  const [input, setInput] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [historyMessages, setHistoryMessages] = useState<DBMessage[] | null>(null);
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

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant') {
      fetchSessions();
    }
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
    <div className="flex h-screen bg-black text-white">

      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <button
            onClick={newChat}
            className="w-full py-2 px-4 bg-zinc-700 hover:bg-zinc-600 rounded text-sm font-medium"
          >
            + Chat Baru
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-xs text-zinc-500 px-2 py-1 uppercase tracking-wider">
            Riwayat Obrolan
          </p>
          {sessions.map(session => (
            <button
              key={session.id}
              onClick={() => loadSession(session.id)}
              className={`w-full text-left px-3 py-2 rounded text-sm mb-1 hover:bg-zinc-800 transition-colors ${
                activeSessionId === session.id ? 'bg-zinc-700' : ''
              }`}
            >
              <div className="truncate font-medium">
                {session.title}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {new Date(session.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-zinc-800 text-center font-bold text-lg">
          MagangBot
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {historyMessages ? (
            historyMessages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${
                  msg.role === 'user' ? 'bg-blue-600' : 'bg-zinc-800'
                }`}>
                  <p className="text-xs font-semibold mb-1 opacity-70">
                    {msg.role === 'user' ? 'Kamu' : 'MagangBot'}
                  </p>
                  <MarkdownRenderer content={msg.content} />
                </div>
              </div>
            ))
          ) : (
            messages.map(message => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${
                  message.role === 'user' ? 'bg-blue-600' : 'bg-zinc-800'
                }`}>
                  <p className="text-xs font-semibold mb-1 opacity-70">
                    {message.role === 'user' ? 'Kamu' : 'MagangBot'}
                  </p>
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
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        {!historyMessages ? (
          <div className="p-4 border-t border-zinc-800">
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!input.trim()) return;
                sendMessage({ text: input });
                setInput('');
              }}
              className="flex gap-2"
            >
              <input
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 disabled:opacity-50"
                value={input}
                placeholder={isLoading ? 'MagangBot sedang mengetik...' : 'Ketik pesanmu di sini...'}
                onChange={e => setInput(e.currentTarget.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '...' : 'Kirim'}
              </button>
            </form>
          </div>
        ) : (
          <div className="p-4 border-t border-zinc-800 text-center">
            <button
              onClick={newChat}
              className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm"
            >
              + Mulai Chat Baru
            </button>
          </div>
        )}
      </div>
    </div>
  );
}