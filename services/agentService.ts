import { Agent } from '../types';

// Use Vite's glob import to get raw content of md files
// eager: true loads them synchronously as strings at build/runtime
const agentModules = (import.meta as any).glob('../agents/*.md', { 
  query: '?raw', 
  import: 'default',
  eager: true 
});

export const agentService = {
  getAgents(): Agent[] {
    const agents: Agent[] = [];
    
    for (const path in agentModules) {
      const content = agentModules[path] as string;
      const filename = path.split('/').pop()?.replace('.md', '') || 'Unknown';
      
      // Formatting name: "coder" -> "Coder"
      const name = filename
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      agents.push({
        id: filename,
        name: name,
        systemPrompt: content.trim()
      });
    }
    
    return agents.sort((a, b) => a.name.localeCompare(b.name));
  }
};