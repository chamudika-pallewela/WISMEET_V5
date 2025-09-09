import { GoogleGenAI } from '@google/genai';
import { error } from 'console';
import { NextResponse } from 'next/server';

export async function POST (request: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({error: "AI KEY NOT FOUND!"}, {status: 500});
        }

        const AI = new GoogleGenAI({apiKey : apiKey });

        const body = await request.json();
        const prompt = body?.prompt;

        const response = await AI.models.generateContent({
            model : "gemini-2.0-flash",
            contents : prompt,
        });

        console.log("GEMINI RESPONSE", response.text);

        return NextResponse.json({
            result : response.text,
        });
        
    } catch (error : any) {
        console.error("ERROR IN GEMINI API", error);
        return NextResponse.json(
            {error : error.message || "SOMETHING WENT WRONG!"}, 
            {status : 500}
        );
    }
}