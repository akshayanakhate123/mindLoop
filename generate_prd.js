const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
  TableOfContents, ExternalHyperlink
} = require("docx");
const fs = require("fs");

const NAVY   = "142850";
const ORANGE = "F59E0B";
const BLUE   = "3B82F6";
const GREEN  = "22C55E";
const GRAY   = "64748B";
const LIGHT  = "F8F6F1";
const WHITE  = "FFFFFF";
const BORDER_COLOR = "E7E5E4";

const border = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, size: 36, color: NAVY, font: "Arial" })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, color: NAVY, font: "Arial" })]
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 24, color: NAVY, font: "Arial" })]
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: opts.color || "374151", ...opts })]
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: "374151" })]
  });
}

function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: "374151" })]
  });
}

function spacer(lines = 1) {
  return new Paragraph({ children: [new TextRun({ text: "", size: 22 * lines })] });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function label(text) {
  return new Paragraph({
    spacing: { before: 160, after: 60 },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 18, color: GRAY, font: "Arial", characterSpacing: 40 })]
  });
}

function divider() {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR } },
    children: [new TextRun("")]
  });
}

function headerRow(cells, widths) {
  return new TableRow({
    tableHeader: true,
    children: cells.map((text, i) => new TableCell({
      borders,
      width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: NAVY, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        children: [new TextRun({ text, bold: true, size: 20, color: WHITE, font: "Arial" })]
      })]
    }))
  });
}

function dataRow(cells, widths, shade = false) {
  return new TableRow({
    children: cells.map((text, i) => new TableCell({
      borders,
      width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: shade ? "F9FAFB" : WHITE, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        children: [new TextRun({ text: String(text), size: 20, font: "Arial", color: "374151" })]
      })]
    }))
  });
}

function table(headers, rows, widths) {
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      headerRow(headers, widths),
      ...rows.map((r, i) => dataRow(r, widths, i % 2 === 1))
    ]
  });
}

// ─── Title Page ──────────────────────────────────────────────────────────────
const titlePage = [
  new Paragraph({ spacing: { before: 1440 } }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "MINDLOOP", bold: true, size: 72, color: NAVY, font: "Arial" })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80 },
    children: [new TextRun({ text: "Product Requirements Document", size: 36, color: GRAY, font: "Arial" })]
  }),
  spacer(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ORANGE, space: 6 } },
    children: [new TextRun("")]
  }),
  spacer(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 160 },
    children: [new TextRun({ text: "AI-Powered Interview Preparation Platform", size: 28, color: "4B5563", font: "Arial" })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80 },
    children: [new TextRun({ text: "Guesstimates  ·  Market Sizing  ·  Structured Thinking", size: 24, color: GRAY, font: "Arial" })]
  }),
  spacer(3),
  new Table({
    width: { size: 5040, type: WidthType.DXA },
    columnWidths: [2520, 2520],
    rows: [
      new TableRow({ children: [
        new TableCell({ borders: noBorders, width: { size: 2520, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Version", bold: true, size: 20, color: GRAY, font: "Arial" })] })] }),
        new TableCell({ borders: noBorders, width: { size: 2520, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: "1.0", size: 20, color: "374151", font: "Arial" })] })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: noBorders, width: { size: 2520, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Date", bold: true, size: 20, color: GRAY, font: "Arial" })] })] }),
        new TableCell({ borders: noBorders, width: { size: 2520, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: "June 2026", size: 20, color: "374151", font: "Arial" })] })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: noBorders, width: { size: 2520, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Status", bold: true, size: 20, color: GRAY, font: "Arial" })] })] }),
        new TableCell({ borders: noBorders, width: { size: 2520, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: "Live — Active Development", size: 20, color: "374151", font: "Arial" })] })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: noBorders, width: { size: 2520, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Live URL", bold: true, size: 20, color: GRAY, font: "Arial" })] })] }),
        new TableCell({ borders: noBorders, width: { size: 2520, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: "mind-loop-k3xq.vercel.app", size: 20, color: BLUE, font: "Arial" })] })] }),
      ]}),
    ]
  }),
  pageBreak()
];

// ─── TOC ─────────────────────────────────────────────────────────────────────
const tocSection = [
  h1("Table of Contents"),
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
  pageBreak()
];

// ─── 1. Executive Summary ────────────────────────────────────────────────────
const execSummary = [
  h1("1. Executive Summary"),
  p("MindLoop is an AI-powered, habit-forming interview preparation platform purpose-built for aspiring product managers, consultants, MBA candidates, and analytics professionals. It solves a single, well-defined problem: most candidates know they need to practice guesstimate and market-sizing questions consistently, but they lack a structured, daily system that provides expert-level feedback without a human coach."),
  spacer(),
  p("MindLoop delivers one calibrated guesstimate challenge per day per domain, evaluates the candidate’s answer with a McKinsey-grade AI evaluator (accuracy deviation ladder + structure rubric), and builds the practice habit through a streak-based commitment system. Every session results in a detailed AI breakdown — assumption comparison, step-by-step scoring, model answer, and concrete improvement advice — enabling rapid, measurable skill development."),
  spacer(),
  p("The platform is live at mind-loop-k3xq.vercel.app, built on Next.js 16, Supabase, and Groq’s Llama-3.3-70b model, with 500 curated questions across five professional domains."),
  spacer(),
  label("Key Differentiators"),
  bullet("Reference-doc evaluation: per-question answer benchmarks, benchmark assumptions, and calculation flows ground every score in objective data rather than vague AI judgment"),
  bullet("Clarification practice: a live AI interviewer responds to candidate questions before they answer, mirroring the real interview experience"),
  bullet("Streak commitment system: 7, 14, and 30-day streak tracks with expiry mechanics to build genuine daily habits, not one-off sessions"),
  bullet("Full feedback loop: every session produces an assumption comparison table, step scores, model answer walkthrough, and specific improvement advice"),
  bullet("No coach required: the entire McKinsey-grade evaluation loop runs autonomously at zero marginal cost per session"),
  pageBreak()
];

// ─── 2. Problem Statement ────────────────────────────────────────────────────
const problemStatement = [
  h1("2. Problem Statement"),
  h2("2.1 The Gap in Interview Preparation"),
  p("Guesstimate and market-sizing questions are a standard and often decisive component of consulting and product management interviews at McKinsey, BCG, Bain, Google, Meta, and similar firms. Yet candidates consistently underperform in these sections for three structural reasons:"),
  spacer(),
  bullet("No consistent daily practice system. Candidates read frameworks in books but rarely practice with real questions under timed, pressure conditions."),
  bullet("No objective feedback. Practice answers shared with peers or mentors yield subjective, qualitative feedback that is difficult to track or improve on."),
  bullet("No reference for what ‘good’ looks like. Without knowing the ideal assumptions, calculation flow, and expected answer range, candidates cannot calibrate their accuracy."),
  spacer(),
  h2("2.2 Current Alternatives and Their Shortfalls"),
  spacer(),
  table(
    ["Alternative", "Shortfall"],
    [
      ["YouTube / blog frameworks", "One-way, no practice, no feedback"],
      ["Case interview books", "Static, no personalized scoring, no habit system"],
      ["Peer practice sessions", "Inconsistent, subjective, hard to schedule daily"],
      ["Human coaching", "Expensive ($150–$500/hr), not scalable, not daily"],
      ["Generic AI chatbots", "No calibrated rubric, no reference answers, no streak system"],
    ],
    [4680, 4680]
  ),
  spacer(),
  h2("2.3 The Opportunity"),
  p("A platform that combines a curated question bank, AI-graded evaluation against a reference rubric, live clarification practice, and a habit-forming streak system can replace or significantly reduce the need for expensive coaching while delivering measurably better outcomes per practice hour."),
  pageBreak()
];

