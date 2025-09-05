import { AssemblyAI } from 'assemblyai';
import { stdout } from 'process';

export async function POST(request: Request) {
  const apiKey = process.env.ASSEMBLY_API_KEY;
  if (!apiKey) {
    console.log('No API key found');
    return Response.error();
  }
  console.log('API key found');
  stdout.write('API key found');

  const client = new AssemblyAI({ apiKey: apiKey });
  const body = await request.json();
  console.log('Body found');

  const prompt = body?.prompt;
  console.log('Prompt found');

  if (!prompt) {
    return Response.error();
  }

  const finalPrompt = `You act as an assistant during a video call. You get a question and I want you to answer it directly without repeating it.
  If you do not know the answer, clearly state that.
  Here is the user question:
  ${prompt}`;

  const lemurResponse = await client.lemur.task({
    prompt: finalPrompt,
    input_text: 'This is a conversation during a video call.',
    // TODO: For now we just give some context, but here we could add the actual meeting text.
    final_model: 'anthropic/claude-sonnet-4-20250514'
  });

  const response = {
    prompt: prompt,
    response: lemurResponse.response,
  };
  console.log('Response found');

  console.log(lemurResponse.response);

  return Response.json(response);
}
