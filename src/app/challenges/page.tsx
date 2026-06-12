"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import styles from "./challenges.module.css";
import { loadSessions, loadStreaks, loadBookmarks, saveBookmarks } from "@/lib/db";
import { Bookmark as BookmarkIcon } from "lucide-react";

interface SessionEntry {
  date: string;
  question: string;
  accuracyScore: number;
  structureScore: number;
  hintUsed: boolean;
  category?: string;
  domain?: string;
  interviewReadiness: string;
  finalAnswer?: string;
  correctAnswer?: string;
  difficulty?: string;
  dayIndex?: number | null;
  totalDays?: number | null;
  streakId?: string | null;
  status?: "submitted" | "forfeited" | "removed";
}

interface ActiveStreak {
  id: string;
  completedDates: string[];
  totalDays: number;
  status?: string;
}

interface Bookmark {
  id: string;
  question: string;
  domain: string;
  difficulty: string;
  category: string;
  addedDate: string;
  questionId: string;
}

function formatSubmittedAt(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTodayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function ResultBadge({ accuracy }: { accuracy: number }) {
  if (accuracy >= 70)
    return <span className={`${styles.resultBadge} ${styles.resultCorrect}`}>Correct</span>;
  if (accuracy >= 40)
    return <span className={`${styles.resultBadge} ${styles.resultClose}`}>Close</span>;
  return <span className={`${styles.resultBadge} ${styles.resultIncorrect}`}>Incorrect</span>;
}

function ScorePill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className={styles.scorePill} style={{ borderColor: color, color }}>
      {label}: {value}%
    </span>
  );
}

