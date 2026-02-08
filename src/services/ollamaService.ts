import { Message, OllamaConfig } from '../types';

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
      const res = await fetch(`${this.config.baseUrl}/api/tags`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.models || []).map((m: any) => m.name);
    } catch (e) {
      // Suppress error logging for connection probes to avoid console noise
      return [];
    }
  }

  /**
   * Checks if the Ollama server is reachable and if the model exists.
   */
  async checkConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      // Check if server is up
      const res = await fetch(`${this.config.baseUrl}/api/tags`);
      if (!res.ok) {
        return { ok: false, error: 'Ollama server unreachable. Check URL or CORS settings.' };
      }
      
      const data = await res.json();
      const models = data.models || [];
      // loose matching to handle :latest or specific tags
      const modelExists = models.some((m: any) => m.name.includes(this.config.model));

      if (!modelExists) {
        return { 
          ok: false, 
          error: `Model '${this.config.model}' not found. Run 'ollama pull ${this.config.model}' in your terminal.` 
        };
      }

      return { ok: true };
    } catch (e) {
      // Common error: NetworkError when CORS is blocking or server is down
      return { 
        ok: false, 
        error: 'Connection failed. Is Ollama running?' 
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
        } catch {}
        throw new Error(errorMsg);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported in this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Process any remaining buffer
          if (buffer.trim()) {
            try {
              const json = JSON.parse(buffer);
              if (json.message && json.message.content) {
                yield json.message.content;
              }
            } catch (e) {
              console.error('Error parsing final buffer:', e);
            }
          }
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Split by newlines, but keep the last segment in the buffer as it might be incomplete
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          try {
            const json = JSON.parse(line);
            
            if (json.error) {
              throw new Error(json.error);
            }

            if (json.message && json.message.content) {
              yield json.message.content;
            }
            
            if (json.done) {
              return;
            }
          } catch (e) {
            console.error('Error parsing JSON line:', e, line);
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Generation aborted');
      } else {
        throw error;
      }
    } finally {
      this.abortController = null;
    }
  }
}