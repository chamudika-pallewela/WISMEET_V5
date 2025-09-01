import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {
  // Production optimizations
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 2,  // Minimum number of connections in the pool
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  serverSelectionTimeoutMS: 5000, // Timeout for server selection
  socketTimeoutMS: 45000, // Timeout for socket operations
  connectTimeoutMS: 10000, // Timeout for initial connection
  // Better error handling
  retryWrites: true,
  retryReads: true,
  // Security
  ssl: true, // MongoDB Atlas requires SSL/TLS
  // Monitoring
  monitorCommands: process.env.NODE_ENV === 'development',
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

// Database collections - ensure these are always valid strings
export const COLLECTIONS = {
  MEETINGS: (process.env.MONGODB_MEETINGS_COLLECTION || 'meetings').trim(),
  MESSAGES: (process.env.MONGODB_MESSAGES_COLLECTION || 'messages').trim(),
  CHAT_SESSIONS: (process.env.MONGODB_CHAT_SESSIONS_COLLECTION || 'chat_sessions').trim(),
  INVITATIONS: (process.env.MONGODB_INVITATIONS_COLLECTION || 'invitations').trim(),
  MEETING_SUMMARIES: (process.env.MONGODB_SUMMARIES_COLLECTION || 'meeting_summaries').trim()
} as const;

// Validate collection names
Object.entries(COLLECTIONS).forEach(([key, value]) => {
  if (!value || value.length === 0) {
    throw new Error(`MONGODB_${key}_COLLECTION must be a non-empty string`);
  }
});

// Database connection and utility functions
export const getDb = async () => {
  try {
    const client = await clientPromise;
    
    // Test the connection
    await client.db().admin().ping();
    
    return client.db();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    
    // Log additional context for debugging
    console.error('MongoDB error context:', {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      uri: uri ? `${uri.substring(0, 20)}...` : 'undefined',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    throw new Error('Failed to connect to database');
  }
};

/**
 * Enhanced database health check
 */
export const checkDatabaseHealth = async () => {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    // Test basic operations
    await db.admin().ping();
    
    // Test collection access
    const collections = await db.listCollections().toArray();
    
    return {
      status: 'healthy',
      collections: collections.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Sanitizes a document by removing undefined values recursively
 * This prevents MongoDB "insert <nil>" errors
 */
export function cleanDoc<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj; // Preserve Date objects
  if (Array.isArray(obj)) return obj.map(cleanDoc) as any;
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = cleanDoc(v as any);
  }
  return out;
}

/**
 * Ensures a value is a string (empty string if null/undefined)
 */
export function ensureString(value: any): string {
  return value?.toString() || '';
}

/**
 * Ensures a value is a number (0 if null/undefined)
 */
export function ensureNumber(value: any): number {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Creates a unique index on meeting summaries to prevent duplicates
 */
export async function ensureMeetingSummariesIndex() {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTIONS.MEETING_SUMMARIES);
    
    // Create unique index on (meetingId, endTime) to prevent duplicates
    await collection.createIndex(
      { meetingId: 1, endTime: 1 }, 
      { unique: true, name: 'meeting_summary_unique' }
    );
    
    console.log('✅ Meeting summaries unique index created');
  } catch (error) {
    // Index might already exist, which is fine
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('ℹ️ Meeting summaries index already exists');
    } else {
      console.warn('⚠️ Failed to create meeting summaries index:', error);
    }
  }
}

/**
 * Creates indexes for better query performance
 */
export async function ensureDatabaseIndexes() {
  try {
    const db = await getDb();
    
    // Messages collection indexes
    const messagesCollection = db.collection(COLLECTIONS.MESSAGES);
    await messagesCollection.createIndex({ meetingId: 1, timestamp: 1 });
    await messagesCollection.createIndex({ senderId: 1 });
    
    // Meetings collection indexes
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);
    await meetingsCollection.createIndex({ meetingId: 1 }, { unique: true });
    await meetingsCollection.createIndex({ hostId: 1 });
    await meetingsCollection.createIndex({ participants: 1 });
    
    // Chat sessions collection indexes
    const chatSessionsCollection = db.collection(COLLECTIONS.CHAT_SESSIONS);
    await chatSessionsCollection.createIndex({ meetingId: 1, userId: 1 });
    
    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.warn('⚠️ Failed to create database indexes:', error);
  }
} 

/**
 * Saves a meeting to the database
 */
export const saveMeeting = async (meetingData: {
  meetingId: string;
  hostId: string;
  hostName: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  guests: string[];
  timezone?: string;
  notificationTime?: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  meetingUrl?: string;
}) => {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTIONS.MEETINGS);
    
    const meetingDoc = cleanDoc({
      meetingId: meetingData.meetingId,
      hostId: meetingData.hostId,
      hostName: meetingData.hostName,
      title: meetingData.title,
      description: meetingData.description || '',
      startTime: meetingData.startTime,
      endTime: meetingData.endTime,
      guests: meetingData.guests,
      timezone: meetingData.timezone || 'UTC',
      notificationTime: meetingData.notificationTime || 15,
      status: meetingData.status,
      meetingUrl: meetingData.meetingUrl || '',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const result = await collection.insertOne(meetingDoc);
    console.log('✅ Meeting saved to database:', result.insertedId);
    
    return {
      success: true,
      insertedId: result.insertedId,
      meetingId: meetingData.meetingId
    };
  } catch (error) {
    console.error('❌ Failed to save meeting to database:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Retrieves meetings for a specific user (host or guest)
 */
export const getUserMeetings = async (userId: string) => {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTIONS.MEETINGS);
    
    const meetings = await collection.find({
      $or: [
        { hostId: userId },
        { guests: { $in: [userId] } }
      ]
    }).sort({ startTime: 1 }).toArray();
    
    return {
      success: true,
      meetings
    };
  } catch (error) {
    console.error('❌ Failed to retrieve user meetings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      meetings: []
    };
  }
};

/**
 * Retrieves a specific meeting by ID
 */
export const getMeetingById = async (meetingId: string) => {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTIONS.MEETINGS);
    
    const meeting = await collection.findOne({ meetingId });
    
    return {
      success: true,
      meeting
    };
  } catch (error) {
    console.error('❌ Failed to retrieve meeting:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      meeting: null
    };
  }
};

/**
 * Updates meeting status
 */
export const updateMeetingStatus = async (meetingId: string, status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled') => {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTIONS.MEETINGS);
    
    const result = await collection.updateOne(
      { meetingId },
      { 
        $set: { 
          status,
          updatedAt: new Date()
        }
      }
    );
    
    return {
      success: true,
      modifiedCount: result.modifiedCount
    };
  } catch (error) {
    console.error('❌ Failed to update meeting status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Debug function to list all meetings in the database
 */
export const listAllMeetings = async () => {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTIONS.MEETINGS);
    
    const meetings = await collection.find({}).sort({ createdAt: -1 }).toArray();
    
    console.log('📊 Total meetings in database:', meetings.length);
    meetings.forEach((meeting, index) => {
      console.log(`${index + 1}. ${meeting.title} (${meeting.meetingId}) - ${meeting.status}`);
    });
    
    return {
      success: true,
      count: meetings.length,
      meetings
    };
  } catch (error) {
    console.error('❌ Failed to list meetings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      count: 0,
      meetings: []
    };
  }
}; 