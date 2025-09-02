import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkDatabaseHealth, getDb, COLLECTIONS, ensureCollectionsExist } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Test database health
    const healthCheck = await checkDatabaseHealth();
    
    // Ensure collections exist
    const collectionsCheck = await ensureCollectionsExist();
    
    // Test database connection
    let dbTest = { success: false, error: 'Unknown error' };
    try {
      const db = await getDb();
      const collections = await db.listCollections().toArray();
      dbTest = { 
        success: true, 
        collections: collections.map(c => c.name),
        messagesCollection: COLLECTIONS.MESSAGES
      };
    } catch (error) {
      dbTest = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }

    return NextResponse.json({
      success: true,
      userId,
      databaseHealth: healthCheck,
      collectionsCheck,
      databaseTest: dbTest,
      collections: COLLECTIONS,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in debug route:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
