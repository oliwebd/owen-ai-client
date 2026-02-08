import React from 'react';
import { Message, Role } from '../types';
import { BotIcon, UserIcon } from './Icons';
import { CodeBlock } from './CodeBlock';

interface MessageBubbleProps {
  message: Message;
}

// A simple parser to separate code blocks from text
const parseContent = (content: string) => {
  const parts = [];
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Push text before code block
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    // Push code block
    parts.push({ type: 'code', language: match[1], content: match[2] });
    lastIndex = regex.lastIndex;
  }
  // Push remaining text
  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) });
  }
  return parts;
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.User;
  const parts = parseContent(message.content);

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}>
      <div className={`flex max-w-3xl w-full ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-4`}>
        
        {/* Avatar */}
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          ${isUser 
            ? 'bg-gray-100 dark:bg-indigo-600 text-gray-700 dark:text-white' 
            : 'bg-transparent text-indigo-600 dark:text-emerald-400'}
          ${isUser ? '' : 'mt-1'} 
        `}>
          {isUser ? <UserIcon className="w-5 h-5" /> : <BotIcon className="w-6 h-6" />}
        </div>

        {/* Content Bubble */}
        <div className={`
          flex-1 min-w-0 flex flex-col
          ${isUser ? 'items-end' : 'items-start'}
        `}>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {isUser ? 'You' : 'Owen AI'}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className={`
            prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed
            ${isUser 
              ? 'text-gray-800 dark:text-indigo-100 bg-[#f0f4f9] dark:bg-indigo-950/40 rounded-3xl rounded-tr-sm px-5 py-3' 
              : 'text-gray-800 dark:text-gray-200 px-1'}
          `}>
            {parts.map((part, index) => {
              if (part.type === 'code') {
                return <CodeBlock key={index} language={part.language!} code={part.content} />;
              }
              // Render text with basic newlines
              return (
                <div key={index} className="whitespace-pre-wrap">
                  {part.content}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};