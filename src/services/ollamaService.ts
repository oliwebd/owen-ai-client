import { Message, OllamaConfig } from '../types';

// Define proper types for Ollama API responses
interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

interface OllamaModelsResponse {
  models: OllamaModel[];
}

interface OllamaStreamResponse {
  model: string;
  created_at: string;
  message?: {
    role: string;
    content: string;
  };
  done: boolean;
  error?: string;
}

export class OllamaService {
  private config: OllamaConfig;
  private abortController: AbortController | null = null;

  constructor(config: OllamaConfig) {
    this.config = config;
  }

  updateConfig(config: Partial<OllamaConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Fetches the list of available models from Ollama.
   */
  async getModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (!res.ok) {
        console.warn(`Failed to fetch models: ${res.status} ${res.statusText}`);
        return [];
      }
      
      const data: OllamaModelsResponse = await res.json();
      return (data.models || []).map((m) => m.name);
    } catch (e) {
      // Suppress error logging for connection probes to avoid console noise
      if (e instanceof Error && e.name !== 'TimeoutError') {
        console.warn('Error fetching models:', e.message);
      }
      return [];
    }
  }

  /**
   * Checks if the Ollama server is reachable and if the model exists.
   */
  async checkConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      // Check if server is up with timeout
      const res = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (!res.ok) {
        return { 
          ok: false, 
          error: 'Ollama server unreachable. Check URL or CORS settings.' 
        };
      }
      
      const data: OllamaModelsResponse = await res.json();
      const models = data.models || [];
      
      // Improved model matching: exact match or with :latest suffix
      const normalizedConfigModel = this.config.model.replace(':latest', '');
      const modelExists = models.some((m) => {
        const normalizedModelName = m.name.replace(':latest', '');
        return m.name === this.config.model || 
               normalizedModelName === normalizedConfigModel ||
               m.name === `${normalizedConfigModel}:latest`;
      });

      if (!modelExists) {
        const availableModels = models.map(m => m.name).join(', ');
        return { 
          ok: false, 
          error: `Model '${this.config.model}' not found. Available models: ${availableModels || 'none'}. Run 'ollama pull ${this.config.model}' to download it.` 
        };
      }

      return { ok: true };
    } catch (e) {
      // Differentiate between different error types
      if (e instanceof Error) {
        if (e.name === 'TimeoutError') {
          return { 
            ok: false, 
            error: 'Connection timeout. Is Ollama running and accessible?' 
          };
        }
        if (e.message.includes('CORS')) {
          return { 
            ok: false, 
            error: 'CORS error. Start Ollama with: OLLAMA_ORIGINS="*" ollama serve' 
          };
        }
      }
      return { 
        ok: false, 
        error: 'Connection failed. Is Ollama running? Check console for details.' 
      };
    }
  }

  cancelRequest() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  async *streamChat(messages: Message[]): AsyncGenerator<string, void, unknown> {
    this.cancelRequest();
    this.abortController = new AbortController();

    const formattedMessages = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: formattedMessages,
          stream: true,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        let errorMsg = `Ollama API Error: ${response.statusText}`;
        try {
          const errorJson = await response.json();
          if (errorJson.error) errorMsg = errorJson.error;
        } catch {
          // If we can't parse the error, use the status text
        }
        throw new Error(errorMsg);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported in this browser.');
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8', { fatal: false });
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Process any remaining buffer
          if (buffer.trim()) {
            try {
              const json: OllamaStreamResponse = JSON.parse(buffer);
              if (json.error) {
                throw new Error(json.error);
              }
              if (json.message?.content) {
                yield json.message.content;
              }
            } catch (e) {
              if (e instanceof Error && !e.message.startsWith('Unexpected')) {
                console.error('Error parsing final buffer:', e, buffer);
              }
            }
          }
          break;
        }

        // Decode with streaming enabled to handle multi-byte UTF-8 characters
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Split by newlines, keep the last incomplete line in buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine === '') continue;
          
          try {
            const json: OllamaStreamResponse = JSON.parse(trimmedLine);
            
            if (json.error) {
              throw new Error(json.error);
            }

            if (json.message?.content) {
              yield json.message.content;
            }
            
            if (json.done) {
              return;
            }
          } catch (e) {
            // Only log if it's not a JSON parse error (incomplete chunks)
            if (e instanceof SyntaxError) {
              console.warn('JSON parse error (possibly incomplete chunk):', trimmedLine);
            } else {
              throw e; // Re-throw other errors like API errors
            }
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Generation aborted by user');
          return;
        }
        throw error;
      }
      throw new Error('Unknown error occurred during streaming');
    } finally {
      // Ensure reader is released
      if (reader) {
        try {
          reader.releaseLock();
        } catch {
          // Reader may already be released
        }
      }
      this.abortController = null;
    }
  }
}