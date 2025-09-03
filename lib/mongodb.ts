import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

const uri = process.env.MONGODB_URI;
const options = {
  // Production optimizations
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 2, // Minimum number of connections in the pool
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
  monitorCommands: process.env.NODE_ENV === "development",
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
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
  MEETINGS: (process.env.MONGODB_MEETINGS_COLLECTION || "meetings").trim(),
  MESSAGES: (process.env.MONGODB_MESSAGES_COLLECTION || "messages").trim(),
  CHAT_SESSIONS: (
    process.env.MONGODB_CHAT_SESSIONS_COLLECTION || "chat_sessions"
  ).trim(),
  INVITATIONS: (
    process.env.MONGODB_INVITATIONS_COLLECTION || "invitations"
  ).trim(),
  MEETING_SUMMARIES: (
    process.env.MONGODB_SUMMARIES_COLLECTION || "meeting_summaries"
  ).trim(),
  RECORDINGS: (
    process.env.MONGODB_RECORDINGS_COLLECTION || "recordings"
  ).trim(), // ✅ new
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
    console.error("MongoDB connection error:", error);

    // Log additional context for debugging
    console.error("MongoDB error context:", {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      uri: uri ? `${uri.substring(0, 20)}...` : "undefined",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw new Error("Failed to connect to database");
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
      status: "healthy",
      collections: collections.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Database health check failed:", error);
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Sanitizes a document by removing undefined values recursively
 * This prevents MongoDB "insert <nil>" errors
 */
export function cleanDoc<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
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
  return value?.toString() || "";
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
      { unique: true, name: "meeting_summary_unique" }
    );

    console.log("✅ Meeting summaries unique index created");
  } catch (error) {
    // Index might already exist, which is fine
    if (error instanceof Error && error.message.includes("already exists")) {
      console.log("ℹ️ Meeting summaries index already exists");
    } else {
      console.warn("⚠️ Failed to create meeting summaries index:", error);
    }
  }
}

/**
 * Saves a recording metadata entry to the database
 */
