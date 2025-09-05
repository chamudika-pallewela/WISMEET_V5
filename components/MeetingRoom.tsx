'use client';
import { useState, useEffect, useCallback } from 'react';
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

import { createTranscriber } from '@/helpers/createTranscriber';
import { createMicrophone } from '@/helpers/createMicrophone';

// Infer correct type from your helper
type Transcriber = Awaited<ReturnType<typeof createTranscriber>>;

type CallLayoutType = 'grid' | 'speaker-left' | 'speaker-right';

const MeetingRoom = () : JSX.Element => {
  const searchParams = useSearchParams();
  const isPersonalRoom = !!searchParams.get('personal');
  const router = useRouter();
  const [layout, setLayout] = useState<CallLayoutType>('speaker-left');
  const [showParticipants, setShowParticipants] = useState(false);
  const { useCallCallingState, useMicrophoneState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const call = useCall();

  const { mediaStream } = useMicrophoneState();

  const [transcribedText, setTranscribedText] = useState<string>('');
  const [llmActive, setLlmActive] = useState<boolean>(false);
  const [llmResponse, setLlmResponse] = useState<string>('');
  const [robotActive, setRobotActive] = useState<boolean>(false);
  const [transcriber, setTranscriber] = useState<Transcriber | undefined>(undefined);
  const [mic, setMic] = useState<ReturnType<typeof createMicrophone> | undefined>(undefined);

  const processPrompt = useCallback(async (prompt: string) => {
    console.log('Processing prompt');
    const response = await fetch('/api/lemurRequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    console.log('Response found');

    const { response: lemurResponse } = await response.json();
    console.log('Lemur response found');
    setLlmResponse(lemurResponse);

    setTimeout(() => {
      setLlmResponse('');
      setLlmActive(false);
      setTranscribedText('');
    }, 7000);
  }, []);
  console.log('Process prompt found');

  const initializeAssemblyAI = useCallback(async () => {
    if (!mediaStream) {
      console.error('No media stream found!');
      return;
    }

    try {
      const tr = await createTranscriber(setTranscribedText, setLlmActive, processPrompt);
      if (!tr) {
        console.error('Failed to create transcriber');
        return;
      }

      console.log('[Transcriber] Connecting...');
      await tr.connect();

      const microphone = createMicrophone(mediaStream);
      await microphone.startRecording((audioData: any) => {
        tr.sendAudio(audioData);
      });

      setMic(microphone);
      setTranscriber(tr);
    } catch (err) {
      console.error('Error initializing AssemblyAI:', err);
    }
  }, [mediaStream, processPrompt]);

  const switchRobot = useCallback(async (isActive: boolean) => {
    if (isActive) {
      console.log('[Robot] Stopping...');
      mic?.stopRecording();
      await transcriber?.close();
      setMic(undefined);
      setTranscriber(undefined);
      setRobotActive(false);
      setTranscribedText('');
    } else {
      console.log('[Robot] Starting...');
      await initializeAssemblyAI();
      setRobotActive(true);
    }
  }, [initializeAssemblyAI, mic, transcriber]);

  // Cleanup
  useEffect(() => {
    return () => {
      try { mic?.stopRecording(); } catch {}
      (async () => { try { await transcriber?.close(); } catch {} })();
    };
  }, [mic, transcriber]);

  if (callingState !== CallingState.JOINED) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
          <Loader />
        </motion.div>
      </div>
    );
  }

  const CallLayout = () => {
    const participantsBarPosition: 'left' | 'right' =
      layout === 'speaker-right' ? 'left' : 'right';

    switch (layout) {
      case 'grid':
        return <PaginatedGridLayout />;
      case 'speaker-right':
      case 'speaker-left':
        return <SpeakerLayout participantsBarPosition={participantsBarPosition} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative flex h-screen flex-col bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Toggle button */}
      <button
        className={`ml-8 border-2 border-black dark:bg-white rounded-full px-4 py-2 transition-colors ease-in-out duration-200 ${
          robotActive ? 'bg-black text-white animate-pulse' : ''
        }`}
        onClick={() => switchRobot(robotActive)}
      >
        {robotActive ? 'Transcription ON' : 'Transcription OFF'}
      </button>

      <div className='ml-8 border-2 border-black dark:bg-white rounded-full px-4 py-2 transition-colors ease-in-out duration-200'>
        {transcribedText}
        {llmResponse}
      </div>

      {/* LLM response */}
      {llmResponse && (
        <div className="absolute mx-8 top-8 right-8 bg-white text-black p-4 rounded-lg shadow-md">
          {llmResponse}
        </div>
      )}

      {/* Transcript */}
      {transcribedText && (
        <div className="flex items-center justify-center w-full bottom-2">
          <h3 className="text-white text-center bg-black rounded-xl px-6 py-1">
            {transcribedText}
          </h3>
        </div>
      )}

      {/* Main Content */}
      <div className="relative flex flex-1 overflow-hidden">
        <motion.div className="relative flex flex-1 items-center justify-center p-4">
          <div className="relative h-full w-full max-w-[1440px]">
            <CallLayout />
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <motion.div className="relative flex flex-wrap items-center justify-center gap-2 bg-gray-900/90 p-4 backdrop-blur-sm md:gap-4">
        <CallControls onLeave={() => router.push('/')} />
        <CallStatsButton />
        {!isPersonalRoom && <EndCallButton />}
      </motion.div>
    </div>
  );
};

export default MeetingRoom;
