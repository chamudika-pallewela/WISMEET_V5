import { AssemblyAI } from 'assemblyai';

export async function POST() {
  const apiKey = process.env.ASSEMBLY_API_KEY;
  if (!apiKey) {
    return Response.error();
  }

  const assemblyClient = new AssemblyAI({ apiKey: apiKey });

  const token = await assemblyClient.streaming.createTemporaryToken({ expires_in_seconds: 600 });

  const response = {
    token: token,
  };

  return Response.json(response);
}