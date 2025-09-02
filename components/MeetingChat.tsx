'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Users, User, Globe } from 'lucide-react';
import { useStreamChat } from '@/providers/StreamChatProvider';
import { useUser } from '@clerk/nextjs';
import { useChatParticipants } from '@/hooks/useChatParticipants';

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

interface ChatParticipant {
  id: string;
  name: string;
  image?: string;
}

const MeetingChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<'everyone' | 'private'>('everyone');
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [showRecipientSelector, setShowRecipientSelector] = useState(false);
  const { chatClient, channel, isConnected } = useStreamChat();
  const { user } = useUser();
  const { ensureChatAccess } = useChatParticipants();

  // Load participants and messages
  useEffect(() => {
    if (!channel) return;

    const loadParticipants = async () => {
      try {
        const response = await channel.queryMembers({});
        const participantList = response.members.map((member: any) => ({
          id: member.user_id,
          name: member.user?.name || 'Anonymous',
          image: member.user?.image,
        }));
        setParticipants(participantList);
      } catch (error) {
        console.error('Failed to load participants:', error);
      }
    };

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
          isPrivate: message.type === 'ephemeral' || message.parent_id,
          recipientId: message.parent_id ? message.user.id : undefined,
        };
        
        setMessages(prev => [...prev, chatMessage]);
      }
    };

    channel.on('message.new', handleNewMessage);
    channel.on('member.added', loadParticipants);
    channel.on('member.removed', loadParticipants);

    // Load existing messages and participants
    loadMessages();
    loadParticipants();

    return () => {
      channel.off('message.new', handleNewMessage);
      channel.off('member.added', loadParticipants);
      channel.off('member.removed', loadParticipants);
    };
  }, [channel]);

  // Load existing messages
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
        isPrivate: msg.type === 'ephemeral' || msg.parent_id,
        recipientId: msg.parent_id ? msg.user.id : undefined,
      }));
      
      setMessages(existingMessages.reverse()); // Show newest first
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !channel || !user) return;

    try {
      if (messageType === 'private' && selectedRecipient) {
        // Send private message using Stream Chat's mention system
        const privateMessage = `@${selectedRecipient} ${newMessage.trim()}`;
        await channel.sendMessage({
          text: privateMessage,
          // Use regular message type (default)
        });
      } else {
        // Send message to everyone
        await channel.sendMessage({
          text: newMessage.trim(),
        });
      }
      
      setNewMessage('');
      // Reset to everyone after sending
      setMessageType('everyone');
      setSelectedRecipient('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isConnected) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled
        className="fixed right-4 top-20 z-40 flex items-center gap-2 rounded-lg bg-gray-400 px-3 py-2 text-white shadow-lg cursor-not-allowed"
        title="Chat is not available"
      >
        <MessageSquare className="h-5 w-5" />
        <span className="hidden md:inline">Chat</span>
      </motion.button>
    );
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed right-4 top-20 z-40 flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-white shadow-lg hover:bg-blue-700 transition-colors"
      >
        <MessageSquare className="h-5 w-5" />
        <span className="hidden md:inline">Chat</span>
        {participants.length > 0 && (
          <span className="bg-white text-blue-600 text-xs px-2 py-1 rounded-full font-medium">
            {participants.length}
          </span>
        )}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-gray-200"
          >
            <div className="flex flex-col h-full">
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Meeting Chat</h3>
                  <p className="text-sm text-gray-600">
                    {participants.length} participant{participants.length !== 1 ? 's' : ''} in chat
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      console.log('🔄 Manually refreshing chat access...');
                      await ensureChatAccess();
                    }}
                    className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-blue-600"
                    title="Refresh chat access"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No messages yet</p>
                    <p className="text-sm">Start the conversation!</p>
                  </div>
                ) : (
                                     messages.map((message) => (
                     <div
                       key={message.id}
                       className={`flex ${message.sender.id === user?.id ? 'justify-end' : 'justify-start'}`}
                     >
                       <div
                         className={`max-w-xs px-3 py-2 rounded-lg ${
                           message.sender.id === user?.id
                             ? message.isPrivate 
                               ? 'bg-purple-600 text-white' 
                               : 'bg-blue-600 text-white'
                             : message.isPrivate
                               ? 'bg-purple-100 text-purple-900 border border-purple-300'
                               : 'bg-gray-100 text-gray-900'
                         }`}
                       >
                                                 <div className="text-xs opacity-75 mb-1 flex items-center gap-1">
                          {message.text.startsWith('@') && (
                            <User className="h-3 w-3" />
                          )}
                          {message.sender.name}
                          {message.text.startsWith('@') && (
                            <span className="text-xs">(Private)</span>
                          )}
                        </div>
                         <div className="text-sm">{message.text}</div>
                         <div className="text-xs opacity-75 mt-1">
                           {message.timestamp.toLocaleTimeString([], { 
                             hour: '2-digit', 
                             minute: '2-digit' 
                           })}
                         </div>
                       </div>
                     </div>
                   ))
                )}
              </div>

              {/* Message Type Selector */}
              <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">Message to:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setMessageType('everyone');
                        setSelectedRecipient('');
                      }}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        messageType === 'everyone'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <Globe className="h-3 w-3 inline mr-1" />
                      Everyone
                    </button>
                    <button
                      onClick={() => setMessageType('private')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        messageType === 'private'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <User className="h-3 w-3 inline mr-1" />
                      Private
                    </button>
                  </div>
                </div>

                {/* Recipient Selector for Private Messages */}
                {messageType === 'private' && (
                  <div className="mb-2">
                    <select
                      value={selectedRecipient}
                      onChange={(e) => setSelectedRecipient(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select recipient...</option>
                      {participants
                        .filter(p => p.id !== user?.id)
                        .map((participant) => (
                          <option key={participant.id} value={participant.id}>
                            {participant.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      messageType === 'private' && selectedRecipient
                        ? `Private message to ${participants.find(p => p.id === selectedRecipient)?.name}...`
                        : "Type a message..."
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || (messageType === 'private' && !selectedRecipient)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Debug Info */}
              <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
                <details>
                  <summary className="cursor-pointer hover:text-gray-800">Debug Info</summary>
                  <div className="mt-2 space-y-1">
                    <div>Chat Connected: {isConnected ? '✅' : '❌'}</div>
                    <div>Channel Available: {channel ? '✅' : '❌'}</div>
                    <div>Participants in Chat: {participants.length}</div>
                    <div>Current User: {user?.fullName || user?.username || 'Unknown'}</div>
                  </div>
                </details>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MeetingChat;