// ─── 3. Target Users & Personas ──────────────────────────────────────────────
const targetUsers = [
  h1("3. Target Users & Personas"),
  h2("3.1 Primary Personas"),
  spacer(),
  h3("Persona 1: The Consulting Aspirant"),
  table(
    ["Attribute", "Detail"],
    [
      ["Name", "Priya, 23"],
      ["Role", "Final-year MBA student"],
      ["Goal", "Land a BCG or McKinsey offer"],
      ["Pain", "Practices once a week; feedback from peers is vague; scores vary wildly"],
      ["Behavior", "Studies frameworks but struggles with estimation accuracy under time pressure"],
      ["Success metric", "Consistent 70%+ accuracy on Finance and Market Sizing questions before interview season"],
    ],
    [2800, 6560]
  ),
  spacer(),
  h3("Persona 2: The PM Candidate"),
  table(
    ["Attribute", "Detail"],
    [
      ["Name", "Arjun, 26"],
      ["Role", "Software engineer transitioning to product management"],
      ["Goal", "Pass PM interviews at Google, Flipkart, or a high-growth startup"],
      ["Pain", "Strong on execution but weak on market sizing and business estimation"],
      ["Behavior", "Practices in bursts before interviews but lacks a consistent daily habit"],
      ["Success metric", "Complete a 30-day Product domain streak; reach ‘Almost Ready’ readiness level"],
    ],
    [2800, 6560]
  ),
  spacer(),
  h3("Persona 3: The Analytics Professional"),
  table(
    ["Attribute", "Detail"],
    [
      ["Name", "Meera, 28"],
      ["Role", "Data analyst targeting a senior strategy role"],
      ["Goal", "Sharpen business intuition and structured thinking"],
      ["Pain", "Comfortable with numbers but not with open-ended business estimation problems"],
      ["Behavior", "Practices during commute; prefers voice-based input over typing"],
      ["Success metric", "Average accuracy above 65% across Finance and Generalist domains"],
    ],
    [2800, 6560]
  ),
  spacer(),
  h2("3.2 Secondary Users"),
  bullet("Undergraduate students targeting analyst programs at top consulting firms"),
  bullet("Professionals upskilling for internal strategy/product roles"),
  bullet("Bootcamp and MBA program instructors using MindLoop as a structured practice tool for cohorts"),
  pageBreak()
];

// ─── 4. Goals & Success Metrics ─────────────────────────────────────────────
const goals = [
  h1("4. Product Goals & Success Metrics"),
  h2("4.1 Business Goals"),
  bullet("Establish MindLoop as the leading daily guesstimate practice platform for India and global consulting/PM candidates"),
  bullet("Achieve sustainable user retention through the streak habit loop"),
  bullet("Build a defensible position through the proprietary question bank and per-question reference evaluation system"),
  spacer(),
  h2("4.2 User Goals"),
  bullet("Complete one guesstimate challenge per day without needing a coach or partner"),
  bullet("Receive specific, actionable feedback after every session"),
  bullet("Track improvement over time with objective metrics"),
  bullet("Build a visible daily practice habit through streaks and activity heatmaps"),
  spacer(),
  h2("4.3 Key Success Metrics"),
  spacer(),
  table(
    ["Metric", "Target", "Measurement Method"],
    [
      ["Day-7 retention", "40%+", "Users who submit at least 1 session in week 2"],
      ["Streak completion rate", "35%+", "Streaks completed vs started (7-day)"],
      ["Sessions per active user per week", "5+", "Average weekly submissions for active users"],
      ["Avg accuracy improvement", "+15 points over 14 sessions", "Delta between first 3 and last 3 session scores"],
      ["Session completion rate", "80%+", "Sessions submitted vs started"],
      ["Clarification usage rate", "50%+", "Sessions where at least 1 clarifying question was asked"],
      ["Hint usage rate", "<25%", "Sessions where hint was revealed"],
      ["Time to first completed streak", "<10 days", "Median for 7-day streak completions"],
    ],
    [3120, 2000, 4240]
  ),
  pageBreak()
];

