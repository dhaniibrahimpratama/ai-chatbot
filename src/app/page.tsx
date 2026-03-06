'use client';

import { useChat } from '@ai-sdk/react';
import { useRef, useState, useEffect } from 'react';

export default function Chat() {
  const sessionId = useRef(crypto.randomUUID()).current;
  const [input, setInput] = useState('');

  useEffect(() => {
  const originalFetch = window.fetch;
  window.fetch = async (input, init) => {
    console.log('fetch intercepted:', input);
    console.log('body:', init?.body);

    if (typeof input === 'string' && input.includes('/api/chat') && init?.body) {
      const body = JSON.parse(init.body as string);
      console.log('injecting sessionId:', sessionId);
      return originalFetch(input, {
        ...init,
        body: JSON.stringify({ ...body, sessionId }),
      });
    }
    return originalFetch(input, init);
  };
  return () => {
    window.fetch = originalFetch;
  };
}, [sessionId]);

  const { messages, sendMessage } = useChat();

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      <h1 className="text-2xl font-bold mb-8 text-center">MagangBot</h1>
      
      {messages.map(message => (
        <div key={message.id} className="whitespace-pre-wrap">
          {message.role === 'user' ? 'User: ' : 'AI: '}
          {message.parts.map((part, i) => {
            switch (part.type) {
              case 'text':
                return <span key={`${message.id}-${i}`}>{part.text}</span>;
              default:
                return null;
            }
          })}
        </div>
      ))}

      <form 
        onSubmit={e => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput('');
        }} 
      >
        <input
          className="fixed dark:bg-zinc-900 bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 dark:border-zinc-800 rounded shadow-xl"
          value={input}
          placeholder="Ketik pesanmu di sini..."
          onChange={e => setInput(e.currentTarget.value)}
        />
      </form>
    </div>
  );
}