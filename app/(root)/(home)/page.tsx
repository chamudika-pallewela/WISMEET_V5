'use client';

import { motion } from 'framer-motion';
import MeetingTypeList from '@/components/MeetingTypeList';
import MeetingCard from '@/components/MeetingCard';
import Image from 'next/image';
import { useGetDatabaseMeetings } from '@/hooks/useGetDatabaseMeetings';
import { useGetCalls } from '@/hooks/useGetCalls';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';

import ScheduleMeetingModal from '@/components/ScheduleMeetingModal';
import { Call, useStreamVideoClient } from '@stream-io/video-react-sdk';
import { useToast } from '@/components/ui/use-toast';
import { 
  Clock, 
  Users, 
  Video, 
  Mic, 
  Calendar, 
  MessageSquare, 
  Play, 
  Share2, 
  Copy, 
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Activity,
  Star,
  TrendingUp
} from 'lucide-react';

interface MeetingData {
  title: string;
  guests: string[];
  date: Date;
  time: Date;
  timezone: string;
  notificationTime: number;
  description: string;
}

const LoadingSpinner = () => (
  <div className="flex items-center gap-2 text-gray-400">
    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
    <span>Loading...</span>
  </div>
);
const StatCard = ({ icon: Icon, value, label, trend, className }: any) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -2 }}
    className={cn(
      "relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 border border-gray-700/30 backdrop-blur-xl",
      className
    )}
  >
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20">
          <Icon className="w-6 h-6 text-blue-400" />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-green-400 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>{trend}</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          {value}
        </div>
        <div className="text-sm text-gray-400">{label}</div>
      </div>
    </div>
  </motion.div>
);
const FeatureCard = ({ icon: Icon, title, description, gradient }: any) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -2 }}
    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 border border-gray-700/30 backdrop-blur-xl hover:border-gray-600/50 transition-all duration-300"
  >
    <div className={`absolute inset-0 ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
    <div className="relative z-10">
      <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 mb-4 w-fit">
        <Icon className="w-6 h-6 text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

const Home = () => {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const date = (new Intl.DateTimeFormat('en-US', { dateStyle: 'full' })).format(now);
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser();
  const [isClient, setIsClient] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const client = useStreamVideoClient();
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { upcomingMeetings, isLoading: meetingsLoading, refetch: refetchMeetings } = useGetDatabaseMeetings();
  const { callRecordings, isLoading: recordingsLoading } = useGetCalls();

  // Debug logs
  console.log('🔍 Home Debug - upcomingMeetings:', upcomingMeetings);
  console.log('🔍 Home Debug - meetingsLoading:', meetingsLoading);
  console.log('🔍 Home Debug - upcomingMeetings length:', upcomingMeetings?.length);

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
      
      const startsAt = meetingDateTime.toISOString();
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
              startTime: meetingDateTime.toISOString(),
              endTime: new Date(meetingDateTime.getTime() + (60 * 60 * 1000)).toISOString(), // Default 1 hour duration
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
                // Refresh upcoming meetings after successful scheduling
                refetchMeetings();
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
        // Refresh upcoming meetings after successful scheduling
        refetchMeetings();
      }

      setIsScheduleModalOpen(false);
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

  // Show loading state while user authentication is being checked
  if (!isClient || !isUserLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white p-6 lg:p-8 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Show sign-in message if user is not authenticated
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white p-6 lg:p-8 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Welcome to WISMeet</h2>
          <p className="text-gray-400">Please sign in to access your meetings and recordings.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-[#0f1620] to-black text-white"
    >
      {/* Header Section */}
      <div className="px-6 lg:px-8 py-8">
        <motion.div 
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="flex items-center justify-between mb-12"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 p-0.5">
              <div className="h-full w-full rounded-2xl bg-gray-900 flex items-center justify-center">
                <Image src="/icons/logo.svg" alt="Logo" width={28} height={28} className="text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                WISMeet Pro
              </h1>
              <p className="text-sm text-gray-400">Professional Video Conferencing</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-gray-800/30 backdrop-blur-xl rounded-full px-5 py-2.5 border border-gray-700/30">
              <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-gray-300">System Online</span>
            </div>
          </div>
        </motion.div>

        {/* Hero Section */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="relative mb-12"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-3xl" />
          <div className="relative overflow-hidden rounded-3xl bg-gray-900/50 backdrop-blur-xl border border-gray-800/50">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 blur-[120px] rounded-full" />
            
            <div className="relative p-8 lg:p-12">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-8">
                  <div className="space-y-6">
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-full px-5 py-2 border border-blue-500/10"
                    >
                      <Image src="/icons/Video.svg" alt="Video" width={18} height={18} className="opacity-70" />
                      <span className="text-sm font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Enterprise-Grade Video Conferencing
                      </span>
                    </motion.div>
                    
                    <motion.h2 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-4xl lg:text-5xl font-bold leading-tight"
                    >
                      Connect with Crystal Clear{' '}
                      <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        HD Quality
                      </span>
                    </motion.h2>
                    
                    <motion.p 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-lg text-gray-400 leading-relaxed"
                    >
                      Experience seamless video meetings with enterprise-grade security, 
                      crystal clear audio, and advanced collaboration tools.
                    </motion.p>
                  </div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-wrap gap-6"
                  >
                    {[
                      { icon: '🔒', label: 'End-to-End Encryption' },
                      { icon: '🎥', label: 'HD Video Quality' },
                      { icon: '🔊', label: 'Crystal Clear Audio' },
                      { icon: '📊', label: 'Screen Sharing' },
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-gray-400">
                        <span className="text-lg">{feature.icon}</span>
                        {feature.label}
                      </div>
                    ))}
                  </motion.div>
                </div>

                <div className="relative">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700/50"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <div className="space-y-1">
                        <div className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                          {time}
                        </div>
                        <div className="text-gray-400">{date}</div>
                      </div>
                      <div className="flex items-center gap-2 bg-green-500/10 text-green-400 rounded-full px-4 py-2">
                        <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm font-medium">Ready to Connect</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Active Users', value: '2.4k+' },
                        { label: 'Meetings Today', value: '186' },
                        { label: 'Uptime', value: '99.9%' },
                        { label: 'Bandwidth', value: 'Ultra' },
                      ].map((stat, index) => (
                        <div key={index} className="bg-gray-800/50 rounded-xl p-4">
                          <div className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                            {stat.value}
                          </div>
                          <div className="text-sm text-gray-400">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        {/* Premium Stats Section */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-12"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard 
                icon={Users} 
                value="2.4k+" 
                label="Active Users" 
                trend="+12%"
                className="from-blue-500/10 to-cyan-500/10"
              />
              <StatCard 
                icon={Calendar} 
                value="186" 
                label="Meetings Today" 
                trend="+8%"
                className="from-purple-500/10 to-pink-500/10"
              />
              <StatCard 
                icon={BarChart3} 
                value="99.9%" 
                label="Uptime" 
                trend="+0.1%"
                className="from-green-500/10 to-emerald-500/10"
              />
              <StatCard 
                icon={Zap} 
                value="Ultra HD" 
                label="Bandwidth" 
                trend="+15%"
                className="from-orange-500/10 to-red-500/10"
              />
            </div>
          </motion.div>

        {/* Quick Actions Section */}
        <section className="px-6 lg:px-8 py-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Quick Actions
              </h3>
              <p className="text-sm text-gray-400">Start or join meetings with enterprise-grade quality</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50">
                <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-gray-400">Network: Excellent</span>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium 
                  hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300
                  flex items-center gap-2"
              >
                <span>View All</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
            </div>
          </div>
          
          <MeetingTypeList />

          {/* Upcoming Meetings Section */}
          <div className="mt-12 space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-lg font-semibold text-white">Upcoming Meetings</h4>
                <p className="text-sm text-gray-400">Your scheduled meetings</p>
              </div>
              <Link 
                href="/upcoming"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2"
              >
                View All
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {meetingsLoading ? (
                  <div className="col-span-full flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : upcomingMeetings?.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-12 px-4">
                  <div className="bg-gray-800/50 rounded-full p-4 mb-4">
                    <Image
                      src="/icons/schedule.svg"
                      alt="No meetings"
                      width={32}
                      height={32}
                      className="opacity-50"
                    />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No Upcoming Meetings</h3>
                  <p className="text-gray-400 text-center mb-6">
                    You don't have any meetings scheduled. Would you like to schedule one now?
                  </p>
                  <button
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Schedule a Meeting
                  </button>
                </div>
              ) : (
                upcomingMeetings?.slice(0, 3).map((meeting: any, index: number) => (
                  <MeetingCard key={meeting.meetingId} meeting={meeting} index={index} />
                ))
              )}
            </div>
          </div>

          {/* Recent Recordings Section */}
          <div className="mt-12 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 border border-gray-800/50">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h4 className="text-lg font-semibold text-white">Recent Recordings</h4>
                <p className="text-sm text-gray-400">Your latest meeting recordings</p>
              </div>
              <Link 
                href="/recordings"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2"
              >
                View All
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recordingsLoading ? (
                <div className="col-span-full flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : callRecordings?.length === 0 ? (
                <div className="col-span-full text-center text-gray-400 py-8">
                  No recordings available
                </div>
              ) : (
                callRecordings?.slice(0, 3).map((recording: any, index: number) => (
                  <motion.div
                    key={recording.filename || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group relative overflow-hidden rounded-xl bg-gray-800/50 p-4 hover:bg-gray-800/70 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h5 className="font-medium text-white">
                          {recording.filename?.substring(0, 40) || 'Recorded Meeting'}
                        </h5>
                        <p className="text-sm text-gray-400">
                          {recording.end_time && formatDistanceToNow(new Date(recording.end_time), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          Recording
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      {recording.url && (
                        <a 
                          href={recording.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Watch Recording
                        </a>
                      )}
                      <button className="text-sm text-gray-400 hover:text-gray-300 transition-colors">
                        Share
                      </button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      

      {/* Schedule Meeting Modal */}
      <ScheduleMeetingModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSchedule={handleScheduleMeeting}
        isSendingInvitations={isCreating}
      />
    </motion.div>
  );
};

export default Home;
