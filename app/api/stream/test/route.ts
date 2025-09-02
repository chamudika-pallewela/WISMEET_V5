import { NextResponse } from 'next/server';
import { StreamChat } from 'stream-chat';

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_SECRET_KEY;

export async function GET() {
  try {
    const config = {
      apiKey: STREAM_API_KEY ? 'Present' : 'Missing',
      apiSecret: STREAM_API_SECRET ? 'Present' : 'Missing',
      hasBoth: !!(STREAM_API_KEY && STREAM_API_SECRET),
    };

    if (!STREAM_API_KEY || !STREAM_API_SECRET) {
      return NextResponse.json({
        error: 'Stream configuration incomplete',
        config,
        message: 'Please check your environment variables',
      });
    }

    // Test Stream client creation
    const serverClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);
    
    // Test token generation
    const testToken = serverClient.createToken('test-user');

    return NextResponse.json({
      success: true,
      config,
      message: 'Stream configuration is working',
      testToken: testToken ? 'Generated successfully' : 'Failed to generate',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Stream test failed:', error);
    return NextResponse.json({
      error: 'Stream test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      config: {
        apiKey: STREAM_API_KEY ? 'Present' : 'Missing',
        apiSecret: STREAM_API_SECRET ? 'Present' : 'Missing',
        hasBoth: !!(STREAM_API_KEY && STREAM_API_SECRET),
      },
    }, { status: 500 });
  }
}
