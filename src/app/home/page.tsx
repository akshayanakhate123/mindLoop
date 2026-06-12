"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocalStorage } from "../hooks/useLocalStorage";
import styles from "./home.module.css";
import { motion } from "framer-motion";
import { datasets } from "../../data/guesstimates";
import Image from "next/image";
import { HeroBanner } from "./HeroBanner";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  loadStreaks, saveStreaks,
  loadBestStreak, saveBestStreak,
  loadCompletedDays, saveSessions,
} from "@/lib/db";
import { Trophy, Clock, Flame, Sparkles, Target, BarChart2, MessageSquare, X, DollarSign, Package, Megaphone, Users, Lightbulb, Brain, Calendar, PartyPopper, HeartCrack } from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────
const QUOTES = [
  { text: "Thinking is the hardest work there is, which is probably the reason why so few engage in it.", author: "Henry Ford" },
  { text: "An approximate answer to the right question is worth a great deal more than a precise answer to the wrong one.", author: "John Tukey" },
  { text: "In God we trust; all others must bring data.", author: "W. Edwards Deming" },
];

const EXAMPLE_QUESTIONS: Record<string, string[]> = {
  Finance:    ["What counts as revenue here?", "Should we include retail or only institutional?", "What time range should we estimate for?"],
  Marketing:  ["Are we targeting B2B or B2C customers?", "What geography should we focus on?", "Should we count organic or paid channels only?"],
  Product:    ["What counts as an active user?", "Are we estimating for mobile or all platforms?", "What time range should we estimate for?"],
  Sales:      ["What counts as a closed deal?", "Should we consider only direct sales?", "What is the target customer segment?"],
  Generalist: ["What counts as revenue?", "Should we consider only one segment?", "What time range should we estimate for?"],
};

const CATEGORIES = [
  { value: "Guesstimates", label: "Guesstimates", icon: <BarChart2 size={16} />, desc: "Market sizing & estimation" },
  { value: "Case Studies", label: "Case Studies", icon: <MessageSquare size={16} />, desc: "Coming soon", disabled: true },
];

const DOMAINS = [
  { value: "Finance",    label: "Finance",    icon: <DollarSign size={14} /> },
  { value: "Product",    label: "Product",    icon: <Package size={14} /> },
  { value: "Marketing",  label: "Marketing",  icon: <Megaphone size={14} /> },
  { value: "Sales",      label: "Sales",      icon: <Users size={14} /> },
  { value: "Generalist", label: "Generalist", icon: <Lightbulb size={14} /> },
];

// ── Types ──────────────────────────────────────────────────────────────────
export interface ActiveStreak {
  id: string;
  category: string;
  domain: string;
  totalDays: number;
  currentDay: number;
  completedDates: string[];    // ISO date strings e.g. "2026-05-28"
  startDate: string;           // ISO timestamp
  lastActivityDate: string | null;
  status: "active" | "completed" | "forfeited" | "expired";
  questions: any[];
  todayScore?: { accuracyScore: number; structureScore: number; clarificationCount?: number } | null;
}

// ── Streak expiry ──────────────────────────────────────────────────────────
// A streak expires if the user has not submitted in more than 36 hours.
// Reference time: lastActivityDate if set, otherwise startDate (ISO timestamp).
const EXPIRY_MS = 36 * 60 * 60 * 1000;

// Returns full calendar days elapsed between a reference date string and today (local time).
function daysSince(ref: string | null | undefined): number {
  if (!ref) return 999;
  const refLocal = new Date(ref.includes("T") ? ref : ref + "T00:00:00").toLocaleDateString("sv");
  const todayLocal = new Date().toLocaleDateString("sv");
  return Math.max(0, Math.round(
    (new Date(todayLocal).getTime() - new Date(refLocal).getTime()) / 86400000
  ));
}

function checkStreakExpiry(streaks: ActiveStreak[]): { streaks: ActiveStreak[]; changed: boolean } {
  const now = Date.now();
  let changed = false;
  const updated = streaks.map(s => {
    if (s.status !== "active") return s;
    const refTime = s.lastActivityDate
      ? new Date(s.lastActivityDate).getTime()
      : new Date(s.startDate).getTime();
    if (now - refTime > EXPIRY_MS) {
      changed = true;
      return { ...s, status: "expired" as const };
    }
    return s;
  });
  return { streaks: updated, changed };
}

