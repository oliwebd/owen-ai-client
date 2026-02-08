import React from 'react';
import { Message, Role } from '../types';
import { UserIcon } from './Icons';
import { AnimatedBotIcon } from './AnimatedBotIcon';
import { CodeBlock } from './CodeBlock';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

interface ContentPart {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

/**
 * Enhanced parser to separate code blocks from text with better edge case handling
 */
const parseContent = (content: string): ContentPart[] => {
  if (!content || content.trim() === '') {
    return [{ type: 'text', content: '' }];
  }

  const parts: ContentPart[] = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Push text before code block (if any)
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index);
      if (textContent) {
        parts.push({ type: 'text', content: textContent });
      }
    }

    // Extract language and code content
    const language = match[1]?.trim() || 'text';
    const codeContent = match[2] || '';

    // Push code block
    parts.push({ 
      type: 'code', 
      language, 
      content: codeContent 
    });

    lastIndex = regex.lastIndex;
  }

  // Push remaining text after last code block
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex);
    if (remainingText) {
      parts.push({ type: 'text', content: remainingText });
    }
  }

  // If no parts were found (no code blocks), return the entire content as text
  if (parts.length === 0) {
    parts.push({ type: 'text', content });
  }

  return parts;
};

/**
 * Format text content with basic markdown-like features
 */
const formatTextContent = (text: string): React.ReactNode => {
  if (!text) return null;

  // Split by lines and handle basic formatting
  const lines = text.split('\n');
  
  return lines.map((line, idx) => {
    // Handle lists
    if (line.trim().match(/^[-*]\s+/)) {
      return (
        <div key={idx} className="flex gap-2 my-1">
          <span className="text-gray-400 dark:text-gray-500">•</span>
          <span>{line.trim().replace(/^[-*]\s+/, '')}</span>
        </div>
      );
    }

    // Handle numbered lists
    if (line.trim().match(/^\d+\.\s+/)) {
      const match = line.trim().match(/^(\d+)\.\s+(.+)/);
      if (match) {
        return (
          <div key={idx} className="flex gap-2 my-1">
            <span className="text-gray-400 dark:text-gray-500">{match[1]}.</span>
            <span>{match[2]}</span>
          </div>
        );
      }
    }

    // Regular line (preserve empty lines)
    return (
      <div key={idx} className={line.trim() ? '' : 'h-4'}>
        {line || '\u00A0'}
      </div>
    );
  });
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isStreaming = false }) => {
  const isUser = message.role === Role.User;
  const isSystem = message.role === Role.System;
  const isAssistant = message.role === Role.Assistant;

  // Handle system messages differently
  if (isSystem) {
    return (
      <div className="flex w-full justify-center mb-6">
        <div className="max-w-3xl w-full px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
            <span className="whitespace-pre-wrap">{message.content}</span>
          </div>
        </div>
      </div>
    );
  }

  const parts = parseContent(message.content);
  const showAnimation = isAssistant && isStreaming;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}>
      <div className={`flex max-w-3xl w-full ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-4`}>
        
        {/* Avatar with animation */}
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          ${isUser 
            ? 'bg-gray-100 dark:bg-indigo-600 text-gray-700 dark:text-white' 
            : 'bg-transparent text-indigo-600 dark:text-emerald-400'}
          ${isUser ? '' : 'mt-1'} 
        `}>
          {isUser ? (
            <UserIcon className="w-5 h-5" />
          ) : (
            <AnimatedBotIcon 
              className="w-6 h-6" 
              isAnimating={showAnimation}
            />
          )}
        </div>

        {/* Content Bubble */}
        <div className={`
          flex-1 min-w-0 flex flex-col
          ${isUser ? 'items-end' : 'items-start'}
        `}>
          {/* Header with name and timestamp */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {isUser ? 'You' : 'Owen AI'}
            </span>
            {showAnimation && (
              <span className="text-xs text-gray-400 dark:text-gray-500 animate-pulse">
                typing...
              </span>
            )}
            {!showAnimation && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {new Date(message.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            )}
          </div>

          {/* Message content */}
          <div className={`
            w-full
            ${isUser 
              ? 'text-gray-800 dark:text-indigo-100 bg-[#f0f4f9] dark:bg-indigo-950/40 rounded-3xl rounded-tr-sm px-5 py-3' 
              : 'text-gray-800 dark:text-gray-200 px-1'}
          `}>
            {parts.length === 0 || (parts.length === 1 && !parts[0].content) ? (
              showAnimation ? (
                <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" 
                         style={{ animationDelay: '0s' }} />
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" 
                         style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" 
                         style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 dark:text-gray-500 italic text-sm">
                  Empty message
                </div>
              )
            ) : (
              parts.map((part, index) => {
                if (part.type === 'code') {
                  return (
                    <div key={index} className={`${index > 0 ? 'mt-3' : ''} ${index < parts.length - 1 ? 'mb-3' : ''}`}>
                      <CodeBlock 
                        language={part.language || 'text'} 
                        code={part.content} 
                      />
                    </div>
                  );
                }

                // Render text content
                return (
                  <div 
                    key={index} 
                    className="text-sm leading-relaxed"
                  >
                    {formatTextContent(part.content)}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};