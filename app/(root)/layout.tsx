import { ReactNode } from 'react';

import StreamVideoProvider from '@/providers/StreamClientProvider';
import { ParticipantNameProvider } from '@/providers/ParticipantNameProvider';

const RootLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  return (
    <main>
      <StreamVideoProvider>
        <ParticipantNameProvider>
          {children}
        </ParticipantNameProvider>
      </StreamVideoProvider>
    </main>
  );
};

export default RootLayout;