// ── Component ──────────────────────────────────────────────────────────────
export default function HomePage() {
  const [name]          = useLocalStorage("mindloop_name", "");
  const [sessions]      = useLocalStorage<any[]>("mindloop_sessions", []);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted]     = useState(false);
  const [forfeitModal, setForfeitModal] = useState<string | null>(null);
  const [milestoneBanner, setMilestoneBanner] = useState<string | null>(null);
  const [idleBanner, setIdleBanner] = useState<string | null>(null);
  const [celebrationStreak, setCelebrationStreak] = useState<ActiveStreak | null>(null);
  useEffect(() => setMounted(true), []);

  // Seed mindloop_name from Supabase session if not already set
  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const stored = localStorage.getItem("mindloop_name");
      if (!stored || stored === "" || stored === "Google User") {
        const displayName =
          session.user.user_metadata?.full_name ||
          session.user.email ||
          "";
        if (displayName) localStorage.setItem("mindloop_name", displayName);
      }
    });
  }, []);

  const router = useRouter();

  // ── Multi-streak state ─────────────────────────────────────────────────
  const [activeStreaks, setActiveStreaksState] = useState<ActiveStreak[]>([]);

  const setActiveStreaks = (streaks: ActiveStreak[]) => {
    setActiveStreaksState(streaks);
    saveStreaks(streaks); // writes localStorage + fires Supabase upsert in background
  };

  // ── New streak wizard ──────────────────────────────────────────────────
  const [newStreakStep, setNewStreakStep]         = useState(0);
  const [newStreakCategory, setNewStreakCategory] = useState("Guesstimates");
  const [newStreakDomain, setNewStreakDomain]     = useState("Finance");
  const [newStreakDays, setNewStreakDays]         = useState("30");

  // ── Re-sync ALL stats from localStorage on every signal that data may have changed ─
  // Triggers: tab visibility flips back to visible, window regains focus, another tab
  // writes an mindloop_* key. Together these cover SPA navigation back from /feedback
  // (focus event), cross-tab updates (storage event), and tab-switching (visibilitychange).
  useEffect(() => {
    const reSync = () => {
      // 1. Active streaks — also self-heal currentDay if completedDates has more entries
      try {
        const raw = localStorage.getItem("mindloop_active_streaks");
        const parsed: ActiveStreak[] = raw ? JSON.parse(raw) ?? [] : [];
        let mutated = false;
        const normalized = parsed.map(s => {
          const trueDay = Math.max(s.currentDay || 0, s.completedDates?.length ?? 0);
          if (trueDay !== (s.currentDay || 0)) {
            mutated = true;
            return { ...s, currentDay: trueDay };
          }
          return s;
        });
        const { streaks: withExpiry, changed: expiryChanged } = checkStreakExpiry(normalized);
        if (mutated || expiryChanged) {
          localStorage.setItem("mindloop_active_streaks", JSON.stringify(withExpiry));
          if (expiryChanged) saveStreaks(withExpiry);
        }
        setActiveStreaksState(withExpiry);

        // 2. Best streak — ground truth is max(stored, completedDates.length across all streaks)
        const maxDay = withExpiry.reduce((m, s) =>
          Math.max(m, s.currentDay || 0, s.completedDates?.length || 0), 0);
        const stored = parseInt(localStorage.getItem("mindloop_best_streak") || "0");
        const newBest = Math.max(stored, maxDay);
        setBestStreak(newBest);
        if (newBest > stored) saveBestStreak(newBest);
      } catch { /* ignore */ }

      // 3. Total sessions — read directly from mindloop_sessions (never derive from streak counts)
      try {
        const sessRaw = localStorage.getItem("mindloop_sessions");
        const allSess: any[] = sessRaw ? JSON.parse(sessRaw) : [];
        setTotalSessions(allSess.filter((s: any) => s.status === "submitted" || !s.status).length);
      } catch { /* ignore */ }

      // 4. Celebration modal: check if feedback page set a pending celebration flag
      try {
        const celebRaw = localStorage.getItem("mindloop_show_celebration");
        if (celebRaw) {
          const [streakId, celebDate] = celebRaw.split("|");
          const todayStr = new Date().toLocaleDateString("sv");
          if (celebDate === todayStr) {
            // Find the completed streak to show its details in the modal
            const streaksRaw = localStorage.getItem("mindloop_active_streaks");
            const allStreaks: ActiveStreak[] = streaksRaw ? JSON.parse(streaksRaw) : [];
            const match = allStreaks.find(s => s.id === streakId);
            if (match) setCelebrationStreak(match);
          } else {
            // Flag is from a previous day — discard it
            localStorage.removeItem("mindloop_show_celebration");
          }
        }
      } catch { /* ignore */ }
    };

    const onVisibility = () => { if (document.visibilityState === "visible") reSync(); };
    const onFocus      = () => reSync();
    const onStorage    = (e: StorageEvent) => { if (!e.key || e.key.startsWith("mindloop_")) reSync(); };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // ── Load + migrate on mount ────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;

    (async () => {
      // Seed localStorage from Supabase if empty (no-op if localStorage already has data)
      await Promise.all([loadStreaks(), loadBestStreak(), loadCompletedDays()]);

      const existingStr = localStorage.getItem("mindloop_active_streaks");
      if (existingStr !== null) {
        try {
          const parsed: ActiveStreak[] = JSON.parse(existingStr) ?? [];
          const { streaks: withExpiry, changed: expiryChanged } = checkStreakExpiry(parsed);
          if (expiryChanged) {
            localStorage.setItem("mindloop_active_streaks", JSON.stringify(withExpiry));
            saveStreaks(withExpiry);
          }
          setActiveStreaksState(withExpiry);
          // Recompute best streak from ground truth
          const maxDay = withExpiry.reduce((m, s) =>
            Math.max(m, s.currentDay || 0, s.completedDates?.length || 0), 0);
          const stored = parseInt(localStorage.getItem("mindloop_best_streak") || "0");
          const newBest = Math.max(stored, maxDay);
          setBestStreak(newBest);
          if (newBest > stored) saveBestStreak(newBest);
          // Total sessions — read directly from mindloop_sessions (never derive from streak counts)
          const sessRaw = localStorage.getItem("mindloop_sessions");
          const allSess: any[] = sessRaw ? JSON.parse(sessRaw) : [];
          setTotalSessions(allSess.filter((s: any) => s.status === "submitted" || !s.status).length);
        } catch { setActiveStreaksState([]); }
        return;
      }

      // Migrate from legacy single-streak format
      const questionsStr = localStorage.getItem("mindloop_questions");
      const startDate    = localStorage.getItem("mindloop_start_date");
      if (!questionsStr || !startDate) {
        localStorage.setItem("mindloop_active_streaks", "[]");
        return;
      }
      try {
        const questions    = JSON.parse(questionsStr);
        const domain       = localStorage.getItem("mindloop_domain")   || "Finance";
        const category     = localStorage.getItem("mindloop_track")    || "Guesstimates";
        const totalDays    = parseInt(localStorage.getItem("mindloop_duration") || "30");
        const sessionsArr: any[] = JSON.parse(localStorage.getItem("mindloop_sessions") || "[]");
        const completedDates = Array.from(new Set(
          sessionsArr.filter(s => s.date >= startDate).map(s => s.date.split("T")[0])
        )) as string[];

        const migrated: ActiveStreak = {
          id: "streak_legacy",
          category, domain, totalDays,
          currentDay: completedDates.length,
          completedDates,
          startDate,
          lastActivityDate: completedDates.at(-1) ?? null,
          status: "active",
          questions,
          todayScore: null,
        };
        localStorage.setItem("mindloop_active_streaks", JSON.stringify([migrated]));
        setActiveStreaksState([migrated]);
        saveStreaks([migrated]);
      } catch {
        localStorage.setItem("mindloop_active_streaks", "[]");
      }
    })();
  }, [mounted]);

  // ── Nudge 3: streak milestone (3 / 7 / 14 days) ──────────────────────
  useEffect(() => {
    if (!mounted) return;
    const raw = localStorage.getItem("mindloop_completed_days");
    if (!raw) return;
    let days: string[] = [];
    try { days = JSON.parse(raw); } catch { return; }
    const count = days.length;
    const milestones = [3, 7, 14];
    for (const m of milestones) {
      if (count >= m) {
        const key = `mindloop_nudge_shown_${m}`;
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, "1");
          const msgs: Record<number, string[]> = {
            3:  ["3-day streak! You're building the habit — keep the momentum.", "Three in a row. That's not luck, that's discipline."],
            7:  ["One full week of guesstimates. You're in the top tier of prep.", "7-day streak! Interviewers can't touch someone this consistent."],
            14: ["14 days. That's a structured thinking machine right there.", "Two weeks in. You've outlasted 90% of interview preppers."],
          };
          const pool = msgs[m];
          setMilestoneBanner(pool[Math.floor(Math.random() * pool.length)]);
          break; // show only the highest unlocked unseen milestone
        }
      }
    }
  }, [mounted]);

  // ── Nudge 4: idle return (last session > 48h, at least 1 session) ─────
  useEffect(() => {
    if (!mounted) return;
    const sessRaw = localStorage.getItem("mindloop_sessions");
    if (!sessRaw) return;
    let sessions: any[] = [];
    try { sessions = JSON.parse(sessRaw); } catch { return; }
    const submitted = sessions.filter((s: any) => s.status === "submitted" || !s.status);
    if (submitted.length === 0) return;
    const lastDate = submitted[submitted.length - 1]?.date;
    if (!lastDate) return;
    const hoursSince = (Date.now() - new Date(lastDate).getTime()) / 3600000;
    if (hoursSince < 48) return;
    const seenKey = "mindloop_nudge_idle_seen";
    const lastSeen = localStorage.getItem(seenKey);
    if (lastSeen && (Date.now() - parseInt(lastSeen)) < 48 * 3600 * 1000) return;
    localStorage.setItem(seenKey, String(Date.now()));
    const msgs = [
      "You've been away a while. Your streak misses you.",
      "48+ hours offline? Let's get back on track.",
      "Every day you skip is a day a competitor practices. Let's go.",
    ];
    setIdleBanner(msgs[Math.floor(Math.random() * msgs.length)]);
  }, [mounted]);

  // ── Computed values ────────────────────────────────────────────────────
  const todayStr        = new Date().toLocaleDateString("sv");
  const visibleStreaks  = activeStreaks.filter(s => {
    if (s.status === "active")    return true;
    if (s.status === "expired")   return daysSince(s.lastActivityDate ?? s.startDate) <= 3;
    if (s.status === "completed") return daysSince(s.completedDates?.at(-1)) <= 2;
    return false;
  });
  const completedStreaks = activeStreaks.filter(s => s.status === "completed");

  const displayBestStreak = bestStreak;
  // totalSessions is tracked in useState and read fresh from mindloop_sessions on mount + tab focus

  // ── Per-streak utilities ───────────────────────────────────────────────
  // Returns the last 7 calendar days (oldest → newest) with activity status.
  // Uses local timezone so the dots always match the user's clock.
  const getLastSevenDays = (streak: ActiveStreak) => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i)); // index 0 = 6 days ago, index 6 = today
      const dateStr = d.toLocaleDateString("sv");                            // YYYY-MM-DD local
      const label   = d.toLocaleDateString("en-US", { weekday: "short" });  // "Mon", "Tue" …
      return { label, active: streak.completedDates.includes(dateStr) };
    });
  };

  const isCompletedToday = (streak: ActiveStreak) => streak.completedDates.includes(todayStr);

  // Ground truth for "what day of the streak are we on" — completion-based, not calendar-based.
  // Calendar math drifts whenever the user skips a day or there's a timezone edge case.
  const getStreakDayCount = (streak: ActiveStreak) =>
    Math.max(streak.currentDay || 0, streak.completedDates?.length ?? 0);

  const getDayIndex = (streak: ActiveStreak) =>
    Math.min(streak.completedDates?.length ?? 0, Math.max(0, streak.questions.length - 1));

  const getActiveChallenge = (streak: ActiveStreak) => {
    const idx = getDayIndex(streak);
    return streak.questions[idx] ?? null;
  };

  const getCurrentDayNum = (streak: ActiveStreak) => getStreakDayCount(streak);

  const getCountdown = () => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight.getTime() - now.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const getInsight = (score: { accuracyScore: number; structureScore: number } | null | undefined) => {
    if (!score) return "Complete a session to unlock your AI insight.";
    const { accuracyScore, structureScore } = score;
    if (accuracyScore >= 80 && structureScore >= 80) return "Outstanding! Your thinking is interview-ready.";
    if (structureScore > accuracyScore + 10) return "Strong structure overall, but your estimates could be more precise.";
    if (accuracyScore > structureScore + 10) return "Good numerical intuition! Focus on structuring your approach more clearly.";
    if (accuracyScore < 50) return "Keep practicing — focus on validating your key assumptions.";
    return "Solid effort! Keep refining both your estimates and structure.";
  };

  // ── Ask a Question button state ────────────────────────────────────────
  const pendingStreak = visibleStreaks.find(s => s.status === "active" && !s.completedDates.includes(todayStr));

  // ── Quote + AI example ─────────────────────────────────────────────────
  const quote         = QUOTES[new Date().getDate() % QUOTES.length];
  const recentDomain  = visibleStreaks.length > 0
    ? [...visibleStreaks].sort((a, b) => (b.lastActivityDate ?? "").localeCompare(a.lastActivityDate ?? ""))[0].domain
    : "Finance";
  const exampleQuestions = EXAMPLE_QUESTIONS[recentDomain] || EXAMPLE_QUESTIONS["Generalist"];

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleStartChallenge = (streak: ActiveStreak) => {
    router.push(`/question?streakId=${streak.id}`);
  };

  const handleForfeit = (streakId: string) => {
    setForfeitModal(streakId);
  };

  const confirmForfeit = () => {
    if (!forfeitModal) return;
    const streak = activeStreaks.find(s => s.id === forfeitModal);
    if (streak) {
      const challenge = getActiveChallenge(streak);
      const todayStr = new Date().toLocaleDateString("sv");
      try {
        const raw = localStorage.getItem("mindloop_sessions");
        const existing: any[] = raw ? JSON.parse(raw) : [];
        // Find today's submitted session(s) for this streak's current question
        const matchIdx = existing.findIndex(
          s => s.date.startsWith(todayStr) && s.question === challenge?.question
        );
        const forfeitDate = new Date().toISOString();
        const challengeId = challenge?.id || "unknown";
        if (matchIdx >= 0) {
          console.log("[SESSION_SAVE_BLOCKED]", {
            reason: "forfeit_updates_existing_record",
            challengeId,
            submittedAt: forfeitDate,
          });
          // Update the existing record's status in place — never delete it
          existing[matchIdx] = { ...existing[matchIdx], status: "forfeited" };
        } else {
          console.log("[SESSION_SAVE]", {
            challengeId,
            attemptId: `${challengeId}_forfeit_${forfeitDate}`,
            submittedAt: forfeitDate,
          });
          // No submitted session exists yet — insert a forfeited placeholder
          existing.push({
            date: forfeitDate,
            question: challenge?.question || "",
            accuracyScore: 0,
            structureScore: 0,
            hintUsed: false,
            category: challenge?.category || "Guesstimate",
            domain: challenge?.domain || "generalist",
            interviewReadiness: "Needs Work",
            finalAnswer: "",
            correctAnswer: "",
            difficulty: challenge?.difficulty || "Medium",
            dayIndex: getCurrentDayNum(streak),
            totalDays: streak.totalDays,
            status: "forfeited",
          });
        }
        localStorage.setItem("mindloop_sessions", JSON.stringify(existing));
        saveSessions(existing); // sync to Supabase in background
      } catch { /* storage write failure is non-fatal */ }

      // Record the forfeited day on the streak before closing it
      const isNewDay = !streak.completedDates.includes(todayStr);
      const updatedStreaks = activeStreaks.map(s => {
        if (s.id !== forfeitModal) return s;
        return {
          ...s,
          completedDates: isNewDay ? [...s.completedDates, todayStr] : s.completedDates,
          currentDay: isNewDay ? (s.currentDay || 0) + 1 : s.currentDay,
          lastActivityDate: todayStr,
          status: "forfeited" as const,
        };
      });
      setActiveStreaks(updatedStreaks);
      saveStreaks(updatedStreaks);
    }
    setForfeitModal(null);
  };

  const handleStartNewStreak = async () => {
    setIsLoading(true);
    try {
      const dataset = datasets[newStreakDomain];
      if (!dataset?.length) throw new Error(`No questions for domain: ${newStreakDomain}`);
      const completedTexts = new Set(sessions.map((s: any) => s.question));
      let available = dataset.filter((q: any) => !completedTexts.has(q.question));
      if (available.length < Number(newStreakDays)) available = [...dataset];
      const selected = available.sort(() => 0.5 - Math.random()).slice(0, Number(newStreakDays));

      const newStreak: ActiveStreak = {
        id: `streak_${Date.now()}`,
        category: newStreakCategory,
        domain:   newStreakDomain,
        totalDays: parseInt(newStreakDays),
        currentDay: 0,
        completedDates: [],
        startDate: new Date().toISOString(),
        lastActivityDate: null,
        status: "active",
        questions: selected,
        todayScore: null,
      };

      setActiveStreaks([...activeStreaks, newStreak]);
      setNewStreakStep(0);

      localStorage.setItem("mindloop_duration", newStreakDays);

      router.push(`/question?streakId=${newStreak.id}`);
    } catch (err: any) {
      alert("Failed to setup streak: " + err.message);
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── Streak completion celebration modal ── */}
      {celebrationStreak && (
        <motion.div
          className={styles.celebrationOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className={styles.celebrationCard}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className={styles.celebrationIcon}><Trophy size={32} /></div>
            <h2 className={styles.celebrationTitle}>Streak Complete!</h2>
            <p className={styles.celebrationSub}>
              You completed your {celebrationStreak.totalDays}-day {celebrationStreak.domain} streak.
            </p>
            {celebrationStreak.todayScore && (
              <div className={styles.celebrationScores}>
                <div className={styles.celebrationScoreItem}>
                  <span className={styles.celebrationScoreLabel}>Accuracy</span>
                  <span className={styles.celebrationScoreValue}>{celebrationStreak.todayScore.accuracyScore}%</span>
                </div>
                <div className={styles.celebrationScoreDivider} />
                <div className={styles.celebrationScoreItem}>
                  <span className={styles.celebrationScoreLabel}>Structure</span>
                  <span className={styles.celebrationScoreValue}>{celebrationStreak.todayScore.structureScore}%</span>
                </div>
              </div>
            )}
            <div className={styles.celebrationActions}>
              <button
                className={styles.celebrationPrimary}
                onClick={() => {
                  localStorage.removeItem("mindloop_show_celebration");
                  setCelebrationStreak(null);
                  router.push("/insights");
                }}
              >
                View Insights →
              </button>
              <button
                className={styles.celebrationClose}
                onClick={() => {
                  localStorage.removeItem("mindloop_show_celebration");
                  setCelebrationStreak(null);
                }}
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ── Nudge 3: streak milestone banner ── */}
      {milestoneBanner && (
        <div className={styles.nudgeBanner}>
          <Trophy size={16} style={{marginRight:'6px'}} />{milestoneBanner}
          <button className={styles.nudgeBannerClose} onClick={() => setMilestoneBanner(null)} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}

      {/* ── Nudge 4: idle return banner ── */}
      {idleBanner && (
        <div className={styles.nudgeBanner}>
          <Clock size={16} style={{marginRight:'6px'}} />{idleBanner}
          <button className={styles.nudgeBannerClose} onClick={() => setIdleBanner(null)} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}


      {/* ── Hero Banner ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <HeroBanner name={name} />
      </motion.div>

      {/* ── Stats Row: Best Streak + Total Sessions ── */}
      <motion.div
        className={styles.statsRow}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className={styles.smallCard}>
          <div className={styles.smallCardIcon}><Sparkles size={16} /></div>
          <div>
            <p className={styles.smallCardLabel}>Best Streak</p>
            <p className={styles.smallCardValue}>{displayBestStreak}</p>
            <p className={styles.smallCardUnit}>days</p>
          </div>
        </div>
        <div className={styles.smallCard}>
          <div className={styles.smallCardIcon}><Calendar size={16} /></div>
          <div>
            <p className={styles.smallCardLabel}>Total Sessions</p>
            <p className={styles.smallCardValue}>{totalSessions}</p>
            <p className={styles.smallCardUnit}>sessions</p>
          </div>
        </div>
      </motion.div>

      {/* ── Streak Scroll Row: one card per active streak + Start New ── */}
      <motion.div
        className={styles.streakScrollRow}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {visibleStreaks.map(streak => {
          // ── Completed streak champion card ─────────────────────────────
          if (streak.status === "completed") {
            const lastDate = streak.completedDates?.at(-1);
            const daysAgo  = daysSince(lastDate);
            const formattedDate = lastDate
              ? new Date(lastDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : null;
            return (
              <div key={streak.id} className={`${styles.streakScrollCard} ${styles.championCard}`}>
                <div className={styles.streakMetaRow} style={{ borderTop: "none", paddingTop: 0 }}>
                  <span className={styles.streakMetaChip}>{streak.category}</span>
                  <span className={styles.streakMetaChip}>{streak.domain}</span>
                  <span className={`${styles.streakMetaChip} ${styles.streakMetaProgress}`}>
                    {streak.totalDays} / {streak.totalDays} days
                  </span>
                </div>

                <div className={styles.championCenter}>
                  <div className={styles.championTrophyRing}>
                    <Trophy size={28} color="#F59E0B" strokeWidth={2} />
                  </div>
                  <h2 className={styles.championTitle}>Streak Complete!</h2>
                  <p className={styles.championSub}>
                    {streak.totalDays}-day streak finished
                    {formattedDate ? ` · ${formattedDate}` : ""}
                  </p>
                </div>

                {streak.todayScore && (
                  <div className={styles.completedStats}>
                    <div className={styles.completedStatCol}>
                      <span className={styles.completedStatIcon}><Target size={14} /></span>
                      <p className={styles.completedStatLabel}>Accuracy</p>
                      <p className={styles.completedStatValue}>{streak.todayScore.accuracyScore}%</p>
                    </div>
                    <div className={styles.completedStatDivider} />
                    <div className={styles.completedStatCol}>
                      <span className={styles.completedStatIcon}><BarChart2 size={14} /></span>
                      <p className={styles.completedStatLabel}>Structure</p>
                      <p className={styles.completedStatValue}>{streak.todayScore.structureScore}%</p>
                    </div>
                  </div>
                )}

                <p className={styles.championExpiry}>
                  <Clock size={12} style={{ marginRight: 4 }} />
                  {daysAgo === 0 ? "Disappears in 2 days" : daysAgo === 1 ? "Disappears tomorrow" : "Disappears today"}
                </p>

                <button className={styles.startBtn} onClick={() => router.push("/insights")}>
                  View Insights →
                </button>
              </div>
            );
          }

          // ── Expired streak card ──────────────────────────────────────────
          if (streak.status === "expired") {
            const expiredDaysAgo = daysSince(streak.lastActivityDate ?? streak.startDate);
            const daysLeft = 3 - expiredDaysAgo;
            return (
              <div key={streak.id} className={`${styles.streakScrollCard} ${styles.expiredCard}`}>
                <div className={styles.streakMetaRow} style={{ borderTop: "none", paddingTop: 0 }}>
                  <span className={styles.streakMetaChip}>{streak.category}</span>
                  <span className={styles.streakMetaChip}>{streak.domain}</span>
                  <span className={`${styles.streakMetaChip} ${styles.streakMetaProgress}`}>
                    {Math.max(streak.currentDay, streak.completedDates?.length ?? 0)} / {streak.totalDays} days
                  </span>
                </div>
                <div className={styles.streakDivider} />
                <div style={{ textAlign: "center", padding: "0.75rem 0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.6rem" }}>
                    <span style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#EF4444" }}>
                      <HeartCrack size={22} />
                    </span>
                  </div>
                  <h2 className={styles.challengeTitle} style={{ color: "#FCA5A5" }}>Streak Broken</h2>
                  <p className={styles.challengeSubtitle} style={{ color: "rgba(255,255,255,0.4)", marginBottom: "0.75rem" }}>
                    You missed a day and this streak has ended.
                  </p>
                  <p className={styles.championExpiry} style={{ marginBottom: "0.75rem" }}>
                    <Clock size={12} style={{ marginRight: 4 }} />
                    {daysLeft > 1 ? `Disappears in ${daysLeft} days` : daysLeft === 1 ? "Disappears tomorrow" : "Disappears today"}
                  </p>
                  <button className={styles.startBtn} onClick={() => setNewStreakStep(1)}>
                    Start New Streak
                  </button>
                </div>
              </div>
            );
          }

          // ── Active streak card ───────────────────────────────────────────
          const done        = isCompletedToday(streak);
          const lastSeven   = getLastSevenDays(streak);
          const challenge   = getActiveChallenge(streak);
          const currentDayN = getCurrentDayNum(streak);

          return (
            <div key={streak.id} className={`${styles.streakScrollCard} ${done ? styles.streakScrollCardDone : ""}`}>

              {/* Category / domain / progress chips */}
              <div className={styles.streakMetaRow}>
                <span className={styles.streakMetaChip}>{streak.category}</span>
                <span className={styles.streakMetaChip}>{streak.domain}</span>
                <span className={`${styles.streakMetaChip} ${styles.streakMetaProgress}`}>
                  {Math.max(streak.currentDay, streak.completedDates?.length ?? 0)} / {streak.totalDays} days
                </span>
              </div>

              {/* Last-7-days activity dots */}
              <div className={styles.weekDots}>
                {lastSeven.map((day, i) => (
                  <div key={i} className={styles.weekDotCol}>
                    <div className={`${styles.weekDotCircle} ${day.active ? styles.weekDotFilled : styles.weekDotEmpty}`} />
                    <span className={styles.weekDotLabel}>{day.label.slice(0, 2)}</span>
                  </div>
                ))}
              </div>

              <div className={styles.streakDivider} />

              {/* Today's challenge */}
              <span className={styles.todayBadge}>TODAY&apos;S CHALLENGE</span>

              {done ? (
                <>
                  {/* Heading */}
                  <div className={styles.challengeBody}>
                    <div className={styles.challengeTarget}><PartyPopper size={16} /></div>
                    <div>
                      <h2 className={styles.challengeTitle}>Day {currentDayN} Complete!</h2>
                      <p className={styles.challengeSubtitle}>Great start! Keep the momentum going.</p>
                    </div>
                  </div>

                  {/* Three-column stats */}
                  <div className={styles.completedStats}>
                    <div className={styles.completedStatCol}>
                      <span className={styles.completedStatIcon}><Target size={16} /></span>
                      <p className={styles.completedStatLabel}>Accuracy</p>
                      <p className={styles.completedStatValue}>{streak.todayScore?.accuracyScore ?? 0}%</p>
                    </div>
                    <div className={styles.completedStatDivider} />
                    <div className={styles.completedStatCol}>
                      <span className={styles.completedStatIcon}><BarChart2 size={16} /></span>
                      <p className={styles.completedStatLabel}>Structure</p>
                      <p className={styles.completedStatValue}>{streak.todayScore?.structureScore ?? 0}%</p>
                    </div>
                    {streak.todayScore?.clarificationCount != null && (
                      <>
                        <div className={styles.completedStatDivider} />
                        <div className={styles.completedStatCol}>
                          <span className={styles.completedStatIcon}><MessageSquare size={16} /></span>
                          <p className={styles.completedStatLabel}>Clarification Questions</p>
                          <p className={styles.completedStatValue}>{streak.todayScore.clarificationCount}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* AI Insight */}
                  <div className={styles.aiInsightBox}>
                    <span className={styles.aiInsightIcon}><Sparkles size={14} /></span>
                    <div>
                      <p className={styles.aiInsightTitle}>AI Insight</p>
                      <p className={styles.aiInsightText}>{getInsight(streak.todayScore)}</p>
                    </div>
                  </div>

                  {/* Next challenge countdown */}
                  <p className={styles.nextChallengeText}><Clock size={16} style={{marginRight:'4px'}} />Next challenge in {getCountdown()}</p>

                  {/* Buttons */}
                  <button className={styles.forfeitStreakBtn} onClick={() => handleForfeit(streak.id)}>Forfeit Streak</button>
                </>
              ) : (
                <>
                  <div className={styles.challengeBody}>
                    <div className={styles.challengeTarget}><Target size={16} /></div>
                    <div>
                      <h2 className={styles.challengeTitle}>Ready for today&apos;s thinking session?</h2>
                      <p className={styles.challengeSubtitle}>Sharpen your estimation skills and structured thinking.</p>
                    </div>
                  </div>
                  <div className={styles.metaChips}>
                    <div className={styles.metaChip}>
                      <span className={styles.metaIcon}><Clock size={16} /></span>
                      <div><p className={styles.metaValue}>5 min</p><p className={styles.metaLabel}>Est. Time</p></div>
                    </div>
                    <div className={styles.metaChip}>
                      <span className={styles.metaIcon}><BarChart2 size={16} /></span>
                      <div><p className={styles.metaValue}>{challenge?.difficulty || "Medium"}</p><p className={styles.metaLabel}>Difficulty</p></div>
                    </div>
                    <div className={styles.metaChip}>
                      <span className={styles.metaIcon}><Target size={16} /></span>
                      <div><p className={styles.metaValue}>{streak.domain}</p><p className={styles.metaLabel}>Domain</p></div>
                    </div>
                  </div>
                  <button className={styles.startBtn} onClick={() => handleStartChallenge(streak)}>
                    Start Thinking Session →
                  </button>
                  <button className={styles.forfeitLink} onClick={() => handleForfeit(streak.id)}>
                    Forfeit Streak
                  </button>
                </>
              )}
            </div>
          );
        })}

        {/* Start New Streak card — always last */}
        <div className={`${styles.streakScrollCard} ${styles.startNewCard} ${newStreakStep > 0 ? styles.startNewActive : ""}`}>
          {newStreakStep === 0 ? (
            <div className={styles.startNewIdle} onClick={() => setNewStreakStep(1)}>
              <div className={styles.startNewPlus}>+</div>
              <p className={styles.startNewTitle}>Start a new streak</p>
              <p className={styles.startNewSub}>Build a new practice habit</p>
            </div>
          ) : (
            <>
              <div className={styles.wizardHeader}>
                <div>
                  <span className={styles.todayBadge}>START A NEW STREAK</span>
                  <div className={styles.wizardStepIndicator}>
                    {[1, 2, 3].map(s => (
                      <div key={s} className={`${styles.stepDot} ${s === newStreakStep ? styles.stepDotActive : s < newStreakStep ? styles.stepDotDone : ""}`} />
                    ))}
                  </div>
                </div>
                <span className={styles.wizardStepLabel}>Step {newStreakStep} of 3</span>
              </div>

              {newStreakStep === 1 && (
                <motion.div key="ns1" className={styles.wizardStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <p className={styles.wizardQuestion}>What do you want to practice?</p>
                  <div className={styles.wizardOptions}>
                    {CATEGORIES.map(cat => (
                      <button key={cat.value}
                        className={`${styles.wizardOption} ${newStreakCategory === cat.value ? styles.wizardOptionActive : ""} ${cat.disabled ? styles.wizardOptionDisabled : ""}`}
                        onClick={() => { if (!cat.disabled) { setNewStreakCategory(cat.value); setNewStreakStep(2); } }}
                        disabled={cat.disabled}
                      >
                        <span className={styles.wizardOptionEmoji}>{cat.icon}</span>
                        <div>
                          <p className={styles.wizardOptionLabel}>{cat.label}</p>
                          <p className={styles.wizardOptionDesc}>{cat.desc}</p>
                        </div>
                        {cat.disabled && <span className={styles.comingSoon}>Soon</span>}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {newStreakStep === 2 && (
                <motion.div key="ns2" className={styles.wizardStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <p className={styles.wizardQuestion}>Pick a domain</p>
                  <div className={styles.wizardGrid}>
                    {DOMAINS.map(d => (
                      <button key={d.value}
                        className={`${styles.wizardPill} ${newStreakDomain === d.value ? styles.wizardPillActive : ""}`}
                        onClick={() => setNewStreakDomain(d.value)}
                      >
                        <span>{d.icon}</span> {d.label}
                      </button>
                    ))}
                  </div>
                  <button className={styles.startBtn} onClick={() => setNewStreakStep(3)} style={{ marginTop: "0.25rem" }}>Next →</button>
                  <button className={styles.wizardBack} onClick={() => setNewStreakStep(1)}>← Back</button>
                </motion.div>
              )}

              {newStreakStep === 3 && (
                <motion.div key="ns3" className={styles.wizardStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <p className={styles.wizardQuestion}>How many days?</p>
                  <div className={styles.quickDays}>
                    {["7", "14", "21", "30"].map(d => (
                      <button key={d}
                        className={`${styles.dayPill} ${newStreakDays === d ? styles.dayPillActive : ""}`}
                        onClick={() => setNewStreakDays(d)}
                      >{d}</button>
                    ))}
                  </div>
                  <div className={styles.wizardDayInputWrapper}>
                    <input
                      type="number" className={styles.wizardDayInput}
                      value={newStreakDays} min={1} max={100} placeholder="e.g. 30"
                      onChange={e => {
                        const raw = e.target.value;
                        if (raw === "" || raw === "-") { setNewStreakDays(""); return; }
                        setNewStreakDays(String(Math.min(100, Math.max(1, parseInt(raw, 10)))));
                      }}
                    />
                    <span className={styles.wizardDayUnit}>days</span>
                  </div>
                  <button className={styles.startBtn} onClick={handleStartNewStreak}
                    disabled={isLoading || !newStreakDays || Number(newStreakDays) < 1}
                    style={{ marginTop: "0.25rem" }}
                  >
                    {isLoading ? "Setting up…" : `Start ${newStreakDays || "?"}-Day Streak`}
                  </button>
                  <button className={styles.wizardBack} onClick={() => setNewStreakStep(2)}>← Back</button>
                </motion.div>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* ── Completed Streaks ── */}
      {completedStreaks.length > 0 && (
        <motion.div
          className={styles.completedSection}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className={styles.completedSectionTitle}>Completed Streaks</h2>
          <div className={styles.completedList}>
            {completedStreaks.map(streak => {
              const lastDate = streak.completedDates?.at(-1);
              const formattedDate = lastDate
                ? new Date(lastDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : null;
              return (
                <div key={streak.id} className={styles.completedCard}>
                  <div className={styles.completedCardLeft}>
                    <div className={styles.completedCardTags}>
                      <span className={styles.streakMetaChip}>{streak.domain}</span>
                      <span className={styles.streakMetaChip}>{streak.category}</span>
                      <span className={styles.completedBadge}>Completed</span>
                    </div>
                    <p className={styles.completedCardLabel}>{streak.totalDays}-Day Streak</p>
                    <p className={styles.completedCardMeta}>
                      {getStreakDayCount(streak)} / {streak.totalDays} days
                      {formattedDate && <> &nbsp;·&nbsp; {formattedDate}</>}
                    </p>
                  </div>
                  <button
                    className={styles.completedInsightsLink}
                    onClick={() => router.push("/insights")}
                  >
                    View Insights
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Quote ── */}
      <motion.div className={styles.quoteCard} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <div className={styles.quoteLeft}>
          <div className={styles.owlCircle}>
            <Image src="/owlly-icon.png" alt="Mindloop" width={36} height={36} style={{ objectFit: "contain" }} />
          </div>
        </div>
        <div className={styles.quoteContent}>
          <span className={styles.quoteMark}>&ldquo;</span>
          <p className={styles.quoteText}>{quote.text}</p>
          <p className={styles.quoteAuthor}>— {quote.author}</p>
        </div>
        <div className={styles.trendArrow}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M8 36 L28 16 L36 24 L44 8" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <polyline points="36,8 44,8 44,16" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
      </motion.div>

      {/* ── Forfeit confirmation modal ── */}
      {forfeitModal && (
        <div className={styles.modalOverlay} onClick={() => setForfeitModal(null)}>
          <div className={styles.modalDialog} onClick={e => e.stopPropagation()}>
            <p className={styles.modalTitle}>Forfeit this streak?</p>
            <p className={styles.modalBody}>
              This challenge will be marked as forfeited and saved to your history.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setForfeitModal(null)}>
                Cancel
              </button>
              <button className={styles.modalConfirm} onClick={confirmForfeit}>
                Yes, Forfeit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
