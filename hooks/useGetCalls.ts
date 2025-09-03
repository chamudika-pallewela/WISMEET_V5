"use client";

import { useEffect, useState } from "react";
import { useStreamVideoClient, Call } from "@stream-io/video-react-sdk";
import { useUser } from "@clerk/nextjs";

type Recording = {
  id: string;
  callId: string;
  url: string;
  duration: number;
  createdAt: string;
  // 👆 shape depends on your /api/recordings response
};

export const useGetCalls = () => {
  const client = useStreamVideoClient();
  const { user, isLoaded: isUserLoaded } = useUser();

  const [endedCalls, setEndedCalls] = useState<Call[]>([]);
  const [upcomingCalls, setUpcomingCalls] = useState<Call[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCalls = async () => {
      if (!client || !isUserLoaded || !user) {
        setIsLoading(true);
        return;
      }

      try {
        setIsLoading(true);

        // ✅ Fetch upcoming calls
        const upcomingCallsResponse = await client.queryCalls({
          filter_conditions: {
            starts_at: { $gt: new Date().toISOString() },
            $or: [
              { created_by_user_id: user.id },
              { members: { $in: [user.id] } },
            ],
          },
          sort: [{ field: "starts_at", direction: 1 }],
          limit: 10,
        });

        // ✅ Fetch ended calls
        const endedCallsResponse = await client.queryCalls({
          filter_conditions: {
            ended_at: { $exists: true },
            $or: [
              { created_by_user_id: user.id },
              { members: { $in: [user.id] } },
            ],
          },
          sort: [{ field: "ended_at", direction: -1 }],
          limit: 10,
        });

        // ✅ Initialize calls
        const initializeCallObjects = async (calls: any[]) => {
          return Promise.all(
            calls.map(async (call) => {
              const callObj = client.call("default", call.id);
              await callObj.get();
              return callObj;
            })
          );
        };

        const [upcomingCallObjects, endedCallObjects] = await Promise.all([
          initializeCallObjects(upcomingCallsResponse.calls),
          initializeCallObjects(endedCallsResponse.calls),
        ]);

        // ✅ Fetch real recordings from your API
        const res = await fetch(`/api/recordings?createdBy=${user.id}`);
        const data = await res.json();

        setUpcomingCalls(upcomingCallObjects);
        setEndedCalls(endedCallObjects);
        setRecordings(data.recordings || []);
      } catch (err) {
        console.error("Error fetching calls:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalls();
    const intervalId = setInterval(fetchCalls, 30000); // auto refresh every 30s
    return () => clearInterval(intervalId);
  }, [client, user, isUserLoaded]);

  return {
    endedCalls,
    upcomingCalls,
    recordings, // ✅ now only from /api/recordings
    isLoading,
  };
};
