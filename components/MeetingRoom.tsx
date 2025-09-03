"use client";
import { useState, useEffect } from "react";
import {
  CallControls,
  CallParticipantsList,
  CallStatsButton,
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
} from "@stream-io/video-react-sdk";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  LayoutList,
  X,
  ChevronLeft,
  MessageSquare,
  Grid3X3,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import Loader from "./Loader";
import EndCallButton from "./EndCallButton";
import MeetingChat from "./MeetingChat";
import ChatHistory from "./ChatHistory";
import { cn } from "@/lib/utils";
import { useParticipantName } from "@/providers/ParticipantNameProvider";
import { useChatPersistence } from "@/hooks/useChatPersistence";
import { useChatParticipants } from "@/hooks/useChatParticipants";

type CallLayoutType =
  | "auto"
  | "grid"
  | "speaker-left"
  | "speaker-right"
  | "spotlight";

const MeetingRoom = () => {
  const searchParams = useSearchParams();
  const isPersonalRoom = !!searchParams.get("personal");
  const router = useRouter();
  const [layout, setLayout] = useState<CallLayoutType>("auto");
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const { useCallCallingState } = useCallStateHooks();
  const [isRecording, setIsRecording] = useState(false);
  const callingState = useCallCallingState();
  const call = useCall();

  // Get participant name from context
  const { participantName } = useParticipantName();

  // Initialize chat persistence
  useChatPersistence();

  // Initialize chat participants management
  const { debugParticipants } = useChatParticipants();

  // Count active participants (excluding local user)
  const participants = call?.state.participants || {};
  const participantIds = Object.keys(participants);
  const activeParticipants = participantIds.filter((id) => {
    const participant = (participants as any)[id];
    return participant && !participant.isLocal && participant.isSpeaking;
  });
  const totalParticipants = participantIds.length;
  const hasMultipleParticipants = totalParticipants > 1;

  // Auto-determine best layout based on participant count
  const getAutoLayout = (): CallLayoutType => {
    if (totalParticipants <= 2) return "speaker-left";
    if (totalParticipants <= 4) return "grid";
    if (totalParticipants <= 6) return "spotlight";
    return "grid"; // Default to grid for larger groups
  };
  const handleRecordingToggle = async () => {
    if (!call) return;

    try {
      if (!isRecording) {
        await call.startRecording();
        setIsRecording(true);
        console.log("Recording started...");
      } else {
        await call.stopRecording();
        setIsRecording(false);
        console.log("Recording stopped. Processing...");

        // Poll recordings until available
        let recordings: any[] = [];
        let attempts = 0;

        while (attempts < 5) {
          const response = await call.queryRecordings();
          recordings = response.recordings || [];
          if (recordings.length > 0) break;

          attempts++;
          console.log("⏳ Waiting for recording to process...");
          await new Promise((res) => setTimeout(res, 5000));
        }

        if (!recordings || recordings.length === 0) {
          console.warn("⚠️ No recordings available yet.");
          return;
        }

        const latest = recordings[recordings.length - 1];

        // 🔹 Collect all participant IDs
        const participantIds = Array.from(call.state.participants.values()).map(
          (p) => p.userId
        );

        // Save metadata + URL
        await fetch("/api/recordings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meetingId: call.id,
            callId: call.id,
            recordingUrl: latest.url,
            startedAt: latest.start_time,
            endedAt: latest.end_time,
            createdBy: participantIds, // ✅ array of userIds instead of single name
          }),
        });

        console.log("✅ Recording saved:", latest.url);
      }
    } catch (err) {
      console.error("❌ Recording error:", err);
    }
  };

  // Get the effective layout (auto or manual)
  const effectiveLayout = layout === "auto" ? getAutoLayout() : layout;

  // Initialize devices based on setup preferences
  useEffect(() => {
    if (call && callingState === CallingState.JOINED) {
      const initialCameraEnabled = call.state.custom?.initialCameraEnabled;
      const initialMicEnabled = call.state.custom?.initialMicEnabled;

      // Apply device states after joining with multiple attempts
      const applyDeviceStates = async () => {
        try {
          if (initialCameraEnabled === false) {
            await call.camera.disable();
          }
          if (initialMicEnabled === false) {
            await call.microphone.disable();
          }
        } catch (err) {
          console.error("Error applying initial device states:", err);
          // Retry after a short delay
          setTimeout(async () => {
            try {
              if (initialCameraEnabled === false) {
                await call.camera.disable();
              }
              if (initialMicEnabled === false) {
                await call.microphone.disable();
              }
            } catch (retryErr) {
              console.error("Retry failed for device states:", retryErr);
            }
          }, 500);
        }
      };

      // Apply immediately and also after a delay to ensure it takes effect
      applyDeviceStates();
      setTimeout(applyDeviceStates, 200);
    }
  }, [call, callingState]);

  if (callingState !== CallingState.JOINED) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Loader />
        </motion.div>
      </div>
    );
  }

  const CallLayout = () => {
    const participantsBarPosition: "left" | "right" =
      effectiveLayout === "speaker-right" ? "left" : "right";

    switch (effectiveLayout) {
      case "grid":
        return (
          <div className="h-full w-full">
            <PaginatedGridLayout groupSize={hasMultipleParticipants ? 9 : 4} />
          </div>
        );
      case "spotlight":
        return (
          <div className="h-full w-full">
            <PaginatedGridLayout groupSize={hasMultipleParticipants ? 6 : 4} />
          </div>
        );
      case "speaker-right":
      case "speaker-left":
        return (
          <div className="h-full w-full">
            <SpeakerLayout participantsBarPosition={participantsBarPosition} />
          </div>
        );
      default:
        return (
          <div className="h-full w-full">
            <PaginatedGridLayout groupSize={hasMultipleParticipants ? 9 : 4} />
          </div>
        );
    }
  };

  return (
    <div className="relative flex h-screen flex-col bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 right-0 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute -bottom-1/2 left-0 h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      {/* Participant Count Indicator */}
      {hasMultipleParticipants && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10"
        >
          <div className="flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-700">
            <Users className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-white font-medium">
              {totalParticipants}{" "}
              {totalParticipants === 1 ? "Participant" : "Participants"}
            </span>
            {activeParticipants.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-green-400">
                  {activeParticipants.length} speaking
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Video Layout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative flex flex-1 items-center justify-center p-4"
        >
          <div className="relative h-full w-full max-w-[1440px]">
            <CallLayout />
          </div>
        </motion.div>

        {/* Participants List */}
        <AnimatePresence>
          {showParticipants && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 20 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full border-l border-gray-800 bg-gray-900/95 backdrop-blur-xl md:relative md:w-80"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-gray-800 p-4">
                  <h2 className="text-lg font-semibold text-white">
                    Participants
                  </h2>
                  <button
                    onClick={() => setShowParticipants(false)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <CallParticipantsList
                    onClose={() => setShowParticipants(false)}
                  />

                  {/* Manual Chat Access Button */}
                  <div className="p-4 border-t border-gray-800">
                    <button
                      onClick={() => {
                        // This will trigger the chat participants hook
                        console.log("🔄 Manually refreshing chat access...");
                      }}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm mb-2"
                    >
                      🔄 Refresh Chat Access
                    </button>
                    <button
                      onClick={() => {
                        debugParticipants();
                      }}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      🔍 Debug Participants
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Participants Toggle */}
        <AnimatePresence>
          {!showParticipants && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={() => setShowParticipants(true)}
              className="fixed right-4 top-1/2 z-40 -translate-y-1/2 rounded-l-xl bg-gray-800/90 p-2 text-white backdrop-blur-sm hover:bg-gray-700 md:hidden"
            >
              <ChevronLeft className="h-6 w-6" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative flex flex-wrap items-center justify-center gap-2 bg-gray-900/90 p-4 backdrop-blur-sm md:gap-4"
      >
        <CallControls onLeave={() => router.push("/")} />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-white transition-colors hover:bg-gray-700 md:px-4">
            <LayoutList className="h-5 w-5" />
            <span className="hidden text-sm md:inline">Layout</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="border-gray-700 bg-gray-800">
            {[
              { key: "auto", label: "Auto", icon: User },
              { key: "grid", label: "Grid", icon: Grid3X3 },
              { key: "speaker-left", label: "Speaker Left", icon: User },
              { key: "speaker-right", label: "Speaker Right", icon: User },
              { key: "spotlight", label: "Spotlight", icon: Grid3X3 },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <DropdownMenuItem
                  key={item.key}
                  onClick={() => setLayout(item.key as CallLayoutType)}
                  className={cn(
                    "text-white hover:bg-gray-700 flex items-center gap-2",
                    layout === item.key && "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {layout === item.key && (
                    <span className="ml-auto text-xs bg-blue-500 px-2 py-1 rounded">
                      Active
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <CallStatsButton />
        <button
          onClick={handleRecordingToggle}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 transition-colors md:px-4",
            isRecording
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-gray-800 text-white hover:bg-gray-700"
          )}
        >
          {isRecording ? "⏹ Stop Recording" : "⏺ Start Recording"}
        </button>

        <button
          onClick={() => setShowParticipants((prev) => !prev)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 transition-colors md:px-4",
            showParticipants
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-800 text-white hover:bg-gray-700"
          )}
        >
          <Users className="h-5 w-5" />
          <span className="hidden text-sm md:inline">Participants</span>
          {hasMultipleParticipants && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              {totalParticipants}
            </span>
          )}
        </button>

        <button
          onClick={() => setShowChatHistory(true)}
          className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-white transition-colors hover:bg-gray-700 md:px-4"
        >
          <MessageSquare className="h-5 w-5" />
          <span className="hidden text-sm md:inline">History</span>
        </button>

        {!isPersonalRoom && <EndCallButton />}
      </motion.div>

      {/* Chat Component */}
      <MeetingChat />

      {/* Chat History Modal */}
      <ChatHistory
        meetingId={call?.id || ""}
        isOpen={showChatHistory}
        onClose={() => setShowChatHistory(false)}
      />
    </div>
  );
};

export default MeetingRoom;
