'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ParticipantNameContextType {
  participantName: string;
  setParticipantName: (name: string) => void;
}

const ParticipantNameContext = createContext<ParticipantNameContextType | undefined>(undefined);

export const useParticipantName = () => {
  const context = useContext(ParticipantNameContext);
  if (!context) {
    throw new Error('useParticipantName must be used within a ParticipantNameProvider');
  }
  return context;
};

export const ParticipantNameProvider = ({ children }: { children: ReactNode }) => {
  const [participantName, setParticipantName] = useState('');

  return (
    <ParticipantNameContext.Provider value={{ participantName, setParticipantName }}>
      {children}
    </ParticipantNameContext.Provider>
  );
};
