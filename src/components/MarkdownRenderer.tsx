import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const markdownComponents = {
  code({ className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    const isInline = !match;

    if (isInline) {
      return (
        <code className="bg-zinc-700 px-1 py-0.5 rounded text-xs font-mono" {...props}>
          {children}
        </code>
      );
    }

    return (
      <SyntaxHighlighter
        style={oneDark}
        language={match[1]}
        PreTag="div"
        className="rounded-lg text-xs my-2"
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    );
  },
  p({ children }: any) {
    return <p className="mb-2 last:mb-0">{children}</p>;
  },
  ul({ children }: any) {
    return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
  },
  ol({ children }: any) {
    return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
  },
  li({ children }: any) {
    return <li className="text-sm">{children}</li>;
  },
  h1({ children }: any) {
    return <h1 className="text-lg font-bold mb-2">{children}</h1>;
  },
  h2({ children }: any) {
    return <h2 className="text-base font-bold mb-2">{children}</h2>;
  },
  h3({ children }: any) {
    return <h3 className="text-sm font-bold mb-1">{children}</h3>;
  },
  strong({ children }: any) {
    return <strong className="font-bold">{children}</strong>;
  },
  blockquote({ children }: any) {
    return (
      <blockquote className="border-l-2 border-zinc-500 pl-3 italic opacity-80 my-2">
        {children}
      </blockquote>
    );
  },
};

export default memo(function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown components={markdownComponents}>
      {content}
    </ReactMarkdown>
  );
});