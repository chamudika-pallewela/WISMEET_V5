"use client";

import { useEffect, useCallback } from "react";
import { useStreamChat } from "@/providers/StreamChatProvider";
import { useCall } from "@stream-io/video-react-sdk";

export const useChatParticipants = () => {
  const { channel, isConnected } = useStreamChat();
  const call = useCall();

  // Debug function to log participant structure
  const debugParticipants = useCallback(() => {
    if (!call) return;

    const participants = call.state.participants;
    console.log("🔍 Debug: Video participants structure:", participants);

    // Handle both Map and object-like structures
    if (participants instanceof Map) {
      participants.forEach((participant, id) => {
        console.log(`  Participant ${id}:`, {
          userId: participant.userId,
          name: participant.name,
          type: typeof participant.userId,
        });
      });
    } else {
      Object.entries(participants).forEach(([id, participant]) => {
        console.log(`  Participant ${id}:`, {
          userId: participant.userId,
          name: participant.name,
          type: typeof participant.userId,
        });
      });
    }
  }, [call]);

  // Function to create Stream Chat users for video participants
  const createStreamChatUsers = useCallback(async (participants: any[]) => {
    try {
      const response = await fetch("/api/stream/create-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ participants }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create users: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Stream Chat users created:", result);
      return result.createdUsers || [];
    } catch (error) {
      console.error("❌ Failed to create Stream Chat users:", error);
      return [];
    }
  }, []);

  // Function to add a participant to chat
  const addParticipantToChat = useCallback(
    async (participantId: string) => {
      if (!channel || !isConnected) return;

      try {
        await channel.addMembers([participantId]);
        console.log(`✅ Added participant ${participantId} to chat`);
        return true;
      } catch (error) {
        console.log(
          `ℹ️ Could not add participant ${participantId} to chat:`,
          error
        );
        return false;
      }
    },
    [channel, isConnected]
  );

  // Function to add all current participants to chat
  const addAllParticipantsToChat = useCallback(async () => {
    if (!channel || !isConnected || !call) return;

    try {
      const participants = call.state.participants;
      const participantIds = Object.keys(participants);

      // Filter out numeric IDs (Stream Video internal IDs) and get actual user IDs
      const validParticipants: any[] = [];

      if (participants instanceof Map) {
        participants.forEach((participant) => {
          if (participant.userId && !/^\d+$/.test(participant.userId)) {
            validParticipants.push({
              userId: participant.userId,
              name: participant.name,
              image: participant.image,
            });
          }
        });
      } else {
        Object.values(participants).forEach((participant: any) => {
          if (participant.userId && !/^\d+$/.test(participant.userId)) {
            validParticipants.push({
              userId: participant.userId,
              name: participant.name,
              image: participant.image,
            });
          }
        });
      }

      if (validParticipants.length > 0) {
        console.log(
          "👥 Processing valid participants for chat:",
          validParticipants
        );

        // First create Stream Chat users
        const createdUsers = await createStreamChatUsers(validParticipants);

        if (createdUsers.length > 0) {
          // Then add them to the channel
          const userIds = createdUsers.map((user: any) => user.id);
          console.log("👥 Adding created users to chat:", userIds);
          await channel.addMembers(userIds);
          console.log("✅ Added created users to chat");
          return true;
        }
      } else {
        console.log("ℹ️ No valid user IDs found in participants");
      }
    } catch (error) {
      console.log("ℹ️ Could not add all participants to chat:", error);
      return false;
    }
  }, [channel, isConnected, call, createStreamChatUsers]);

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
      const validParticipants: any[] = [];

      if (videoParticipants instanceof Map) {
        videoParticipants.forEach((participant) => {
          if (participant.userId && !/^\d+$/.test(participant.userId)) {
            validParticipants.push({
              userId: participant.userId,
              name: participant.name,
              image: participant.image,
            });
          }
        });
      } else {
        Object.values(videoParticipants).forEach((participant: any) => {
          if (participant.userId && !/^\d+$/.test(participant.userId)) {
            validParticipants.push({
              userId: participant.userId,
              name: participant.name,
              image: participant.image,
            });
          }
        });
      }

      // Find participants who aren't in chat yet
      const missingParticipants = validParticipants.filter(
        (participant) => !currentMembers.includes(participant.userId)
      );

      if (missingParticipants.length > 0) {
        console.log(
          "🔍 Found missing participants for chat:",
          missingParticipants
        );

        // Create Stream Chat users first
        const createdUsers = await createStreamChatUsers(missingParticipants);

        if (createdUsers.length > 0) {
          // Then add them to the channel
          const userIds = createdUsers.map((user: any) => user.id);
          console.log("🔍 Adding missing participants to chat:", userIds);
          await channel.addMembers(userIds);
          console.log("✅ Added missing participants to chat");
          return true;
        }
      }

      return false;
    } catch (error) {
      console.log("ℹ️ Could not ensure chat access:", error);
      return false;
    }
  }, [channel, isConnected, call, createStreamChatUsers]);

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
    call.on("participant.joined", handleParticipantJoined);
    call.on("participant.left", handleParticipantLeft);

    // Initial check
    setTimeout(() => {
      debugParticipants(); // Debug first
      ensureChatAccess();
    }, 2000);

    return () => {
      call.off("participant.joined", handleParticipantJoined);
      call.off("participant.left", handleParticipantLeft);
    };
  }, [isConnected, call, ensureChatAccess, debugParticipants]);

  return {
    addParticipantToChat,
    addAllParticipantsToChat,
    ensureChatAccess,
    debugParticipants,
    createStreamChatUsers,
  };
};
