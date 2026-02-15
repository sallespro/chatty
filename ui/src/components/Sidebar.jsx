import { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  Sparkles,
  FolderOpen,
  FileText,
  ChevronDown,
  ChevronRight,
  Eye,
  X,
  Share2,
  Link,
  Check,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { apiClient } from '../lib/api';

function ArtifactViewer({ artifact, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative glass rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            <span className="text-sm font-medium">{artifact.name}</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>
        <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-foreground whitespace-pre-wrap">
          {artifact.content}
        </pre>
      </div>
    </div>
  );
}

function ShareBadge({ shareUrl, onClose }) {
  const [copied, setCopied] = useState(false);
  const fullUrl = `${window.location.origin}${shareUrl}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1.5 animate-fade-in bg-primary/10 rounded-lg px-2 py-1.5 text-[10px]">
      <Link size={10} className="text-primary shrink-0" />
      <span className="text-primary/80 font-mono truncate max-w-[120px]">{shareUrl}</span>
      <button onClick={handleCopy} className="rounded px-1.5 py-0.5 bg-primary/20 text-primary hover:bg-primary/30 transition-colors" title="Copy link">
        {copied ? <Check size={9} /> : 'Copy'}
      </button>
      <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-0.5">
        <X size={9} />
      </button>
    </div>
  );
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  workspace,
}) {
  const [filesOpen, setFilesOpen] = useState(true);
  const [viewingArtifact, setViewingArtifact] = useState(null);
  const [shareResult, setShareResult] = useState(null); // { forId, url }

  const handleViewArtifact = async (filename) => {
    try {
      const artifact = await workspace.getArtifact(filename);
      setViewingArtifact(artifact);
    } catch (err) {
      console.error('Failed to load artifact:', err);
    }
  };

  const handleShareSession = async (session) => {
    try {
      const result = await apiClient.createShare('session', {
        title: session.title,
        messages: session.messages,
      });
      setShareResult({ forId: `session-${session.id}`, url: result.shareUrl });
    } catch (err) {
      console.error('Failed to share session:', err);
    }
  };

  const handleShareArtifact = async (filename) => {
    try {
      const result = await apiClient.createShare('artifact', { filename });
      setShareResult({ forId: `file-${filename}`, url: result.shareUrl });
    } catch (err) {
      console.error('Failed to share artifact:', err);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <>
      <div className="w-72 h-full flex flex-col bg-sidebar border-r border-sidebar-border">
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles size={16} className="text-primary" />
            </div>
            <h1 className="text-lg font-bold gradient-text">AI Chat</h1>
          </div>
          <button
            onClick={onCreateSession}
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5',
              'bg-primary/10 hover:bg-primary/20 border border-primary/20',
              'text-primary text-sm font-medium',
              'transition-all duration-200 hover:border-primary/40',
              'active:scale-[0.98]'
            )}
          >
            <Plus size={16} />
            New Chat
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-4 px-4">
              No conversations yet.
            </p>
          )}

          {sessions.map((session) => (
            <div key={session.id}>
              <div
                className={cn(
                  'group flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer',
                  'transition-all duration-150',
                  session.id === activeSessionId
                    ? 'bg-primary/10 border border-primary/20 text-foreground'
                    : 'hover:bg-muted/50 text-sidebar-foreground border border-transparent'
                )}
                onClick={() => onSelectSession(session.id)}
              >
                <MessageSquare
                  size={14}
                  className={cn(
                    'shrink-0',
                    session.id === activeSessionId ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                <span className="flex-1 text-sm truncate">{session.title}</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareSession(session);
                    }}
                    className="shrink-0 rounded p-1 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all"
                    title="Share session"
                  >
                    <Share2 size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="shrink-0 rounded p-1 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {shareResult?.forId === `session-${session.id}` && (
                <div className="px-3 py-1">
                  <ShareBadge shareUrl={shareResult.url} onClose={() => setShareResult(null)} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Workspace Files */}
        <div className="border-t border-sidebar-border">
          <button
            onClick={() => setFilesOpen(!filesOpen)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-sidebar-foreground hover:bg-muted/30 transition-colors"
          >
            {filesOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <FolderOpen size={12} className="text-primary" />
            Workspace Files
            {workspace.artifacts.length > 0 && (
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {workspace.artifacts.length}
              </span>
            )}
          </button>

          {filesOpen && (
            <div className="max-h-40 overflow-y-auto px-2 pb-2 space-y-0.5">
              {workspace.loading && (
                <p className="text-[10px] text-muted-foreground text-center py-2">Loading...</p>
              )}
              {!workspace.loading && workspace.artifacts.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-2 px-2">
                  No files yet. Save a chat response to create one.
                </p>
              )}
              {workspace.artifacts.map((file) => (
                <div key={file.name}>
                  <div className="group flex items-center gap-2 rounded-md px-2.5 py-1.5 hover:bg-muted/50 transition-colors">
                    <FileText size={11} className="text-muted-foreground shrink-0" />
                    <span className="flex-1 text-[11px] truncate text-sidebar-foreground">
                      {file.name}
                    </span>
                    <span className="text-[9px] text-muted-foreground shrink-0">
                      {formatSize(file.size)}
                    </span>
                    <button
                      onClick={() => handleShareArtifact(file.name)}
                      className="opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all"
                      title="Share"
                    >
                      <Share2 size={10} />
                    </button>
                    <button
                      onClick={() => handleViewArtifact(file.name)}
                      className="opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all"
                      title="View"
                    >
                      <Eye size={10} />
                    </button>
                    <button
                      onClick={() => workspace.deleteArtifact(file.name)}
                      className="opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                      title="Delete"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                  {shareResult?.forId === `file-${file.name}` && (
                    <div className="px-2.5 py-1">
                      <ShareBadge shareUrl={shareResult.url} onClose={() => setShareResult(null)} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <p className="text-[10px] text-muted-foreground text-center">
            Powered by OpenAI + MCP
          </p>
        </div>
      </div>

      {/* Artifact viewer modal */}
      {viewingArtifact && (
        <ArtifactViewer
          artifact={viewingArtifact}
          onClose={() => setViewingArtifact(null)}
        />
      )}
    </>
  );
}
