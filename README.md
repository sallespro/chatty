# 🤖 Chatty

A full-stack AI chat application powered by **OpenAI** and **MCP (Model Context Protocol)** tools. Features server-side session management, per-user workspace, markdown rendering, and content sharing.

![Node.js](https://img.shields.io/badge/Node.js-22-green) ![React](https://img.shields.io/badge/React-19-blue) ![License](https://img.shields.io/badge/License-Private-red)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **AI Chat** | Conversations with OpenAI models (GPT-4o, GPT-4.1, o3-mini, etc.) |
| **MCP Tool Integration** | Connects to MCP servers for real-time data via tool calls |
| **Server-Side Sessions** | Chat history stored per-user on the server — no localStorage dependency |
| **Markdown Rendering** | Full markdown in responses: code blocks, tables, links, lists |
| **Workspace** | Save and manage files (artifacts) per user |
| **Sharing** | Generate public links for sessions and workspace files (7-day expiry) |
| **API Key Auth** | Register → get API key → sign in anywhere with that key |
| **Docker Ready** | One-command deployment with Docker Compose |

---

## 📁 Project Structure

```
chatty/
├── packages/
│   ├── lib/          # Core completion logic (OpenAI + MCP)
│   ├── sdk/          # ChatClient SDK wrapper
│   └── cli/          # CLI chat tool
├── server/           # Express API server (port 3002)
│   └── src/
│       ├── index.js          # Server entry point
│       ├── store.js          # In-memory data store
│       ├── middleware/
│       │   ├── auth.js       # JWT authentication
│       │   └── rateLimit.js  # Token-based rate limiting
│       └── routes/
│           ├── auth.js       # Register, login, /me
│           ├── chat.js       # AI chat endpoint
│           ├── sessions.js   # Session CRUD
│           ├── workspace.js  # File management
│           └── share.js      # Content sharing
├── ui/               # React + Vite frontend
│   └── src/
│       ├── App.jsx
│       ├── components/       # AuthGate, ChatWindow, Sidebar, etc.
│       ├── hooks/            # useChatSessions, useSettings, useWorkspace
│       └── lib/              # ApiClient, utilities
├── Dockerfile
├── docker-compose.yaml
└── package.json              # npm workspaces root
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 22+** and npm
- **OpenAI API Key** ([get one here](https://platform.openai.com/api-keys))

### Local Development

```bash
# 1. Clone the repo
git clone git@github.com:sallespro/chatty.git
cd chatty

# 2. Install all workspace dependencies
npm install

# 3. Set your OpenAI API key
export OPENAI_API_KEY=sk-...

# 4. Start the server (port 3002)
node server/src/index.js

# 5. In a second terminal, start the UI dev server (port 5173)
cd ui && npm run dev
```

Open **http://localhost:5173** in your browser.

### Docker Deployment

```bash
# 1. Create a .env file
cat > .env << EOF
OPENAI_API_KEY=sk-...
JWT_SECRET=your-secret-here
EOF

# 2. Build and run
docker compose up -d

# Access at http://localhost:3002
```

---

## 🔐 Authentication Flow

1. **Register** — `POST /auth/register` with a name → receive an API key secret + JWT
2. **Sign In** — `POST /auth/token` with the secret → receive a new JWT
3. **Use JWT** — all protected endpoints require `Authorization: Bearer <token>`
4. **View Profile** — `GET /auth/me` → returns name and API key ID

> **Important:** The API key secret is shown once on register and is available in the Settings panel. Save it for re-login.

---

## 📡 API Reference

All endpoints use JSON. Protected routes require `Authorization: Bearer <token>`.

### Auth (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register a new API key |
| `POST` | `/auth/token` | Exchange API key secret for JWT |
| `GET` | `/auth/me` | Get current user info (protected) |

**Register:**
```bash
curl -X POST http://localhost:3002/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name": "Alice"}'
```

**Sign In:**
```bash
curl -X POST http://localhost:3002/auth/token \
  -H 'Content-Type: application/json' \
  -d '{"secret": "ck_..."}'
```

---

### Chat (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/chat` | Send a message to the AI |

```bash
curl -X POST http://localhost:3002/chat \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"input": "What is the weather?", "model": "gpt-4.1-mini"}'
```

---

### Sessions (Protected)

Sessions are scoped per-user. User A cannot see User B's sessions.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/sessions` | List all sessions |
| `POST` | `/sessions` | Create a new session |
| `GET` | `/sessions/:id` | Get session with messages |
| `PUT` | `/sessions/:id` | Update session title |
| `DELETE` | `/sessions/:id` | Delete a session |
| `POST` | `/sessions/:id/messages` | Add a message |

```bash
# Create session
curl -X POST http://localhost:3002/sessions \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"title": "Weather Chat"}'

# Add message
curl -X POST http://localhost:3002/sessions/<id>/messages \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"role": "user", "content": "Hello!"}'
```

---

### Workspace (Protected)

Per-user file storage on disk.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/workspace/artifacts` | List all files |
| `POST` | `/workspace/artifacts` | Save a file |
| `GET` | `/workspace/artifacts/:name` | Read a file |
| `DELETE` | `/workspace/artifacts/:name` | Delete a file |

---

### Sharing

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/share` | Yes | Create a share link (7-day expiry) |
| `GET` | `/share/:shareId` | No | View shared content (public) |

```bash
# Share a session
curl -X POST http://localhost:3002/share \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"type": "session", "data": {"messages": [...]}}'
```

---

## ⚙️ Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3002` | Server port |
| `OPENAI_API_KEY` | — | **Required.** OpenAI API key |
| `JWT_SECRET` | `dev-secret-change-in-production` | JWT signing secret |
| `NODE_ENV` | `development` | Set to `production` for Docker |

---

## 🛠️ Tech Stack

- **Backend:** Node.js 22, Express, JWT, in-memory store
- **Frontend:** React 19, Vite, Lucide icons, react-markdown
- **AI:** OpenAI Responses API, MCP tool protocol
- **Deployment:** Docker, Docker Compose

---

## 📦 npm Workspaces

This is a monorepo managed by npm workspaces:

| Package | Path | Description |
|---------|------|-------------|
| `@chat/lib` | `packages/lib` | Core OpenAI completion + MCP logic |
| `@chat/sdk` | `packages/sdk` | ChatClient wrapper |
| `@chat/cli` | `packages/cli` | CLI interface |
| `chat-server` | `server` | Express API |
| `chat-ui` | `ui` | React frontend |

---

## 🔒 Session Isolation

Each user's sessions are scoped by their API key ID on the server. When User A creates sessions and User B logs in, User B will have their own empty session list. This is enforced server-side — there is no way for one user to read another user's sessions or workspace files.

---

## 📝 License

Private — all rights reserved.
