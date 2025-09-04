import { AssemblyAI } from 'assemblyai';
import { getAssemblyToken } from '@/helpers/getAssesmblyToken';
import { Dispatch, SetStateAction } from 'react';

export async function createTranscriber(
  setTranscribedText: Dispatch<SetStateAction<string>>,
  setLlamaActive: Dispatch<SetStateAction<boolean>>,
  processPrompt: (prompt: string) => void
) {
  const token = await getAssemblyToken();
  console.log('Assembly token type:', typeof token);
  console.log('Assembly token value:', token);
  
  if (!token) {
    console.error('No token found');
    return;
  }

  if (typeof token !== 'string') {
    console.error('Token must be a string, received:', typeof token, token);
    return;
  }

  // For browser environment, we don't need to create a client with the temporary token
  // Instead, we pass the token directly to the StreamingTranscriber
  const client = new AssemblyAI({
    apiKey: 'dummy', // Not used for streaming with temporary tokens
  });

  // Create transcriber using temporary token for browser environment
  const transcriber = client.streaming.transcriber({
    token: token, // Use the temporary token here
    sampleRate: 16_000,
    formatTurns: true, // Enable formatted turns
  });

  // Session opened event
  transcriber.on('open', ({ id }) => {
    console.log(`Transcriber opened with session ID: ${id}`);
  });

  // Error handling
  transcriber.on('error', (error) => {
    console.error('Transcriber error:', error);
    // TODO: close transcriber
    // await transcriber.close();
  });

  // Session closed event
  transcriber.on('close', (code, reason) => {
    console.log(`Transcriber closed with code ${code} and reason: ${reason}`);
    // TODO: clean up
    // transcriber = null;
  });

  // Handle turn events
  transcriber.on('turn', (turn) => {
    if (!turn.transcript) {
      return;
    }

    // Detect if we're asking something for the LLM
    setLlamaActive(turn.transcript.toLowerCase().indexOf('llama') > 0);

    if (turn.end_of_turn) {
      // Final transcript (end of turn)
      console.log('[Turn] Final:', turn.transcript);
      setTranscribedText(turn.transcript);
      
      if (turn.transcript.toLowerCase().indexOf('llama') > 0) {
        console.log('Setting prompt to: ', turn.transcript);
        processPrompt(turn.transcript);
      }
    } else {
      // Ongoing turn  
      console.log('[Turn] Partial:', turn.transcript);
      setTranscribedText(turn.transcript);
    }
  });

  return transcriber;
}