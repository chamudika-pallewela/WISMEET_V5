import { NextResponse } from "next/server";
import { saveRecording, getUserRecordings } from "@/lib/mongodb";

// Save a new recording
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const result = await saveRecording({
      meetingId: body.meetingId,
      callId: body.callId,
      recordingUrl: body.recordingUrl,
      startedAt: new Date(body.startedAt),
      endedAt: new Date(body.endedAt),
      createdBy: body.createdBy || "system",
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("API /recordings POST error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("createdBy");

  if (!userId) {
    return NextResponse.json(
      { success: false, recordings: [] },
      { status: 400 }
    );
  }

  const result = await getUserRecordings(userId);
  return NextResponse.json(result);
}
