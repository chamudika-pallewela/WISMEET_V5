import { NextRequest, NextResponse } from 'next/server';
import { StreamChat } from 'stream-chat';

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_SECRET_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!STREAM_API_KEY || !STREAM_API_SECRET) {
      return NextResponse.json(
        { error: 'Stream API configuration is missing' },
        { status: 500 }
      );
    }

    const { userId, userName, userImage } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Create Stream server client
    const serverClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);

    // Generate user token
    const token = serverClient.createToken(userId);

    console.log(`✅ Generated Stream Chat token for user: ${userId}`);

    return NextResponse.json({
      token,
      userId,
      userName,
      userImage,
    });

  } catch (error) {
    console.error('❌ Error generating Stream Chat token:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate chat token',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
