import { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiClient } from '../lib/api';

export default function AuthGate({ onAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setError('');
    setLoading(true);
    try {
      const data = await apiClient.login(email.trim(), password.trim());
      localStorage.setItem('chat_user_name', data.name);
      localStorage.setItem('chat_api_key_id', data.apiKeyId);
      localStorage.setItem('chat_api_secret', data.apiKeySecret);
      localStorage.setItem('chat_refresh_token', data.refreshToken);
      onAuthenticated({
        name: data.name,
        apiKeyId: data.apiKeyId,
        apiKeySecret: data.apiKeySecret,
      });
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
          <h1 className="text-3xl font-bold gradient-text mb-2">Chatty</h1>
          <p className="text-muted-foreground text-sm">
            cloudpilot
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-center mb-6">Sign In</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                className={cn(
                  'w-full rounded-xl px-4 py-2.5 text-sm',
                  'bg-input border border-border',
                  'focus:outline-none focus:ring-2 focus:ring-ring/50',
                  'placeholder:text-muted-foreground',
                  'transition-all duration-200'
                )}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
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
              disabled={!email.trim() || !password.trim() || loading}
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

          {error && (
            <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-2.5 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