// ─── 5. Feature Specifications ───────────────────────────────────────────────
const features = [
  h1("5. Feature Specifications"),

  h2("5.1 Authentication & Onboarding"),
  label("Overview"),
  p("Users sign in with Google OAuth via Supabase. Every sign-in forces the account picker to prevent silent session reuse. New users go through a three-step onboarding flow before accessing the app."),
  spacer(),
  label("Onboarding Steps"),
  numbered("Welcome screen: user enters name and email (pre-filled from Google session)"),
  numbered("Goal selection: user picks one or more goals from three options"),
  numbered("Completion: profile saved to localStorage and Supabase; cookie set for middleware gate"),
  spacer(),
  label("Goals Available"),
  bullet("Sharpen my estimation thinking"),
  bullet("Improve my structured problem solving"),
  bullet("Practice consistently every day"),
  spacer(),
  label("Acceptance Criteria"),
  bullet("Google OAuth sign-in completes in under 3 seconds on a standard connection"),
  bullet("Account picker is shown on every login; silent re-authentication is not permitted"),
  bullet("Users who have completed onboarding are never shown onboarding again"),
  bullet("Incomplete onboarding blocks access to all app pages via middleware cookie check"),
  bullet("Profile (name, email, goal) persists in both localStorage and Supabase"),
  spacer(),

  h2("5.2 Home Dashboard"),
  label("Overview"),
  p("The home page is the daily hub. It shows the user’s active streaks, completed streaks, a motivational hero banner, and a wizard to create new streaks."),
  spacer(),
  label("Hero Banner"),
  bullet("Displays a rotating daily motivational quote from a curated list"),
  bullet("Shows a ‘Start Today’s Challenge’ CTA if the user has an active streak with today not yet completed"),
  spacer(),
  label("Active Streak Cards"),
  bullet("Horizontal scroll row; each card is a fixed 320px width"),
  bullet("Shows: domain chip, category chip, progress chip (e.g. ‘2 / 7 days’), weekly calendar row with completion dots"),
  bullet("If today is complete: shows ‘Day N Complete!’, today’s accuracy and structure scores, and a countdown to next challenge"),
  bullet("If today is not complete: shows ‘Start Today’s Challenge’ button"),
  bullet("Forfeit Streak button with confirmation (marks streak as forfeited, saves forfeited session entry)"),
  bullet("Celebration modal (confetti + message) fires on streak completion"),
  spacer(),
  label("New Streak Wizard"),
  bullet("Step 1: Category selection — Guesstimates (active), Case Studies (coming soon, disabled)"),
  bullet("Step 2: Domain selection — Finance, Product, Marketing, Sales, Generalist"),
  bullet("Step 3: Duration selection — 7, 14, or 30 days"),
  bullet("On confirmation: generates a unique question sequence from the selected domain, excluding previously answered questions"),
  spacer(),
  label("Streak Expiry Logic"),
  bullet("A streak expires if the user has not submitted for more than 36 hours"),
  bullet("Expired streaks are moved out of active streaks on next page load"),
  bullet("Users are notified of expiry via streak status chip"),
  spacer(),
  label("Acceptance Criteria"),
  bullet("Multiple active streaks (different domains) can run simultaneously"),
  bullet("New streak creation excludes all questions the user has previously answered"),
  bullet("Streak expiry is computed from lastActivityDate; 36-hour window from last submission"),
  bullet("Celebration modal fires exactly once per completed streak"),
  spacer(),

  h2("5.3 Challenge / Question Page"),
  label("Overview"),
  p("The challenge page is the core interaction. The user has 10 minutes to ask clarifying questions to an AI interviewer, record or type their thought process, and submit a final estimate."),
  spacer(),
  label("Layout"),
  bullet("Two-column: left column (40% width) = Clarification Questions panel; right column (60%) = Answer + Submit panel"),
  bullet("On screens ≤ 768px: stacks vertically, left panel first"),
  bullet("Top bar: breadcrumb (domain), countdown timer, round indicator (Day N of M), difficulty badge, user avatar"),
  spacer(),
  label("Clarification Questions Panel (Left)"),
  bullet("Hint button: reveals the question’s hint on click; once revealed, accuracy and structure scores are capped at 70 and 75 respectively"),
  bullet("AI Chat: candidate types or speaks a clarifying question; AI responds in 1–3 sentences"),
  bullet("AI is grounded in the per-question reference document (ideal clarification questions, benchmark assumptions)"),
  bullet("Off-topic guard: any question not related to the estimation problem is rejected with a fixed message"),
  bullet("Voice input: Web Speech API mic button in the chat input"),
  bullet("Question counter: shows number of clarifying questions asked"),
  spacer(),
  label("Answer Panel (Right)"),
  bullet("Voice transcript: continuous speech recognition; each recording stop creates a transcript entry with elapsed time"),
  bullet("Transcript entries are editable (pencil icon to edit, blur to save)"),
  bullet("Final Estimate: text input for the final numeric/range answer"),
  bullet("Submit button: single submission per session; disabled during evaluation"),
  spacer(),
  label("Timer Behavior"),
  bullet("10-minute countdown shown in top bar; turns red at under 60 seconds"),
  bullet("Auto-submits when timer reaches zero if a final answer exists"),
  bullet("If no final answer at timeout but transcript exists: shows warning banner asking for final answer"),
  bullet("If nothing entered at timeout: writes a ‘not attempted’ payload and navigates to feedback"),
  spacer(),
  label("Navigation Guard"),
  bullet("Intercepting browser back button: pushes a history entry to prevent accidental back navigation; shows ‘Leave challenge?’ confirmation modal"),
  bullet("Sidebar links: intercepted via NavigationGuard singleton; shows same modal"),
  bullet("Confirming leave: navigates to home; cancelling returns to challenge"),
  spacer(),
  label("Engagement Mechanics"),
  bullet("Streak-start toast on Day 1 of a new streak (shown once per streak per browser session)"),
  bullet("Inactivity nudge: shown after 30 seconds of no interaction (shown once per visit)"),
  bullet("Encouragement toasts at 2-minute, 4-minute, and 8-minute marks"),
  spacer(),
  label("Retry Mode"),
  bullet("Triggered from the feedback page’s ‘Try Again’ button"),
  bullet("URL includes retry=true and retryDayIndex (0-based index into streak’s question array)"),
  bullet("Original question text restored from sessionStorage"),
  bullet("currentQuestionObj is pinned to the retried day’s slot, ensuring correct questionId, category, difficulty, and hint for re-evaluation"),
  bullet("On submit, the previous session entry for that question is overwritten (no duplicates)"),
  spacer(),
  label("Acceptance Criteria"),
  bullet("Timer starts immediately on page load; pauses are not supported"),
  bullet("Voice recording can be started and stopped multiple times; each stop creates a new transcript entry"),
  bullet("Clarification AI never reveals the answer or hints at the numerical range"),
  bullet("Hint reveals are tracked; once revealed, hint penalty applies to the evaluation"),
  bullet("Submit is disabled during evaluation API call; loading state is shown"),
  bullet("Retry mode correctly pins all question metadata; the retry evaluation uses the same rubric as the original"),
  spacer(),

  h2("5.4 AI Evaluation Engine"),
  label("Overview"),
  p("Every submitted session is evaluated by a Groq-powered Llama-3.3-70b-versatile model. The evaluator operates in one of two modes depending on whether a per-question reference document exists."),
  spacer(),
  label("Reference-Doc Mode (Primary)"),
  p("Used when a reference file exists at src/data/references/{questionId}.json. The reference document contains:"),
  bullet("Ideal clarification questions (array of strings)"),
  bullet("Expected logical structure (ordered steps with names and weights)"),
  bullet("Benchmark assumptions (key parameters with ideal values and ranges)"),
  bullet("Calculation flow (step-by-step derivation)"),
  bullet("Final answer range: {low, ideal, high}"),
  spacer(),
  label("General Mode (Fallback)"),
  p("Used when no reference file exists. The AI estimates the ideal answer itself and applies the same rubric."),
  spacer(),
  label("Accuracy Score Ladder"),
  table(
    ["Deviation from Ideal", "AccuracyScore Range"],
    [
      ["Within ±10% of ideal answer", "88 – 100"],
      ["Within ±20% of ideal answer", "74 – 87"],
      ["Within ±35% of ideal answer", "58 – 73"],
      ["Within ±60% of ideal answer", "40 – 57"],
      ["Within ±100% (same order of magnitude)", "20 – 39"],
      ["Off by more than 100% (wrong order of magnitude)", "0 – 19"],
      ["No numeric answer provided", "0"],
    ],
    [4680, 4680]
  ),
  spacer(),
  label("Scoring Rules"),
  bullet("StructureScore reflects adherence to expectedLogicalStructure; above 60 only if assumptions are explicit and reasoning is step-by-step; above 80 only if approach, assumptions, calculations, and conclusion are all present"),
  bullet("Clarification bonus: +8 StructureScore for 2+ matching clarification questions, +4 for 1 matching, +0 for none (capped at 100)"),
  bullet("Hint penalty: AccuracyScore capped at 70, StructureScore capped at 75 if hint was used"),
  bullet("No-process rule: if no transcript was provided, StructureScore = 0 regardless of final answer quality"),
  bullet("Average of all StepScores must exactly match AccuracyScore"),
  bullet("InterviewReadiness: ‘Ready’ if both scores > 85; ‘Almost Ready’ if both > 70; ‘Needs Work’ otherwise"),
  spacer(),
  label("Evaluation Output Schema"),
  table(
    ["Field", "Type", "Description"],
    [
      ["AccuracyScore", "Integer 0–100", "Deviation-based accuracy score"],
      ["StructureScore", "Integer 0–100", "Adherence to logical structure"],
      ["InterviewReadiness", "String enum", "Ready / Almost Ready / Needs Work"],
      ["VerdictLine", "String", "One-sentence overall verdict"],
      ["GoodPoints", "String", "2–4 specific evidence-backed positives"],
      ["BadPoints", "String", "Specific weaknesses with reference to candidate output"],
      ["Improvement", "String", "Concrete next-step advice"],
      ["ClarificationFeedback", "Object", "questionsAsked, quality, feedback, suggestedQuestions[]"],
      ["AssumptionComparison", "Array", "[{parameter, userAssumption, idealAssumption, isMatch}]"],
      ["StepScores", "Array", "[{step, score, comment}]"],
      ["ModelAnswer", "String[]", "Approach / Assumption / Calculation strings"],
    ],
    [2520, 1800, 5040]
  ),
  spacer(),
  label("Reliability"),
  bullet("Groq API calls retry up to 3 times with exponential backoff (2s, 4s, 6s) on rate limit (HTTP 429)"),
  bullet("If both transcript and final answer are empty, a zero-score response is returned without calling the API"),
  bullet("JSON parse errors are caught and surfaced as user-facing error messages"),
  spacer(),

  h2("5.5 Feedback / Results Page"),
  label("Overview"),
  p("The feedback page displays the full AI evaluation result for a completed session. It is read-only; no data writes occur here."),
  spacer(),
  label("Sections"),
  bullet("Verdict banner: InterviewReadiness badge + VerdictLine"),
  bullet("Score gauges: AccuracyScore and StructureScore as visual gauges with numeric labels"),
  bullet("Good Points / Bad Points / Improvement: AI-generated feedback panels"),
  bullet("Clarification Feedback: questions asked count, quality rating, feedback narrative, suggested questions (if none asked)"),
  bullet("Assumption Comparison table: parameter | your assumption | ideal assumption | match status"),
  bullet("Step-by-step score breakdown: each logical step with its score and AI comment"),
  bullet("Model Answer: the AI’s ideal walkthrough as an ordered narrative"),
  bullet("Sticky footer: ‘Try Again’ button (restores exact same question for retry)"),
  spacer(),
  label("Not-Attempted State"),
  p("If the user did not attempt the challenge (timer expired with no input), the feedback page shows a special not-attempted message with a ‘Try Again’ CTA."),
  spacer(),
  label("Acceptance Criteria"),
  bullet("All feedback sections render correctly for both reference-doc and general-mode evaluations"),
  bullet("Try Again correctly navigates back to the question page with retry=true, retryDayIndex, and streakId parameters"),
  bullet("The session stored from a retry overwrites the previous session for that question on that day"),
  spacer(),

  h2("5.6 Challenges Page"),
  label("Overview"),
  p("Shows all challenges the user completed today. Each challenge is shown as a card with scores, answers, and bookmark controls."),
  spacer(),
  label("Deduplication Logic"),
  p("Only the latest submission per question per local calendar day is shown. Retried questions show only the most recent attempt. IST-safe: uses toLocaleDateString(‘sv’) for date comparison."),
  spacer(),
  label("Challenge Card"),
  bullet("Domain (e.g. PRODUCT) and category label in top row"),
  bullet("Difficulty badge (Easy / Medium / Hard)"),
  bullet("Round indicator (e.g. ‘Round 2 of 7’)"),
  bullet("Bookmark button (adds to bookmarks)"),
  bullet("Question text"),
  bullet("Your answer vs. Correct answer side by side"),
  bullet("Score pills: Accuracy X%, Structure X%"),
  bullet("Result badge: Correct (≥70%), Close (≥40%), Incorrect (<40%)"),
  bullet("Submitted-at timestamp"),
  spacer(),
  label("Acceptance Criteria"),
  bullet("Only sessions with status ‘submitted’ (not forfeited) appear"),
  bullet("Clicking a card navigates to the feedback page for that session"),
  bullet("Empty state shows a CTA to start today’s challenge, routing to the correct pending streak if one exists"),
  spacer(),

  h2("5.7 Insights & Progress Page"),
  label("Overview"),
  p("Provides a data-rich view of the user’s performance over time. All aggregation is done on deduplicated session data (latest per question per local day)."),
  spacer(),
  label("Date Range"),
  p("Date range picker with three options: Last 7 Days (default), Last 30 Days, Last 90 Days. All charts and metrics update when range changes."),
  spacer(),
  label("Top Stats Row"),
  bullet("Interview Readiness: semi-circle gauge (average of AccuracyScore + StructureScore across last 5 sessions); green > 80%, amber > 60%, red otherwise"),
  bullet("Current Streak: computed from local completedDays array (IST-safe, not from session UTC dates)"),
  bullet("Best Streak: stored separately and updated after each session"),
  bullet("Avg Accuracy % and Avg Structure %: averages across all sessions in selected range"),
  spacer(),
  label("Improvement Banner"),
  p("Visible only when user has 6+ sessions in range. Compares last 3 vs. previous 3 sessions by accuracy. Shows positive (green) or negative (red) trend."),
  spacer(),
  label("Trend Charts"),
  bullet("Accuracy Trend line chart: daily average accuracy over selected range"),
  bullet("Structure Trend line chart: daily average structure score over selected range"),
  bullet("X-axis labels skip every N days to avoid crowding (adaptive)"),
  bullet("Y-axis: 0–100% with gridlines at 25-point intervals"),
  spacer(),
  label("Performance by Type"),
  bullet("Donut chart showing relative performance across 5 domains"),
  bullet("Legend: domain name + average accuracy; untried domains show ‘—’ (greyed out)"),
  bullet("Donut uses only domains with at least one session; empty donut if no sessions in range"),
  spacer(),
  label("Strongest / Weakest Type Cards"),
  bullet("Strongest: domain with highest average accuracy + a domain-specific description"),
  bullet("Weakest: domain with lowest average accuracy + a domain-specific improvement tip"),
  bullet("Weakest card is hidden if only one domain has data"),
  spacer(),
  label("Acceptance Criteria"),
  bullet("All metrics are computed from deduplicated sessions (latest per question per local day)"),
  bullet("Current streak uses local calendar dates, not UTC session timestamps"),
  bullet("Charts render correctly with 1 to 90 data points"),
  bullet("Untried domain types display ‘—’ in the legend, not ‘0%’"),
  spacer(),

  h2("5.8 History Page"),
  label("Overview"),
  p("A scrollable timeline of all practice sessions, grouped by date. Users can filter by domain and toggle bookmarks inline."),
  spacer(),
  label("Session Entry"),
  bullet("Domain badge with domain-specific icon and background color"),
  bullet("Difficulty chip"),
  bullet("Question text (truncated with expand option)"),
  bullet("Accuracy and structure scores"),
  bullet("Verdict / InterviewReadiness label"),
  bullet("Bookmark toggle button"),
  spacer(),
  label("Grouping & Filtering"),
  bullet("Grouped by local calendar day: ‘Today’, ‘Yesterday’, then date labels (e.g. ‘Jun 15’)"),
  bullet("Filter by domain"),
  bullet("Both submitted and forfeited sessions shown (forfeited sessions styled differently)"),
  spacer(),

  h2("5.9 Bookmarks Page"),
  label("Overview"),
  p("A collection of questions the user has saved for future review or re-practice. Bookmarks persist across sessions."),
  spacer(),
  label("Bookmark Card"),
  bullet("Domain tag with icon and color"),
  bullet("Difficulty badge"),
  bullet("Full question text"),
  bullet("Date added"),
  bullet("Practice button: navigates to question page for that specific question"),
  bullet("Remove button: deletes bookmark from localStorage and Supabase"),
  spacer(),

  h2("5.10 Profile Page"),
  label("Overview"),
  p("Displays the user’s account information, practice statistics, activity heatmap, and achievements."),
  spacer(),
  label("Sections"),
  bullet("Account section: name (editable), email, goal"),
  bullet("Stats: current streak, best streak, total sessions, average accuracy"),
  bullet("Activity heatmap: 13-week GitHub-style grid of practice days; active days highlighted"),
  bullet("Achievements: badges earned based on milestones (e.g. first streak completed, 7-day streak, 100% accuracy session)"),
  bullet("Sign out button: clears session, forces Google account picker on next login"),
  spacer(),
  label("Acceptance Criteria"),
  bullet("Name edits save to both localStorage and Supabase"),
  bullet("Heatmap uses local calendar dates (not UTC) for accurate day marking"),
  bullet("Sign out clears auth state and redirects to login page"),
  pageBreak()
];

