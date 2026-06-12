"use client";

import styles from "./insights.module.css";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo, useRef } from "react";
import { loadSessions, loadBestStreak } from "@/lib/db";
import { Calendar, Flame, Trophy, Target, TrendingUp, ThumbsUp, Lightbulb, MessageSquare, RotateCcw, PartyPopper, AlertTriangle } from "lucide-react";

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

function SemiCircleGauge({ pct, color }: { pct: number; color: string }) {
  const R = 70;
  const C = Math.PI * R;
  const fill = (pct / 100) * C;
  return (
    <svg viewBox="0 0 160 95" className={styles.gaugeSvg}>
      <path d="M 15 85 A 70 70 0 0 1 145 85" fill="none" stroke="#E5E7EB" strokeWidth="14" strokeLinecap="round" />
      <path
        d="M 15 85 A 70 70 0 0 1 145 85"
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${fill} ${C}`}
      />
      <text x="80" y="80" textAnchor="middle" className={styles.gaugeNum}>{pct}%</text>
    </svg>
  );
}

function LineChart({ data, color, yKey }: { data: any[]; color: string; yKey: "accuracy" | "structure" }) {
  const W = 420, H = 175, PL = 38, PR = 16, PT = 28, PB = 38;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const n = data.length;
  const xStep = n > 1 ? chartW / (n - 1) : 0;

  // Show x-axis label every Nth point so they never overlap (~40px min spacing)
  const labelEvery = n <= 7 ? 1 : n <= 15 ? 2 : n <= 30 ? 4 : 7;

  const points = data.map((d, i) => ({
    x: PL + i * xStep,
    y: PT + chartH - (d[yKey] / 100) * chartH,
    val: d[yKey],
    label: d.dateLabel,
  }));
  const polyline = points.map(p => `${p.x},${p.y}`).join(" ");
  const yTicks = [0, 25, 50, 75, 100];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.lineSvg}>
      {yTicks.map(t => {
        const y = PT + chartH - (t / 100) * chartH;
        return (
          <g key={t}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#F0EBE0" strokeWidth="1" />
            <text x={PL - 5} y={y + 4} textAnchor="end" className={styles.axisLabel}>{t}%</text>
          </g>
        );
      })}
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={n > 30 ? 3 : 4} fill={color} />
          {/* Value label — skip if points too dense */}
          {(n <= 15 || i % labelEvery === 0) && (
            <text x={p.x} y={p.y - 9} textAnchor="middle" className={styles.dotLabel}>{p.val}%</text>
          )}
          {/* X-axis date label — show every Nth */}
          {i % labelEvery === 0 && (
            <text x={p.x} y={H - 4} textAnchor="middle" className={styles.axisLabel}>{p.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

function TypeDonut({ segments }: { segments: { name: string; avg: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.avg, 0) || 1;
  let cumulative = 0;
  const gradient = segments
    .map(s => {
      const pct = (s.avg / total) * 100;
      const start = cumulative;
      cumulative += pct;
      return `${s.color} ${start}% ${cumulative}%`;
    })
    .join(", ");
  return (
    <div className={styles.typeDonutWrap}>
      <div className={styles.typeDonut} style={{ background: `conic-gradient(${gradient})` }}>
        <div className={styles.typeDonutHole} />
      </div>
    </div>
  );
}

const TYPE_COLORS: Record<string, string> = {
  Finance:    "#3B82F6",
  Product:    "#22C55E",
  Marketing:  "#F59E0B",
  Sales:      "#8B5CF6",
  Generalist: "#6B7280",
};

const ALL_TYPES = ["Finance", "Product", "Marketing", "Sales", "Generalist"];

const STRONGEST_DESC: Record<string, string> = {
  Finance:    "You perform best on quantitative finance problems — your numerical reasoning is strong.",
  Product:    "You excel at product sizing and market estimation questions.",
  Marketing:  "You're strong at marketing estimation and campaign-scale problems.",
  Sales:      "You handle sales-focused estimation well with solid business intuition.",
  Generalist: "You perform well across open-ended generalist problems with a structured framework.",
};

const WEAKEST_DESC: Record<string, string> = {
  Finance:    "Practice breaking financial estimates into smaller, verifiable components.",
  Product:    "Try anchoring product estimates with user funnel or adoption rate assumptions.",
  Marketing:  "Focus on sizing the audience before estimating campaign reach or spend.",
  Sales:      "Practice building a clear sales pipeline structure before diving into numbers.",
  Generalist: "Try structuring open-ended problems with a clear framework before jumping to conclusions.",
};

type RangeKey = "7" | "30" | "90";
const RANGE_LABELS: Record<RangeKey, string> = {
  "7":  "Last 7 Days",
  "30": "Last 30 Days",
  "90": "Last 90 Days",
};

export default function InsightsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [mounted, setMounted] = useState(false);
  const [range, setRange] = useState<RangeKey>("7");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    loadSessions().then(setSessions).catch(() => {});
    loadBestStreak().then(setBestStreak).catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const allSubmitted = sessions.filter(s => s.status === "submitted" || !s.status);
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - parseInt(range));
    const submitted = allSubmitted.filter(s => new Date(s.date) >= cutoff);
    if (submitted.length === 0) return null;

    const avgAccuracy = Math.round(submitted.reduce((acc, s) => acc + s.accuracyScore, 0) / submitted.length);
    const avgStructure = Math.round(submitted.reduce((acc, s) => acc + s.structureScore, 0) / submitted.length);

    const completedDays = [...new Set(submitted.map(s => s.date.split("T")[0]))].sort((a, b) => b.localeCompare(a));
    let currentStreak = 0;
    if (completedDays.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastDate = new Date(completedDays[0]);
      lastDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / 86400000);
      if (diffDays <= 1) {
        currentStreak = 1;
        let prev = lastDate;
        for (let i = 1; i < completedDays.length; i++) {
          const curr = new Date(completedDays[i]);
          curr.setHours(0, 0, 0, 0);
          if (Math.floor((prev.getTime() - curr.getTime()) / 86400000) === 1) {
            currentStreak++;
            prev = curr;
          } else break;
        }
      }
    }

    // Aggregate sessions by calendar day, average scores per day
    const dayMap: Record<string, { accTotal: number; strTotal: number; count: number }> = {};
    submitted.forEach(s => {
      const day = s.date.split("T")[0];
      if (!dayMap[day]) dayMap[day] = { accTotal: 0, strTotal: 0, count: 0 };
      dayMap[day].accTotal += s.accuracyScore;
      dayMap[day].strTotal += s.structureScore;
      dayMap[day].count += 1;
    });
    const trendData = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, d]) => ({
        dateLabel: new Date(day + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        accuracy: Math.round(d.accTotal / d.count),
        structure: Math.round(d.strTotal / d.count),
      }));

    let improvementRate: number | null = null;
    if (submitted.length >= 6) {
      const last3Avg = submitted.slice(-3).reduce((acc, s) => acc + s.accuracyScore, 0) / 3;
      const prev3Avg = submitted.slice(-6, -3).reduce((acc, s) => acc + s.accuracyScore, 0) / 3;
      improvementRate = Math.round(last3Avg - prev3Avg);
    }

    const typeMap: Record<string, { total: number; count: number }> = {};
    submitted.forEach(s => {
      const t = s.domain ? s.domain.charAt(0).toUpperCase() + s.domain.slice(1) : "General";
      if (!typeMap[t]) typeMap[t] = { total: 0, count: 0 };
      typeMap[t].total += s.accuracyScore;
      typeMap[t].count += 1;
    });
    const typeAvgs = Object.entries(typeMap).map(([name, d]) => ({ name, avg: Math.round(d.total / d.count) }));
    typeAvgs.sort((a, b) => b.avg - a.avg);
    const strongest = typeAvgs[0];
    const weakest = typeAvgs.length > 1 ? typeAvgs[typeAvgs.length - 1] : null;

    const last5Avg = Math.round(
      submitted.slice(-5).reduce((acc, s) => acc + (s.accuracyScore + s.structureScore) / 2, 0) /
        Math.min(submitted.length, 5)
    );

    const typeSegments = ALL_TYPES.map(name => ({
      name,
      avg: typeMap[name] ? Math.round(typeMap[name].total / typeMap[name].count) : 0,
      color: TYPE_COLORS[name] || "#999",
    }));

    return { avgAccuracy, avgStructure, currentStreak, trendData, improvementRate, strongest, weakest, last5Avg, typeSegments, sessionCount: submitted.length };
  }, [sessions, range]);

  const dateRangeLabel = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - parseInt(range) + 1);
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
  }, [range]);

  if (!mounted) return null;

  if (!stats) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><img src="/owlly-icon.png" alt="" style={{ height: "64px", width: "auto", display: "block" }} /></div>
          <h1>No sessions yet</h1>
          <p>Complete your first challenge to see history and performance insights!</p>
          <button onClick={() => (window.location.href = "/home")} className={styles.ctaButton}>
            Start Practice
          </button>
        </div>
      </div>
    );
  }

  const { avgAccuracy, avgStructure, currentStreak, trendData, improvementRate, strongest, weakest, last5Avg, typeSegments } = stats;
  const gaugeColor = last5Avg > 80 ? "#22C55E" : last5Avg > 60 ? "#F59E0B" : "#EF4444";
  const gaugeLabel = last5Avg > 80 ? "Expert" : last5Avg > 60 ? "Good" : "Needs Practice";
  const gaugeLabelClass = last5Avg > 80 ? styles.gaugeGood : last5Avg > 60 ? styles.gaugeOk : styles.gaugeBad;

  return (
    <div className={styles.page}>
      {/* Header */}
      <motion.div className={styles.pageHeader} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 className={styles.pageTitle}>Insights & Progress</h1>
          <p className={styles.pageSubtitle}>Dynamic analysis of your guesstimate performance.</p>
        </div>
        <div ref={pillRef} style={{ position: "relative" }}>
          <div
            className={styles.dateRangePill}
            style={{ cursor: "pointer" }}
            onClick={() => setDropdownOpen(o => !o)}
          >
            <span><Calendar size={16} /></span>
            <span className={styles.dateRangeText}>{dateRangeLabel}</span>
            <span>▾</span>
          </div>
          {dropdownOpen && (
            <div className={styles.rangeDropdown}>
              {(Object.keys(RANGE_LABELS) as RangeKey[]).map(key => (
                <button
                  key={key}
                  className={`${styles.rangeDropdownItem} ${range === key ? styles.rangeDropdownItemActive : ""}`}
                  onClick={() => { setRange(key); setDropdownOpen(false); }}
                >
                  {RANGE_LABELS[key]}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Section 1: Top Stats Row */}
      <motion.div className={styles.topRow} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className={styles.readinessCard}>
          <p className={styles.readinessTitle}>Interview Readiness</p>
          <SemiCircleGauge pct={last5Avg} color={gaugeColor} />
          <p className={`${styles.readinessLabel} ${gaugeLabelClass}`}>{gaugeLabel}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Current Streak</p>
          <p className={styles.statValue}>{currentStreak} <Flame size={16} /></p>
          <p className={styles.statSub}>Keep it going!</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Best Streak</p>
          <p className={styles.statValue}>{bestStreak} <Trophy size={16} /></p>
          <p className={styles.statSub}>Your record</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Avg Accuracy</p>
          <p className={styles.statValue}>{avgAccuracy}%</p>
          <p className={styles.statSub}>Across all sessions</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Avg Structure</p>
          <p className={styles.statValue}>{avgStructure}%</p>
          <p className={styles.statSub}>Across all sessions</p>
        </div>
      </motion.div>

      {/* Section 2: Improvement Banner */}
      {improvementRate !== null && (
        <motion.div
          className={`${styles.banner} ${improvementRate >= 0 ? styles.bannerGreen : styles.bannerRed}`}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className={`${styles.bannerIcon} ${improvementRate >= 0 ? styles.bannerIconGreen : styles.bannerIconRed}`}>
            {improvementRate >= 0 ? <TrendingUp size={16} /> : <TrendingUp size={16} style={{transform:'rotate(180deg)'}} />}
          </div>
          {improvementRate >= 0 ? (
            <p className={styles.bannerText}>
              You improved by{" "}
              <strong className={styles.bannerHighlight}>+{improvementRate}% accuracy</strong>
              {" "}over your last 6 sessions! <PartyPopper size={16} />
            </p>
          ) : (
            <p className={styles.bannerText}>
              Accuracy dipped by{" "}
              <strong className={styles.bannerHighlightRed}>{Math.abs(improvementRate)}%</strong>
              {" "}— keep practicing to bounce back!
            </p>
          )}
        </motion.div>
      )}

      {/* Section 3: Trend Charts */}
      <motion.div className={styles.chartsRow} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={`${styles.chartIconCircle} ${styles.chartIconRed}`}><Target size={16} /></div>
            <h2 className={styles.chartTitle}>Accuracy Trend ({RANGE_LABELS[range]})</h2>
          </div>
          {trendData.length > 0 ? (
            <LineChart data={trendData} color="#EF4444" yKey="accuracy" />
          ) : (
            <p className={styles.noData}>No data yet</p>
          )}
        </div>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={`${styles.chartIconCircle} ${styles.chartIconBlue}`}><TrendingUp size={16} /></div>
            <h2 className={styles.chartTitle}>Structure Trend ({RANGE_LABELS[range]})</h2>
          </div>
          {trendData.length > 0 ? (
            <LineChart data={trendData} color="#3B82F6" yKey="structure" />
          ) : (
            <p className={styles.noData}>No data yet</p>
          )}
        </div>
      </motion.div>

      {/* Section 4: Type Analysis */}
      <motion.div className={styles.typeRow} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        {/* Strongest */}
        <div className={styles.typeCard}>
          <div className={styles.typeCardHeader}>
            <div className={`${styles.typeIconCircle} ${styles.typeIconGreen}`}><ThumbsUp size={16} /></div>
            <h2 className={styles.typeCardTitle}>Strongest Type</h2>
          </div>
          <div className={styles.typeNameRow}>
            <span className={styles.typeNameGreen}>{strongest.name}</span>
            <span className={styles.typeAvgPill}>Avg {strongest.avg}%</span>
          </div>
          <div className={styles.typeBar}><div className={styles.typeBarFillGreen} style={{ width: `${strongest.avg}%` }} /></div>
          <p className={styles.typeDesc}>{STRONGEST_DESC[strongest.name] ?? "You perform well in this category."}</p>
        </div>

        {/* Weakest */}
        <div className={styles.typeCard}>
          {weakest ? (
            <>
              <div className={styles.typeCardHeader}>
                <div className={`${styles.typeIconCircle} ${styles.typeIconAmber}`}><AlertTriangle size={16} /></div>
                <h2 className={styles.typeCardTitle}>Weakest Type</h2>
              </div>
              <div className={styles.typeNameRow}>
                <span className={styles.typeNameAmber}>{weakest.name}</span>
                <span className={styles.typeAvgPill}>Avg {weakest.avg}%</span>
              </div>
              <div className={styles.typeBar}><div className={styles.typeBarFillAmber} style={{ width: `${weakest.avg}%` }} /></div>
              <p className={styles.typeDesc}>{WEAKEST_DESC[weakest.name] ?? "Focus on improving here."}</p>
            </>
          ) : (
            <p className={styles.typeDesc}>Practice more question types to see your weakest area here.</p>
          )}
        </div>

        {/* Performance by Type */}
        <div className={styles.typeCard}>
          <h2 className={styles.typeCardTitle}>Performance by Type</h2>
          <div className={styles.typeDonutRow}>
            <TypeDonut segments={typeSegments} />
            <div className={styles.typeLegend}>
              {typeSegments.map(s => (
                <div key={s.name} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: s.color }} />
                  <span className={styles.legendName}>{s.name}</span>
                  <span className={styles.legendPct}>{s.avg}%</span>
                </div>
              ))}
            </div>
          </div>
          <button className={styles.typeExampleBtn} onClick={() => (window.location.href = "/question")}>View All Types →</button>
        </div>
      </motion.div>

      {/* Section 5: Insights for You */}
      <motion.div className={styles.insightsRow} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className={styles.insightsAnchor}>
          <div className={styles.insightsAnchorIcon}><Lightbulb size={16} /></div>
          <p className={styles.insightsAnchorLabel}>Insights for You</p>
        </div>
        <div className={styles.insightCard}>
          <div className={`${styles.insightIcon} ${styles.insightIconAmber}`}><Target size={16} /></div>
          <h3 className={styles.insightTitle}>Focus on Structure</h3>
          <p className={styles.insightDesc}>Strong solutions start with a clear structure. Practice breaking problems down step-by-step.</p>
        </div>
        <div className={styles.insightCard}>
          <div className={`${styles.insightIcon} ${styles.insightIconBlue}`}><MessageSquare size={16} /></div>
          <h3 className={styles.insightTitle}>Ask Better Questions</h3>
          <p className={styles.insightDesc}>Asking the right clarifying questions can improve your accuracy by 20%+.</p>
        </div>
        <div className={styles.insightCard}>
          <div className={`${styles.insightIcon} ${styles.insightIconGreen}`}><RotateCcw size={16} /></div>
          <h3 className={styles.insightTitle}>Stay Consistent</h3>
          <p className={styles.insightDesc}>Keep your streak alive! Consistent practice is the key to improvement.</p>
        </div>
      </motion.div>

      <div style={{ height: "2rem" }} />
    </div>
  );
}
