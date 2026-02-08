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
    *   ✅ **DO** use CSS variables and `@theme` blocks in `src/index.css`.
*   **Icons**: `lucide-react`.
*   **PWA**: `vite-plugin-pwa`.

## 3. Directory Structure
This project uses a standard **src/** folder structure.

```text
/
├── src/
│   ├── components/       # React UI components
│   ├── services/         # Business logic (Ollama API, IndexedDB)
│   ├── App.tsx           # Main application logic
│   ├── constants.ts      # Global constants and Agent definitions
│   ├── index.tsx         # Entry point
│   ├── types.ts          # Shared TypeScript interfaces
│   └── index.css         # Tailwind v4 entry and global styles
├── index.html            # HTML entry (points to src/index.tsx)
└── vite.config.ts        # Vite configuration
```

## 4. Key Architectural Patterns

### A. The Agent System
Agents are defined as constants in `src/constants.ts`.
- **Definition**: The `AGENTS` array contains preset system prompts.
- **Rule**: If adding a new agent, add it to the `AGENTS` array in `src/constants.ts`.

### B. Ollama Integration (`src/services/ollamaService.ts`)
- The app streams responses using the `fetch` API and `ReadableStream`.
- **CORS**: The app assumes the user has set `OLLAMA_ORIGINS="*"` on their local machine.
- **Error Handling**: Network errors usually mean Ollama is not running. Handle this gracefully.

### C. Chat History (`src/services/historyService.ts`)
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
- No `any` types unless interacting with obscure browser APIs.
- Define all shared interfaces in `src/types.ts`.

## 6. Critical "Do Not Break" Rules
1.  **Do not move source files out of `src/`**. The build system expects them there.
2.  **Do not break PWA support**. Ensure `PWAInstallButton.tsx` and `ReloadPrompt.tsx` remain functional.
3.  **Do not add heavy dependencies**. This is a lightweight local interface.

## 7. Common Tasks

**Adding a new Feature**:
1.  Define types in `src/types.ts`.
2.  Create logic in `src/services/`.
3.  Create UI in `src/components/`.
4.  Integrate in `src/App.tsx`.

**Adding a new Agent**:
1.  Open `src/constants.ts`.
2.  Add a new object to the `AGENTS` array.
3.  That's it.

**Updating Tailwind Config**:
1.  Edit `src/index.css`.
2.  Add variables to the `@theme` block.