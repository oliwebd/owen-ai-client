import React from 'react';
import { Bot } from 'lucide-react';

interface AnimatedBotIconProps {
  className?: string;
  isAnimating?: boolean;
}

export const AnimatedBotIcon: React.FC<AnimatedBotIconProps> = ({ 
  className = "w-6 h-6", 
  isAnimating = false 
}) => {
  if (!isAnimating) {
    return <Bot className={className} />;
  }

  return (
    <div className="relative inline-block">
      {/* Base bot icon */}
      <Bot className={className} />
      
      {/* Animated overlay for blinking effect */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full h-full">
          {/* Left eye blink */}
          <div 
            className="absolute bg-current rounded-full animate-bot-blink"
            style={{
              width: '20%',
              height: '3%',
              left: '30%',
              top: '35%',
            }}
          />
          
          {/* Right eye blink */}
          <div 
            className="absolute bg-current rounded-full animate-bot-blink"
            style={{
              width: '20%',
              height: '3%',
              right: '30%',
              top: '35%',
              animationDelay: '0.1s'
            }}
          />
          
          {/* Thinking dots animation */}
          <div className="absolute bottom-[20%] left-1/2 transform -translate-x-1/2 flex gap-0.5">
            <div className="w-0.5 h-0.5 bg-current rounded-full animate-thinking-dot" 
                 style={{ animationDelay: '0s' }} />
            <div className="w-0.5 h-0.5 bg-current rounded-full animate-thinking-dot" 
                 style={{ animationDelay: '0.2s' }} />
            <div className="w-0.5 h-0.5 bg-current rounded-full animate-thinking-dot" 
                 style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>
    </div>
  );
};