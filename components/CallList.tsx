"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Loader from "./Loader";
import MeetingCard from "./MeetingCard";
import { useGetCalls } from "@/hooks/useGetCalls";

type CallListProps = {
  type: "ended" | "upcoming" | "recordings";
};

const CallList = ({ type }: CallListProps) => {
  const router = useRouter();
  const { endedCalls, upcomingCalls, isLoading: callsLoading } = useGetCalls();

  const [recordings, setRecordings] = useState<any[]>([]);
  const [recordingsLoading, setRecordingsLoading] = useState(false);

  useEffect(() => {
    if (type === "recordings") {
      const fetchRecordings = async () => {
        try {
          setRecordingsLoading(true);

          // TODO: replace with actual logged-in userId
          const userId = "user_31pTWCFVnuOFfEP1MqHNwvxVIew";
          const res = await fetch(`/api/recordings?createdBy=${userId}`);
          const data = await res.json();

          // 🔹 Normalize API response
          const normalized = (data.recordings || []).map((rec: any) => ({
            id: rec._id || rec.recordingId,
            callId: rec.callId,
            url: rec.recordingUrl,
            startTime: rec.startedAt,
            endTime: rec.endedAt,
            filename: rec.recordingId,
            isRecording: true,
          }));

          setRecordings(normalized);
        } catch (err) {
          console.error("Error fetching recordings:", err);
        } finally {
          setRecordingsLoading(false);
        }
      };
      fetchRecordings();
    }
  }, [type]);

  const getCalls = () => {
    switch (type) {
      case "ended":
        return endedCalls.map((c: any) => ({ ...c, isRecording: false }));
      case "upcoming":
        return upcomingCalls.map((c: any) => ({ ...c, isRecording: false }));
      case "recordings":
        return recordings;
      default:
        return [];
    }
  };

  const getNoCallsMessage = () => {
    switch (type) {
      case "ended":
        return "No Previous Calls";
      case "upcoming":
        return "No Upcoming Calls";
      case "recordings":
        return "No Recordings";
      default:
        return "";
    }
  };

  if (callsLoading || recordingsLoading) return <Loader />;

  const calls = getCalls();
  const noCallsMessage = getNoCallsMessage();

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {calls && calls.length > 0 ? (
        calls.map((meeting: any) => (
          <MeetingCard
            key={meeting.id || meeting.callId}
            icon={
              meeting.isRecording
                ? "/icons/recordings.svg"
                : type === "ended"
                  ? "/icons/previous.svg"
                  : "/icons/upcoming.svg"
            }
            title={
              meeting.isRecording
                ? meeting.filename?.substring(0, 20) || "Recording"
                : meeting.state?.custom?.description || "No Description"
            }
            date={
              meeting.isRecording
                ? new Date(meeting.startTime).toLocaleString()
                : meeting.state?.startsAt?.toLocaleString()
            }
            isPreviousMeeting={!meeting.isRecording && type === "ended"}
            link={
              meeting.isRecording
                ? meeting.url
                : `${process.env.NEXT_PUBLIC_BASE_URL}/meeting/${meeting.id}`
            }
            buttonIcon1={meeting.isRecording ? "/icons/play.svg" : undefined}
            buttonText={meeting.isRecording ? "Play" : "Start"}
            handleClick={
              meeting.isRecording
                ? () => router.push(meeting.url)
                : () => router.push(`/meeting/${meeting.id}`)
            }
          />
        ))
      ) : (
        <h1 className="text-2xl font-bold text-white">{noCallsMessage}</h1>
      )}
    </div>
  );
};

export default CallList;
