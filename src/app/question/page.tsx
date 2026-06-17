"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useLocalStorage } from "../hooks/useLocalStorage";
import styles from "./question.module.css";
import { Target, Users, Sparkles, Lightbulb, Mic, Flame, Clock, Lock, Brain, ShieldCheck, Pencil, BarChart2, TrendingUp } from "lucide-react";
import { saveSession, saveStreaks, saveCompletedDay, saveBestStreak } from "@/lib/db";
import { setNavigationGuard, clearNavigationGuard } from "@/lib/navigationGuard";
import type { Session } from "@/lib/db";

const FALLBACK_QUESTION = "Estimate the number of ping pong balls that can fit in a Boeing 747.";


interface TranscriptEntry {
  id: number;
  content: string;
  elapsed: string;
  editing: boolean;
}

function QuestionPageInner() {
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [liveText, setLiveText] = useState("");
  const liveTextRef = useRef("");

  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);

  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatRecording, setIsChatRecording] = useState(false);
  const [chatSpeechSupported, setChatSpeechSupported] = useState(false);
  const [nudgeShown, setNudgeShown] = useState(false);
  const [timeoutWarning, setTimeoutWarning] = useState("");

  const [finalAnswer, setFinalAnswer] = useState("");
  const [retryQuestion, setRetryQuestion] = useState<string | null>(null);
  const [streakStartNudge, setStreakStartNudge] = useState<string | null>(null);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<string | null>(null);
  const hasProgressRef = useRef(false);
  const [inactivityNudge, setInactivityNudge] = useState<string | null>(null);
  const inactivityNudgeShownRef = useRef(false);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nudgeDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [encourageToast, setEncourageToast] = useState<string | null>(null);
  const encourageTimer2Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const encourageTimer4Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const encourageTimer8Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const encourageDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [name] = useLocalStorage("mindloop_name", "");
  const [activeStreaksList] = useLocalStorage<any[]>("mindloop_active_streaks", []);
  const [practiceQuestions] = useLocalStorage<any[]>("mindloop_questions", []);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const streakId = searchParams.get("streakId") ?? "";
  const retryParam = searchParams.get("retry") === "true";
  const retryDayIndexParam = searchParams.get("retryDayIndex");
  const retryDayIndex = retryDayIndexParam !== null ? parseInt(retryDayIndexParam, 10) : null;
  const recognitionRef = useRef<any>(null);
  const chatRecognitionRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ── Derived question data ───────────────────────────────────────────────
  const currentStreak = streakId
    ? (activeStreaksList.find((s: any) => s.id === streakId) ?? null)
    : null;
  const activeQuestions: any[] | null = currentStreak?.questions ?? (practiceQuestions.length > 0 ? practiceQuestions : null);

  // Use completion count as the day index — stays in sync with home tab's completedDates.length
  const completedDatesCount: number = currentStreak?.completedDates?.length ?? 0;
  const dayIndex = completedDatesCount;
  // In retry mode, lock the question object to the original day's index so the
  // correct questionId, category, difficulty, and hint are used for evaluation.
  const currentQuestionObj = (() => {
    if (retryDayIndex !== null && activeQuestions && retryDayIndex >= 0 && retryDayIndex < activeQuestions.length) {
      return activeQuestions[retryDayIndex];
    }
    return activeQuestions ? activeQuestions[Math.min(dayIndex, activeQuestions.length - 1)] : null;
  })();
  // Never show the "streak complete" screen mid-retry
  const isStreakComplete = retryParam ? false : (activeQuestions !== null && dayIndex >= activeQuestions.length);
  const questionText = retryQuestion || currentQuestionObj?.question || FALLBACK_QUESTION;
  const questionCategory = currentQuestionObj?.category || "Guesstimate";
  const questionDomain = currentQuestionObj?.domain || "generalist";
  // For practice mode (no streak), domain falls back to the question's own domain
  const streakDomain: string = currentStreak?.domain ?? questionDomain;
  // For retry, displayDay reflects the original day (retryDayIndex is 0-based → +1 for display)
  const displayDay = retryDayIndex !== null
    ? retryDayIndex + 1
    : (activeQuestions ? Math.min(dayIndex + 1, activeQuestions.length) : 1);
  const totalDays = activeQuestions?.length || 1;
  const userInitial = (name || "S")[0].toUpperCase();

  // ── Info banner data ──────────────────────────────────────────────────────
  const DOMAIN_FOCUS: Record<string, string> = {
    Finance:    "Model revenue streams, unit economics, and market sizing",
    Product:    "Consider user segments, usage patterns, and platform scale",
    Marketing:  "Estimate reach, conversion rates, and campaign ROI",
    Sales:      "Break down by deal stages, segments, and win rates",
    Generalist: "Clarify scope, segment the market, and estimate top-down",
  };
  const infoFocus = DOMAIN_FOCUS[streakDomain] ?? DOMAIN_FOCUS.Generalist;

  // ── Ref for auto-submit + timer no-attempt ──────────────────────────────
  const latestStateRef = useRef({ transcriptEntries, liveText, finalAnswer, hintUsed, chatMessages, questionText, questionCategory, streakDomain, displayDay, totalDays, streakId });
  useEffect(() => {
    latestStateRef.current = { transcriptEntries, liveText, finalAnswer, hintUsed, chatMessages, questionText, questionCategory, streakDomain, displayDay, totalDays, streakId };
  }, [transcriptEntries, liveText, finalAnswer, hintUsed, chatMessages, questionText, questionCategory, streakDomain, displayDay, totalDays, streakId]);

  // ── Track whether user has started work (for back-nav guard) ───────────
  useEffect(() => {
    hasProgressRef.current =
      transcriptEntries.length > 0 ||
      liveText.trim().length > 0 ||
      finalAnswer.trim().length > 0 ||
      chatMessages.length > 0;
  }, [transcriptEntries, liveText, finalAnswer, chatMessages]);

  // ── Intercept browser back button ───────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      setLeaveTarget("back");
      setShowLeaveModal(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const guardedNavigate = (url: string) => {
    if (hasProgressRef.current) {
      setLeaveTarget(url);
      setShowLeaveModal(true);
    } else {
      router.push(url);
    }
  };

  const confirmLeave = () => {
    setShowLeaveModal(false);
    if (leaveTarget === "back") {
      router.push("/home");
    } else if (leaveTarget) {
      router.push(leaveTarget);
    }
  };

  // ── Inactivity nudge (40 s, once per visit) ─────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    const MESSAGES = [
      "Still with us? Your estimation is waiting.",
      "Take your best shot. There's no perfect answer here.",
      "Stuck? Try starting with what you do know.",
    ];

    const showNudge = () => {
      if (inactivityNudgeShownRef.current) return;
      inactivityNudgeShownRef.current = true;
      setInactivityNudge(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
      nudgeDismissTimerRef.current = setTimeout(() => setInactivityNudge(null), 5000);
    };

    const resetTimer = () => {
      if (inactivityNudgeShownRef.current) {
        setInactivityNudge(null);
        return;
      }
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(showNudge, 30000);
    };

    resetTimer();
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("mousedown", resetTimer);
    window.addEventListener("touchstart", resetTimer);

    return () => {
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("mousedown", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (nudgeDismissTimerRef.current) clearTimeout(nudgeDismissTimerRef.current);
    };
  }, [mounted]);

  // Dismiss inactivity nudge when recording starts
  useEffect(() => {
    if (isRecording && inactivityNudge) setInactivityNudge(null);
  }, [isRecording, inactivityNudge]);

  // ── Timed encouragement toasts ───────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;

    const MSGS_2 = [
      "2 minutes in! You are building momentum.",
      "Great start! Keep that thinking flowing.",
      "You are doing great so far. Stay with it.",
    ];
    const MSGS_4 = [
      "Halfway there! You are in the zone.",
      "4 minutes strong. Trust your framework.",
      "Keep going! Your best thinking is coming through.",
    ];
    const MSGS_8 = [
      "Almost done! Finish strong.",
      "2 minutes left. Give it everything you have got.",
      "You are so close. Wrap it up with confidence.",
    ];

    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    const showToast = (msg: string) => {
      if (encourageDismissRef.current) clearTimeout(encourageDismissRef.current);
      setEncourageToast(msg);
      encourageDismissRef.current = setTimeout(() => setEncourageToast(null), 4000);
    };

    encourageTimer2Ref.current = setTimeout(() => showToast(pick(MSGS_2)), 2 * 60 * 1000);
    encourageTimer4Ref.current = setTimeout(() => showToast(pick(MSGS_4)), 4 * 60 * 1000);
    encourageTimer8Ref.current = setTimeout(() => showToast(pick(MSGS_8)), 8 * 60 * 1000);

    return () => {
      if (encourageTimer2Ref.current) clearTimeout(encourageTimer2Ref.current);
      if (encourageTimer4Ref.current) clearTimeout(encourageTimer4Ref.current);
      if (encourageTimer8Ref.current) clearTimeout(encourageTimer8Ref.current);
      if (encourageDismissRef.current) clearTimeout(encourageDismissRef.current);
    };
  }, [mounted]);

  // ── Register sidebar navigation guard ────────────────────────────────────
  useEffect(() => {
    setNavigationGuard((url) => {
      setLeaveTarget(url);
      setShowLeaveModal(true);
    });
    return () => clearNavigationGuard();
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const elapsedTime = () => formatTime(600 - timeLeft);

  // ── Submit ───────────────────────────────────────────────────────────────
  // This is the ONLY place sessions are created. All writes happen here,
  // before navigating. The feedback page is pure display — no writes.
  const submitAssessment = useCallback(
    async (state: any = null) => {
      const s = state || latestStateRef.current;
      setIsLoading(true);
      const fullTranscript = [...(s.transcriptEntries as TranscriptEntry[]).map((e) => e.content), s.liveText]
        .filter(Boolean)
        .join("\n\n");
      const cleanChat = (s.chatMessages || []).filter(
        (m: any) => m.role === "user" || m.role === "interviewer"
      );
      try {
        const res = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: questionText,
            category: questionCategory,
            transcript: fullTranscript,
            finalAnswer: s.finalAnswer,
            hintUsed: s.hintUsed,
            chatHistory: cleanChat,
            difficulty: currentQuestionObj?.difficulty || "Medium",
            domain: streakDomain,
            questionId: currentQuestionObj?.id ?? "",
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const evalDate = new Date().toISOString();
        const todayStr = new Date().toLocaleDateString("sv");
        const challengeId = currentQuestionObj?.id || "unknown";
        const attemptId = `${challengeId}_${evalDate}`;

        // ── Build session entry ──────────────────────────────────────────────
        const rawLastStep = data.ModelAnswer?.length
          ? String(data.ModelAnswer[data.ModelAnswer.length - 1])
          : "";
        const lastModelStep = rawLastStep
          .replace(/^Step \d+:?\s*/i, "")
          .replace(/^Final Answer:\s*/i, "")
          .trim();
        const newEntry: Session = {
          date: evalDate,
          question: questionText,
          accuracyScore: data.AccuracyScore,
          structureScore: data.StructureScore,
          hintUsed: s.hintUsed,
          category: questionCategory,
          domain: streakDomain,
          interviewReadiness: data.InterviewReadiness,
          finalAnswer: s.finalAnswer || "",
          correctAnswer: lastModelStep,
          difficulty: currentQuestionObj?.difficulty || "Medium",
          dayIndex: displayDay,
          totalDays,
          status: "submitted" as const,
        };

        // ── Dedup: one record per question per calendar day ──────────────────
        const existingRaw = localStorage.getItem("mindloop_sessions");
        const allSessions: Session[] = existingRaw ? JSON.parse(existingRaw) : [];
        const existingIdx = allSessions.findIndex(
          e => e.question === questionText && new Date(e.date).toLocaleDateString("sv") === todayStr
        );
        if (existingIdx >= 0) {
          console.log("[SESSION_SAVE_BLOCKED]", {
            reason: "same_question_already_submitted_today",
            challengeId,
            attemptId,
            submittedAt: evalDate,
          });
          // Overwrite with the latest attempt (re-attempt on same day)
          allSessions[existingIdx] = newEntry;
        } else {
          allSessions.push(newEntry);
        }
        console.log("[SESSION_SAVE]", { challengeId, attemptId, submittedAt: evalDate });
        localStorage.setItem("mindloop_sessions", JSON.stringify(allSessions));
        saveSession(newEntry); // background Supabase sync

        // ── Update active streak ─────────────────────────────────────────────
        if (streakId) {
          try {
            const streaksRaw = localStorage.getItem("mindloop_active_streaks");
            if (streaksRaw) {
              const streaks = JSON.parse(streaksRaw);
              const idx = streaks.findIndex((st: any) => st.id === streakId);
              if (idx >= 0) {
                const isNewDay = !streaks[idx].completedDates?.includes(todayStr);
                const newCurrentDay = isNewDay
                  ? (streaks[idx].currentDay || 0) + 1
                  : streaks[idx].currentDay;
                const isNowComplete = newCurrentDay >= (streaks[idx].totalDays || Infinity);
                streaks[idx] = {
                  ...streaks[idx],
                  currentDay: newCurrentDay,
                  completedDates: isNewDay
                    ? [...(streaks[idx].completedDates || []), todayStr]
                    : streaks[idx].completedDates,
                  lastActivityDate: todayStr,
                  todayScore: { accuracyScore: data.AccuracyScore, structureScore: data.StructureScore },
                  status: isNowComplete ? "completed" : streaks[idx].status,
                };
                localStorage.setItem("mindloop_active_streaks", JSON.stringify(streaks));
                saveStreaks(streaks); // background Supabase sync
              }
            }
          } catch (e) {
            console.error("Streak update error", e);
          }
        }

        // ── Update completed days + best streak ──────────────────────────────
        const completedRaw = localStorage.getItem("mindloop_completed_days");
        let completedDays: string[] = completedRaw ? JSON.parse(completedRaw) : [];
        if (!completedDays.includes(todayStr)) {
          completedDays.push(todayStr);
          localStorage.setItem("mindloop_completed_days", JSON.stringify(completedDays));
          saveCompletedDay(todayStr); // background Supabase sync

          completedDays.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
          let streakLen = 1;
          let prev = new Date(completedDays[0]);
          prev.setHours(0, 0, 0, 0);
          for (let i = 1; i < completedDays.length; i++) {
            const curr = new Date(completedDays[i]);
            curr.setHours(0, 0, 0, 0);
            const diff = Math.floor((prev.getTime() - curr.getTime()) / 86400000);
            if (diff === 1) { streakLen++; prev = curr; }
            else if (diff === 0) continue;
            else break;
          }
          const bestStored = parseInt(localStorage.getItem("mindloop_best_streak") || "0");
          const allStreaks: any[] = JSON.parse(localStorage.getItem("mindloop_active_streaks") || "[]");
          const maxStreakDay = allStreaks.reduce((m: number, st: any) =>
            Math.max(m, st.currentDay || 0, st.completedDates?.length || 0), 0);
          const newBest = Math.max(streakLen, bestStored, maxStreakDay);
          localStorage.setItem("mindloop_best_streak", newBest.toString());
          saveBestStreak(newBest); // background Supabase sync
        }

        // ── Store eval payload for feedback display (read-only from this point) ──
        const evalPayload = {
          ...data,
          date: evalDate,
          finalAnswer: s.finalAnswer,
          difficulty: currentQuestionObj?.difficulty || "Medium",
          dayIndex: displayDay,
          totalDays,
          streakId,
          question: questionText,
          category: questionCategory,
          domain: streakDomain,
        };
        localStorage.setItem("mindloop_latest_evaluation", JSON.stringify(evalPayload));
        localStorage.setItem("mindloop_eval_" + evalDate, JSON.stringify(evalPayload));
        localStorage.removeItem("mindloop_draft_transcript");
        router.push("/feedback");
      } catch (err: any) {
        alert("Failed to evaluate: " + err.message);
        setIsLoading(false);
      }
    },
    [questionText, questionCategory, streakDomain, router, streakId, currentQuestionObj, displayDay, totalDays]
  );

  // ── Speech recognition setup ────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);

    // Retry mode: restore the original question from the previous attempt
    if (retryParam) {
      const saved = sessionStorage.getItem("mindloop_retry_question");
      if (saved) {
        setRetryQuestion(saved);
        sessionStorage.removeItem("mindloop_retry_question");
      }
    }

    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      liveTextRef.current = text;
      setLiveText(text);
    };
    recognitionRef.current.onerror = () => setIsRecording(false);

    // ── Separate recognition instance for the clarification chat input ──
    setChatSpeechSupported(true);
    chatRecognitionRef.current = new SpeechRecognition();
    chatRecognitionRef.current.continuous = false;   // auto-stops after a speech pause
    chatRecognitionRef.current.interimResults = false; // only final results

    chatRecognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      if (transcript) {
        setChatInput(prev => prev ? prev + " " + transcript : transcript);
      }
    };
    chatRecognitionRef.current.onend  = () => setIsChatRecording(false);
    chatRecognitionRef.current.onerror = () => setIsChatRecording(false);
  }, []);

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted || isStreakComplete || isLoading) return;
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev > 1) return prev - 1;
        clearInterval(id);
        const { finalAnswer: fa, transcriptEntries: te, liveText: lt, questionText: qt, questionCategory: qc, streakDomain: sd, displayDay: dd, totalDays: td, streakId: sid } = latestStateRef.current;
        const hasAnswer = fa.trim().length > 0;
        const hasTranscript = te.length > 0 || lt.trim().length > 0;
        if (hasAnswer) {
          submitAssessment();
        } else if (hasTranscript) {
          setTimeoutWarning("Time's up! Please enter your final estimate to submit.");
        } else {
          // Nothing entered — write a not-attempted marker and go straight to feedback
          const payload = {
            notAttempted: true,
            date: new Date().toISOString(),
            question: qt,
            category: qc,
            domain: sd,
            dayIndex: dd,
            totalDays: td,
            streakId: sid,
          };
          localStorage.setItem("mindloop_latest_evaluation", JSON.stringify(payload));
          router.push("/feedback");
        }
        return 0;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [mounted, isStreakComplete, isLoading, submitAssessment]);

  // ── Nudge 1: streak-start toast (day 1 of a new streak) ─────────────────
  useEffect(() => {
    if (!mounted || !streakId || dayIndex !== 0) return;
    // Show only once per streak per browser session
    const seenKey = `mindloop_nudge_streak_start_${streakId}`;
    if (sessionStorage.getItem(seenKey)) return;
    sessionStorage.setItem(seenKey, "1");
    const msgs = [
      "Day 1 of your next big streak. Let's go.",
      "Every expert was once a beginner. Start strong.",
      "Your future self will thank you for showing up today.",
    ];
    setStreakStartNudge(msgs[Math.floor(Math.random() * msgs.length)]);
    const t = setTimeout(() => setStreakStartNudge(null), 4000);
    return () => clearTimeout(t);
  }, [mounted, streakId, dayIndex]);

  // ── Auto-scroll transcript ───────────────────────────────────────────────
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcriptEntries, liveText]);

  // ── Auto-scroll clarification chat ──────────────────────────────────────
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── Mic toggle ───────────────────────────────────────────────────────────
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition not supported. Please use Chrome or Edge.");
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      const captured = liveTextRef.current.trim();
      if (captured) {
        setTranscriptEntries((prev) => [
          ...prev,
          { id: Date.now(), content: captured, elapsed: elapsedTime(), editing: false },
        ]);
        liveTextRef.current = "";
        setLiveText("");
      }
    } else {
      liveTextRef.current = "";
      setLiveText("");
      recognitionRef.current.start();
      setIsRecording(true);
      if (!hintUsed) setHintUsed(false); // keep as-is but mark session started
    }
  };

  // ── Chat mic toggle ───────────────────────────────────────────────────────
  const toggleChatRecording = () => {
    if (!chatRecognitionRef.current) return;
    if (isChatRecording) {
      chatRecognitionRef.current.stop();
      setIsChatRecording(false);
    } else {
      try {
        chatRecognitionRef.current.start();
        setIsChatRecording(true);
      } catch { /* recognition already started — ignore */ }
    }
  };

  // ── Transcript entry editing ─────────────────────────────────────────────
  const editEntry = (id: number) =>
    setTranscriptEntries((p) => p.map((e) => (e.id === id ? { ...e, editing: true } : e)));
  const updateEntry = (id: number, content: string) =>
    setTranscriptEntries((p) => p.map((e) => (e.id === id ? { ...e, content } : e)));
  const saveEntry = (id: number) =>
    setTranscriptEntries((p) => p.map((e) => (e.id === id ? { ...e, editing: false } : e)));

  // ── TTS ──────────────────────────────────────────────────────────────────
  const handleTTS = () => {
    if (!("speechSynthesis" in window)) { alert("TTS not supported in this browser."); return; }
    if (isPlaying) { window.speechSynthesis.cancel(); setIsPlaying(false); return; }
    const u = new SpeechSynthesisUtterance(questionText);
    u.rate = 0.9; u.pitch = 1.1;
    u.onend = () => setIsPlaying(false);
    setIsPlaying(true);
    window.speechSynthesis.speak(u);
  };

  // ── Chat ─────────────────────────────────────────────────────────────────
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const newMessages = [...chatMessages, { role: "user", content: chatInput }];
    setChatMessages(newMessages);
    setChatInput("");
    setIsChatLoading(true);
    try {
      const res = await fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionText, messages: newMessages, questionId: currentQuestionObj?.id ?? "" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setChatMessages([...newMessages, { role: "interviewer", content: data.reply }]);
    } catch (err: any) {
      alert("Failed to get clarification: " + err.message);
    } finally {
      setIsChatLoading(false);
    }
  };

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const userAskedClarification = chatMessages.some((m) => m.role === "user");
    if (!userAskedClarification && !nudgeShown) {
      setNudgeShown(true);
      const proceed = window.confirm(
        "You haven't asked any clarifying questions yet!\n\nIn real interviews, clarifying scope is crucial. Click OK to submit anyway."
      );
      if (!proceed) return;
    }
    submitAssessment({ transcriptEntries, liveText, finalAnswer, hintUsed, chatMessages });
  };

  if (!mounted) return null;

  // ── Streak complete screen ────────────────────────────────────────────────
  if (isStreakComplete) {
    return (
      <div className={styles.page}>
        <motion.div
          className={styles.completeCard}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <h1>Streak Complete!</h1>
          <p>You&apos;ve successfully completed all {activeQuestions?.length} days!</p>
          <button onClick={() => router.push("/home")} className={styles.completeBtn}>
            Return Home to Start a New Streak
          </button>
        </motion.div>
      </div>
    );
  }

  const usedQuestions = chatMessages.filter((m) => m.role === "user").length;

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* ── Nudge 1: streak-start toast ── */}
      {streakStartNudge && (
        <div className={styles.nudgeToast}>
          <Flame size={16} style={{marginRight:'4px'}} />{streakStartNudge}
        </div>
      )}
      {encourageToast && (
        <div className={styles.encourageToast}>
          {encourageToast}
        </div>
      )}
      {inactivityNudge && (
        <div className={styles.inactivityToast}>
          {inactivityNudge}
        </div>
      )}
      {/* ── Top bar ── */}
      <motion.div
        className={styles.topBar}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Row 1: label + meta badges */}
        <div className={styles.topRow}>
          <p className={styles.breadcrumb}>
            DAILY CHALLENGE&nbsp;·&nbsp;{questionDomain.toUpperCase()}
          </p>
          <div className={styles.topBarRight}>
            <div className={`${styles.statChip} ${timeLeft < 60 ? styles.statChipWarn : ""}`}>
              <span className={styles.chipIcon}><Clock size={16} /></span>
              <div>
                <p className={styles.chipValue}>{formatTime(timeLeft)}</p>
                <p className={styles.chipLabel}>Time Remaining</p>
              </div>
            </div>
            <div className={styles.statChip}>
              <span className={styles.chipIcon}><BarChart2 size={16} /></span>
              <div>
                <p className={styles.chipValue}>Round {displayDay} of {totalDays}</p>
                <p className={styles.chipLabel}>Estimation Round</p>
              </div>
            </div>
            <div className={styles.statChip}>
              <span className={styles.chipIcon}><BarChart2 size={16} /></span>
              <div>
                <p className={styles.chipValue}>{currentQuestionObj?.difficulty || "Medium"}</p>
                <p className={styles.chipLabel}>Difficulty</p>
              </div>
            </div>
            <div className={styles.avatar}>{userInitial}</div>
          </div>
        </div>
        {/* Rows 2–4: question title */}
        <h1 className={styles.questionTitle}>{questionText}</h1>
        {/* Row 5: tagline */}
        <p className={styles.tagline}>
          Sharpen your thinking. Structure your approach. Estimate with clarity.
        </p>
      </motion.div>


      {/* ── Two-column body ── */}
      <div className={styles.columns}>
        {/* ── Left column ── */}
        <div className={styles.leftCol}>
          {/* Clarification Questions (combined hint + chat) */}
          <motion.div
            className={styles.clarificationCard}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className={styles.clarificationHeader}>
              <h3 className={styles.clarificationTitle}>
                <Sparkles size={14} style={{marginRight:'6px'}} />Clarification Questions
              </h3>
              <p className={styles.clarificationSub}>
                Strong candidates clarify assumptions before estimating.
              </p>
            </div>

            {currentQuestionObj?.hint && (
              <button
                className={styles.hintRow}
                onClick={() => { setHintOpen(!hintOpen); setHintUsed(true); }}
                type="button"
              >
                <span><Lightbulb size={16} /></span>
                <span className={styles.hintText}>
                  {hintOpen ? currentQuestionObj.hint : "Show Hint"}
                </span>
                <span className={styles.hintChevron}>{hintOpen ? "▲" : "▼"}</span>
              </button>
            )}

            {chatMessages.length > 0 && (
              <div className={styles.chatHistory}>
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={msg.role === "user" ? styles.userMsg : styles.aiMsg}
                  >
                    <strong>{msg.role === "user" ? "You" : "Interviewer"}:</strong>{" "}
                    {msg.content}
                  </div>
                ))}
                {isChatLoading && (
                  <div className={styles.aiMsg}>
                    <em>Interviewer is thinking…</em>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
            )}

            <form onSubmit={handleSendChat} className={styles.chatForm}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={isChatRecording ? "Listening…" : "Ask the interviewer anything…"}
                disabled={isChatLoading}
                className={styles.chatInput}
              />
              {chatSpeechSupported && (
                <button
                  type="button"
                  onClick={toggleChatRecording}
                  className={`${styles.chatMicBtn} ${isChatRecording ? styles.chatMicBtnActive : ""}`}
                  title={isChatRecording ? "Stop recording" : "Ask by voice"}
                >
                  <Mic size={16} />
                </button>
              )}
              <button
                type="submit"
                disabled={isChatLoading || !chatInput.trim()}
                className={styles.chatAskBtn}
              >
                Ask
              </button>
            </form>
            <div className={styles.chatFooter}>
              <span><Sparkles size={14} style={{marginRight:'4px'}} />Clarify scope and assumptions before estimating</span>
              <span>{usedQuestions} asked</span>
            </div>
          </motion.div>
        </div>

        {/* ── Right column ── */}
        <div className={styles.rightCol}>
          {/* AI Interview Session */}
          <motion.div
            className={styles.sessionCard}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className={styles.sessionHeader}>
              <div className={styles.sessionHeaderLeft}>
                <span className={styles.redDot} />
                <h3 className={styles.sessionTitle}>Tell me your thought process</h3>
              </div>
              <button
                className={`${styles.micBtn} ${isRecording ? styles.micBtnActive : ""}`}
                onClick={toggleRecording}
                type="button"
                title={isRecording ? "Stop recording" : "Start recording"}
              >
                <Mic size={16} />
              </button>
            </div>

            <div className={styles.sessionTranscript}>
              {transcriptEntries.length === 0 && !isRecording && (
                <>
                  <p className={styles.emptySession}>
                    Press the mic button to start recording your approach…
                  </p>
                  <div className={styles.sessionFeatures}>
                    <div className={styles.sessionFeature}>
                      <span className={`${styles.featureIcon} ${styles.featureIconPurple}`}><Sparkles size={14} /></span>
                      <span>Organize your structured thinking</span>
                    </div>
                    <div className={styles.sessionFeature}>
                      <span className={`${styles.featureIcon} ${styles.featureIconGreen}`}><BarChart2 size={14} /></span>
                      <span>Speak clearly and confidently</span>
                    </div>
                    <div className={styles.sessionFeature}>
                      <span className={`${styles.featureIcon} ${styles.featureIconOrange}`}><TrendingUp size={14} /></span>
                      <span>Get better with every attempt</span>
                    </div>
                  </div>
                </>
              )}
              {transcriptEntries.map((entry) => (
                <div key={entry.id} className={styles.transcriptEntry}>
                  <div className={styles.entryAvatar}>{userInitial}</div>
                  <div className={styles.entryContent}>
                    <div className={styles.entryMeta}>
                      <span className={styles.entryYou}>You</span>
                      <span className={styles.entryTime}>{entry.elapsed}</span>
                      {!entry.editing && (
                        <button
                          className={styles.editBtn}
                          onClick={() => editEntry(entry.id)}
                          type="button"
                        >
                          <Pencil size={14} style={{marginRight:'4px'}} />Edit
                        </button>
                      )}
                    </div>
                    {entry.editing ? (
                      <textarea
                        className={styles.entryEditArea}
                        value={entry.content}
                        onChange={(e) => updateEntry(entry.id, e.target.value)}
                        onBlur={() => saveEntry(entry.id)}
                        autoFocus
                      />
                    ) : (
                      <p className={styles.entryText}>{entry.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isRecording && (
                <div className={styles.transcriptEntry}>
                  <div className={`${styles.entryAvatar} ${styles.entryAvatarLive}`}>
                    {userInitial}
                  </div>
                  <div className={styles.entryContent}>
                    <div className={styles.entryMeta}>
                      <span className={styles.entryYou}>You</span>
                      <span className={`${styles.entryTime} ${styles.liveTag}`}>● live</span>
                    </div>
                    <p className={styles.entryText} style={{ opacity: liveText ? 1 : 0.4 }}>
                      {liveText || "Listening…"}
                    </p>
                  </div>
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>
          </motion.div>

          {/* Timeout warning banner */}
          {timeoutWarning && (
            <div className={styles.timeoutBanner}>
              {timeoutWarning}
            </div>
          )}

          {/* Final Estimate + Submit */}
          <motion.form
            className={styles.submitSection}
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <label className={styles.estimateLabel}>Final Estimate</label>
            <input
              type="text"
              className={styles.estimateInput}
              value={finalAnswer}
              onChange={(e) => setFinalAnswer(e.target.value)}
              placeholder="e.g. 2,450"
            />
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading}
            >
              {isLoading ? <><Brain size={16} style={{marginRight:'6px'}} />Evaluating…</> : "Submit Answer →"}
            </button>
            <p className={styles.submitNote}><Lock size={16} style={{marginRight:'4px'}} />You can submit once</p>
          </motion.form>
        </div>
      </div>

      {/* ── Bottom motivational banner ── */}
      <motion.div
        className={styles.bottomBanner}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className={styles.bottomBannerLeft}>
          <span className={styles.bottomBannerShield}><ShieldCheck size={20} /></span>
          <div>
            <p className={styles.bottomBannerTitle}>Take a deep breath, think step by step, and enjoy the challenge.</p>
            <p className={styles.bottomBannerSub}>Every estimation you do makes you sharper!</p>
          </div>
        </div>
        <span className={styles.bottomBannerTarget}><Target size={20} /></span>
      </motion.div>

      {/* ── Leave challenge modal ── */}
      {showLeaveModal && (
        <div className={styles.leaveOverlay} onClick={() => setShowLeaveModal(false)}>
          <div className={styles.leaveModal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.leaveTitle}>Leave this challenge?</h2>
            <p className={styles.leaveBody}>Your progress won&apos;t be saved if you go back now.</p>
            <div className={styles.leaveBtns}>
              <button className={styles.leaveStayBtn} onClick={() => setShowLeaveModal(false)}>Stay</button>
              <button className={styles.leaveConfirmBtn} onClick={confirmLeave}>Leave anyway</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuestionPage() {
  return (
    <Suspense fallback={null}>
      <QuestionPageInner />
    </Suspense>
  );
}
