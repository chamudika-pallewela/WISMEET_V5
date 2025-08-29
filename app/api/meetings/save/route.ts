import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { saveMeeting } from '@/lib/mongodb';

// POST /api/meetings/save - Save meeting to database
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      meetingId,
      hostId,
      hostName,
      title,
      description,
      startTime,
      endTime,
      guests,
      timezone,
      notificationTime,
      status
    } = body;

    // Validate required fields
    if (!meetingId || !hostId || !hostName || !title || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: meetingId, hostId, hostName, title, startTime, endTime' },
        { status: 400 }
      );
    }

    // Generate meeting URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const meetingUrl = `${baseUrl}/meeting/${meetingId}`;

    // Save meeting to database
    const result = await saveMeeting({
      meetingId,
      hostId,
      hostName,
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      guests: guests || [],
      timezone,
      notificationTime,
      status: status || 'scheduled',
      meetingUrl
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Meeting saved successfully',
        data: result,
        meetingUrl
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to save meeting', details: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Save meeting API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
