"use client";

import { motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Calendar, 
  Clock, 
  Users, 
  Video, 
  Copy, 
  Crown,
  User
} from 'lucide-react';

interface Meeting {
  _id: string;
  meetingId: string;
  hostId: string;
  hostName: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  guests: string[];
  timezone: string;
  notificationTime: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  meetingUrl: string;
  createdAt: string;
  updatedAt: string;
  isHost: boolean;
  isUpcoming: boolean;
  isPast: boolean;
  timeUntilStart: number | null;
}

interface MeetingCardProps {
  meeting: Meeting;
  index?: number;
}

const MeetingCard = ({ meeting, index = 0 }: MeetingCardProps) => {
  const startTime = new Date(meeting.startTime);
  const endTime = new Date(meeting.endTime);
  const now = new Date();

  const getStatusColor = () => {
    if (meeting.status === 'cancelled') return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (meeting.status === 'completed') return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    if (meeting.status === 'ongoing') return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (meeting.isPast) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  };

  const getStatusText = () => {
    if (meeting.status === 'cancelled') return 'Cancelled';
    if (meeting.status === 'completed') return 'Completed';
    if (meeting.status === 'ongoing') return 'Live Now';
    if (meeting.isPast) return 'Past';
    return 'Upcoming';
  };

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(meeting.meetingUrl);
    // You can add a toast notification here
  };

  const getTimeDisplay = () => {
    if (meeting.isPast) {
      return formatDistanceToNow(startTime, { addSuffix: true });
    }
    
    if (meeting.timeUntilStart !== null) {
      if (meeting.timeUntilStart === 0) {
        return 'Today';
      } else if (meeting.timeUntilStart === 1) {
        return 'Tomorrow';
      } else {
        return `In ${meeting.timeUntilStart} days`;
      }
    }
    
    return format(startTime, 'MMM d, yyyy');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group relative overflow-hidden rounded-xl bg-gray-800/50 p-6 hover:bg-gray-800/70 transition-all duration-300 border border-gray-700/30 hover:border-gray-600/50"
    >
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-lg mb-1 truncate">
              {meeting.title}
            </h3>
            <p className="text-gray-400 text-sm line-clamp-2">
              {meeting.description || 'No description provided'}
            </p>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor()}`}>
              {getStatusText()}
            </span>
            {meeting.isHost && (
              <div className="p-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                <Crown className="w-3 h-3 text-yellow-400" />
              </div>
            )}
          </div>
        </div>

        {/* Meeting Details */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>{format(startTime, 'EEEE, MMMM d, yyyy')}</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            <span>
              {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
            </span>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <Users className="w-4 h-4" />
            <span>{meeting.guests.length + 1} participants</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <User className="w-4 h-4" />
            <span>Host: {meeting.hostName}</span>
          </div>
        </div>

        {/* Time indicator */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-300">
            {getTimeDisplay()}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {meeting.isUpcoming && meeting.status === 'scheduled' && (
            <Link
              href={meeting.meetingUrl}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Video className="w-4 h-4" />
              Join Meeting
            </Link>
          )}
          
          {meeting.isPast && (
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium">
              <Video className="w-4 h-4" />
              View Recording
            </button>
          )}
          
          <button
            onClick={copyMeetingLink}
            className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-gray-300 transition-colors text-sm"
          >
            <Copy className="w-4 h-4" />
            Copy Link
          </button>
        </div>
      </div>

      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
    </motion.div>
  );
};

export default MeetingCard;