// ─── 6. User Flows ───────────────────────────────────────────────────────────
const userFlows = [
  h1("6. Key User Flows"),

  h2("6.1 First-Time User Flow"),
  numbered("User lands on root URL"),
  numbered("Redirected to login page; clicks ‘Sign in with Google’"),
  numbered("Google account picker shown; user selects account"),
  numbered("OAuth callback handled; user authenticated with Supabase"),
  numbered("Middleware checks onboarding cookie; not found — redirect to /onboarding"),
  numbered("Onboarding Step 1: enter name and email (pre-filled from Google)"),
  numbered("Onboarding Step 2: select one or more practice goals"),
  numbered("Onboarding Step 3: completion; profile saved; cookie set"),
  numbered("Redirect to /home"),
  numbered("User sees hero banner + empty active streaks panel + ‘Create Your First Streak’ CTA"),
  spacer(),

  h2("6.2 Daily Challenge Flow (Happy Path)"),
  numbered("User opens app; navigates to /home"),
  numbered("Active streak card shows ‘Start Today’s Challenge’ button"),
  numbered("Click navigates to /question?streakId={id}"),
  numbered("Timer starts; question displayed"),
  numbered("User asks 1–3 clarifying questions via the Clarification panel"),
  numbered("User speaks their thought process via voice recording"),
  numbered("User types a final estimate"),
  numbered("User clicks ‘Submit Answer’ (or timer auto-submits)"),
  numbered("Evaluation API called; loading state shown"),
  numbered("Session saved to localStorage + Supabase (background)"),
  numbered("Streak’s completedDates updated; completedDays updated"),
  numbered("User navigated to /feedback"),
  numbered("Feedback page shows full AI evaluation"),
  numbered("User can click ‘Try Again’ or navigate away"),
  spacer(),

  h2("6.3 Retry Flow"),
  numbered("User clicks ‘Try Again’ on the feedback page"),
  numbered("Original question text saved to sessionStorage"),
  numbered("Navigation to /question?streakId={id}&retry=true&retryDayIndex={n}"),
  numbered("Question page reads retryDayIndex; pins currentQuestionObj to that streak array slot"),
  numbered("retryQuestion restored from sessionStorage"),
  numbered("User completes the challenge with the same question"),
  numbered("On submit, existing session for that question + today is overwritten"),
  numbered("User navigated to /feedback with updated scores"),
  spacer(),

  h2("6.4 New Streak Creation Flow"),
  numbered("User clicks ‘Create New Streak’ on home page"),
  numbered("Wizard Step 1: select category (Guesstimates)"),
  numbered("Wizard Step 2: select domain (Finance / Product / Marketing / Sales / Generalist)"),
  numbered("Wizard Step 3: select duration (7 / 14 / 30 days)"),
  numbered("Confirm: system generates unique question sequence, excluding previously answered"),
  numbered("New streak created with status ‘active’, saved to localStorage + Supabase"),
  numbered("Streak card appears in active streaks row; user directed to first challenge"),
  pageBreak()
];

