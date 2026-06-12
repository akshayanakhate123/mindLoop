"use client";

import styles from "./profile.module.css";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  loadUserProfile, saveUserProfile,
  loadSessions, loadBestStreak, loadCompletedDays,
} from "@/lib/db";
import { Flame, Calendar, Pencil, User, Settings, Mail, Globe, Key, Lock, Brain, TrendingUp, Lightbulb, Trophy, Check } from "lucide-react";

interface Session {
  date: string;
  question: string;
  accuracyScore: number;
  structureScore: number;
  hintUsed: boolean;
  category?: string;
  domain?: string;
  interviewReadiness: string;
  status?: "submitted" | "forfeited" | "removed";
}

// ── Heatmap ──────────────────────────────────────────────────────────────────
function Heatmap({ completedDays }: { completedDays: string[] }) {
  const daySet = new Set(completedDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 13 full weeks, column-aligned to Sunday
  const start = new Date(today);
  start.setDate(start.getDate() - 90);
  start.setDate(start.getDate() - start.getDay()); // back to Sunday

  const cells: { date: Date; active: boolean }[] = [];
  const d = new Date(start);
  while (cells.length < 91) {
    cells.push({
      date: new Date(d),
      active: daySet.has(d.toISOString().split("T")[0]) && d <= today,
    });
    d.setDate(d.getDate() + 1);
  }

  const numWeeks = Math.ceil(cells.length / 7);
  const weekCells = Array.from({ length: numWeeks }, (_, wi) =>
    Array.from({ length: 7 }, (_, di) => cells[wi * 7 + di] ?? null)
  );

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const SHOW_ROW = new Set([1, 3, 5, 0]); // Mon, Wed, Fri, Sun

  const monthLabels: Record<number, string> = {};
  let prevMonth = -1;
  weekCells.forEach((week, wi) => {
    const first = week.find(c => c);
    if (first) {
      const m = first.date.getMonth();
      if (m !== prevMonth) {
        monthLabels[wi] = first.date.toLocaleDateString("en-US", { month: "short" });
        prevMonth = m;
      }
    }
  });

  return (
    <div className={styles.heatmapContainer}>
      {/* Month labels */}
      <div className={styles.heatmapMonthRow}>
        <div className={styles.dayLabelSpacer} />
        {weekCells.map((_, wi) => (
          <div key={wi} className={styles.heatmapMonthCell}>
            {monthLabels[wi] && <span className={styles.monthLabel}>{monthLabels[wi]}</span>}
          </div>
        ))}
      </div>
      {/* Day rows */}
      {[1, 2, 3, 4, 5, 6, 0].map(dow => (
        <div key={dow} className={styles.heatmapRow}>
          <span className={styles.dayLabel}>{SHOW_ROW.has(dow) ? DAY_LABELS[dow] : ""}</span>
          {weekCells.map((week, wi) => {
            const cell = week[dow];
            if (!cell) return <div key={wi} className={`${styles.heatCell} ${styles.heatFuture}`} />;
            const isFuture = cell.date > today;
            return (
              <div
                key={wi}
                className={`${styles.heatCell} ${isFuture ? styles.heatFuture : cell.active ? styles.heatActive : styles.heatEmpty}`}
                title={cell.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  // apiKey / provider are legacy dead-keys kept for the UI; still use localStorage directly
  const [apiKey, setApiKey]       = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("mindloop_api_key") || "" : "");
  const [provider, setProvider]   = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("mindloop_provider") || "groq" : "groq");
  const [sessions, setSessions]   = useState<Session[]>([]);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [completedDays, setCompletedDays] = useState<string[]>([]);

  const [mounted, setMounted] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    loadUserProfile().then(profile => {
      if (profile) {
        setName(profile.name);
        setEmail(profile.email);
      }
    }).catch(() => {});
    loadSessions().then(setSessions).catch(() => {});
    loadBestStreak().then(setBestStreak).catch(() => {});
    loadCompletedDays().then(setCompletedDays).catch(() => {});
  }, []);

  const stats = useMemo(() => {
    const submitted = sessions.filter(s => s.status === "submitted" || !s.status);
    if (!submitted.length) return null;

    const avgAcc = Math.round(submitted.reduce((a, s) => a + s.accuracyScore,  0) / submitted.length);
    const avgStr = Math.round(submitted.reduce((a, s) => a + s.structureScore, 0) / submitted.length);

    // Current streak
    const days = [...new Set(submitted.map(s => s.date.split("T")[0]))].sort((a, b) => b.localeCompare(a));
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

    // Days practiced this week (Mon–Sun)
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // Monday
    weekStart.setHours(0, 0, 0, 0);
    const daysThisWeek = [...new Set(submitted.map(s => s.date.split("T")[0]))]
      .filter(d => new Date(d) >= weekStart).length;

    // Top % — fun computed metric based on avg accuracy
    const topPct = avgAcc >= 90 ? 5 : avgAcc >= 80 ? 10 : avgAcc >= 70 ? 18 : avgAcc >= 60 ? 30 : avgAcc >= 50 ? 45 : 60;
    const progressPct = Math.round((1 - topPct / 100) * 100);

    // Thinking profile
    const typeMap: Record<string, { total: number; count: number }> = {};
    submitted.forEach(s => {
      const t = s.domain ? s.domain.charAt(0).toUpperCase() + s.domain.slice(1) : "General";
      if (!typeMap[t]) typeMap[t] = { total: 0, count: 0 };
      typeMap[t].total += s.accuracyScore;
      typeMap[t].count++;
    });
    const typeAvgs = Object.entries(typeMap).map(([name, d]) => ({ name, avg: Math.round(d.total / d.count) }));
    typeAvgs.sort((a, b) => b.avg - a.avg);
    const strongest = typeAvgs[0];
    const weakest   = typeAvgs[typeAvgs.length - 1];

    // Achievements
    const estCount = submitted.length;
    const strImproved = submitted.length >= 6
      ? Math.round(submitted.slice(-3).reduce((a, s) => a + s.structureScore, 0) / 3) -
        Math.round(submitted.slice(-6, -3).reduce((a, s) => a + s.structureScore, 0) / 3) >= 20
      : false;
    const hintFreeCount = submitted.filter(s => !s.hintUsed).length;

    // Member since (first submitted session date)
    const firstDate = submitted.length
      ? new Date(submitted[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : null;

    return { avgAcc, avgStr, streak, daysThisWeek, topPct, progressPct, strongest, weakest, estCount, strImproved, hintFreeCount, firstDate };
  }, [sessions]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Persist name/email to localStorage + Supabase
    saveUserProfile({ name, email });
    // Keep legacy dead-keys in sync
    localStorage.setItem("mindloop_api_key", apiKey);
    localStorage.setItem("mindloop_provider", provider);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const providerLabel = provider === "groq" ? "Groq (Free)" : provider === "openai" ? "OpenAI" : "Google Gemini";
  const initial = mounted && name ? name.charAt(0).toUpperCase() : "A";
  const displayName = mounted && name ? name : "Your Name";

  if (!mounted) return null;

  return (
    <div className={styles.page}>
      {/* ── S1: Hero card ── */}
      <motion.div className={styles.heroCard} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className={styles.heroLeft}>
          <div className={styles.avatarCircle}>{initial}</div>
          <div className={styles.heroInfo}>
            <h1 className={styles.heroName}>{displayName}</h1>
            <p className={styles.heroTitle}>Structured Thinker</p>
            <p className={styles.heroQuote}><span className={styles.quoteGlyph}>&ldquo;</span> You break complex problems into clear, logical steps.</p>
          </div>
        </div>
        <div className={styles.heroRight}>
          <p className={styles.topPct}>Top {stats?.topPct ?? 18}% <span className={styles.topArrow}><TrendingUp size={14} /></span></p>
          <p className={styles.topSub}>of the month</p>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${stats?.progressPct ?? 78}%` }} />
          </div>
          <p className={styles.progressPct}>{stats?.progressPct ?? 78}%</p>
        </div>
        {/* Stat chips */}
        <div className={styles.heroChips}>
          <span className={styles.chipAmber}><Flame size={16} style={{marginRight:'4px'}} />{stats?.streak ?? 0} Day Streak</span>
          <span className={styles.chipGreen}><Calendar size={16} style={{marginRight:'4px'}} />{stats?.daysThisWeek ?? 0} of 7 days this week</span>
        </div>
      </motion.div>

      {/* ── S2: Account details ── */}
      <motion.div className={styles.accountCard} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className={styles.accountHeader}>
          <h2 className={styles.sectionTitle}>Account Details</h2>
          <button className={styles.editBtn}><Pencil size={14} style={{marginRight:'4px'}} />Edit</button>
        </div>
        <form onSubmit={handleSave}>
          <div className={styles.fieldGrid}>
            {/* Name */}
            <div className={styles.fieldCell}>
              <div className={styles.fieldLabel}><span className={styles.fieldIcon}><User size={14} /></span> Name</div>
              <input className={styles.fieldInput} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            {/* Member Since */}
            <div className={styles.fieldCell}>
              <div className={styles.fieldLabel}><span className={styles.fieldIcon}><Calendar size={14} /></span> Member Since</div>
              <p className={styles.fieldValue}>{stats?.firstDate ?? "—"}</p>
            </div>
            {/* AI Provider */}
            <div className={styles.fieldCell}>
              <div className={styles.fieldLabel}><span className={styles.fieldIcon}><Settings size={14} /></span> AI Provider</div>
              <div className={styles.fieldRow}>
                <select className={styles.fieldSelect} value={provider} onChange={e => setProvider(e.target.value)}>
                  <option value="groq">Groq (Free)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                </select>
                <span className={styles.connectedBadge}>Connected</span>
              </div>
            </div>
            {/* Email */}
            <div className={styles.fieldCell}>
              <div className={styles.fieldLabel}><span className={styles.fieldIcon}><Mail size={14} /></span> Email</div>
              <input className={styles.fieldInput} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
            </div>
            {/* Time Zone */}
            <div className={styles.fieldCell}>
              <div className={styles.fieldLabel}><span className={styles.fieldIcon}><Globe size={14} /></span> Time Zone</div>
              <p className={styles.fieldValue}>(GMT+5:30) Asia/Kolkata</p>
            </div>
            {/* API Key */}
            <div className={styles.fieldCell}>
              <div className={styles.fieldLabel}><span className={styles.fieldIcon}><Key size={14} /></span> API Key</div>
              <div className={styles.fieldRow}>
                <input
                  className={styles.fieldInput}
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="Enter API key…"
                  style={{ flex: 1 }}
                />
                <button type="button" className={styles.showBtn} onClick={() => setShowApiKey(v => !v)}>
                  {showApiKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>
          <p className={styles.apiNote}><Lock size={16} style={{marginRight:'4px'}} />Your API key is stored securely and never shared.</p>
        </form>
      </motion.div>

      {/* ── S3: Activity + Thinking profile ── */}
      <motion.div className={styles.midRow} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {/* Practice Activity */}
        <div className={styles.activityCard}>
          <div className={styles.activityHeader}>
            <div className={styles.activityHeaderLeft}>
              <h2 className={styles.sectionTitle}>Practice Activity</h2>
              <span className={styles.infoIcon}>ℹ</span>
            </div>
            <span className={styles.periodPill}>Last 90 days ▾</span>
          </div>
          <Heatmap completedDays={completedDays} />
          <div className={styles.consistencyRow}>
            <span className={styles.consistencyCheck}><Check size={16} /></span>
            <p className={styles.consistencyText}>
              <strong className={styles.consistencyGreen}>Great consistency!</strong>{" "}
              You practiced {stats?.daysThisWeek ?? 0} of the last 7 days.
            </p>
          </div>
          <p className={styles.consistencySub}>Keep practicing daily to build your interview edge.</p>
        </div>

        {/* Thinking Profile */}
        <div className={styles.thinkingCard}>
          <div className={styles.thinkingHeader}>
            <div className={styles.thinkingIconCircle}><Brain size={16} /></div>
            <h2 className={styles.sectionTitle}>Your Thinking Profile</h2>
          </div>
          <div className={styles.traitList}>
            <div className={styles.traitRow}>
              <span className={`${styles.traitDot} ${styles.traitDotGreen}`} />
              <div>
                <p className={styles.traitName}>Strong in structured breakdowns</p>
                <p className={styles.traitDesc}>You break problems down logically.</p>
              </div>
            </div>
            <div className={styles.traitRow}>
              <span className={`${styles.traitDot} ${styles.traitDotGreen}`} />
              <div>
                <p className={styles.traitName}>
                  {stats?.strongest ? `Excellent at ${stats.strongest.name.toLowerCase()}` : "Excellent at market sizing"}
                </p>
                <p className={styles.traitDesc}>Your estimates are well-reasoned.</p>
              </div>
            </div>
            <div className={styles.traitRow}>
              <span className={`${styles.traitDot} ${styles.traitDotAmber}`} />
              <div>
                <p className={styles.traitName}>
                  {stats?.weakest ? `Focus area: ${stats.weakest.name}` : "Focus area: Assumptions"}
                </p>
                <p className={styles.traitDesc}>Work on making explicit, testable assumptions.</p>
              </div>
            </div>
          </div>
          <button className={styles.insightsLink} onClick={() => router.push("/insights")}>
            View Detailed Insights →
          </button>
        </div>
      </motion.div>

      {/* ── S4: Achievements ── */}
      <motion.div className={styles.achievementsSection} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className={styles.achievementsHeader}>
          <h2 className={styles.sectionTitle}>Achievements</h2>
          <button className={styles.viewAllBtn}>View all</button>
        </div>
        <div className={styles.achievementsRow}>
          <div className={styles.achieveCard}>
            <p className={styles.achieveIcon}><Flame size={16} /></p>
            <p className={styles.achieveTitle}>{bestStreak} Day Streak</p>
            <p className={styles.achieveDesc}>Keep the momentum going!</p>
            <div className={`${styles.achieveBar} ${styles.achieveBarAmber}`} />
          </div>
          <div className={`${styles.achieveCard} ${!stats || stats.estCount < 10 ? styles.achieveLocked : ""}`}>
            <p className={styles.achieveIcon}><Brain size={16} /></p>
            <p className={styles.achieveTitle}>10 Estimations</p>
            <p className={styles.achieveDesc}>Completed 10 estimation sessions</p>
            <div className={`${styles.achieveBar} ${styles.achieveBarBlue}`} />
          </div>
          <div className={`${styles.achieveCard} ${!stats?.strImproved ? styles.achieveLocked : ""}`}>
            <p className={styles.achieveIcon}><TrendingUp size={16} /></p>
            <p className={styles.achieveTitle}>Structure Improver</p>
            <p className={styles.achieveDesc}>Improved structure score by 20%</p>
            <div className={`${styles.achieveBar} ${styles.achieveBarGreen}`} />
          </div>
          <div className={`${styles.achieveCard} ${!stats || stats.hintFreeCount < 5 ? styles.achieveLocked : ""}`}>
            <p className={styles.achieveIcon}><Lightbulb size={16} /></p>
            <p className={styles.achieveTitle}>Hint-Free Thinker</p>
            <p className={styles.achieveDesc}>Completed 5 sessions without using a hint</p>
            <div className={`${styles.achieveBar} ${styles.achieveBarPurple}`} />
          </div>
        </div>
      </motion.div>

      {/* ── S5: Footer CTA ── */}
      <motion.div className={styles.footerCard} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className={styles.footerLeft}>
          <Image src="/owlly-icon.png" alt="Mindloop" width={90} height={90} style={{ objectFit: "contain", flexShrink: 0 }} />
          <div>
            <p className={styles.footerHeading}>Keep building your edge!</p>
            <p className={styles.footerSub}>Consistency is the secret to mastering case interviews. You're doing great!</p>
          </div>
        </div>
        <div className={styles.footerRight}>
          <form onSubmit={handleSave}>
            <button type="submit" className={styles.saveBtn}>
              {saved ? <><Check size={16} style={{marginRight:'4px'}} />Saved!</> : "Save Changes"}
            </button>
          </form>
          <button
            className={styles.logoutBtn}
            onClick={async () => {
              const supabase = createBrowserClient();
              await supabase.auth.signOut();
              router.push("/");
            }}
          >
            Log Out
          </button>
        </div>
      </motion.div>
    </div>
  );
}
