import React, { useState } from 'react';
import { Input } from '../core/Input';
import { Button } from '../core/Button';

interface ChatInputProps {
  onSend: (message: string) => Promise<void>;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend }) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() === '' || isSending) return;

    setIsSending(true);
    try {
      await onSend(text);
      setText('');
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    // Theme-aware border
    <form onSubmit={handleSubmit} className="p-4 border-t border-grey-mid/20 dark:border-grey-dark flex gap-4">
      <Input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Send an encrypted message..."
        disabled={isSending}
      />
      <Button type="submit" isLoading={isSending} className="w-auto px-6">
        Send
      </Button>
    </form>
  );
};