// ─── 7. Question Library ──────────────────────────────────────────────────────
const questionLibrary = [
  h1("7. Question Library"),
  h2("7.1 Structure"),
  p("MindLoop ships with 500 curated guesstimate questions evenly distributed across five domains (100 per domain). Each question is stored as a JSON object in src/data/guesstimates/."),
  spacer(),
  label("Question Object Schema"),
  table(
    ["Field", "Type", "Description"],
    [
      ["id", "String", "Unique identifier (e.g. ‘product-1’)"],
      ["domain", "String", "Domain key: finance, product, marketing, sales, generalist"],
      ["question", "String", "The full question text"],
      ["hint", "String", "Structural hint for the user (reveals on click, triggers score penalty)"],
      ["difficulty", "Enum", "Easy / Medium / Hard"],
      ["category", "String", "Always ‘Guesstimate’ for current library"],
    ],
    [1440, 1200, 6720]
  ),
  spacer(),
  h2("7.2 Reference Documents"),
  p("A subset of questions have per-question reference documents at src/data/references/{questionId}.json. These ground the AI evaluation in objective data."),
  spacer(),
  label("Reference Document Schema"),
  table(
    ["Field", "Description"],
    [
      ["idealClarificationQuestions", "Array of the best clarifying questions a candidate should ask"],
      ["expectedLogicalStructure", "Ordered array of steps the ideal answer should follow"],
      ["benchmarkAssumptions", "Key parameters with ideal values and acceptable ranges"],
      ["calculationFlow", "Step-by-step derivation matching the logical structure"],
      ["finalAnswerRange", "Object: {low, ideal, high} — the acceptable answer band"],
    ],
    [3120, 6240]
  ),
  spacer(),
  h2("7.3 Domain Distribution"),
  table(
    ["Domain", "Questions", "Focus Area"],
    [
      ["Finance", "100", "Revenue modeling, unit economics, valuation, market sizing with financial metrics"],
      ["Product", "100", "User adoption, market sizing for digital products, platform scale estimation"],
      ["Marketing", "100", "Campaign reach, conversion funnels, audience sizing, ROI estimation"],
      ["Sales", "100", "Pipeline sizing, deal volume, sales org productivity, territory planning"],
      ["Generalist", "100", "Open-ended estimation problems spanning multiple domains"],
    ],
    [1800, 1440, 6120]
  ),
  pageBreak()
];

