import { useState, useRef, useEffect } from 'react';
import { Send, Save, Check, X, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';
import { apiClient } from '../lib/api';

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 animate-fade-in">
      <div className="flex gap-1">
        <span className="typing-dot w-2 h-2 rounded-full bg-primary/60 inline-block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-primary/60 inline-block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-primary/60 inline-block" />
      </div>
      <span className="text-xs text-muted-foreground ml-2">Thinking...</span>
    </div>
  );
}

function MarkdownContent({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-semibold mb-1.5 mt-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="text-sm">{children}</li>,
        code: ({ inline, className, children }) => {
          if (inline) {
            return <code className="bg-white/5 px-1.5 py-0.5 rounded text-[12px] font-mono text-primary/90">{children}</code>;
          }
          return (
            <pre className="bg-black/30 rounded-lg p-3 my-2 overflow-x-auto">
              <code className="text-[12px] font-mono">{children}</code>
            </pre>
          );
        },
        pre: ({ children }) => <>{children}</>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary/30 pl-3 my-2 text-muted-foreground italic">{children}</blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="text-xs border-collapse w-full">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="border border-border px-2 py-1 bg-muted/30 text-left font-medium">{children}</th>,
        td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        hr: () => <hr className="border-border my-3" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function InlineSaveForm({ onSave, onCancel, defaultName }) {
  const [filename, setFilename] = useState(defaultName);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (filename.trim()) {
      onSave(filename.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5 animate-fade-in">
      <input
        ref={inputRef}
        type="text"
        value={filename}
        onChange={(e) => setFilename(e.target.value)}
        placeholder="filename.md"
        className="text-[10px] px-2 py-1 rounded-md bg-input border border-border text-foreground w-36 font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
      />
      <button
        type="submit"
        className="rounded-md px-1.5 py-1 bg-primary/20 text-primary text-[10px] hover:bg-primary/30 transition-colors"
      >
        <Check size={10} />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md px-1.5 py-1 text-muted-foreground text-[10px] hover:text-foreground transition-colors"
      >
        <X size={10} />
      </button>
    </form>
  );
}

function MessageBubble({ message, onSave }) {
  const isUser = message.role === 'user';
  const [saveState, setSaveState] = useState('idle'); // idle | editing | saving | saved | error

  const defaultName = (message.content || '').slice(0, 30).replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'response';

  const handleSave = async (filename) => {
    setSaveState('saving');
    try {
      await onSave(filename, message.content);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 2500);
    }
  };

  return (
    <div
      className={cn(
        'animate-fade-in flex w-full group',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div className="flex flex-col gap-1 max-w-[75%]">
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'glass rounded-bl-md text-foreground'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="markdown-body">
              <MarkdownContent content={message.content} />
            </div>
          )}
          {message.usage && (
            <p className="text-[10px] mt-1 opacity-50">
              tokens: {message.usage.input_tokens}↑ {message.usage.output_tokens}↓
            </p>
          )}
        </div>

        {/* Save button for assistant messages */}
        {!isUser && message.content && !message.content.startsWith('⚠️') && (
          <div className="flex items-center min-h-[24px]">
            {saveState === 'idle' && (
              <button
                onClick={() => setSaveState('editing')}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-2 py-1 text-[10px]',
                  'text-muted-foreground hover:text-primary hover:bg-primary/10',
                  'transition-all duration-150',
                  'opacity-0 group-hover:opacity-100'
                )}
                title="Save to workspace"
              >
                <Save size={10} />
                Save
              </button>
            )}
            {saveState === 'editing' && (
              <InlineSaveForm
                defaultName={defaultName}
                onSave={handleSave}
                onCancel={() => setSaveState('idle')}
              />
            )}
            {saveState === 'saving' && (
              <span className="text-[10px] text-muted-foreground px-2">Saving...</span>
            )}
            {saveState === 'saved' && (
              <span className="flex items-center gap-1 text-[10px] text-green-400 px-2">
                <Check size={10} /> Saved!
              </span>
            )}
            {saveState === 'error' && (
              <span className="text-[10px] text-destructive px-2">Failed to save</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatWindow({ session, onAddMessage, settings, workspace }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [session?.id]);

  const handleSaveArtifact = async (filename, content) => {
    await workspace.saveArtifact(filename, content);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading || !session) return;

    setInput('');
    onAddMessage(session.id, { role: 'user', content: trimmed });
    setIsLoading(true);

    try {
      const result = await apiClient.chat(trimmed, {
        model: settings.model,
        mcpServerUrl: settings.mcpServerUrl,
      });

      onAddMessage(session.id, {
        role: 'assistant',
        content: result.response,
        usage: result.usage,
        model: result.model,
        tools: result.toolsDiscovered,
      });
    } catch (err) {
      onAddMessage(session.id, {
        role: 'assistant',
        content: `⚠️ Error: ${err.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold gradient-text mb-2">Welcome</h2>
          <p className="text-muted-foreground">
            Create a new chat or select an existing one to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">
        {session.messages.length === 0 && (
          <div className="flex items-center justify-center h-full animate-fade-in">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 glow-primary">
                <MessageSquare className="text-primary" size={32} />
              </div>
              <h3 className="text-lg font-semibold mb-1">Start a conversation</h3>
              <p className="text-sm text-muted-foreground">
                Type a message below. MCP tools from <br />
                <span className="text-primary/80 font-mono text-xs">{settings.mcpServerUrl}</span>
                <br /> are available.
              </p>
            </div>
          </div>
        )}

        {session.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onSave={handleSaveArtifact} />
        ))}

        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input area */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className={cn(
              'flex-1 rounded-xl px-4 py-3 text-sm',
              'bg-input border border-border',
              'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50',
              'placeholder:text-muted-foreground',
              'transition-all duration-200',
              'disabled:opacity-50'
            )}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              'rounded-xl px-4 py-3',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 active:scale-95',
              'transition-all duration-200',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
              input.trim() && !isLoading && 'animate-pulse-glow'
            )}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
