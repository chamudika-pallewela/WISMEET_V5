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

    const { userId, userName, userImage, meetingId } = await request.json();

    if (!userId || !meetingId) {
      return NextResponse.json(
        { error: 'User ID and Meeting ID are required' },
        { status: 400 }
      );
    }

    // Create Stream server client
    const serverClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);

    try {
      // Try to add user to existing channel
      const channel = serverClient.channel('messaging', meetingId);
      
      // Add user to channel using server-side permissions
      await channel.addMembers([userId]);
      
      console.log(`✅ User ${userId} added to channel ${meetingId}`);

      return NextResponse.json({
        success: true,
        message: 'User added to channel successfully',
        userId,
        meetingId,
      });

    } catch (channelError) {
      console.log('ℹ️ Could not add user to existing channel, trying to create one...');
      
      try {
        // Create new channel with user as member
        const newChannel = serverClient.channel('messaging', meetingId, {
          name: `Meeting ${meetingId}`,
          members: [userId],
          created_by_id: userId,
        });
        
        await newChannel.create();
        console.log(`✅ New channel created for meeting ${meetingId} with user ${userId}`);
        
        return NextResponse.json({
          success: true,
          message: 'New channel created successfully',
          userId,
          meetingId,
        });
        
      } catch (createError) {
        console.error('❌ Failed to create channel:', createError);
        
        // Try alternative channel types
        try {
          const teamChannel = serverClient.channel('team', meetingId, {
            name: `Meeting ${meetingId}`,
            members: [userId],
            created_by_id: userId,
          });
          
          await teamChannel.create();
          console.log(`✅ Team channel created for meeting ${meetingId}`);
          
          return NextResponse.json({
            success: true,
            message: 'Team channel created successfully',
            userId,
            meetingId,
          });
          
        } catch (teamError) {
          console.error('❌ Failed to create team channel:', teamError);
          
          return NextResponse.json({
            error: 'Failed to create or join any chat channel',
            details: 'Please check Stream Chat permissions and try again',
          }, { status: 500 });
        }
      }
    }

  } catch (error) {
    console.error('❌ Error in join channel API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to join chat channel',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
