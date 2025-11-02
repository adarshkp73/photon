import React from 'react';
import clsx from 'clsx';
import { Timestamp } from 'firebase/firestore'; 

interface ChatMessageProps {
  text: string;
  isSender: boolean;
  timestamp: Timestamp | null;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ text, isSender, timestamp }) => {
  
  const formattedTime = timestamp
    ? timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      className={clsx('flex', isSender ? 'justify-end' : 'justify-start')}
    >
      <div
        className={clsx(
          'max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg shadow-md',
          // THEME-AWARE BUBBLES
          isSender
            // Sender: Dark in light mode, White in dark mode
            ? 'bg-night text-pure-white dark:bg-pure-white dark:text-night'
            // Receiver: White in light mode, Dark in dark mode
            : 'bg-pure-white text-night dark:bg-grey-dark dark:text-grey-light'
        )}
      >
        <p className="whitespace-pre-wrap break-words">{text}</p>
        
        {formattedTime && (
          <span
            className={clsx(
              'text-xs mt-1 block text-right',
              // Theme-aware timestamp text
              isSender 
                ? 'text-grey-light/70 dark:text-grey-mid' 
                : 'text-grey-mid dark:text-grey-mid'
            )}
          >
            {formattedTime}
          </span>
        )}
      </div>
    </div>
  );
};