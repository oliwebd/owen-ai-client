import React, { useState, useEffect, useRef } from 'react';
import { OllamaService } from './services/ollamaService';
import { historyService } from './services/historyService';
import { Message, Role, OllamaConfig, ChatSession } from './types';
import { AGENTS, DEFAULT_HOST, DEFAULT_MODEL } from './constants';
import { MessageBubble } from './components/MessageBubble';
import { SendIcon, StopIcon, SettingsIcon, SunIcon, MoonIcon, MenuIcon, PlusIcon } from './components/Icons';
import { SettingsModal } from './components/SettingsModal';
import { ReloadPrompt } from './components/ReloadPrompt';
import { PWAInstallButton } from './components/PWAInstallButton';
import { Sidebar } from './components/Sidebar';

function App() {
  // Config state
  const [config, setConfig] = useState<OllamaConfig>({
    baseUrl: DEFAULT_HOST,
    model: DEFAULT_MODEL,
    systemPrompt: '',
  });

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  
  // Interaction state
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);
  
  // UI state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light'); 
  
  // Model state
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  
  // Service ref
  const ollamaService = useRef(new OllamaService(config));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Initialize Connection, History
  useEffect(() => {
    ollamaService.current = new OllamaService(config);
    checkOllamaConnection();
    loadHistory();
  }, [config.baseUrl, config.model]);

  // Initial Load: Fetch models
  useEffect(() => {
    const init = async () => {
      try {
        await fetchModels();
      } catch (e) {
        console.warn("Initial model fetch failed");
      }
    };
    init();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const loadHistory = async () => {
    try {
      const loadedSessions = await historyService.getAllSessions();
      setSessions(loadedSessions);
    } catch (e) {
      console.error("Failed to load history:", e);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const fetchModels = async (forceRefresh: boolean = false) => {
  const models = await ollamaService.current.getModels(forceRefresh);
  setAvailableModels(models);
  if (models.length > 0) {
    const exactMatch = models.includes(config.model);
    if (!exactMatch) {
      const partialMatch = models.find(m => m.includes(config.model));
      if (partialMatch) {
         setConfig(prev => ({ ...prev, model: partialMatch }));
      } else {
         setConfig(prev => ({ ...prev, model: models[0] }));
      }
    }
  }
};

  const checkOllamaConnection = async () => {
    setConnectionStatus('checking');
    setErrorMessage(null);
    const result = await ollamaService.current.checkConnection();
    if (result.ok) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('error');
      setErrorMessage(result.error || 'Unknown connection error');
    }
  };

  // Chat Session Management
  const createNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setInput('');
    setStreamingMessageId(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const loadSession = async (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setStreamingMessageId(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      await historyService.deleteSession(id);
      await loadHistory();
      if (currentSessionId === id) {
        createNewChat();
      }
    }
  };

  const saveCurrentSession = async (currentMessages: Message[]) => {
    let title = 'New Chat';
    const firstUserMessage = currentMessages.find(m => m.role === Role.User);
    if (firstUserMessage) {
      title = firstUserMessage.content.slice(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '');
    }

    const sessionId = currentSessionId || crypto.randomUUID();
    
    const session: ChatSession = {
      id: sessionId,
      title: title,
      messages: currentMessages,
      createdAt: currentSessionId ? (sessions.find(s => s.id === sessionId)?.createdAt || Date.now()) : Date.now(),
      updatedAt: Date.now()
    };

    await historyService.saveSession(session);
    
    if (!currentSessionId) {
      setCurrentSessionId(sessionId);
    }
    
    await loadHistory();
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    if (connectionStatus === 'error') {
       const result = await ollamaService.current.checkConnection();
       if (!result.ok) {
         setErrorMessage(result.error || 'Connection failed');
         return;
       }
       setConnectionStatus('connected');
    }

    const userMessage: Message = {
      role: Role.User,
      content: input.trim(),
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);

    await saveCurrentSession(updatedMessages);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const assistantMessageId = Date.now() + 1;
    setStreamingMessageId(assistantMessageId);
    const placeholderMessage: Message = { role: Role.Assistant, content: '', timestamp: assistantMessageId };
    
    setMessages(prev => [...prev, placeholderMessage]);

    try {
      let accumulatedContent = '';
      
      const apiMessages = [...updatedMessages];
      if (config.systemPrompt && config.systemPrompt.trim()) {
        apiMessages.unshift({
          role: Role.System,
          content: config.systemPrompt.trim(),
          timestamp: Date.now()
        });
      }

      const stream = ollamaService.current.streamChat(apiMessages);

      for await (const chunk of stream) {
        accumulatedContent += chunk;
        setMessages(prev => 
          prev.map(msg => 
            msg.timestamp === assistantMessageId 
              ? { ...msg, content: accumulatedContent }
              : msg
          )
        );
      }
      
      const finalAssistantMessage: Message = { 
        role: Role.Assistant, 
        content: accumulatedContent, 
        timestamp: assistantMessageId 
      };
      const finalMessages = [...updatedMessages, finalAssistantMessage];
      await saveCurrentSession(finalMessages);

    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMsg = error.message || 'Error generating response.';
      setMessages(prev => [
        ...prev,
        { role: Role.System, content: `Error: ${errorMsg}`, timestamp: Date.now() }
      ]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingMessageId(null);
    }
  };

  const handleStop = () => {
    ollamaService.current.cancelRequest();
    setIsLoading(false);
    setIsStreaming(false);
    setStreamingMessageId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200 font-sans selection:bg-indigo-500/30 transition-colors duration-300">
      <ReloadPrompt />
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={loadSession}
        onNewChat={createNewChat}
        onDeleteSession={deleteSession}
      />

      <header className="flex-none h-16 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <MenuIcon className="w-5 h-5" />
          </button>

          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
             <span className="font-mono font-bold text-white text-lg">O</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="font-semibold text-gray-900 dark:text-white tracking-tight">Owen AI System</h1>
            <div className="flex items-center gap-2 text-xs">
               <span className="text-gray-500">{config.model}</span>
               <span className="text-gray-300 dark:text-gray-700">|</span>
               
               <div className="group relative flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-emerald-500' : 
                    connectionStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 
                    'bg-red-500'
                  }`}></span>
                  
                  <span className={`font-medium ${
                    connectionStatus === 'connected' ? 'text-emerald-600 dark:text-emerald-500' : 
                    connectionStatus === 'checking' ? 'text-yellow-600 dark:text-yellow-500' : 
                    'text-red-500 dark:text-red-400 cursor-help'
                  }`}>
                    {connectionStatus === 'connected' ? 'Connected' : 
                     connectionStatus === 'checking' ? 'Checking...' : 
                     'Error'}
                  </span>
                  
                  {connectionStatus === 'error' && errorMessage && (
                    <div className="absolute top-full left-0 mt-2 w-72 p-3 bg-white dark:bg-gray-900 border border-red-100 dark:border-red-500/30 rounded-lg text-xs text-red-600 dark:text-red-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl backdrop-blur-sm">
                      <div className="font-semibold mb-1">Connection Error</div>
                      {errorMessage}
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton />
          
          <button
            onClick={createNewChat}
            className="sm:hidden p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            title="New Chat"
          >
            <PlusIcon className="w-5 h-5" />
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Toggle Theme"
          >
            {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
          </button>
          
          <button 
            onClick={() => {
              fetchModels();
              setIsSettingsOpen(true);
            }}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 custom-scrollbar">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-8 animate-fade-in">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-3xl flex items-center justify-center border border-gray-100 dark:border-gray-800 shadow-xl shadow-indigo-500/5">
                <span className="text-5xl">👋</span>
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Welcome to Owen AI</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  A powerful local AI assistant running on your machine.
                  <br />
                  <span className="text-sm opacity-60">Powered by Ollama • {config.model}</span>
                </p>
              </div>
              
              {connectionStatus === 'error' && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl p-4 max-w-lg text-left shadow-lg">
                  <h3 className="text-red-600 dark:text-red-400 font-semibold mb-2 flex items-center gap-2">
                    Connection Failed
                  </h3>
                  <p className="text-red-600/80 dark:text-red-200/80 text-sm mb-4">{errorMessage}</p>
                  
                  <div className="space-y-3">
                     <div className="text-xs bg-white/50 dark:bg-gray-950/50 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                        <p className="text-gray-600 dark:text-gray-400 mb-1">1. Make sure Ollama is running.</p>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">2. Allow browser connections (CORS):</p>
                        <code className="block bg-gray-100 dark:bg-black/40 p-2 rounded text-indigo-600 dark:text-indigo-300 font-mono select-all">
                          OLLAMA_ORIGINS="*" ollama serve
                        </code>
                     </div>
                     <button 
                       onClick={checkOllamaConnection}
                       className="w-full py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-200 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800/50 transition-colors"
                     >
                       Retry Connection
                     </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <MessageBubble 
                  key={idx} 
                  message={msg} 
                  isStreaming={isStreaming && msg.timestamp === streamingMessageId}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </main>

      <div className="flex-none p-4 sm:p-6 bg-white dark:bg-gray-950 transition-colors duration-300">
        <div className="max-w-3xl mx-auto relative group">
          <div className="relative bg-[#f0f4f9] dark:bg-gray-900 rounded-3xl border border-transparent dark:border-gray-800 focus-within:bg-white dark:focus-within:bg-gray-900 focus-within:border-gray-300 dark:focus-within:border-gray-700 focus-within:shadow-md dark:focus-within:shadow-none flex items-end overflow-hidden transition-all duration-200">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Owen AI..."
              className="w-full bg-transparent text-gray-900 dark:text-white placeholder-gray-500 px-6 py-4 min-h-[60px] max-h-[200px] outline-none resize-none font-sans"
            />
            <div className="pb-3 pr-3">
              {isStreaming ? (
                <button
                  onClick={handleStop}
                  className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-full transition-all shadow-lg hover:shadow-red-500/20"
                >
                  <StopIcon className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim()}
                  className={`
                    p-2 rounded-full transition-all
                    ${!input.trim()
                      ? 'bg-transparent text-gray-400 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'}
                  `}
                >
                  <SendIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          <div className="text-center mt-3">
             <p className="text-[10px] text-gray-400 dark:text-gray-600 font-medium">AI generated content can be inaccurate.</p>
          </div>
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={setConfig}
        availableModels={availableModels}
        agents={AGENTS}
        onRefreshModels={fetchModels}
      />
    </div>
  );
}

export default App;