// ─── 8. Data Architecture ────────────────────────────────────────────────────
const dataArch = [
  h1("8. Data Architecture"),
  h2("8.1 Storage Strategy"),
  p("MindLoop uses a two-layer storage architecture: localStorage as the primary data layer (fast, synchronous, offline-capable) and Supabase PostgreSQL as the secondary layer (persistence, cross-device sync, analytics)."),
  spacer(),
  p("All reads serve from localStorage first. If localStorage is empty, the app fetches from Supabase, populates localStorage, and returns data. All writes go to localStorage immediately and to Supabase asynchronously (fire-and-forget)."),
  spacer(),
  h2("8.2 localStorage Keys"),
  table(
    ["Key", "Type", "Contents"],
    [
      ["mindloop_sessions", "JSON Array", "All session entries (submitted and forfeited)"],
      ["mindloop_active_streaks", "JSON Array", "All streak objects with questions, completedDates, status"],
      ["mindloop_completed_days", "JSON Array", "YYYY-MM-DD local date strings for each day a session was completed"],
      ["mindloop_best_streak", "String (number)", "Integer count of best streak length"],
      ["mindloop_latest_evaluation", "JSON Object", "Most recent evaluation result; read by feedback page"],
      ["mindloop_eval_{date}", "JSON Object", "Per-session evaluation result keyed by ISO date"],
      ["mindloop_name", "String", "User’s display name"],
      ["mindloop_email", "String", "User’s email address"],
      ["mindloop_goal", "String", "Selected onboarding goals (comma-separated)"],
      ["mindloop_bookmarks", "JSON Array", "Bookmarked question objects"],
      ["mindloop_onboarding_complete", "String (‘true’)", "Gate flag; also stored as cookie for SSR middleware"],
    ],
    [3000, 1560, 4800]
  ),
  spacer(),
  h2("8.3 Session Object Schema"),
  table(
    ["Field", "Type", "Description"],
    [
      ["date", "ISO String", "UTC timestamp of submission"],
      ["question", "String", "Full question text"],
      ["accuracyScore", "Integer", "0–100"],
      ["structureScore", "Integer", "0–100"],
      ["hintUsed", "Boolean", "Whether the hint was revealed"],
      ["category", "String", "Always ‘Guesstimate’ currently"],
      ["domain", "String", "Title case domain name (e.g. ‘Product’)"],
      ["interviewReadiness", "String", "Ready / Almost Ready / Needs Work"],
      ["finalAnswer", "String", "User’s submitted estimate"],
      ["correctAnswer", "String", "Last step of ModelAnswer (AI’s final calculation)"],
      ["difficulty", "String", "Easy / Medium / Hard"],
      ["dayIndex", "Integer", "The streak day number (1-based)"],
      ["totalDays", "Integer", "Total days in the streak"],
      ["status", "Enum", "‘submitted’ or ‘forfeited’"],
    ],
    [2160, 1440, 5760]
  ),
  spacer(),
  h2("8.4 Session Deduplication"),
  p("All aggregation pages (Insights, Challenges) deduplicate sessions before processing: for each unique (question, local calendar day) pair, only the latest submission by timestamp is retained. This ensures retried questions do not inflate counts or distort averages."),
  spacer(),
  p("Date comparisons use toLocaleDateString(‘sv’) which returns YYYY-MM-DD in the local timezone, ensuring correctness for IST users where UTC midnight and local midnight differ by 5 hours 30 minutes."),
  pageBreak()
];

// ─── 9. Technical Architecture ───────────────────────────────────────────────
const techArch = [
  h1("9. Technical Architecture"),
  h2("9.1 Stack"),
  table(
    ["Layer", "Technology", "Role"],
    [
      ["Frontend Framework", "Next.js 16.2 (App Router)", "SSR/CSR hybrid, routing, API routes"],
      ["Language", "TypeScript 5", "Type safety across all layers"],
      ["React version", "React 19", "UI components and hooks"],
      ["Build Tool", "Turbopack", "Fast local development builds"],
      ["Styling", "CSS Modules", "Co-located scoped styles per component"],
      ["Animations", "Framer Motion", "Page and component transitions"],
      ["Icons", "Lucide React", "Exclusive icon library (no emojis)"],
      ["Auth", "Supabase Auth (Google OAuth)", "Authentication, session management"],
      ["Database", "Supabase (PostgreSQL)", "Background persistence and cross-device sync"],
      ["AI", "Groq API — llama-3.3-70b-versatile", "Evaluation and clarification responses"],
      ["Speech", "Web Speech API", "Voice input for transcript and clarification chat"],
      ["Deployment", "Vercel", "Hosting, edge functions, CI/CD from GitHub"],
    ],
    [2520, 2880, 3960]
  ),
  spacer(),
  h2("9.2 Project Structure"),
  table(
    ["Path", "Description"],
    [
      ["src/app/home/", "Dashboard page — streaks, hero banner, new streak wizard"],
      ["src/app/question/", "Challenge page — answer + clarify flow, timer, navigation guard"],
      ["src/app/feedback/", "Results page — full AI evaluation display, retry button"],
      ["src/app/challenges/", "Today’s solved challenges with dedup and bookmarks"],
      ["src/app/insights/", "Progress charts, readiness gauge, performance by type"],
      ["src/app/history/", "Full session timeline grouped by date"],
      ["src/app/bookmarks/", "Saved questions for review"],
      ["src/app/profile/", "Account info, heatmap, achievements, stats"],
      ["src/app/onboarding/", "3-step new user onboarding flow"],
      ["src/app/api/evaluate/", "POST endpoint — grades an answer with Groq"],
      ["src/app/api/clarify/", "POST endpoint — handles clarifying question AI responses"],
      ["src/data/guesstimates/", "500 JSON question files across 5 domains"],
      ["src/data/references/", "Per-question reference evaluation documents"],
      ["src/lib/db.ts", "localStorage + Supabase read/write layer"],
      ["src/lib/navigationGuard.ts", "Module-level singleton for cross-component navigation interception"],
      ["src/app/proxy.ts", "Next.js middleware (not middleware.ts) for onboarding gate"],
    ],
    [3360, 6000]
  ),
  spacer(),
  h2("9.3 API Endpoints"),
  table(
    ["Endpoint", "Method", "Input", "Output"],
    [
      ["POST /api/evaluate", "POST", "question, transcript, finalAnswer, hintUsed, chatHistory, difficulty, domain, questionId", "Full evaluation JSON (AccuracyScore, StructureScore, ModelAnswer, etc.)"],
      ["POST /api/clarify", "POST", "question, messages[], questionId", "{ reply: string } — 1–3 sentence AI response"],
    ],
    [2160, 720, 3240, 3240]
  ),
  spacer(),
  h2("9.4 AI Model Configuration"),
  table(
    ["Parameter", "Value"],
    [
      ["Model", "llama-3.3-70b-versatile"],
      ["Provider", "Groq API"],
      ["Temperature", "0 (deterministic; consistent scoring)"],
      ["Response format", "json_object (evaluate endpoint)"],
      ["Retry policy", "3 attempts with exponential backoff (2s, 4s, 6s) on HTTP 429"],
      ["Max context", "The full transcript + chat history + reference doc are sent in a single prompt"],
    ],
    [2520, 6840]
  ),
  pageBreak()
];

