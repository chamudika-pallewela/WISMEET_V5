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
import ChecklistCard from './CheckListCard';

// Infer correct type from your helper
type Transcriber = Awaited<ReturnType<typeof createTranscriber>>;

type CallLayoutType = 'grid' | 'speaker-left' | 'speaker-right';

type checkList = {
  asked_if_speaking_to_customer: boolean;
  asked_if_customer_name: boolean;
  asked_if_call_time_okay: boolean;
  asked_purchase_or_remortgage: boolean;
  asked_first_time_buyer_or_home_mover: boolean;
  asked_if_found_property: boolean;
  asked_property_price_range: boolean;
  asked_deposit_amount: boolean;
  asked_outstanding_mortgage_balance: boolean;
  asked_estimated_property_value: boolean;
  asked_current_lender: boolean;
  asked_if_on_fixed_deal_and_end_date: boolean;
  asked_estimated_rental_income: boolean;
  asked_if_property_on_standard_AST: boolean;
  asked_how_many_other_properties: boolean;
  asked_if_properties_are_let: boolean;
  asked_if_customer_married: boolean;
  asked_if_joint_mortgage: boolean;
  asked_customer_age_or_partner_age: boolean;
  asked_if_has_children_and_expenses: boolean;
  asked_customer_nationality: boolean;
  asked_about_visa_duration_or_residency: boolean;
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
    asked_if_speaking_to_customer: false,
    asked_if_customer_name: false,
    asked_if_call_time_okay: false,
    asked_purchase_or_remortgage: false,
    asked_first_time_buyer_or_home_mover: false,
    asked_if_found_property: false,
    asked_property_price_range: false,
    asked_deposit_amount: false,
    asked_outstanding_mortgage_balance: false,
    asked_estimated_property_value: false,
    asked_current_lender: false,
    asked_if_on_fixed_deal_and_end_date: false,
    asked_estimated_rental_income: false,
    asked_if_property_on_standard_AST: false,
    asked_how_many_other_properties: false,
    asked_if_properties_are_let: false,
    asked_if_customer_married: false,
    asked_if_joint_mortgage: false,
    asked_customer_age_or_partner_age: false,
    asked_if_has_children_and_expenses: false,
    asked_customer_nationality: false,
    asked_about_visa_duration_or_residency: false,
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
        asked_if_speaking_to_customer: prev.asked_if_speaking_to_customer || !!data.result.asked_if_speaking_to_customer,
        asked_if_customer_name: prev.asked_if_customer_name || !!data.result.asked_if_customer_name,
        asked_if_call_time_okay: prev.asked_if_call_time_okay || !!data.result.asked_if_call_time_okay,
        asked_purchase_or_remortgage: prev.asked_purchase_or_remortgage || !!data.result.asked_purchase_or_remortgage,
        asked_first_time_buyer_or_home_mover: prev.asked_first_time_buyer_or_home_mover || !!data.result.asked_first_time_buyer_or_home_mover,
        asked_if_found_property: prev.asked_if_found_property || !!data.result.asked_if_found_property,
        asked_property_price_range: prev.asked_property_price_range || !!data.result.asked_property_price_range,
        asked_deposit_amount: prev.asked_deposit_amount || !!data.result.asked_deposit_amount,
        asked_outstanding_mortgage_balance: prev.asked_outstanding_mortgage_balance || !!data.result.asked_outstanding_mortgage_balance,
        asked_estimated_property_value: prev.asked_estimated_property_value || !!data.result.asked_estimated_property_value,
        asked_current_lender: prev.asked_current_lender || !!data.result.asked_current_lender,
        asked_if_on_fixed_deal_and_end_date: prev.asked_if_on_fixed_deal_and_end_date || !!data.result.asked_if_on_fixed_deal_and_end_date,
        asked_estimated_rental_income: prev.asked_estimated_rental_income || !!data.result.asked_estimated_rental_income,
        asked_if_property_on_standard_AST: prev.asked_if_property_on_standard_AST || !!data.result.asked_if_property_on_standard_AST,
        asked_how_many_other_properties: prev.asked_how_many_other_properties || !!data.result.asked_how_many_other_properties,
        asked_if_properties_are_let: prev.asked_if_properties_are_let || !!data.result.asked_if_properties_are_let,
        asked_if_customer_married: prev.asked_if_customer_married || !!data.result.asked_if_customer_married,
        asked_if_joint_mortgage: prev.asked_if_joint_mortgage || !!data.result.asked_if_joint_mortgage,
        asked_customer_age_or_partner_age: prev.asked_customer_age_or_partner_age || !!data.result.asked_customer_age_or_partner_age,
        asked_if_has_children_and_expenses: prev.asked_if_has_children_and_expenses || !!data.result.asked_if_has_children_and_expenses,
        asked_customer_nationality: prev.asked_customer_nationality || !!data.result.asked_customer_nationality,
        asked_about_visa_duration_or_residency: prev.asked_about_visa_duration_or_residency || !!data.result.asked_about_visa_duration_or_residency,
      }));

      // Show a short textual summary of newly detected items
      const summary: string[] = [];
      if (data.result.asked_if_speaking_to_customer) summary.push('Customer ID ✓');
      if (data.result.asked_if_customer_name) summary.push('Name ✓');
      if (data.result.asked_if_call_time_okay) summary.push('Call Time ✓');
      if (data.result.asked_purchase_or_remortgage) summary.push('Purpose ✓');
      if (data.result.asked_first_time_buyer_or_home_mover) summary.push('Buyer Status ✓');
      if (data.result.asked_if_found_property) summary.push('Property Found ✓');
      if (data.result.asked_property_price_range) summary.push('Price Range ✓');
      if (data.result.asked_deposit_amount) summary.push('Deposit ✓');
      if (data.result.asked_outstanding_mortgage_balance) summary.push('Outstanding Balance ✓');
      if (data.result.asked_estimated_property_value) summary.push('Property Value ✓');
      if (data.result.asked_current_lender) summary.push('Current Lender ✓');
      if (data.result.asked_if_on_fixed_deal_and_end_date) summary.push('Deal Details ✓');
      if (data.result.asked_estimated_rental_income) summary.push('Rental Income ✓');
      if (data.result.asked_if_property_on_standard_AST) summary.push('AST Status ✓');
      if (data.result.asked_how_many_other_properties) summary.push('Other Properties ✓');
      if (data.result.asked_if_properties_are_let) summary.push('Properties Let ✓');
      if (data.result.asked_if_customer_married) summary.push('Marital Status ✓');
      if (data.result.asked_if_joint_mortgage) summary.push('Joint Mortgage ✓');
      if (data.result.asked_customer_age_or_partner_age) summary.push('Age ✓');
      if (data.result.asked_if_has_children_and_expenses) summary.push('Children/Expenses ✓');
      if (data.result.asked_customer_nationality) summary.push('Nationality ✓');
      if (data.result.asked_about_visa_duration_or_residency) summary.push('Visa/Residency ✓');
      
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
