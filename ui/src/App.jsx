import { useState, useCallback, useEffect } from 'react';
import { Settings, LogOut } from 'lucide-react';
import { apiClient } from './lib/api';
import { useChatSessions } from './hooks/useChatSessions';
import { useSettings } from './hooks/useSettings';
import { useWorkspace } from './hooks/useWorkspace';
import AuthGate from './components/AuthGate';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import SettingsPanel from './components/SettingsPanel';
import SharedView from './components/SharedView';
import { cn } from './lib/utils';

function getShareIdFromPath() {
  const match = window.location.pathname.match(/^\/shared\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sharedId, setSharedId] = useState(() => getShareIdFromPath());
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const {
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    selectSession,
    deleteSession,
    addMessage,
    refreshSessions,
  } = useChatSessions();

  const { settings, updateSettings } = useSettings();
  const workspace = useWorkspace();

  // Restore session on mount from stored refresh token
  useEffect(() => {
    const init = async () => {
      const refreshToken = localStorage.getItem('chat_refresh_token');
      const storedToken = localStorage.getItem('chat_access_token');

      if (refreshToken && storedToken) {
        // Try to use the stored token first
        apiClient.setToken(storedToken);

        // Try to get user info to verify the token is still valid
        try {
          const me = await apiClient.getMe();
          setUserInfo({
            name: me.name,
            apiKeyId: me.apiKeyId,
            apiKeySecret: localStorage.getItem('chat_api_secret') || '',
          });
          setIsAuthenticated(true);
        } catch {
          // Token expired, try to refresh
          try {
            const res = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });
            const data = await res.json();
            if (res.ok && data.token) {
              apiClient.setToken(data.token);
              localStorage.setItem('chat_access_token', data.token);
              localStorage.setItem('chat_refresh_token', data.refreshToken);
              setIsAuthenticated(true);

              const me = await apiClient.getMe();
              setUserInfo({
                name: me.name,
                apiKeyId: me.apiKeyId,
                apiKeySecret: localStorage.getItem('chat_api_secret') || '',
              });
            }
          } catch {
            // Both failed — user must log in again
            handleLogout();
          }
        }
      }
      setLoading(false);
    };

    init();
  }, []);

  // Listen for URL changes (back/forward)
  useEffect(() => {
    const handlePopState = () => setSharedId(getShareIdFromPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleAuthenticated = useCallback((info) => {
    setIsAuthenticated(true);
    if (info) setUserInfo(info);
    // Store the access token for session restore
    const token = apiClient.getToken();
    if (token) {
      localStorage.setItem('chat_access_token', token);
    }
    workspace.refresh();
    refreshSessions();
  }, [workspace, refreshSessions]);

  const handleLogout = useCallback(() => {
    apiClient.clearToken();
    localStorage.removeItem('chat_access_token');
    localStorage.removeItem('chat_refresh_token');
    localStorage.removeItem('chat_api_secret');
    localStorage.removeItem('chat_user_name');
    localStorage.removeItem('chat_api_key_id');
    localStorage.removeItem('chat_active_session');
    setIsAuthenticated(false);
    setUserInfo(null);
  }, []);

  // Shared content view (public, no auth needed)
  if (sharedId) {
    return (
      <SharedView
        shareId={sharedId}
        onBack={() => {
          window.history.pushState(null, '', '/');
          setSharedId(null);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthGate onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={selectSession}
        onCreateSession={createSession}
        onDeleteSession={deleteSession}
        workspace={workspace}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border glass-subtle">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium truncate max-w-md">
              {activeSession?.title || 'cloudpilot'}
            </h2>
            {activeSession && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
                {settings.model}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {userInfo?.name && (
              <span className="text-[10px] text-muted-foreground mr-1">
                {userInfo.name}
              </span>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className={cn(
                'rounded-lg p-2',
                'text-muted-foreground hover:text-primary hover:bg-primary/10',
                'transition-all duration-200'
              )}
              title="Settings"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={handleLogout}
              className={cn(
                'rounded-lg p-2',
                'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
                'transition-all duration-200'
              )}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <ChatWindow
          session={activeSession}
          onAddMessage={addMessage}
          settings={settings}
          workspace={workspace}
        />
      </div>

      <SettingsPanel
        settings={settings}
        onUpdate={updateSettings}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userInfo={userInfo}
      />
    </div>
  );
}
