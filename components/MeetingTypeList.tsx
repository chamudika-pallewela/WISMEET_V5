'use client';

/* eslint-disable camelcase */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import HomeCard from './HomeCard';
import MeetingModal from './MeetingModal';
import ScheduleMeetingModal from './ScheduleMeetingModal';
import { Call, useStreamVideoClient } from '@stream-io/video-react-sdk';
import { useUser } from '@clerk/nextjs';
import Loader from './Loader';
import { Textarea } from './ui/textarea';
import ReactDatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useToast } from './ui/use-toast';
import { Input } from './ui/input';

interface MeetingData {
  title: string;
  guests: string[];
  date: Date;
  time: Date;
  timezone: string;
  notificationTime: number;
  description: string;
}

const initialValues = {
  dateTime: new Date(),
  description: '',
  link: '',
};

const MeetingTypeList = () => {
  const router = useRouter();
  const [meetingState, setMeetingState] = useState<
    'isScheduleMeeting' | 'isJoiningMeeting' | 'isInstantMeeting' | undefined
  >(undefined);
  const [values, setValues] = useState(initialValues);
  const [callDetail, setCallDetail] = useState<Call>();
  const [isCreating, setIsCreating] = useState(false);
  const client = useStreamVideoClient();
  const { user } = useUser();
  const { toast } = useToast();

  const createMeeting = async () => {
    if (!client || !user) {
      toast({ 
        title: 'Error',
        description: 'Please sign in to create a meeting',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsCreating(true);
      const id = crypto.randomUUID();
      const call = client.call('default', id);
      
      if (!call) {
        throw new Error('Failed to create meeting');
      }

      const startsAt = values.dateTime.toISOString();
      const description = values.description || 'Instant Meeting';

      // Create member object with required fields
      const member = {
        user_id: user.id,
        role: 'host',
      };

      await call.getOrCreate({
        data: {
          starts_at: startsAt,
          members: [member],
          custom: {
            description,
            host: user.fullName || user.username,
          },
        },
      });

      setCallDetail(call);
      
      if (meetingState === 'isInstantMeeting') {
        router.push(`/meeting/${call.id}`);
      }

      toast({
        title: 'Success',
        description: meetingState === 'isInstantMeeting' 
          ? 'Meeting created! Redirecting...'
          : 'Meeting scheduled successfully',
      });
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast({ 
        title: 'Error',
        description: 'Failed to create meeting. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinMeeting = () => {
    if (!values.link) {
      toast({
        title: 'Error',
        description: 'Please enter a meeting link',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Extract meeting ID from link
      const meetingId = values.link.split('/').pop();
      if (!meetingId) {
        throw new Error('Invalid meeting link');
      }
      router.push(`/meeting/${meetingId}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Invalid meeting link. Please check and try again.',
        variant: 'destructive'
      });
    }
  };

  const handleScheduleMeeting = async (meetingData: MeetingData) => {
    if (!client || !user) {
      toast({ 
        title: 'Error',
        description: 'Please sign in to schedule a meeting',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsCreating(true);
      const id = crypto.randomUUID();
      const call = client.call('default', id);
      
      if (!call) {
        throw new Error('Failed to create meeting');
      }

      // Combine date and time
      const meetingDateTime = new Date(meetingData.date);
      meetingDateTime.setHours(meetingData.time.getHours());
      meetingDateTime.setMinutes(meetingData.time.getMinutes());
      
      const startTime = meetingDateTime;
      const endTime = new Date(meetingDateTime.getTime() + (60 * 60 * 1000)); // Default 1 hour duration
      const startsAt = startTime.toISOString();
      const description = meetingData.description || 'Scheduled Meeting';

      // Create member object with required fields
      const member = {
        user_id: user.id,
        role: 'host',
      };

      await call.getOrCreate({
        data: {
          starts_at: startsAt,
          members: [member],
          custom: {
            description,
            host: user.fullName || user.username,
            guests: meetingData.guests,
            timezone: meetingData.timezone,
            notificationTime: meetingData.notificationTime,
          },
        },
      });

      setCallDetail(call);

      // Send invitation emails to guests
      if (meetingData.guests && meetingData.guests.length > 0) {
        try {
          const invitationResponse = await fetch('/api/meetings/send-invitations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              meetingId: call.id,
              title: meetingData.title,
              description: meetingData.description,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              guestEmails: meetingData.guests,
              hostName: user.fullName || user.emailAddresses[0].emailAddress
            }),
          });

          if (invitationResponse.ok) {
            const invitationResult = await invitationResponse.json();
            console.log('Invitation emails sent:', invitationResult);
            
            // Show success message with email statistics
            if (invitationResult.statistics) {
              const { successful, failed, total } = invitationResult.statistics;
              if (successful > 0) {
                toast({
                  title: 'Meeting Scheduled & Invitations Sent',
                  description: `Meeting created successfully! ${successful}/${total} invitation emails sent successfully.${failed > 0 ? ` ${failed} failed.` : ''}`,
                });
              } else {
                toast({
                  title: 'Meeting Scheduled',
                  description: 'Meeting created successfully, but invitation emails failed to send. Please check your email configuration.',
                  variant: 'destructive'
                });
              }
            }
          } else {
            console.error('Failed to send invitation emails');
            toast({
              title: 'Meeting Scheduled',
              description: 'Meeting created successfully, but invitation emails failed to send. Please check your email configuration.',
              variant: 'destructive'
            });
          }
        } catch (emailError) {
          console.error('Error sending invitation emails:', emailError);
          toast({
            title: 'Meeting Scheduled',
            description: 'Meeting created successfully, but invitation emails failed to send. Please check your email configuration.',
            variant: 'destructive'
          });
        }
      } else {
        // No guests to send emails to
        toast({
          title: 'Success',
          description: 'Meeting scheduled successfully!',
        });
      }

      setMeetingState(undefined);
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      toast({ 
        title: 'Error',
        description: 'Failed to schedule meeting. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (!client || !user) return <Loader />;

  const meetingLink = callDetail ? `${process.env.NEXT_PUBLIC_BASE_URL}/meeting/${callDetail.id}` : '';

  return (
    <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      <HomeCard
        img="/icons/add-meeting.svg"
        title="Start Instant Meeting"
        description="Launch a professional HD video conference instantly with advanced collaboration tools and secure encryption."
        handleClick={() => setMeetingState('isInstantMeeting')}
        features={[
          "HD Video & Audio",
          "Screen Sharing",
          "Live Captions",
          "Recording"
        ]}
        stats={[
          { label: 'Quality', value: 'HD' },
          { label: 'Latency', value: '50ms' }
        ]}
        badge="Recommended"
      />
      <HomeCard
        img="/icons/join-meeting.svg"
        title="Join Meeting"
        description="Connect to an existing meeting seamlessly with one click. No downloads required, just pure browser-based HD quality."
        className="bg-gradient-to-br from-blue-600/5 to-blue-700/5"
        handleClick={() => setMeetingState('isJoiningMeeting')}
        features={[
          "Quick Join",
          "Guest Access",
          "Meeting Preview",
          "Chat Support"
        ]}
        stats={[
          { label: 'Active', value: '1.2k' },
          { label: 'Success', value: '99%' }
        ]}
      />
      <HomeCard
        img="/icons/schedule.svg"
        title="Schedule Meeting"
        description="Plan ahead with smart scheduling, calendar integration, automated reminders, and recurring meeting support."
        className="bg-gradient-to-br from-purple-600/5 to-purple-700/5"
        handleClick={() => setMeetingState('isScheduleMeeting')}
        features={[
          "Calendar Sync",
          "Reminders",
          "Recurring",
          "Time Zones"
        ]}
        stats={[
          { label: 'Today', value: '89' },
          { label: 'Week', value: '412' }
        ]}
        badge="Pro"
      />
      <HomeCard
        img="/icons/recordings.svg"
        title="Meeting Library"
        description="Access your secure cloud recordings with automatic transcription, analytics, and easy sharing options."
        className="bg-gradient-to-br from-amber-600/5 to-amber-700/5"
        handleClick={() => router.push('/recordings')}
        features={[
          "Cloud Storage",
          "Transcripts",
          "Analytics",
          "Sharing"
        ]}
        stats={[
          { label: 'Stored', value: '156' },
          { label: 'Hours', value: '380' }
        ]}
      />

      {/* Schedule Meeting Modal */}
      <ScheduleMeetingModal
        isOpen={meetingState === 'isScheduleMeeting'}
        onClose={() => setMeetingState(undefined)}
        onSchedule={handleScheduleMeeting}
      />

      {/* Success Modal for Scheduled Meeting */}
      {callDetail && (
        <MeetingModal
          isOpen={meetingState === 'isScheduleMeeting' && !!callDetail}
          onClose={() => {
            setMeetingState(undefined);
            setCallDetail(undefined);
            setValues(initialValues);
          }}
          title="Meeting Scheduled!"
          description="Your meeting has been scheduled successfully"
          handleClick={() => {
            navigator.clipboard.writeText(meetingLink);
            toast({ 
              title: 'Success',
              description: 'Meeting link copied to clipboard'
            });
          }}
          image="/icons/checked.svg"
          buttonIcon="/icons/copy.svg"
          buttonText="Copy Meeting Link"
        />
      )}

      <MeetingModal
        isOpen={meetingState === 'isJoiningMeeting'}
        onClose={() => {
          setMeetingState(undefined);
          setValues(initialValues);
        }}
        title="Join Meeting"
        description="Enter the meeting link to join"
        buttonText="Join Meeting"
        handleClick={handleJoinMeeting}
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">
            Meeting Link
          </label>
          <Input
            placeholder="Paste meeting link here..."
            value={values.link}
            onChange={(e) => setValues({ ...values, link: e.target.value })}
            className="bg-gray-800/50 border-gray-700 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </MeetingModal>

      <MeetingModal
        isOpen={meetingState === 'isInstantMeeting'}
        onClose={() => setMeetingState(undefined)}
        title="Start Instant Meeting"
        description="Create a new meeting and join immediately"
        buttonText={isCreating ? 'Creating Meeting...' : 'Start Meeting'}
        handleClick={createMeeting}
      />
    </section>
  );
};

export default MeetingTypeList;