// ─── 10. Design System ───────────────────────────────────────────────────────
const designSystem = [
  h1("10. Design System"),
  h2("10.1 Visual Style"),
  p("MindLoop’s visual identity is: 70% Linear (clean, professional, data-dense), 20% Notion (structured, readable, calm), 10% Duolingo (streaks, badges, habit mechanics — never cartoonish)."),
  spacer(),
  h2("10.2 Color Palette"),
  table(
    ["Token", "Hex", "Usage"],
    [
      ["Navy (Primary)", "#142850", "Headings, primary buttons, active navigation, sidebar background"],
      ["Orange (Accent)", "#F59E0B", "Challenge labels, progress indicators, highlight states, streak chips"],
      ["Purple", "#8B5CF6", "Sales domain, secondary accents, focus states"],
      ["Green", "#22C55E", "Positive feedback, success states, Product domain"],
      ["Blue", "#3B82F6", "Accuracy score, analytics, Finance domain"],
      ["Red", "#EF4444", "Errors, destructive actions, forfeit buttons"],
      ["Page Background", "#F8F6F1", "App background (warm off-white)"],
      ["Card Background", "#FFFFFF", "Cards and panels"],
      ["Border", "#E7E5E4", "All card and input borders"],
      ["Muted Text", "#64748B", "Secondary labels, subtitles"],
    ],
    [2160, 1440, 5760]
  ),
  spacer(),
  h2("10.3 Typography"),
  table(
    ["Element", "Weight", "Size", "Color"],
    [
      ["Page Headings (H1)", "700 Bold", "24–32px", "#142850"],
      ["Section Headings (H2)", "700 Bold", "18–24px", "#142850"],
      ["Card Titles (H3)", "600 Semi-bold", "14–18px", "#142850"],
      ["Body Text", "400–500", "14px", "#374151"],
      ["Labels / Chips", "600 Semi-bold", "11–12px", "#64748B (with letter-spacing)"],
      ["Score Values", "700 Bold", "24–36px", "Domain or state color"],
    ],
    [2520, 1440, 1440, 3960]
  ),
  spacer(),
  h2("10.4 Icon System"),
  p("All icons are exclusively from lucide-react. No other icon library may be mixed in. Emoji use is strictly prohibited throughout the product."),
  spacer(),
  p("Icon sizes: 16px (inline/label), 20px (card headers), 24px (hero/navigation)."),
  spacer(),
  h2("10.5 Owl Mascot"),
  p("The owl is MindLoop’s mascot. It appears ONLY in: hero section, empty states, and motivation banners. It must never appear in metric cards, charts, statistics, navigation, or achievement badges."),
  spacer(),
  h2("10.6 Component Principles"),
  bullet("Soft shadows and rounded corners (16–18px radius on cards)"),
  bullet("Large spacing and clean whitespace"),
  bullet("Cards are white on a warm off-white (#F8F6F1) page background"),
  bullet("Color communicates meaning (green = good, red = error, orange = in-progress)"),
  bullet("The user should feel like they are training for interviews, not playing a game"),
  pageBreak()
];

// ─── 11. Constraints ─────────────────────────────────────────────────────────
const constraints = [
  h1("11. Constraints & Assumptions"),
  h2("11.1 Technical Constraints"),
  bullet("The Web Speech API (voice input) requires Chrome or Edge; Safari support is limited and not guaranteed"),
  bullet("localStorage is the primary data layer; data is device-specific; cross-device sync via Supabase is background/best-effort"),
  bullet("Groq API rate limits apply; the retry policy handles transient limits but sustained high traffic may require API tier upgrades"),
  bullet("The middleware file must be named proxy.ts (not middleware.ts) due to the Next.js version’s routing behavior"),
  bullet("All date computations use local timezone (toLocaleDateString(‘sv’)) to ensure IST correctness; UTC-only dates would cause off-by-one errors for users between midnight and 5:30 AM IST"),
  spacer(),
  h2("11.2 Product Assumptions"),
  bullet("Users practice on a single device; multi-device sync is a future feature"),
  bullet("One session per question per day is the intended model; the dedup system enforces this while allowing retries"),
  bullet("The 36-hour streak expiry window is intentional; it allows late-night users to still complete the previous day’s challenge"),
  bullet("Case Studies and other question types are scoped out of the current release and will be enabled in a future version"),
  bullet("Social and leaderboard features are intentionally absent in v1 to maintain focus on individual skill development"),
  spacer(),
  h2("11.3 Security Constraints"),
  bullet("The GROQ_API_KEY is server-side only (never exposed to the client)"),
  bullet("Supabase RLS (Row-Level Security) must be enabled to prevent cross-user data access"),
  bullet("Google OAuth is the only authentication method; password-based auth is not supported"),
  bullet("The clarification AI has an off-topic guard to prevent prompt injection or misuse as a general-purpose assistant"),
  pageBreak()
];

// ─── 12. Out of Scope ─────────────────────────────────────────────────────────
const outOfScope = [
  h1("12. Out of Scope (v1)"),
  table(
    ["Feature", "Reason / Future Plan"],
    [
      ["Case Studies category", "UI placeholder exists; content and evaluation rubric in development for v2"],
      ["Social leaderboard", "Planned for v2 after individual practice loop is proven"],
      ["Mobile app (iOS / Android)", "Planned post-web stabilization; Web Speech API dependency is a blocker"],
      ["Multi-device sync (real-time)", "Supabase background sync exists; real-time conflict resolution is v2"],
      ["Group / cohort practice", "Enterprise/B2B use case; scoped for v3"],
      ["Video interview simulation", "Requires camera/audio processing infrastructure; roadmap item"],
      ["Custom question uploads", "Admin tooling needed; not built yet"],
      ["Password-based auth", "Google OAuth covers target users; complexity not justified in v1"],
      ["Offline mode (PWA)", "localStorage provides offline read; offline submit would require service worker"],
    ],
    [3120, 6240]
  ),
  pageBreak()
];

