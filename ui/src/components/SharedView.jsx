import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, FileText, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';
import { apiClient } from '../lib/api';

function SharedMarkdown({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-semibold mb-1.5 mt-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold mb-1 mt-2">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
        code: ({ inline, children }) => {
          if (inline) {
            return <code className="bg-white/5 px-1.5 py-0.5 rounded text-[13px] font-mono text-primary/90">{children}</code>;
          }
          return (
            <pre className="bg-black/30 rounded-lg p-3 my-2 overflow-x-auto">
              <code className="text-[13px] font-mono">{children}</code>
            </pre>
          );
        },
        pre: ({ children }) => <>{children}</>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">{children}</a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary/30 pl-3 my-2 text-muted-foreground italic">{children}</blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-2"><table className="text-sm border-collapse w-full">{children}</table></div>
        ),
        th: ({ children }) => <th className="border border-border px-2 py-1 bg-muted/30 text-left font-medium">{children}</th>,
        td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default function SharedView({ shareId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await apiClient.fetchShare(shareId);
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [shareId]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Loading shared content...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-primary hover:underline">
          <ArrowLeft size={14} /> Go to app
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border glass-subtle">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            {data.type === 'session' ? <MessageSquare size={16} className="text-primary" /> : <FileText size={16} className="text-primary" />}
            <h1 className="text-sm font-medium">
              {data.type === 'session' ? data.title : data.filename}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Clock size={10} />
          Shared content
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {data.type === 'session' && (
          <div className="max-w-3xl mx-auto p-6 space-y-4">
            {data.messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex w-full',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[75%]',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'glass rounded-bl-md text-foreground'
                  )}
                >
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="markdown-body">
                      <SharedMarkdown content={msg.content} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {data.type === 'artifact' && (
          <div className="max-w-3xl mx-auto p-6">
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <FileText size={14} className="text-primary" />
                <span className="text-sm font-mono">{data.filename}</span>
              </div>
              <div className="p-4">
                {data.filename.endsWith('.md') ? (
                  <div className="markdown-body text-sm leading-relaxed">
                    <SharedMarkdown content={data.content} />
                  </div>
                ) : (
                  <pre className="text-xs font-mono whitespace-pre-wrap">{data.content}</pre>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
