'use client';

import { useEffect, useRef } from 'react';
import { useStreamChat } from '@/providers/StreamChatProvider';
import { useParams } from 'next/navigation';

interface ChatMessage {
  id: string;
  text: string;
  sender: {
    id: string;
    name: string;
  };
  timestamp: Date;
  isPrivate?: boolean;
  recipientId?: string;
  recipientName?: string;
}

export const useChatPersistence = () => {
  const { channel, isConnected } = useStreamChat();
  const params = useParams();
  const meetingId = params?.id as string;
  const messagesRef = useRef<ChatMessage[]>([]);

  // Listen for new messages and store them locally
  useEffect(() => {
    if (!channel) return;

    const handleNewMessage = (event: any) => {
      const message = event.message;
      if (message && message.text) {
        const chatMessage: ChatMessage = {
          id: message.id,
          text: message.text,
          sender: {
            id: message.user.id,
            name: message.user.name || 'Anonymous',
          },
          timestamp: new Date(message.created_at),
          isPrivate: message.text.startsWith('@'),
          recipientId: message.text.startsWith('@') ? message.text.split(' ')[0].substring(1) : undefined,
        };
        
        messagesRef.current.push(chatMessage);
      }
    };

    // Load existing messages into our ref
    const loadMessages = async () => {
      try {
        const response = await channel.getMessages();
        const existingMessages = response.messages.map((msg: any) => ({
          id: msg.id,
          text: msg.text,
          sender: {
            id: msg.user.id,
            name: msg.user.name || 'Anonymous',
          },
          timestamp: new Date(msg.created_at),
        }));
        
        messagesRef.current = existingMessages;
      } catch (error) {
        console.error('Failed to load messages for persistence:', error);
      }
    };

    loadMessages();
    channel.on('message.new', handleNewMessage);

    return () => {
      channel.off('message.new', handleNewMessage);
    };
  }, [channel]);

  // Function to save chat to database
  const saveChatToDatabase = async () => {
    if (!meetingId || messagesRef.current.length === 0) return;

    try {
      const response = await fetch('/api/chat/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId,
          messages: messagesRef.current.map(msg => ({
            senderId: msg.sender.id,
            senderName: msg.sender.name,
            message: msg.text,
            timestamp: msg.timestamp,
          })),
        }),
      });

      if (response.ok) {
        console.log('✅ Chat messages saved to database');
        // Clear the messages ref after successful save
        messagesRef.current = [];
      } else {
        console.error('❌ Failed to save chat messages');
      }
    } catch (error) {
      console.error('❌ Error saving chat messages:', error);
    }
  };

  // Save chat when component unmounts (meeting ends)
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveChatToDatabase();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveChatToDatabase();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Save chat when component unmounts
      saveChatToDatabase();
    };
  }, [meetingId]);

  return {
    saveChatToDatabase,
    getCurrentMessages: () => messagesRef.current,
  };
};
