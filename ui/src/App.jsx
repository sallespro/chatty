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
  const [isAuthenticated, setIsAuthenticated] = useState(apiClient.isAuthenticated());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sharedId, setSharedId] = useState(() => getShareIdFromPath());

  const {
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    selectSession,
    deleteSession,
    addMessage,
  } = useChatSessions();

  const { settings, updateSettings } = useSettings();
  const workspace = useWorkspace();

  // Listen for URL changes (back/forward)
  useEffect(() => {
    const handlePopState = () => setSharedId(getShareIdFromPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleAuthenticated = useCallback(() => {
    setIsAuthenticated(true);
    workspace.refresh();
  }, [workspace]);

  const handleLogout = useCallback(() => {
    apiClient.clearToken();
    setIsAuthenticated(false);
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
              {activeSession?.title || 'AI Chat'}
            </h2>
            {activeSession && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
                {settings.model}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
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
      />
    </div>
  );
}
