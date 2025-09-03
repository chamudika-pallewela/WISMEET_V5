import { NextRequest, NextResponse } from 'next/server';
import { StreamChat } from 'stream-chat';

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_SECRET_KEY;

export async function GET() {
  try {
    if (!STREAM_API_KEY || !STREAM_API_SECRET) {
      return NextResponse.json(
        { error: 'Stream API configuration is missing' },
        { status: 500 }
      );
    }

    // Create Stream server client
    const serverClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);

    // Test creating a user
    const testUser = await serverClient.upsertUser({
      id: 'test-user-123',
      name: 'Test User',
    });

    console.log('✅ Test user created:', testUser);

    return NextResponse.json({
      success: true,
      message: 'Test user created successfully',
      user: testUser,
    });

  } catch (error) {
    console.error('❌ Error creating test user:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create test user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
