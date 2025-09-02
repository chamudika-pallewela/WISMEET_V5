'use client';

import { useCall, useCallStateHooks } from '@stream-io/video-react-sdk';

import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import { useStreamChat } from '@/providers/StreamChatProvider';

const EndCallButton = () => {
  const call = useCall();
  const router = useRouter();
  const { channel } = useStreamChat();

  if (!call)
    throw new Error(
      'useStreamCall must be used within a StreamCall component.',
    );

  // https://getstream.io/video/docs/react/guides/call-and-participant-state/#participant-state-3
  const { useLocalParticipant } = useCallStateHooks();
  const localParticipant = useLocalParticipant();

  const isMeetingOwner =
    localParticipant &&
    call.state.createdBy &&
    localParticipant.userId === call.state.createdBy.id;

  if (!isMeetingOwner) return null;

  const endCall = async () => {
    try {
      // Save chat messages before ending call
      if (channel) {
        const response = await channel.getMessages();
        const messages = response.messages.map((msg: any) => ({
          senderId: msg.user.id,
          senderName: msg.user.name || 'Anonymous',
          message: msg.text,
          timestamp: new Date(msg.created_at),
          isPrivate: msg.type === 'ephemeral' || msg.parent_id,
          recipientId: msg.parent_id || null,
        }));

        // Save to database
        await fetch('/api/chat/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            meetingId: call.id,
            messages,
          }),
        });
      }

      await call.endCall();
      router.push('/');
    } catch (error) {
      console.error('Error ending call:', error);
      // Still end the call even if chat save fails
      await call.endCall();
      router.push('/');
    }
  };

  return (
    <Button onClick={endCall} className="bg-red-500">
      End call for everyone
    </Button>
  );
};

export default EndCallButton;
