import { NextRequest, NextResponse } from 'next/server';
import { saveChatMessage } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { meetingId, messages } = await request.json();

    if (!meetingId || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    console.log(`💾 Saving ${messages.length} chat messages for meeting: ${meetingId}`);

            // Save each message to the database
        const savePromises = messages.map((msg: any) =>
          saveChatMessage({
            meetingId,
            senderId: msg.senderId,
            senderName: msg.senderName,
            message: msg.message,
            messageType: 'text',
            timestamp: new Date(msg.timestamp),
            isPrivate: msg.isPrivate || false,
            recipientId: msg.recipientId || null,
          })
        );

    const results = await Promise.allSettled(savePromises);
    
    // Count successful saves
    const successfulSaves = results.filter(
      (result) => result.status === 'fulfilled' && result.value.success
    ).length;

    const failedSaves = results.length - successfulSaves;

    console.log(`✅ Successfully saved ${successfulSaves} messages`);
    if (failedSaves > 0) {
      console.warn(`⚠️ Failed to save ${failedSaves} messages`);
    }

    return NextResponse.json({
      success: true,
      savedCount: successfulSaves,
      failedCount: failedSaves,
      totalCount: messages.length,
    });

  } catch (error) {
    console.error('❌ Error in chat save API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
