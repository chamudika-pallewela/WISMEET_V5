import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

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

interface UseGetDatabaseMeetingsReturn {
  meetings: Meeting[];
  upcomingMeetings: Meeting[];
  pastMeetings: Meeting[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useGetDatabaseMeetings = (): UseGetDatabaseMeetingsReturn => {
  const { isSignedIn, user } = useUser();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = async () => {
    if (!isSignedIn || !user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Hook Debug - Fetching meetings...');
      const response = await fetch('/api/meetings/get?filter=all&limit=50');
      
      console.log('🔍 Hook Debug - Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to fetch meetings');
      }

      const data = await response.json();
      console.log('🔍 Hook Debug - API response:', data);
      
      if (data.success) {
        console.log('🔍 Hook Debug - Setting meetings:', data.meetings.length);
        setMeetings(data.meetings);
      } else {
        throw new Error(data.error || 'Failed to fetch meetings');
      }
    } catch (err) {
      console.error('Error fetching meetings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch meetings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [isSignedIn, user]);

  // Filter meetings based on time
  const upcomingMeetings = meetings.filter(meeting => meeting.isUpcoming);
  const pastMeetings = meetings.filter(meeting => meeting.isPast);

  return {
    meetings,
    upcomingMeetings,
    pastMeetings,
    isLoading,
    error,
    refetch: fetchMeetings
  };
};
