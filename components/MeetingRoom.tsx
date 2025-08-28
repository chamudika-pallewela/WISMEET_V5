'use client';
import { useState, useEffect } from 'react';
import {
  CallControls,
  CallParticipantsList,
  CallStatsButton,
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
} from '@stream-io/video-react-sdk';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, LayoutList, X, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import Loader from './Loader';
import EndCallButton from './EndCallButton';
import { cn } from '@/lib/utils';

type CallLayoutType = 'grid' | 'speaker-left' | 'speaker-right';

const MeetingRoom = () => {
  const searchParams = useSearchParams();
  const isPersonalRoom = !!searchParams.get('personal');
  const router = useRouter();
  const [layout, setLayout] = useState<CallLayoutType>('speaker-left');
  const [showParticipants, setShowParticipants] = useState(false);
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const call = useCall();

  // Initialize devices based on setup preferences
  useEffect(() => {
    if (call) {
      const initialCameraEnabled = call.state.custom?.initialCameraEnabled;
      const initialMicEnabled = call.state.custom?.initialMicEnabled;

      if (initialCameraEnabled === false) {
        call.camera.disable();
      }
      if (initialMicEnabled === false) {
        call.microphone.disable();
      }
    }
  }, [call]);

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
    const participantsBarPosition: 'left' | 'right' = layout === 'speaker-right' ? 'left' : 'right';

    switch (layout) {
      case 'grid':
        return (
          <div className="h-full w-full">
            <PaginatedGridLayout />
          </div>
        );
      case 'speaker-right':
      case 'speaker-left':
        return (
          <div className="h-full w-full">
            <SpeakerLayout
              participantsBarPosition={participantsBarPosition}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative flex h-screen flex-col bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 right-0 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute -bottom-1/2 left-0 h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

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
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full border-l border-gray-800 bg-gray-900/95 backdrop-blur-xl md:relative md:w-80"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-gray-800 p-4">
                  <h2 className="text-lg font-semibold text-white">Participants</h2>
                  <button
                    onClick={() => setShowParticipants(false)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <CallParticipantsList 
                  onClose={() => setShowParticipants(false)}
                />
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
        <CallControls 
          onLeave={() => router.push('/')}
        />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-white transition-colors hover:bg-gray-700 md:px-4">
            <LayoutList className="h-5 w-5" />
            <span className="hidden text-sm md:inline">Layout</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="border-gray-700 bg-gray-800">
            {['Grid', 'Speaker-Left', 'Speaker-Right'].map((item) => (
              <DropdownMenuItem
                key={item}
                onClick={() => setLayout(item.toLowerCase() as CallLayoutType)}
                className="text-white hover:bg-gray-700"
              >
                {item}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <CallStatsButton />

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
        </button>

        {!isPersonalRoom && <EndCallButton />}
      </motion.div>
    </div>
  );
};

export default MeetingRoom;
