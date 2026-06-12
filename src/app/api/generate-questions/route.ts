import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Groq from 'groq-sdk';

async function callAIWithRetry(provider: string, apiKey: string, prompt: string, retries = 3) {
  let responseText = "";

  for (let i = 0; i < retries; i++) {
    try {
      if (provider === "openai") {
        const openai = new OpenAI({ apiKey });
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        });
        responseText = response.choices[0].message.content || "";
      } else if (provider === "groq") {
        const groqClient = new Groq({ apiKey });
        const response = await groqClient.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        });
        responseText = response.choices[0]?.message?.content || "";
      } else {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(prompt);
        responseText = result.response.text();
      }
      return responseText;
    } catch (err: any) {
      const is429 = err.status === 429 || err.message?.includes("429") || err.message?.includes("quota") || err.message?.includes("exhausted");
      if (is429 && i < retries - 1) {
        console.warn(`${provider} rate limited. Retrying...`);
        await new Promise(res => setTimeout(res, 2000 * (i + 1))); // Exponential backoff
        continue;
      }
      throw new Error(is429 ? "AI quota exceeded. Please check API key limits." : err.message);
    }
  }
  return responseText;
}

export async function POST(req: Request) {
  try {
    const { totalDays, apiKey, provider } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key." }, { status: 400 });
    }

    if (!totalDays || typeof totalDays !== 'number' || totalDays <= 0) {
      return NextResponse.json({ error: "Invalid totalDays." }, { status: 400 });
    }

    const prompt = `You are an expert product manager preparing mock interview questions.
Generate exactly ${totalDays} completely unique guesstimate/estimation questions.
The questions MUST be contextually relevant to an Indian audience (e.g. using Indian cities, currency in INR, demographics, local businesses, or Indian cultural nuances instead of US-centric examples).
Ensure broad variety (market sizing, volume estimation, revenue estimation, etc.). Do not repeat topics.
Output MUST be strictly JSON matching this exact schema:
{
  "questions": [
    {
      "day": 1,
      "question": "Estimate the number of ping pong balls that can fit in a Boeing 747.",
      "hint": "Start with the interior volume of the aircraft and account for passenger space vs cargo.",
      "difficulty": "Hard",
      "questionType": "Volume Estimation"
    }
  ]
}
Ensure exactly ${totalDays} objects in the array. Difficulty must be exactly "Easy", "Medium", or "Hard". 
QuestionType should be specific like "Market Sizing", "Volume Estimation", "Revenue Estimation", "User Base Estimation", etc.`;

    const textContent = await callAIWithRetry(provider || "gemini", apiKey, prompt);

    let parsedJSON;
    try {
      let cleaned = textContent.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsedJSON = JSON.parse(cleaned);
      
      if (!parsedJSON.questions || !Array.isArray(parsedJSON.questions)) {
        throw new Error("Invalid schema returned by AI: missing 'questions' array.");
      }
    } catch (parseErr: any) {
      throw new Error(`JSON Parse Error: ${parseErr.message}. Raw output: ${textContent.substring(0, 100)}...`);
    }

    return NextResponse.json(parsedJSON.questions);
  } catch (error: any) {
    console.error("Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
