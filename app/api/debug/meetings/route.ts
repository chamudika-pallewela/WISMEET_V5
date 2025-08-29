import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listAllMeetings, checkDatabaseHealth, getUserMeetings } from '@/lib/mongodb';

// GET /api/debug/meetings - List all meetings in database
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'health':
        // Check database health
        const health = await checkDatabaseHealth();
        return NextResponse.json(health);

      case 'user':
        // Get meetings for specific user
        const userMeetings = await getUserMeetings(userId);
        return NextResponse.json(userMeetings);

      case 'list':
      default:
        // List all meetings
        const meetings = await listAllMeetings();
        return NextResponse.json(meetings);
    }
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