export const saveRecording = async (recordingData: {
  meetingId: string;
  callId: string;
  recordingUrl: string;
  startedAt: Date;
  endedAt: Date;
  createdBy: string[]; // ✅ now an array of userIds
}) => {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTIONS.RECORDINGS);

    const recordingDoc = cleanDoc({
      recordingId: `${recordingData.meetingId}_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      meetingId: recordingData.meetingId,
      callId: recordingData.callId,
      recordingUrl: recordingData.recordingUrl,
      startedAt: recordingData.startedAt,
      endedAt: recordingData.endedAt,
      createdBy: recordingData.createdBy, // ✅ store as array
      createdAt: new Date(),
    });

    const result = await collection.insertOne(recordingDoc);
    console.log("✅ Recording saved to database:", result.insertedId);

    return { success: true, insertedId: result.insertedId };
  } catch (error) {
    console.error("❌ Failed to save recording:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Retrieves all recordings for a specific meeting
 */
export const getMeetingRecordings = async (meetingId: string) => {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTIONS.RECORDINGS);

    const recordings = await collection
      .find({ meetingId })
      .sort({ startedAt: -1 })
      .toArray();

    return { success: true, recordings };
  } catch (error) {
    console.error("❌ Failed to get recordings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      recordings: [],
    };
  }
};
export const getUserRecordings = async (userId: string) => {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTIONS.RECORDINGS);

    // Match if userId exists inside createdBy array
    const recordings = await collection
      .find({ createdBy: { $in: [userId] } })
      .sort({ startedAt: -1 })
      .toArray();

    return { success: true, recordings };
  } catch (error) {
    console.error("❌ Failed to get recordings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      recordings: [],
    };
  }
};

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

    console.log("✅ Database indexes created successfully");
  } catch (error) {
    console.warn("⚠️ Failed to create database indexes:", error);
  }
}
export async function getRecordings() {
  const client = await clientPromise;
  const db = client.db("wismeet");
  const collection = db.collection("recordings");

  return collection.find({}).sort({ endedAt: -1 }).toArray();
}
/**
 * Ensures all required collections exist
 */
export async function ensureCollectionsExist() {
  try {
    const db = await getDb();

    // List existing collections
    const existingCollections = await db.listCollections().toArray();
    const existingCollectionNames = existingCollections.map((c) => c.name);

    console.log("📊 Existing collections:", existingCollectionNames);

    // Check if required collections exist
    const requiredCollections = Object.values(COLLECTIONS);
    const missingCollections = requiredCollections.filter(
      (name) => !existingCollectionNames.includes(name)
    );

    if (missingCollections.length > 0) {
      console.log("⚠️ Missing collections:", missingCollections);

      // Create missing collections by inserting a dummy document
      for (const collectionName of missingCollections) {
        try {
          const collection = db.collection(collectionName);
          await collection.insertOne({ _init: true, createdAt: new Date() });
          await collection.deleteOne({ _init: true });
          console.log("✅ Created collection:", collectionName);
        } catch (error) {
          console.error(
            "❌ Failed to create collection:",
            collectionName,
            error
          );
        }
      }
    } else {
      console.log("✅ All required collections exist");
    }

    return {
      success: true,
      existingCollections: existingCollectionNames,
      requiredCollections,
      missingCollections,
    };
  } catch (error) {
    console.error("❌ Failed to ensure collections exist:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
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
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
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
      description: meetingData.description || "",
      startTime: meetingData.startTime,
      endTime: meetingData.endTime,
      guests: meetingData.guests,
      timezone: meetingData.timezone || "UTC",
      notificationTime: meetingData.notificationTime || 15,
      status: meetingData.status,
      meetingUrl: meetingData.meetingUrl || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await collection.insertOne(meetingDoc);
    console.log("✅ Meeting saved to database:", result.insertedId);

    return {
      success: true,
      insertedId: result.insertedId,
      meetingId: meetingData.meetingId,
    };
  } catch (error) {
    console.error("❌ Failed to save meeting to database:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
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

    const meetings = await collection
      .find({
        $or: [{ hostId: userId }, { guests: { $in: [userId] } }],
      })
      .sort({ startTime: 1 })
      .toArray();

    return {
      success: true,
      meetings,
    };
  } catch (error) {
    console.error("❌ Failed to retrieve user meetings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      meetings: [],
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
      meeting,
    };
  } catch (error) {
    console.error("❌ Failed to retrieve meeting:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      meeting: null,
    };
  }
};

/**
 * Updates meeting status
 */
export const updateMeetingStatus = async (
  meetingId: string,
  status: "scheduled" | "ongoing" | "completed" | "cancelled"
) => {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTIONS.MEETINGS);

    const result = await collection.updateOne(
      { meetingId },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );

    return {
      success: true,
      modifiedCount: result.modifiedCount,
    };
  } catch (error) {
    console.error("❌ Failed to update meeting status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
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

    const meetings = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    console.log("📊 Total meetings in database:", meetings.length);
    meetings.forEach((meeting, index) => {
      console.log(
        `${index + 1}. ${meeting.title} (${meeting.meetingId}) - ${meeting.status}`
      );
    });

    return {
      success: true,
      count: meetings.length,
      meetings,
    };
  } catch (error) {
    console.error("❌ Failed to list meetings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      count: 0,
      meetings: [],
    };
  }
};

/**
 * Saves a chat message to the database
 */
export const saveChatMessage = async (messageData: {
  meetingId: string;
  senderId: string;
  senderName: string;
  message: string;
  messageType: "text" | "file" | "reaction";
  timestamp: Date;
  isPrivate?: boolean;
  recipientId?: string;
  fileUrl?: string;
  fileName?: string;
}) => {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTIONS.MESSAGES);

    const messageDoc = cleanDoc({
      messageId: `${messageData.meetingId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      meetingId: messageData.meetingId,
      senderId: messageData.senderId,
      senderName: messageData.senderName,
      message: messageData.message,
      messageType: messageData.messageType,
      timestamp: messageData.timestamp,
      isPrivate: messageData.isPrivate || false,
      recipientId: messageData.recipientId || null,
      fileUrl: messageData.fileUrl || null,
      fileName: messageData.fileName || null,
      createdAt: new Date(),
    });

    const result = await collection.insertOne(messageDoc);
    console.log("✅ Chat message saved to database:", result.insertedId);

    return {
      success: true,
      insertedId: result.insertedId,
      messageId: messageDoc.messageId,
    };
  } catch (error) {
    console.error("❌ Failed to save chat message to database:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Retrieves chat messages for a specific meeting
 */
export const getChatMessages = async (
  meetingId: string,
  limit: number = 50
) => {
  try {
    console.log("🔍 Getting chat messages for meeting:", meetingId);
    const db = await getDb();
    const collection = db.collection(COLLECTIONS.MESSAGES);

    console.log("📊 Collection name:", COLLECTIONS.MESSAGES);

    const messages = await collection
      .find({
        meetingId,
        isPrivate: false, // Only get public messages
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    console.log("✅ Found", messages.length, "public messages");

    // If no messages exist, return empty array (this is normal for new meetings)
    return {
      success: true,
      messages: messages.reverse(), // Return in chronological order
    };
  } catch (error) {
    console.error("❌ Failed to retrieve chat messages:", error);
    console.error("❌ Error details:", {
      meetingId,
      limit,
      collection: COLLECTIONS.MESSAGES,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      messages: [],
    };
  }
};

/**
 * Retrieves private messages for a specific user in a meeting
 */
export const getPrivateMessages = async (meetingId: string, userId: string) => {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTIONS.MESSAGES);

    const messages = await collection
      .find({
        meetingId,
        isPrivate: true,
        $or: [{ senderId: userId }, { recipientId: userId }],
      })
      .sort({ timestamp: 1 })
      .toArray();

    return {
      success: true,
      messages,
    };
  } catch (error) {
    console.error("❌ Failed to retrieve private messages:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      messages: [],
    };
  }
};

/**
 * Deletes a chat message (for sender or meeting host)
 */
export const deleteChatMessage = async (
  messageId: string,
  userId: string,
  isHost: boolean = false
) => {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTIONS.MESSAGES);

    // Find the message first to check permissions
    const message = await collection.findOne({ messageId });

    if (!message) {
      return {
        success: false,
        error: "Message not found",
      };
    }

    // Check if user can delete the message
    if (message.senderId !== userId && !isHost) {
      return {
        success: false,
        error: "Unauthorized to delete this message",
      };
    }

    const result = await collection.deleteOne({ messageId });

    return {
      success: true,
      deletedCount: result.deletedCount,
    };
  } catch (error) {
    console.error("❌ Failed to delete chat message:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Creates a chat session for a meeting
 */
export const createChatSession = async (meetingId: string, userId: string) => {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTIONS.CHAT_SESSIONS);

    const sessionDoc = cleanDoc({
      sessionId: `${meetingId}_${userId}_${Date.now()}`,
      meetingId,
      userId,
      joinedAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
    });

    const result = await collection.insertOne(sessionDoc);

    return {
      success: true,
      sessionId: sessionDoc.sessionId,
    };
  } catch (error) {
    console.error("❌ Failed to create chat session:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Updates chat session activity
 */
export const updateChatSessionActivity = async (sessionId: string) => {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTIONS.CHAT_SESSIONS);

    await collection.updateOne(
      { sessionId },
      {
        $set: {
          lastActivity: new Date(),
        },
      }
    );

    return {
      success: true,
    };
  } catch (error) {
    console.error("❌ Failed to update chat session activity:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Gets active chat participants for a meeting
 */
export const getActiveChatParticipants = async (meetingId: string) => {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTIONS.CHAT_SESSIONS);

    const participants = await collection
      .find({
        meetingId,
        isActive: true,
        lastActivity: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // Active in last 5 minutes
      })
      .toArray();

    return {
      success: true,
      participants,
    };
  } catch (error) {
    console.error("❌ Failed to get active chat participants:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      participants: [],
    };
  }
};
