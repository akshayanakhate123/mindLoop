import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';

async function callGroqWithRetry(groq: Groq, prompt: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0,
      });
      return response.choices[0]?.message?.content || "";
    } catch (err: any) {
      if (err.status === 429 && i < retries - 1) {
        console.warn(`Groq rate limited. Retrying in ${2000 * (i + 1)}ms…`);
        await new Promise(res => setTimeout(res, 2000 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  return "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, category, transcript, finalAnswer, hintUsed, chatHistory, difficulty, domain, questionId } = body;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server misconfiguration: GROQ_API_KEY is not set." }, { status: 500 });
    }

    let referenceDoc: any = null;
    if (questionId) {
      try {
        const refPath = path.join(process.cwd(), 'src', 'data', 'references', `${questionId}.json`);
        referenceDoc = JSON.parse(fs.readFileSync(refPath, 'utf-8'));
      } catch {
        referenceDoc = null;
      }
    }

    const hasTranscript = transcript && transcript.trim().length > 0;
    const hasFinalAnswer = finalAnswer && finalAnswer.trim().length > 0;

    if (!hasTranscript && !hasFinalAnswer) {
      return NextResponse.json({
        AccuracyScore: 0,
        StructureScore: 0,
        InterviewReadiness: "Needs Work",
        VerdictLine: "Nothing was submitted — evaluation cannot be performed.",
        GoodPoints: "None",
        BadPoints: "Both the transcript and final answer were empty.",
        Improvement: "Please speak or type your approach and provide a final estimate.",
        AssumptionComparison: [],
        StepScores: [],
        ModelAnswer: ["No answer provided."],
      });
    }

    const evaluationTranscript = (!hasTranscript && hasFinalAnswer)
      ? `(No thought process provided. Final answer only: ${finalAnswer})`
      : transcript;

    const hasClarifications = Array.isArray(chatHistory) && chatHistory.some((m: any) => m.role === "user");
    const chatHistoryText = hasClarifications
      ? chatHistory.map((m: any) => `  [${m.role === "user" ? "Candidate" : "Interviewer"}]: ${m.content}`).join("\n")
      : "(No clarification questions were asked before solving.)";

    const prompt = referenceDoc
      ? `You are an elite consulting interview evaluator.
Evaluate the candidate ONLY using the reference document provided below for this specific question.

QUESTION: ${question}
DIFFICULTY: ${difficulty || "Medium"}
DOMAIN: ${domain || "General"}
HINT USED: ${hintUsed ? 'Yes' : 'No'}

REFERENCE DOCUMENT:
- Ideal Clarification Questions: ${JSON.stringify(referenceDoc.idealClarificationQuestions)}
- Expected Logical Structure: ${JSON.stringify(referenceDoc.expectedLogicalStructure)}
- Benchmark Assumptions: ${JSON.stringify(referenceDoc.benchmarkAssumptions)}
- Calculation Flow: ${JSON.stringify(referenceDoc.calculationFlow)}
- Final Answer Range: ${referenceDoc.finalAnswerRange.low} to ${referenceDoc.finalAnswerRange.high}, ideal: ${referenceDoc.finalAnswerRange.ideal}

CANDIDATE TRANSCRIPT: ${evaluationTranscript}
FINAL ANSWER: ${finalAnswer}
CLARIFICATION CHAT:
${chatHistoryText}

EVALUATION RULES:
1. Use the reference document as primary source of truth.
2. StepScores must map exactly to expectedLogicalStructure steps.
3. AssumptionComparison must use benchmarkAssumptions as idealAssumption values.
4. AccuracyScore — compute the percentage deviation of the candidate's final answer from the ideal value, then apply this ladder:
   - Within ±10% of ideal → 88–100
   - Within ±20% of ideal → 74–87
   - Within ±35% of ideal → 58–73
   - Within ±60% of ideal → 40–57
   - Within ±100% of ideal (same order of magnitude) → 20–39
   - Off by more than 100% (wrong order of magnitude) → 0–19
   If the candidate gave no numeric answer, AccuracyScore = 0. The final answer range [low, high] acts as a ±tolerance band: any answer inside that band is treated as ≤10% deviation automatically.
5. StructureScore reflects adherence to expectedLogicalStructure.
6. Be strict on structure — do not give StructureScore above 60 unless assumptions are explicit and steps are logical.
7. Feedback must reference actual numbers and assumptions from the candidate.
8. The average of all 'score' values inside StepScores MUST EXACTLY MATCH your overall AccuracyScore.
9. InterviewReadiness: "Ready" (both > 85), "Almost Ready" (both > 70), "Needs Work" (otherwise).
10. CLARIFICATION: questionsAsked = actual count; quality = Excellent/Good/Adequate/Poor/None; if none asked, list 3-5 suggestedQuestions from idealClarificationQuestions. Do NOT reduce numeric scores for skipping clarification.
11. CLARIFICATION SCORING: 2+ matching questions → add up to +8 to StructureScore (cap 100); 1 matching → +4; 0 → no adjustment.
12. NO-PROCESS RULE: If transcript says "(No thought process provided…)", StructureScore = 0; AccuracyScore uses the variance ladder above based solely on answer proximity.
13. ModelAnswer MUST be an array of PLAIN STRINGS ONLY — never objects, never nested arrays.
    First string: "Approach: …"; Middle strings: "Assumption: …"; Final string: "Calculation: … Final Answer: ~X".
14. GoodPoints: 2–4 specific evidence-backed observations referencing actual quotes or numbers. Never generic.

Return strict JSON only — no markdown, no commentary:
{"AccuracyScore":0,"StructureScore":0,"InterviewReadiness":"","VerdictLine":"","GoodPoints":"","BadPoints":"","Improvement":"","ClarificationFeedback":{"questionsAsked":0,"quality":"","feedback":"","suggestedQuestions":[]},"AssumptionComparison":[{"parameter":"","userAssumption":"","idealAssumption":"","isMatch":false}],"StepScores":[{"step":"","score":0,"comment":""}],"ModelAnswer":[""]}`
      : `You are a strict McKinsey interviewer evaluating a guesstimate challenge.
Question: ${question}
Question Difficulty: ${difficulty || "Medium"} | Domain: ${domain || "General"}
Candidate Transcript: ${evaluationTranscript}
Final Answer: ${finalAnswer}
Hint Used: ${hintUsed ? 'Yes' : 'No'}

Clarification Chat History (before solving):
${chatHistoryText}

CRITICAL RULES:
1. ModelAnswer MUST be an array of PLAIN STRINGS ONLY — never objects, never nested arrays.
   a. First string — "Approach: …" (one sentence framework).
   b. Middle strings — "Assumption: …" (one plain sentence per key assumption).
   c. Final string — "Calculation: … Final Answer: ~X".
2. Average of all StepScores[*].score MUST EXACTLY MATCH AccuracyScore.
3. InterviewReadiness: "Ready" (both > 85), "Almost Ready" (both > 70), "Needs Work" (otherwise).
4. AccuracyScore — estimate the "ideal" answer yourself, then compute deviation of the candidate's final answer and apply this ladder:
   - Within ±10% of ideal → 88–100
   - Within ±20% of ideal → 74–87
   - Within ±35% of ideal → 58–73
   - Within ±60% of ideal → 40–57
   - Within ±100% of ideal (same order of magnitude) → 20–39
   - Off by more than 100% (wrong order of magnitude) → 0–19
   If the candidate gave no numeric answer, AccuracyScore = 0.
5. StructureScore — be strict. Above 60 only if assumptions are explicit, reasoning is step-by-step, and the answer is justified. Above 80 only if approach, assumptions, calculations, and conclusion are all present and sound.
6. NO-PROCESS RULE: If transcript says "(No thought process provided…)", StructureScore = 0; AccuracyScore uses the variance ladder above from answer proximity alone.
7. GoodPoints: 2–4 specific evidence-backed observations — never generic. Quote candidate's exact numbers/phrases.
8. CLARIFICATION: questionsAsked = actual count; quality = Excellent/Good/Adequate/Poor/None; if none, list 3-5 suggestedQuestions.
9. CLARIFICATION SCORING: 2+ matching questions → +8 StructureScore (cap 100); 1 → +4; 0 → no adjustment.

Return strict JSON only — no markdown, no commentary:
{"AccuracyScore":0,"StructureScore":0,"InterviewReadiness":"","VerdictLine":"","GoodPoints":"","BadPoints":"","Improvement":"","ClarificationFeedback":{"questionsAsked":0,"quality":"","feedback":"","suggestedQuestions":[]},"AssumptionComparison":[{"parameter":"","userAssumption":"","idealAssumption":"","isMatch":false}],"StepScores":[{"step":"","score":0,"comment":""}],"ModelAnswer":[""]}`;

    const groq = new Groq({ apiKey });
    const textContent = await callGroqWithRetry(groq, prompt);

    let parsedJSON;
    try {
      const cleaned = textContent.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsedJSON = JSON.parse(cleaned);
    } catch (parseErr: any) {
      throw new Error(`JSON Parse Error: ${parseErr.message}. Raw: ${textContent.substring(0, 100)}…`);
    }

    if (hintUsed) {
      parsedJSON.AccuracyScore  = Math.min(parsedJSON.AccuracyScore,  70);
      parsedJSON.StructureScore = Math.min(parsedJSON.StructureScore, 75);
    }

    return NextResponse.json({
      ...parsedJSON,
      question,
      category: category || "Guesstimate",
      domain:   domain   || "generalist",
      hintUsed: !!hintUsed,
      date: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Evaluation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
