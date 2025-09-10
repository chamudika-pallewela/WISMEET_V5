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

        //const body = await request.json();
        //const transcript = body?.prompt;

        const { prompt : transcript = ""} = await request.json();

        const systemPrompt = `
        You are a strict JSON extractor.
        Given this transcript of a conversation:
        ---
        ${transcript}
        ---
        Determine whether the text contains:
        - A **name** (e.g., "I am John", "My name is Sarah")
        - An **age** (e.g., "I am 25", "My age is 30 years old")
        - A **place** (e.g., "I live in New York", "from Colombo")
  
        Return ONLY valid JSON (no Markdown, no code fences, no explanation) in this exact schema:
        {
        "name": true|false,
        "age": true|false,
        "place": true|false
        }
        `.trim();

        const response = await AI.models.generateContent({
            model : "gemini-2.0-flash",
            contents : systemPrompt,
        });

        const rawText = response.text?.trim() || "";
        console.log("RAW GEMINI RESPONSE", rawText);

        let result = {
            name : false,
            age : false,
            place : false,
        };

        try {
            const parsed = JSON.parse(rawText);
            result = {
                name : Boolean(parsed.name),
                age : Boolean(parsed.age),
                place : Boolean(parsed.place),
            };
        } catch (error : any) {
            console.error("JSON PARSING ERROR FALLING BACK TO STRING CHECKING!");

            const normalized = rawText.toLowerCase().replace(/\s/g, "");
            if (normalized.includes('"name":true') || normalized.includes("name:true")) {
                result.name = true;
            }
            if (normalized.includes('"age":true') || normalized.includes("age:true")) {
                result.age = true;
            }
            if (normalized.includes('"place":true') || normalized.includes("place:true")) {
                result.place = true;
            }
        }

        console.log("RESULT", result);
        
        return NextResponse.json({
           result
        });
    } catch (error: any) {
        console.error("ERROR IN GEMINI API", error);
        return NextResponse.json(
          { error: error.message || "SOMETHING WENT WRONG!" },
          { status: 500 }
        );
    }
}