import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

// GET /api/meetings/get - Get meetings for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user details including email
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    console.log('🔍 API Debug - User email:', userEmail);

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // 'all', 'upcoming', 'past'
    const limit = parseInt(searchParams.get('limit') || '10');

    const db = await getDb();
    const collection = db.collection(COLLECTIONS.MEETINGS);

    const now = new Date();
    
    let query: any = {
      $or: [
        { hostId: userId },
        { guests: { $in: [userId] } }
      ]
    };
    
    // If we have user's email, also check for it in guests array
    if (userEmail) {
      query.$or.push({ guests: { $in: [userEmail] } });
    }

    // Apply time-based filtering
    if (filter === 'upcoming') {
      query.startTime = { $gte: now };
    } else if (filter === 'past') {
      query.startTime = { $lt: now };
    }

    console.log('🔍 API Debug - Query:', JSON.stringify(query, null, 2));
    console.log('🔍 API Debug - User ID:', userId);
    
    const meetings = await collection
      .find(query)
      .sort({ startTime: filter === 'past' ? -1 : 1 })
      .limit(limit)
      .toArray();

    console.log('🔍 API Debug - Raw meetings found:', meetings.length);
    console.log('🔍 API Debug - First meeting:', meetings[0]);

    // Transform the data to include computed fields
    const transformedMeetings = meetings.map(meeting => ({
      ...meeting,
      isHost: meeting.hostId === userId,
      isUpcoming: new Date(meeting.startTime) > now,
      isPast: new Date(meeting.startTime) <= now,
      timeUntilStart: new Date(meeting.startTime) > now 
        ? Math.floor((new Date(meeting.startTime).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) // days
        : null
    }));

    console.log('🔍 API Debug - Transformed meetings:', transformedMeetings.length);
    console.log('🔍 API Debug - First transformed meeting:', transformedMeetings[0]);

    return NextResponse.json({
      success: true,
      meetings: transformedMeetings,
      count: transformedMeetings.length,
      filter,
      userId
    });

  } catch (error) {
    console.error('Get meetings API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