export default function ChallengesPage() {
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [streaks, setStreaks] = useState<ActiveStreak[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [bookmarkToast, setBookmarkToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    loadSessions().then(setSessions).catch(() => {});
    loadStreaks().then(setStreaks).catch(() => {});
    loadBookmarks().then(setBookmarks).catch(() => {});
  }, []);

  const toggleBookmark = (session: SessionEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const existingIdx = bookmarks.findIndex(b => b.question === session.question);
    const isAdding = existingIdx < 0;
    const updated = isAdding
      ? [...bookmarks, {
          id: (session as any).questionId || Date.now().toString(),
          question: session.question,
          domain: session.domain || "generalist",
          difficulty: session.difficulty || "Medium",
          category: session.category || "Guesstimate",
          addedDate: new Date().toISOString(),
          questionId: (session as any).questionId || "",
        }]
      : bookmarks.filter((_, i) => i !== existingIdx);
    setBookmarks(updated);
    saveBookmarks(updated); // writes localStorage + Supabase in background

    // Nudge 5: show toast only when bookmarking (not removing)
    if (isAdding) {
      const msgs = [
        "Bookmarked! Come back to this one — it'll sharpen your edge.",
        "Smart move. Revisiting hard problems is how pros prep.",
        "Saved for later. Pattern recognition builds with every review.",
      ];
      setBookmarkToast(msgs[Math.floor(Math.random() * msgs.length)]);
      setTimeout(() => setBookmarkToast(null), 4000);
    }
  };

  const getRoundNumber = (session: SessionEntry): number | null => {
    if (!session.streakId) return session.dayIndex ?? null;
    const streak = streaks.find(s => s.id === session.streakId);
    if (!streak) return session.dayIndex ?? null;
    const sessionDate = session.date.split("T")[0];
    const pos = streak.completedDates.indexOf(sessionDate);
    return pos >= 0 ? pos + 1 : streak.completedDates.length;
  };

  const getTotalDays = (session: SessionEntry): number | null => {
    if (!session.streakId) return session.totalDays ?? null;
    const streak = streaks.find(s => s.id === session.streakId);
    return streak?.totalDays ?? session.totalDays ?? null;
  };

  const todaySessions = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("sv");
    return sessions
      .filter((s) => s.date.startsWith(todayStr) && s.status === "submitted")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessions]);

  if (!mounted) return null;

  return (
    <div className={styles.page}>
      {/* ── Nudge 5: bookmark-added toast ── */}
      {bookmarkToast && (
        <div className={styles.nudgeToast}>
          <BookmarkIcon size={16} style={{marginRight:'6px'}} />{bookmarkToast}
        </div>
      )}
      {/* ── Header ── */}
      <motion.div
        className={styles.pageHeader}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className={styles.pageTitle}>Today&apos;s Challenges</h1>
          <p className={styles.pageSubtitle}>
            Your solved challenges for {formatTodayLabel()}
          </p>
        </div>
        <span className={styles.solvedBadge}>
          {todaySessions.length} solved
        </span>
      </motion.div>

      {/* ── Empty state ── */}
      {todaySessions.length === 0 && (
        <motion.div
          className={styles.emptyState}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className={styles.emptyIcon}><img src="/owlly-icon.png" alt="" style={{ height: "64px", width: "auto", display: "block" }} /></div>
          <h2 className={styles.emptyTitle}>No challenges solved yet today</h2>
          <p className={styles.emptySub}>
            Complete a challenge to see your results here
          </p>
          <button
            className={styles.ctaBtn}
            onClick={() => {
              const todayStr = new Date().toLocaleDateString("sv");
              const pending = streaks.find(
                s => s.status === "active" && !s.completedDates?.includes(todayStr)
              );
              if (pending) {
                router.push(`/question?streakId=${pending.id}`);
              } else {
                router.push("/question");
              }
            }}
          >
            Start Today&apos;s Challenge →
          </button>
        </motion.div>
      )}

      {/* ── Cards ── */}
      {todaySessions.length > 0 && (
        <div className={styles.cardList}>
          {todaySessions.map((session, i) => (
            <motion.div
              key={session.date + i}
              className={styles.card}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.06 }}
              style={{ cursor: "pointer" }}
              onClick={() => {
                const saved = localStorage.getItem("mindloop_eval_" + session.date);
                if (saved) {
                  localStorage.setItem("mindloop_latest_evaluation", saved);
                  router.push("/feedback");
                }
              }}
            >
              {/* ── Card header ── */}
              <div className={styles.cardHeader}>
                <span className={styles.categoryTag}>
                  DAILY CHALLENGE&nbsp;·&nbsp;{(session.domain || session.category || "GUESSTIMATE").toUpperCase()}
                </span>
                <div className={styles.cardHeaderRight}>
                  <span
                    className={`${styles.difficultyBadge} ${
                      session.difficulty === "Hard"
                        ? styles.diffHard
                        : session.difficulty === "Easy"
                        ? styles.diffEasy
                        : styles.diffMedium
                    }`}
                  >
                    {session.difficulty || "Medium"}
                  </span>
                  {getRoundNumber(session) != null && getTotalDays(session) != null && (
                    <span className={styles.roundTag}>
                      Round {getRoundNumber(session)} of {getTotalDays(session)}
                    </span>
                  )}
                  {(() => {
                    const isBookmarked = bookmarks.some(b => b.question === session.question);
                    return (
                      <button
                        className={`${styles.bookmarkBtn} ${isBookmarked ? styles.bookmarkBtnActive : ""}`}
                        onClick={(e) => toggleBookmark(session, e)}
                        title={isBookmarked ? "Remove bookmark" : "Bookmark this question"}
                        type="button"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* ── Question ── */}
              <p className={styles.questionText}>{session.question}</p>

              <div className={styles.divider} />

              {/* ── Answers ── */}
              <div className={styles.answersRow}>
                <div className={styles.answerCol}>
                  <p className={styles.answerLabel}>YOUR ANSWER</p>
                  <p className={styles.answerValue}>
                    {session.finalAnswer || <span className={styles.answerEmpty}>—</span>}
                  </p>
                </div>
                <div className={styles.answerDivider} />
                <div className={styles.answerCol}>
                  <p className={styles.answerLabel}>CORRECT ANSWER</p>
                  <p className={styles.answerValue}>
                    {session.correctAnswer
                      ? session.correctAnswer.replace(/^Step \d+:?\s*/i, "").replace(/^Final Answer:\s*/i, "")
                      : <span className={styles.answerEmpty}>—</span>}
                  </p>
                </div>
              </div>

              <div className={styles.divider} />

              {/* ── Footer row ── */}
              <div className={styles.cardFooter}>
                <div className={styles.pillsRow}>
                  <ScorePill label="Accuracy" value={session.accuracyScore} color="#4A6CF7" />
                  <ScorePill label="Structure" value={session.structureScore} color="#F5A623" />
                  <ResultBadge accuracy={session.accuracyScore} />
                </div>
                <p className={styles.submittedAt}>
                  Submitted at {formatSubmittedAt(session.date)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
