"use client";

import styles from "./history.module.css";
import { motion } from "framer-motion";
import { useState, useMemo, useEffect, useRef, type ReactElement } from "react";
import { loadSessions, loadBestStreak, loadBookmarks, saveBookmarks } from "@/lib/db";
import { DollarSign, Package, Megaphone, Users, Lightbulb, Clock, Target, TrendingUp, Flame, Calendar, Check, X as XIcon } from "lucide-react";

interface Session {
  date: string;
  question: string;
  accuracyScore: number;
  structureScore: number;
  hintUsed: boolean;
  category?: string;
  domain?: string;
  difficulty?: string;
  interviewReadiness: string;
  status?: "submitted" | "forfeited" | "removed";
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

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  if (day.getTime() === today.getTime()) return "Today";
  if (day.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const DOMAIN_STYLE: Record<string, { bg: string; icon: ReactElement }> = {
  finance:     { bg: "#EEF2FF", icon: <DollarSign size={14} /> },
  product:     { bg: "#F0FDF4", icon: <Package size={14} /> },
  marketing:   { bg: "#FFF7ED", icon: <Megaphone size={14} /> },
  sales:       { bg: "#FDF4FF", icon: <Users size={14} /> },
  generalist:  { bg: "#F5F3FF", icon: <Lightbulb size={14} /> },
};

const DOMAIN_TAGS: Record<string, string[]> = {
  finance:    ["Finance", "Quantitative"],
  product:    ["Product", "Market Sizing"],
  marketing:  ["Marketing", "Estimation"],
  sales:      ["Sales", "Estimation"],
  generalist: ["Generalist", "Structuring"],
};

function CategoryIcon({ domain }: { domain?: string }) {
  const c = DOMAIN_STYLE[domain?.toLowerCase() ?? ""] ?? { bg: "#F3F4F6", icon: <Lightbulb size={14} /> };
  return <div className={styles.catIcon} style={{ background: c.bg }}>{c.icon}</div>;
}

function PerfBadge({ readiness }: { readiness: string }) {
  if (readiness === "Ready")
    return <span className={`${styles.badge} ${styles.badgeGreen}`}>Excellent</span>;
  if (readiness === "Almost Ready")
    return <span className={`${styles.badge} ${styles.badgeBlue}`}>Strong</span>;
  return <span className={`${styles.badge} ${styles.badgeAmber}`}>Average</span>;
}

function TimelineDot({ score, status }: { score: number; status?: string }) {
  if (status === "forfeited" || status === "removed")
    return <div className={`${styles.dot} ${styles.dotMuted}`}><XIcon size={12} /></div>;
  if (score >= 70)
    return <div className={`${styles.dot} ${styles.dotGreen}`}><Check size={12} /></div>;
  if (score >= 40)
    return <div className={`${styles.dot} ${styles.dotAmber}`} />;
  return <div className={`${styles.dot} ${styles.dotGray}`} />;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "forfeited")
    return <span className={`${styles.badge} ${styles.badgeForfeited}`}>Forfeited</span>;
  return <span className={`${styles.badge} ${styles.badgeRemoved}`}>Removed</span>;
}

type DateFilter = "all" | "today" | "week" | "month";
type SortOrder = "newest" | "oldest" | "highest" | "lowest";

const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  all: "All Time", today: "Today", week: "This Week", month: "This Month",
};
const SORT_LABELS: Record<SortOrder, string> = {
  newest: "Most Recent", oldest: "Oldest First", highest: "Highest Score", lowest: "Lowest Score",
};

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [mounted, setMounted] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [dateOpen, setDateOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const dateRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    loadSessions().then(setSessions).catch(() => {});
    loadBestStreak().then(setBestStreak).catch(() => {});
    loadBookmarks().then(setBookmarks).catch(() => {});
  }, []);

  const toggleBookmark = (session: Session) => {
    const existingIdx = bookmarks.findIndex(b => b.question === session.question);
    const updated = existingIdx >= 0
      ? bookmarks.filter((_, i) => i !== existingIdx)
      : [...bookmarks, {
          id: Date.now().toString(),
          question: session.question,
          domain: session.domain || "generalist",
          difficulty: session.difficulty || "Medium",
          category: session.category || "Guesstimate",
          addedDate: new Date().toISOString(),
          questionId: "",
        }];
    setBookmarks(updated);
    saveBookmarks(updated); // writes localStorage + Supabase in background
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setDateOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const stats = useMemo(() => {
    if (!sessions.length) return null;
    const submitted = sessions.filter(s => s.status === "submitted" || !s.status);
    const forfeitedCount = sessions.length - submitted.length;
    if (!submitted.length) return { total: 0, forfeited: forfeitedCount, avgAccuracy: 0, avgStructure: 0, streak: 0 };
    const avgAccuracy  = Math.round(submitted.reduce((a, s) => a + s.accuracyScore,  0) / submitted.length);
    const avgStructure = Math.round(submitted.reduce((a, s) => a + s.structureScore, 0) / submitted.length);

    const days = [...new Set(sessions.map(s => s.date.split("T")[0]))].sort((a, b) => b.localeCompare(a));
    let streak = 0;
    if (days.length > 0) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const last  = new Date(days[0]); last.setHours(0, 0, 0, 0);
      if (Math.floor((today.getTime() - last.getTime()) / 86400000) <= 1) {
        streak = 1;
        let prev = last;
        for (let i = 1; i < days.length; i++) {
          const curr = new Date(days[i]); curr.setHours(0, 0, 0, 0);
          if (Math.floor((prev.getTime() - curr.getTime()) / 86400000) === 1) { streak++; prev = curr; }
          else break;
        }
      }
    }
    return { total: submitted.length, forfeited: forfeitedCount, avgAccuracy, avgStructure, streak };
  }, [sessions]);

  const processed = useMemo(() => {
    const now = new Date();
    let list = [...sessions];

    // Date filter
    if (dateFilter !== "all") {
      const cutoff = new Date(now);
      if (dateFilter === "today") { cutoff.setHours(0, 0, 0, 0); }
      else if (dateFilter === "week") { cutoff.setDate(cutoff.getDate() - 7); }
      else if (dateFilter === "month") { cutoff.setDate(cutoff.getDate() - 30); }
      list = list.filter(s => new Date(s.date) >= cutoff);
    }

    // Sort
    if (sortOrder === "newest") {
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortOrder === "oldest") {
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (sortOrder === "highest") {
      list.sort((a, b) => ((b.accuracyScore + b.structureScore) / 2) - ((a.accuracyScore + a.structureScore) / 2));
    } else if (sortOrder === "lowest") {
      list.sort((a, b) => ((a.accuracyScore + a.structureScore) / 2) - ((b.accuracyScore + b.structureScore) / 2));
    }
    return list;
  }, [sessions, dateFilter, sortOrder]);

  const visible = processed.slice(0, visibleCount);

  if (!mounted) return null;

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <motion.div className={styles.pageHeader} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 className={styles.pageTitle}>Session History</h1>
          <p className={styles.pageSubtitle}>Review your past sessions and track your thinking growth.</p>
        </div>
        <div className={styles.controls}>
          {/* Filter by Date */}
          <div ref={dateRef} style={{ position: "relative" }}>
            <button className={styles.controlBtn} onClick={() => { setDateOpen(o => !o); setSortOpen(false); }}>
              <Calendar size={16} style={{marginRight:'4px'}} />{DATE_FILTER_LABELS[dateFilter]} ▾
            </button>
            {dateOpen && (
              <div className={styles.dropdown}>
                {(Object.keys(DATE_FILTER_LABELS) as DateFilter[]).map(key => (
                  <button
                    key={key}
                    className={`${styles.dropdownItem} ${dateFilter === key ? styles.dropdownItemActive : ""}`}
                    onClick={() => { setDateFilter(key); setDateOpen(false); setVisibleCount(5); }}
                  >
                    {DATE_FILTER_LABELS[key]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort */}
          <div ref={sortRef} style={{ position: "relative" }}>
            <button className={styles.controlBtn} onClick={() => { setSortOpen(o => !o); setDateOpen(false); }}>
              Sort: {SORT_LABELS[sortOrder]} ▾
            </button>
            {sortOpen && (
              <div className={styles.dropdown}>
                {(Object.keys(SORT_LABELS) as SortOrder[]).map(key => (
                  <button
                    key={key}
                    className={`${styles.dropdownItem} ${sortOrder === key ? styles.dropdownItemActive : ""}`}
                    onClick={() => { setSortOrder(key); setSortOpen(false); setVisibleCount(5); }}
                  >
                    {SORT_LABELS[key]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Stats bar ── */}
      {stats && (
        <motion.div className={styles.statsBar} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className={styles.statCol}>
            <div className={`${styles.statIcon} ${styles.statIconBlue}`}><Clock size={16} /></div>
            <div>
              <p className={styles.statLabel}>Sessions Completed</p>
              <p className={styles.statValue}>{stats.total}</p>
              {stats.forfeited > 0
                ? <p className={styles.statDelta}>{stats.forfeited} forfeited</p>
                : <p className={styles.statDelta}>↑ across all time</p>}
            </div>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statCol}>
            <div className={`${styles.statIcon} ${styles.statIconGreen}`}><Target size={16} /></div>
            <div>
              <p className={styles.statLabel}>Avg Accuracy</p>
              <p className={styles.statValue}>{stats.avgAccuracy}%</p>
              <p className={styles.statDelta}>↑ across all sessions</p>
            </div>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statCol}>
            <div className={`${styles.statIcon} ${styles.statIconAmber}`}><TrendingUp size={16} /></div>
            <div>
              <p className={styles.statLabel}>Avg Structure Score</p>
              <p className={styles.statValue}>{stats.avgStructure}%</p>
              <p className={styles.statDelta}>↑ across all sessions</p>
            </div>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statCol}>
            <div className={`${styles.statIcon} ${styles.statIconPurple}`}><Flame size={16} /></div>
            <div>
              <p className={styles.statLabel}>Current Streak</p>
              <p className={styles.statValue}>{stats.streak} days</p>
              <p className={styles.statDelta}>Best: {bestStreak} days</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Empty state ── */}
      {!sessions.length && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><img src="/owlly-icon.png" alt="" style={{ height: "64px", width: "auto", display: "block" }} /></div>
          <h2>No sessions yet</h2>
          <p>Complete your first challenge to start building your history!</p>
          <button className={styles.ctaBtn} onClick={() => (window.location.href = "/home")}>
            Start Practice
          </button>
        </div>
      )}

      {/* ── Timeline ── */}
      {sessions.length > 0 && (
        <>
          <div className={styles.timeline}>
            <div className={styles.timelineLine} />
            {visible.map((session, i) => {
              const isIncomplete = session.status === "forfeited" || session.status === "removed";
              const avgScore = isIncomplete ? 0 : Math.round((session.accuracyScore + session.structureScore) / 2);
              const tags = DOMAIN_TAGS[session.domain?.toLowerCase() ?? ""] ?? ["Guesstimate"];
              const prevSubmitted = processed.slice(i + 1).find(s => s.status === "submitted" || !s.status);
              const prevAvg = (prevSubmitted && !isIncomplete) ? Math.round((prevSubmitted.accuracyScore + prevSubmitted.structureScore) / 2) : null;
              const gain = prevAvg !== null ? avgScore - prevAvg : null;

              return (
                <motion.div
                  key={i}
                  className={`${styles.timelineRow} ${isIncomplete ? styles.timelineRowMuted : ""}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  {/* Left: marker */}
                  <div className={styles.markerCol}>
                    <TimelineDot score={avgScore} status={session.status} />
                    <p className={styles.markerDate}>{formatDateLabel(session.date)}</p>
                    <p className={styles.markerTime}>{formatTime(session.date)}</p>
                  </div>

                  {/* Right: session card */}
                  <div className={`${styles.sessionCard} ${isIncomplete ? styles.sessionCardMuted : ""}`}>
                    {/* Top row */}
                    <div className={styles.cardTop}>
                      <CategoryIcon domain={session.domain} />
                      <div className={styles.cardMeta}>
                        <p className={styles.cardTitle}>{session.question || "—"}</p>
                        <p className={styles.cardSub}>{session.domain ? session.domain.charAt(0).toUpperCase() + session.domain.slice(1) : "Guesstimate"}</p>
                      </div>
                      {isIncomplete
                        ? <StatusBadge status={session.status!} />
                        : <PerfBadge readiness={session.interviewReadiness} />}
                      {(() => {
                        const isBookmarked = bookmarks.some(b => b.question === session.question);
                        return (
                          <button
                            className={`${styles.bookmarkBtn} ${isBookmarked ? styles.bookmarkBtnActive : ""}`}
                            onClick={() => toggleBookmark(session)}
                            title={isBookmarked ? "Remove bookmark" : "Bookmark this question"}
                            type="button"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor">
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                            </svg>
                          </button>
                        );
                      })()}
                      <span className={styles.cardChevron}>›</span>
                    </div>

                    {/* Tags */}
                    <div className={styles.tagRow}>
                      {!isIncomplete && tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
                      {session.hintUsed && <span className={`${styles.tag} ${styles.tagHint}`}>Hint Used</span>}
                    </div>

                    {/* Scores — only for submitted sessions */}
                    {!isIncomplete && (
                      <div className={styles.scoreRow}>
                        <div className={styles.scoreCol}>
                          <p className={styles.scoreLabel}>Accuracy</p>
                          <p className={styles.scoreValue}>{session.accuracyScore}%</p>
                        </div>
                        <div className={styles.scoreDivider} />
                        <div className={styles.scoreCol}>
                          <p className={styles.scoreLabel}>Structure</p>
                          <p className={styles.scoreValue}>{session.structureScore}%</p>
                        </div>
                        <div className={styles.scoreDivider} />
                        <div className={styles.scoreCol}>
                          <p className={styles.scoreLabel}>Readiness</p>
                          <p className={styles.scoreValue}>{session.interviewReadiness}</p>
                        </div>
                        <div className={styles.scoreDivider} />
                        <div className={styles.scoreCol}>
                          <p className={styles.scoreLabel}>Score Change</p>
                          <p className={`${styles.scoreValue} ${gain !== null ? (gain >= 0 ? styles.gainPos : styles.gainNeg) : ""}`}>
                            {gain !== null ? `${gain >= 0 ? "+" : ""}${gain}%` : "—"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Load more */}
          <div className={styles.loadMoreRow}>
            <p className={styles.showingText}>
              Showing {Math.min(visibleCount, processed.length)} of {processed.length} sessions
              {dateFilter !== "all" && ` (filtered)`}
            </p>
            {visibleCount < processed.length && (
              <button className={styles.loadMoreBtn} onClick={() => setVisibleCount(v => v + 5)}>
                Load More ▾
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
