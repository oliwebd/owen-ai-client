
export enum Role {
  User = 'user',
  Assistant = 'assistant',
  System = 'system'
}

export interface Message {
  role: Role;
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
}

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  systemPrompt?: string;
}

// Responses from Ollama API
export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export const DEFAULT_MODEL = "qwen2.5-coder:1.5b";
export const DEFAULT_HOST = "http://localhost:11434";