// ─── 13. Roadmap ─────────────────────────────────────────────────────────────
const roadmap = [
  h1("13. Roadmap"),
  h2("13.1 Current (v1 — Live)"),
  bullet("Core challenge loop: streak creation → daily challenge → AI evaluation → feedback"),
  bullet("500-question library across 5 domains with per-question reference documents"),
  bullet("Voice input (transcript + clarification chat)"),
  bullet("Retry flow with correct question pinning"),
  bullet("Insights, Challenges, History, Bookmarks, Profile pages"),
  bullet("Activity heatmap, streak mechanics, achievements"),
  bullet("Supabase auth + background sync"),
  spacer(),
  h2("13.2 Near-Term (v1.x)"),
  bullet("Case Studies category — enable the disabled category with structured case evaluation rubric"),
  bullet("Expand reference documents to all 500 questions (currently partial)"),
  bullet("Mobile responsive polish and PWA manifest"),
  bullet("Email digest: weekly progress summary sent to user"),
  bullet("Achievement system expansion: more milestone badges"),
  bullet("Admin dashboard: question management, user analytics"),
  spacer(),
  h2("13.3 Medium-Term (v2)"),
  bullet("Social leaderboard: weekly accuracy rankings by domain"),
  bullet("Peer practice mode: two users practice the same question and compare scores"),
  bullet("Cohort/instructor mode: instructor creates a class, assigns question sets, views student progress"),
  bullet("Real-time Supabase sync with conflict resolution for multi-device users"),
  bullet("Streak freeze: allow users to pause a streak for up to 2 days per month"),
  bullet("Difficulty progression: auto-increase difficulty as accuracy improves"),
  spacer(),
  h2("13.4 Long-Term (v3+)"),
  bullet("Mobile app (iOS / Android) with native speech recognition"),
  bullet("Video interview simulation with AI interviewer avatar"),
  bullet("LLM-powered custom question generation for niche domains"),
  bullet("Mentorship marketplace: connect users with verified coaches for live feedback"),
  bullet("Enterprise licensing for MBA programs and coaching firms"),
  pageBreak()
];

// ─── 14. Risks & Mitigations ─────────────────────────────────────────────────
const risks = [
  h1("14. Risks & Mitigations"),
  table(
    ["Risk", "Likelihood", "Impact", "Mitigation"],
    [
      ["Groq API rate limits under heavy load", "Medium", "High", "Exponential backoff retry (3x); monitor API tier; add request queuing for spike traffic"],
      ["LLM scoring inconsistency (non-deterministic responses)", "Low", "High", "Temperature = 0 for determinism; per-question reference docs ground evaluation; JSON schema enforcement"],
      ["localStorage data loss (browser clear)", "Medium", "Medium", "Supabase background sync ensures recovery on next login; show sync status indicator"],
      ["Streak expiry frustrating users", "Medium", "Medium", "36-hour grace window (not 24h); future: streak freeze feature"],
      ["Web Speech API not supported (Safari)", "High", "Low", "Manual text input always available; fallback message on unsupported browsers"],
      ["Question exhaustion (user answers all 500)", "Low", "High", "Dedup only excludes within active streaks; practised questions can re-appear in new streaks after cooldown period (roadmap)"],
      ["AI evaluation bias toward verbose answers", "Low", "Medium", "No-process rule (StructureScore=0 if no transcript); accuracy scored independently of structure"],
      ["GROQ_API_KEY leaked via client-side code", "Low", "Critical", "Key is server-only (Next.js API route); never bundled into client"],
    ],
    [2160, 900, 900, 5400]
  ),
  pageBreak()
];

// ─── Appendix ─────────────────────────────────────────────────────────────────
const appendix = [
  h1("Appendix A: Evaluation Prompt Structure"),
  p("The evaluation prompt sent to Groq differs based on the availability of a reference document. Both modes return the same JSON schema. The reference-doc prompt includes:"),
  bullet("Ideal clarification questions array"),
  bullet("Expected logical structure (ordered steps)"),
  bullet("Benchmark assumptions (parameters and ideal values)"),
  bullet("Calculation flow (step-by-step derivation)"),
  bullet("Final answer range: {low, ideal, high}"),
  spacer(),
  p("The general-mode prompt instructs the model to estimate the ideal answer itself using business knowledge before applying the accuracy deviation ladder."),
  spacer(),

  h1("Appendix B: Clarification AI Constraints"),
  p("The clarification API endpoint operates under strict persona rules enforced in the system prompt:"),
  bullet("Only answers questions directly related to clarifying the scope, assumptions, units, context, or data needed for the specific estimation question"),
  bullet("Refuses off-topic questions with a fixed response: ‘I can only help clarify this specific challenge question.’"),
  bullet("Never reveals the final numerical answer or hints at the answer range"),
  bullet("Never mentions the reference document or benchmark values to the user"),
  bullet("Keeps responses to 1–3 sentences; picks the most reasonable interpretation of ambiguous questions"),
  spacer(),

  h1("Appendix C: Streak Expiry Logic"),
  p("A streak’s expiry is computed as follows:"),
  bullet("Reference time: lastActivityDate if set (ISO timestamp); otherwise startDate"),
  bullet("Expiry window: 36 hours from reference time"),
  bullet("Check: if (Date.now() - new Date(referenceTime).getTime()) > 36 * 60 * 60 * 1000 AND streak status is ‘active’, mark as ‘expired’"),
  bullet("Check runs on every home page load and reSync call"),
  bullet("Expired streaks are moved from active to expired; their sessions are retained in history"),
  spacer(),

  h1("Appendix D: Domain Colors Reference"),
  table(
    ["Domain", "Color Name", "Hex"],
    [
      ["Finance", "Blue", "#3B82F6"],
      ["Product", "Green", "#22C55E"],
      ["Marketing", "Amber", "#F59E0B"],
      ["Sales", "Purple", "#8B5CF6"],
      ["Generalist", "Slate", "#64748B"],
    ],
    [2400, 2400, 4560]
  ),
];

// ─── Build Document ───────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }, {
          level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } }
        }]
      },
      {
        reference: "numbers",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: NAVY },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: NAVY },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 }
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: NAVY },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 }
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR, space: 4 } },
          children: [
            new TextRun({ text: "MindLoop — Product Requirements Document", size: 18, color: GRAY, font: "Arial" }),
            new TextRun({ text: "\tv1.0  |  June 2026", size: 18, color: GRAY, font: "Arial" }),
          ],
          tabStops: [{ type: "right", position: 9360 }],
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Page ", size: 18, color: GRAY, font: "Arial" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GRAY, font: "Arial" }),
            new TextRun({ text: " of ", size: 18, color: GRAY, font: "Arial" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: GRAY, font: "Arial" }),
          ]
        })]
      })
    },
    children: [
      ...titlePage,
      ...tocSection,
      ...execSummary,
      ...problemStatement,
      ...targetUsers,
      ...goals,
      ...features,
      ...userFlows,
      ...questionLibrary,
      ...dataArch,
      ...techArch,
      ...designSystem,
      ...constraints,
      ...outOfScope,
      ...roadmap,
      ...risks,
      ...appendix,
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("D:\\AI projects\\owlly\\MindLoop_PRD.docx", buffer);
  console.log("PRD created successfully: MindLoop_PRD.docx");
}).catch(err => {
  console.error("Error creating PRD:", err);
  process.exit(1);
});
