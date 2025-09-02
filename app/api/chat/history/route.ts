import { NextRequest, NextResponse } from 'next/server';
import { getChatMessages } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Retrieving chat history for meeting: ${meetingId}`);

    const result = await getChatMessages(meetingId, 100); // Get up to 100 messages

    if (!result.success) {
      console.error('❌ Failed to retrieve chat messages:', result.error);
      return NextResponse.json(
        { error: 'Failed to retrieve chat messages' },
        { status: 500 }
      );
    }

    console.log(`✅ Retrieved ${result.messages.length} chat messages`);

    return NextResponse.json({
      success: true,
      messages: result.messages,
      count: result.messages.length,
    });

  } catch (error) {
    console.error('❌ Error in chat history API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
