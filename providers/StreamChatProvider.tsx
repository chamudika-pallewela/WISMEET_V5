'use client';

import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { StreamChat, Channel, User } from 'stream-chat';
import { Chat, Channel as ChannelComponent, ChannelHeader, MessageInput, MessageList, Thread, Window } from 'stream-chat-react';
import { useUser } from '@clerk/nextjs';
import { useParams } from 'next/navigation';
import { useCall } from '@stream-io/video-react-sdk';

import 'stream-chat-react/dist/css/v2/index.css';

interface StreamChatContextType {
  chatClient: StreamChat | null;
  channel: Channel | null;
  isConnected: boolean;
}

const StreamChatContext = createContext<StreamChatContextType>({
  chatClient: null,
  channel: null,
  isConnected: false,
});

export const useStreamChat = () => useContext(StreamChatContext);

interface StreamChatProviderProps {
  children: ReactNode;
}

const API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY;

export const StreamChatProvider = ({ children }: StreamChatProviderProps) => {
  const { user } = useUser();
  const params = useParams();
  const meetingId = params?.id as string;
  const call = useCall(); // Get the current video call
  
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [chatAccessInterval, setChatAccessInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user || !meetingId || !API_KEY) return;

    const initChat = async () => {
      try {
        console.log('🚀 Initializing Stream Chat...');
        console.log('📱 API Key:', API_KEY ? 'Present' : 'Missing');
        console.log('👤 User:', user?.id);
        console.log('🏢 Meeting ID:', meetingId);

        // Create Stream Chat client
        const client = StreamChat.getInstance(API_KEY);
        
        // Get proper user token from your backend
        console.log('🔑 Getting chat token...');
        const tokenResponse = await fetch('/api/stream/chat-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            userName: user.fullName || user.username || 'Anonymous',
            userImage: user.imageUrl,
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          throw new Error(`Failed to get chat token: ${tokenResponse.status} - ${errorText}`);
        }

        const { token } = await tokenResponse.json();
        console.log('✅ Chat token received');

        // Connect user to Stream Chat with proper token
        console.log('🔌 Connecting user to Stream Chat...');
        await client.connectUser(
          {
            id: user.id,
            name: user.fullName || user.username || 'Anonymous',
            image: user.imageUrl,
          },
          token
        );
        console.log('✅ User connected to Stream Chat');

        // Create or get channel for the meeting
        console.log('📺 Creating/getting channel...');
        
        // Try to get or create a channel with proper permissions
        let channel = null;
        
        // First try to join existing channel
        try {
          const existingChannel = client.channel('messaging', meetingId);
          await existingChannel.watch();
          channel = existingChannel;
          console.log('✅ Joined existing channel successfully');
        } catch (watchError) {
          console.log('ℹ️ No existing channel found, trying to create one...');
          
          // Try to create a channel with minimal permissions
          try {
            channel = client.channel('messaging', meetingId, {
              name: `Meeting ${meetingId}`,
              members: [user.id],
              created_by_id: user.id,
              commands: ['giphy', 'imgur'],
            });
            
            await channel.create();
            console.log('✅ New channel created successfully');
          } catch (createError) {
            console.log('ℹ️ Could not create messaging channel, trying alternative...');
            
            // Try with different channel type that might have different permissions
            try {
              channel = client.channel('team', meetingId, {
                name: `Meeting ${meetingId}`,
                members: [user.id],
                created_by_id: user.id,
              });
              
              await channel.create();
              console.log('✅ Team channel created successfully');
            } catch (teamError) {
              console.log('ℹ️ Could not create team channel, trying livestream...');
              
              // Last resort: try livestream type
              channel = client.channel('livestream', meetingId, {
                name: `Meeting ${meetingId}`,
                created_by_id: user.id,
              });
              
              await channel.create();
              console.log('✅ Livestream channel created successfully');
            }
          }
        }
        
        // If still no channel, try server-side channel creation
        if (!channel) {
          console.log('ℹ️ Client-side channel creation failed, trying server-side...');
          
          try {
            const response = await fetch('/api/stream/join-channel', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: user.id,
                userName: user.fullName || user.username || 'Anonymous',
                userImage: user.imageUrl,
                meetingId,
              }),
            });

            if (response.ok) {
              // Try to join the channel that was created server-side
              channel = client.channel('messaging', meetingId);
              await channel.watch();
              console.log('✅ Successfully joined server-created channel');
            } else {
              throw new Error('Server-side channel creation failed');
            }
          } catch (serverError) {
            console.error('❌ Server-side channel creation also failed:', serverError);
            throw new Error('Could not create or join any chat channel. Please check Stream Chat permissions.');
          }
        }

        // Ensure current user is a member of the channel
        try {
          const memberResponse = await channel.queryMembers({ user_id: { $eq: user.id } });
          if (memberResponse.members.length === 0) {
            await channel.addMembers([user.id]);
            console.log('✅ User added to channel members');
          } else {
            console.log('✅ User already in channel members');
          }
        } catch (addMemberError) {
          console.log('ℹ️ Could not verify/add user to channel:', addMemberError);
          // This might be a permissions issue, but we'll continue
        }

        // Set up channel permissions for all users
        try {
          // Try to set channel permissions to allow all members to read/write
          await channel.updatePartial({
            set: {
              own_capabilities: ['send-message', 'read', 'write'],
            }
          });
          console.log('✅ Channel permissions updated');
        } catch (permError) {
          console.log('ℹ️ Could not update channel permissions:', permError);
          // Continue anyway, the channel might still work
        }

        // Function to add other meeting participants to chat
        const addOtherParticipantsToChat = async () => {
          try {
            // Get all participants from the video call
            const videoParticipants = call?.state.participants || {};
            const participantIds = Object.keys(videoParticipants).filter(id => id !== user.id);
            
            if (participantIds.length > 0) {
              console.log('👥 Adding other participants to chat:', participantIds);
              await channel.addMembers(participantIds);
              console.log('✅ Added other participants to chat channel');
            }
          } catch (error) {
            console.log('ℹ️ Could not add other participants to chat:', error);
          }
        };

        // Function to ensure all participants have access to chat
        const ensureChatAccess = async () => {
          try {
            // Get current channel members
            const memberResponse = await channel.queryMembers({});
            const currentMembers = memberResponse.members.map((m: any) => m.user_id);
            
            // Get video call participants
            const videoParticipants = call?.state.participants || {};
            const videoParticipantIds = Object.keys(videoParticipants);
            
            // Find participants who aren't in chat yet
            const missingParticipants = videoParticipantIds.filter(id => !currentMembers.includes(id));
            
            if (missingParticipants.length > 0) {
              console.log('🔍 Adding missing participants to chat:', missingParticipants);
              await channel.addMembers(missingParticipants);
              console.log('✅ Added missing participants to chat');
            }
          } catch (error) {
            console.log('ℹ️ Could not ensure chat access:', error);
          }
        };

        // Add other participants to chat after a short delay
        setTimeout(addOtherParticipantsToChat, 2000);
        
        // Periodically check and ensure all participants have chat access
        const interval = setInterval(ensureChatAccess, 10000); // Check every 10 seconds
        setChatAccessInterval(interval);

        setChatClient(client);
        setChannel(channel);
        setIsConnected(true);

        console.log('✅ Stream Chat connected successfully');
      } catch (error) {
        console.error('❌ Failed to connect to Stream Chat:', error);
        console.error('❌ Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    };

    initChat();

    return () => {
      if (chatClient) {
        chatClient.disconnectUser();
      }
      // Clear the chat access interval
      if (chatAccessInterval) {
        clearInterval(chatAccessInterval);
      }
    };
  }, [user, meetingId]);

  const value = {
    chatClient,
    channel,
    isConnected,
    // Add fallback values for when chat is not available
    hasError: false,
    errorMessage: null,
  };

  return (
    <StreamChatContext.Provider value={value}>
      {children}
    </StreamChatContext.Provider>
  );
};

export default StreamChatProvider;
