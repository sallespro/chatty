import { useState } from 'react';
import { KeyRound, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiClient } from '../lib/api';

export default function AuthGate({ onAuthenticated }) {
  const [mode, setMode] = useState('register'); // 'register' | 'login'
  const [name, setName] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdKey, setCreatedKey] = useState(null);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    setLoading(true);
    try {
      const data = await apiClient.register(name.trim());
      setCreatedKey(data);
      onAuthenticated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!secret.trim()) return;
    setError('');
    setLoading(true);
    try {
      await apiClient.exchangeToken(secret.trim());
      onAuthenticated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 glow-primary">
            <Sparkles size={32} className="text-primary" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">AI Chat</h1>
          <p className="text-muted-foreground text-sm">
            Powered by OpenAI + MCP Tools
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 rounded-xl bg-muted p-1">
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={cn(
                'flex-1 rounded-lg py-2 text-sm font-medium transition-all',
                mode === 'register'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Register
            </button>
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={cn(
                'flex-1 rounded-lg py-2 text-sm font-medium transition-all',
                mode === 'login'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Sign In
            </button>
          </div>

          {mode === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name or project name"
                  className={cn(
                    'w-full rounded-xl px-4 py-2.5 text-sm',
                    'bg-input border border-border',
                    'focus:outline-none focus:ring-2 focus:ring-ring/50',
                    'placeholder:text-muted-foreground',
                    'transition-all duration-200'
                  )}
                />
              </div>
              <button
                type="submit"
                disabled={!name.trim() || loading}
                className={cn(
                  'w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5',
                  'bg-primary text-primary-foreground font-medium text-sm',
                  'hover:bg-primary/90 active:scale-[0.98]',
                  'transition-all duration-200',
                  'disabled:opacity-40 disabled:cursor-not-allowed'
                )}
              >
                {loading ? 'Creating...' : 'Create API Key'}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <KeyRound size={14} className="text-primary" />
                  API Key Secret
                </label>
                <input
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="ck_..."
                  className={cn(
                    'w-full rounded-xl px-4 py-2.5 text-sm font-mono',
                    'bg-input border border-border',
                    'focus:outline-none focus:ring-2 focus:ring-ring/50',
                    'placeholder:text-muted-foreground',
                    'transition-all duration-200'
                  )}
                />
              </div>
              <button
                type="submit"
                disabled={!secret.trim() || loading}
                className={cn(
                  'w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5',
                  'bg-primary text-primary-foreground font-medium text-sm',
                  'hover:bg-primary/90 active:scale-[0.98]',
                  'transition-all duration-200',
                  'disabled:opacity-40 disabled:cursor-not-allowed'
                )}
              >
                {loading ? 'Signing in...' : 'Sign In'}
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {error && (
            <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-2.5 text-sm text-destructive">
              {error}
            </div>
          )}

          {createdKey && (
            <div className="mt-4 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 space-y-2">
              <p className="text-xs font-medium text-primary">🔑 Save your API key secret:</p>
              <code className="block text-xs font-mono text-foreground break-all bg-muted p-2 rounded-lg">
                {createdKey.apiKeySecret}
              </code>
              <p className="text-[10px] text-muted-foreground">
                This cannot be retrieved again. Store it securely.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
