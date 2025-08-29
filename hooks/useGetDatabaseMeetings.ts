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
}

interface UseGetDatabaseMeetingsReturn {
  meetings: Meeting[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useGetDatabaseMeetings = (): UseGetDatabaseMeetingsReturn => {
  const { user } = useUser();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/debug/meetings?action=user');
      
      if (!response.ok) {
        throw new Error('Failed to fetch meetings');
      }

      const data = await response.json();
      
      if (data.success) {
        setMeetings(data.meetings || []);
      } else {
        throw new Error(data.error || 'Failed to fetch meetings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setMeetings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [user]);

  return {
    meetings,
    isLoading,
    error,
    refetch: fetchMeetings
  };
};
