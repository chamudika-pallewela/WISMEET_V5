'use client';

import { useEffect, useCallback } from 'react';
import { useStreamChat } from '@/providers/StreamChatProvider';
import { useCall } from '@stream-io/video-react-sdk';

export const useChatParticipants = () => {
  const { channel, isConnected } = useStreamChat();
  const call = useCall();

  // Debug function to log participant structure
  const debugParticipants = useCallback(() => {
    if (!call) return;
    
    const participants = call.state.participants;
    console.log('🔍 Debug: Video participants structure:', participants);
    
    Object.keys(participants).forEach(id => {
      const participant = participants[id];
      console.log(`  Participant ${id}:`, {
        userId: participant.userId,
        name: participant.name,
        isLocal: participant.isLocal,
        type: typeof participant.userId
      });
    });
  }, [call]);

  // Function to add a participant to chat
  const addParticipantToChat = useCallback(async (participantId: string) => {
    if (!channel || !isConnected) return;

    try {
      await channel.addMembers([participantId]);
      console.log(`✅ Added participant ${participantId} to chat`);
      return true;
    } catch (error) {
      console.log(`ℹ️ Could not add participant ${participantId} to chat:`, error);
      return false;
    }
  }, [channel, isConnected]);

  // Function to add all current participants to chat
  const addAllParticipantsToChat = useCallback(async () => {
    if (!channel || !isConnected || !call) return;

    try {
      const participants = call.state.participants;
      const participantIds = Object.keys(participants);
      
      // Filter out numeric IDs (Stream Video internal IDs) and get actual user IDs
      const validUserIds = participantIds.filter(id => {
        const participant = participants[id];
        // Check if participant has a valid user ID (not numeric)
        return participant && participant.userId && !/^\d+$/.test(participant.userId);
      }).map(id => participants[id].userId);
      
      if (validUserIds.length > 0) {
        console.log('👥 Adding valid participants to chat:', validUserIds);
        await channel.addMembers(validUserIds);
        console.log('✅ Added valid participants to chat');
        return true;
      } else {
        console.log('ℹ️ No valid user IDs found in participants');
      }
    } catch (error) {
      console.log('ℹ️ Could not add all participants to chat:', error);
      return false;
    }
  }, [channel, isConnected, call]);

  // Function to ensure all participants have chat access
  const ensureChatAccess = useCallback(async () => {
    if (!channel || !isConnected || !call) return;

    try {
      // Get current channel members
      const memberResponse = await channel.queryMembers({});
      const currentMembers = memberResponse.members.map((m: any) => m.user_id);
      
      // Get video call participants and extract valid user IDs
      const videoParticipants = call.state.participants;
      const videoParticipantIds = Object.keys(videoParticipants);
      
      // Filter out numeric IDs and get actual user IDs
      const validUserIds = videoParticipantIds.filter(id => {
        const participant = videoParticipants[id];
        return participant && participant.userId && !/^\d+$/.test(participant.userId);
      }).map(id => videoParticipants[id].userId);
      
      // Find participants who aren't in chat yet
      const missingParticipants = validUserIds.filter(userId => !currentMembers.includes(userId));
      
      if (missingParticipants.length > 0) {
        console.log('🔍 Adding missing participants to chat:', missingParticipants);
        await channel.addMembers(missingParticipants);
        console.log('✅ Added missing participants to chat');
        return true;
      }
      
      return false;
    } catch (error) {
      console.log('ℹ️ Could not ensure chat access:', error);
      return false;
    }
  }, [channel, isConnected, call]);

  // Automatically ensure chat access when participants change
  useEffect(() => {
    if (!isConnected || !call) return;

    const handleParticipantJoined = () => {
      // Add a small delay to ensure the participant is fully joined
      setTimeout(() => {
        ensureChatAccess();
      }, 1000);
    };

    const handleParticipantLeft = () => {
      // Refresh chat access when someone leaves
      setTimeout(() => {
        ensureChatAccess();
      }, 1000);
    };

    // Listen for participant changes
    call.on('participant.joined', handleParticipantJoined);
    call.on('participant.left', handleParticipantLeft);

    // Initial check
    setTimeout(() => {
      debugParticipants(); // Debug first
      ensureChatAccess();
    }, 2000);

    return () => {
      call.off('participant.joined', handleParticipantJoined);
      call.off('participant.left', handleParticipantLeft);
    };
  }, [isConnected, call, ensureChatAccess]);

  return {
    addParticipantToChat,
    addAllParticipantsToChat,
    ensureChatAccess,
    debugParticipants,
  };
};
