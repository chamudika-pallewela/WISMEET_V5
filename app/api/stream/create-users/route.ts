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

    const { participants } = await request.json();

    if (!participants || !Array.isArray(participants)) {
      return NextResponse.json(
        { error: 'Participants array is required' },
        { status: 400 }
      );
    }

    // Create Stream server client
    const serverClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);

    const createdUsers = [];
    const errors = [];

    for (const participant of participants) {
      try {
        // Check if user already exists
        try {
          const existingUser = await serverClient.queryUsers({ id: { $eq: participant.userId } });
          if (existingUser.users.length > 0) {
            console.log(`✅ User ${participant.userId} already exists`);
            createdUsers.push(existingUser.users[0]);
            continue;
          }
        } catch (queryError) {
          // User doesn't exist, continue to create
        }

        // Create new user
        const newUser = await serverClient.upsertUser({
          id: participant.userId,
          name: participant.name || participant.userId,
          image: participant.image || undefined,
        });

        console.log(`✅ Created Stream Chat user: ${participant.userId}`);
        createdUsers.push(newUser);
      } catch (error) {
        console.error(`❌ Failed to create user ${participant.userId}:`, error);
        errors.push({
          userId: participant.userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      createdUsers,
      errors,
      message: `Successfully processed ${participants.length} participants`
    });

  } catch (error) {
    console.error('❌ Error creating Stream Chat users:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create Stream Chat users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
