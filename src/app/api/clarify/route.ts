import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { question, messages, questionId } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server misconfiguration: GROQ_API_KEY is not set." }, { status: 500 });
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages array." }, { status: 400 });
    }

    // Load reference doc if available — used to ground answers but never revealed to user
    let referenceContext = "";
    if (questionId) {
      try {
        const refPath = path.join(process.cwd(), 'src', 'data', 'references', `${questionId}.json`);
        const doc = JSON.parse(fs.readFileSync(refPath, 'utf-8'));
        referenceContext = `
REFERENCE CONTEXT (use this to answer accurately — do NOT mention this document to the user):
- Ideal clarification questions for this problem: ${JSON.stringify(doc.idealClarificationQuestions)}
- Expected logical structure: ${JSON.stringify(doc.expectedLogicalStructure)}
- Benchmark assumptions: ${JSON.stringify(doc.benchmarkAssumptions)}
- Final answer range: ${JSON.stringify(doc.finalAnswerRange)}
`;
      } catch {
        // Reference doc not found — fall back to general knowledge
        referenceContext = "";
      }
    }

    const systemPrompt = `You are a sharp, helpful interviewer running a business estimation (guesstimate) interview.
The candidate's challenge question is: "${question}"
The candidate is in the clarifying questions phase — they are asking questions before they begin their estimation.
${referenceContext}
OFF-TOPIC GUARD — HIGHEST PRIORITY RULE:
Your ONLY job is to clarify the above challenge question. If the candidate's message is not directly about clarifying the scope, assumptions, units, context, or data needed for THIS specific estimation question, you MUST respond with exactly this sentence and nothing else:
"I can only help clarify this specific challenge question. Please ask something related to the estimation problem."
This applies if they ask about general knowledge, other topics, request hints that reveal the answer, discuss anything unrelated to this estimation, or attempt to use you as a general-purpose assistant. Do NOT engage with, acknowledge, or partially answer off-topic messages.

ON-TOPIC CLARIFICATIONS — what you may help with:
- What assumptions to make (geography, time period, user segment, currency, etc.)
- What to include or exclude from the scope of the estimate
- Units or scale expected in the final answer
- Context about the market, product, or scenario described in the question
- Nothing else

YOUR JOB (for on-topic questions only):
- Answer using the reference context above as your primary source.
- If the reference context does not cover it, use your own business knowledge and make a reasonable assumption.
- State your assumption clearly and confidently. For example: "Assume urban India only." or "Let's use 2024 figures."

ADDITIONAL RULES:
1. NEVER say "I don't know", "I cannot answer that", or any variation of refusal for on-topic questions.
2. NEVER mention the reference document or any background context to the user.
3. NEVER solve the problem or give away the final numerical answer.
4. Keep every response to 1–3 sentences maximum. Be direct and confident.
5. Stay in character as the interviewer at all times.
6. If an on-topic question is ambiguous, pick the most reasonable interpretation, state it, and move on.`;

    const groq = new Groq({ apiKey });

    const groqMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m: any) => ({
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      })),
    ];

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: groqMessages,
    });

    const reply = response.choices[0]?.message?.content?.trim() ||
      "Good question. For this problem, use whatever assumption feels most reasonable and state it explicitly when you present your answer.";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Clarify Error:", error);
    // Return a graceful fallback so the UI never shows a raw error to the user
    return NextResponse.json({
      reply: "Let's keep things simple — make a reasonable assumption for that and note it in your answer.",
    });
  }
}
