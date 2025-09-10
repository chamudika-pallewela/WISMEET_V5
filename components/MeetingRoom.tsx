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

import TranscriptionToggle from './TranscriptionToggle';

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
import { CheckList } from '@/lib/checklist';
import ChecklistCard from './CheckListCard';

// Infer correct type from your helper
type Transcriber = Awaited<ReturnType<typeof createTranscriber>>;

type CallLayoutType = 'grid' | 'speaker-left' | 'speaker-right';

type checkList = {
  name : boolean;
  age : boolean;
  place : boolean;
}

type GeminiResponse = {
  result : checkList;
}

const MeetingRoom = () : JSX.Element => {
  const searchParams = useSearchParams();
  const isPersonalRoom = !!searchParams.get('personal');
  const router = useRouter();
  const [layout, setLayout] = useState<CallLayoutType>('speaker-left');
  const [showParticipants, setShowParticipants] = useState(false);
  const { useCallCallingState, useMicrophoneState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const call = useCall();

  const [checklist, setChecklist] = useState<checkList> ({
    name : false,
    age : false,
    place : false,
  });

  const { mediaStream } = useMicrophoneState();

  const [transcribedText, setTranscribedText] = useState<string>('');
  const [llmActive, setLlmActive] = useState<boolean>(false);
  const [llmResponse, setLlmResponse] = useState<string>('');
  const [robotActive, setRobotActive] = useState<boolean>(false);
  const [transcriber, setTranscriber] = useState<Transcriber | undefined>(undefined);
  const [mic, setMic] = useState<ReturnType<typeof createMicrophone> | undefined>(undefined);

  // Now we are using Gemini API
  const processPrompt = useCallback(async (prompt: string) => {
    try {
      const response = await fetch('/api/geminiResponse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
  
      if (!response.ok) {
        console.error('Gemini API not ok:', response.status);
        return;
      }
  
      const data: GeminiResponse = await response.json();
      if (!data?.result) {
        console.error('Empty result from API');
        return;
      }
  
      // Merge: once true, keep true
      setChecklist(prev => ({
        name: prev.name || !!data.result.name,
        age: prev.age || !!data.result.age,
        place: prev.place || !!data.result.place,
      }));
  
      // (Optional) show a short textual summary
      const summary: string[] = [];
      if (data.result.name) summary.push('Name ✓');
      if (data.result.age) summary.push('Age ✓');
      if (data.result.place) summary.push('Place ✓');
      setLlmResponse(summary.join('  '));
  
      // clear the banner after a few seconds
      setTimeout(() => {
        setLlmResponse('');
        setLlmActive(false);
        setTranscribedText('');
      }, 4000);
    } catch (e) {
      console.error('processPrompt error:', e);
    }
  }, []);  

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
      {/* Fixed Header with Controls */}
      <div className="relative z-50 flex items-center justify-center p-4 bg-gray-900/90 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <TranscriptionToggle
            active={robotActive}
            onToggle={() => switchRobot(robotActive)}
          />
          
          <ChecklistCard 
            status={checklist} 
            className="w-auto"
          />
        </div>
      </div>

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
          <div className="relative h-full w-full max-w-[1440px] z-10">
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
