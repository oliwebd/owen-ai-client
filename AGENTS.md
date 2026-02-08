# Owen AI System - AI Agent Guidelines

> **READ THIS FIRST**: This file contains critical architectural context and coding standards for this project. All AI agents (Cursor, Windsurf, Copilot, etc.) must follow these rules to maintain project integrity.

## 1. Project Overview
**Owen AI System** is a high-performance, local-first AI chat interface that connects directly to a locally running **Ollama** instance.
- **Type**: Single Page Application (SPA) / Progressive Web App (PWA).
- **Backend**: None. The browser connects directly to `http://localhost:11434`.
- **Storage**: IndexedDB (Native implementation) for chat history.

## 2. Tech Stack & Versioning
*   **Framework**: React 19 (Functional Components + Hooks).
*   **Build Tool**: Vite (Latest).
*   **Language**: TypeScript (Strict Mode).
*   **Styling**: **Tailwind CSS v4**.
    *   ⛔ **DO NOT** create a `tailwind.config.js` or `postcss.config.js`.
    *   ✅ **DO** use CSS variables and `@theme` blocks in `index.css`.
*   **Icons**: `lucide-react`.
*   **PWA**: `vite-plugin-pwa`.

## 3. Directory Structure
This project uses a **flat structure** (source files in root), not a nested `src/` folder.

```text
/
├── agents/           # Markdown files defining AI personas (System Prompts)
├── components/       # React UI components
├── services/         # Business logic (Ollama API, IndexedDB, Agent loading)
├── App.tsx           # Main application logic
├── index.tsx         # Entry point
├── index.html        # HTML entry
├── types.ts          # Shared TypeScript interfaces
└── index.css         # Tailwind v4 entry and global styles
```

## 4. Key Architectural Patterns

### A. The Agent System
Agents are defined as Markdown (`.md`) files in the `agents/` directory.
- **Loading**: `services/agentService.ts` uses `import.meta.glob` with `?raw` to load these files at build time.
- **Rule**: If adding a new agent, simply create `agents/new-agent-name.md`. The service picks it up automatically.

### B. Ollama Integration (`ollamaService.ts`)
- The app streams responses using the `fetch` API and `ReadableStream`.
- **CORS**: The app assumes the user has set `OLLAMA_ORIGINS="*"` on their local machine.
- **Error Handling**: Network errors usually mean Ollama is not running. Handle this gracefully.

### C. Chat History (`historyService.ts`)
- **Storage**: We use raw `IndexedDB`, wrapped in a Promise-based service.
- **No External DB Libs**: Do not install `Dexie.js` or `localforage`. Maintain the native implementation to keep bundle size low.

## 5. Coding Standards

### Tailwind CSS v4
- Use the new v4 syntax.
- Do not use `@apply` unless absolutely necessary for complex repeated patterns.
- Dark mode is handled via the `dark` class on the `<html>` element.

### React Components
- Use `React.FC` with typed props.
- Keep components small and focused.
- All SVG icons must come from `lucide-react`.

### TypeScript
- No `any` types unless interacting with obscure browser APIs (like `import.meta.glob`).
- Define all shared interfaces in `types.ts`.

## 6. Critical "Do Not Break" Rules
1.  **Do not move source files to `src/`**. The build system expects them in the root.
2.  **Do not break PWA support**. Ensure `PWAInstallButton.tsx` and `ReloadPrompt.tsx` remain functional.
3.  **Do not add heavy dependencies**. This is a lightweight local interface.
4.  **Do not remove the `import.meta` casting** in `agentService.ts`. It is required for Vite glob imports to work with TypeScript.

## 7. Common Tasks

**Adding a new Feature**:
1.  Define types in `types.ts`.
2.  Create logic in `services/`.
3.  Create UI in `components/`.
4.  Integrate in `App.tsx`.

**Adding a new Agent**:
1.  Create `agents/mypersona.md`.
2.  Write the system prompt.
3.  That's it.

**Updating Tailwind Config**:
1.  Edit `index.css`.
2.  Add variables to the `@theme` block.
