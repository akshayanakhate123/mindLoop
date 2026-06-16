"use client";

import { useEffect, useState } from "react";
import styles from "./feedback.module.css";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Target, X, Download, House, RotateCcw, ThumbsUp, AlertCircle, Lightbulb, MessageSquare, Check, Zap } from "lucide-react";
import confetti from "canvas-confetti";

// ── Confetti burst sequence ────────────────────────────────────────────────
// Fires heavy bursts every 400ms for 5s, then lighter bursts every 800ms for 15s.
const CONFETTI_COLORS = ["#4A6CF7", "#F5A623", "#22C55E", "#8B5CF6", "#EF4444"];

function fireConfetti() {
  const burst = (origin: { x: number; y: number }) =>
    confetti({
      particleCount: 80,
      spread: 120,
      startVelocity: 45,
      colors: CONFETTI_COLORS,
      origin,
    });

  const origins: { x: number; y: number }[] = [
    { x: 0.1, y: 0.6 },
    { x: 0.9, y: 0.6 },
    { x: 0.5, y: 0.3 },
  ];
  let originIdx = 0;
  const timeouts: ReturnType<typeof setTimeout>[] = [];

  // Heavy phase: burst every 400ms for 5s (≈12 bursts)
  for (let t = 0; t < 5000; t += 400) {
    const origin = origins[originIdx % origins.length];
    originIdx++;
    timeouts.push(setTimeout(() => burst(origin), t));
  }

  // Tapering phase: burst every 800ms from 5s to 20s (≈19 bursts)
  for (let t = 5000; t < 20000; t += 800) {
    const origin = origins[originIdx % origins.length];
    originIdx++;
    timeouts.push(setTimeout(() => burst(origin), t));
  }

  return () => timeouts.forEach(clearTimeout);
}

function DonutChart({ pct, color }: { pct: number; color: string }) {
  return (
    <div
      className={styles.donut}
      style={{
        background: `conic-gradient(${color} ${pct}%, #EDEAE4 0)`,
      }}
    >
      <div className={styles.donutHole}>
        <span className={styles.donutPct}>{pct}%</span>
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  const [feedbackData, setFeedbackData] = useState<any>(null);
  const [scoreHistory, setScoreHistory] = useState<number[]>([]);
  const [redirecting, setRedirecting] = useState(false);
  const [submissionNudge, setSubmissionNudge] = useState<string | null>(null);
  const router = useRouter();

  // ── Pure display: this page never writes sessions, streaks, or scores. ──
  // All writes happen in submitAssessment() on the question page before
  // navigating here. This means re-opening feedback from the Challenges page,
  // navigating back from Home, or any other navigation is always safe.
  useEffect(() => {
    const data = localStorage.getItem("mindloop_latest_evaluation");
    if (!data) {
      setRedirecting(true);
      const t = setTimeout(() => router.push("/home"), 1000);
      return () => clearTimeout(t);
    }
    try {
      const parsed = JSON.parse(data);
      setFeedbackData(parsed);

      // Score history is display-only local state (used only for the trend chart).
      const historyStr = localStorage.getItem("mindloop_score_history");
      let history: number[] = historyStr ? JSON.parse(historyStr) : [];
      if (history.length === 0 || history[history.length - 1] !== parsed.AccuracyScore) {
        history.push(parsed.AccuracyScore);
        if (history.length > 6) history = history.slice(history.length - 6);
        localStorage.setItem("mindloop_score_history", JSON.stringify(history));
      }
      setScoreHistory(history);

      // Fresh-submission window: only act on data < 5 minutes old.
      // Re-visiting old feedback from the Challenges page skips all of this.
      const evalAge = Date.now() - new Date(parsed.date || 0).getTime();
      if (evalAge < 5 * 60 * 1000) {
        // Nudge 2: submission encouragement
        const nudgeMsgs =
          parsed.AccuracyScore >= 70
            ? ["Top quartile performance. You're interview-ready on this one.", "Strong showing. That's the standard to beat next time.", "Consultant-grade estimate. Solid all round."]
            : parsed.AccuracyScore >= 40
            ? ["Good structure. One more round and you'll nail this.", "Decent attempt — sharpen those assumptions and you're there.", "You've got the framework. The numbers just need calibrating."]
            : ["Tough one. Every stumble is a data point — use it.", "Hard problems build sharp thinkers. Come back tomorrow.", "The best consultants fail forward. Keep going."];
        setSubmissionNudge(nudgeMsgs[Math.floor(Math.random() * nudgeMsgs.length)]);

        // Streak completion: check if this submission finished the streak
        if (parsed.streakId && parsed.dayIndex != null && parsed.totalDays != null) {
          const isNowComplete = parsed.dayIndex >= parsed.totalDays;
          if (isNowComplete) {
            const todayStr = new Date().toLocaleDateString("sv");
            localStorage.setItem(
              "mindloop_show_celebration",
              `${parsed.streakId}|${todayStr}`
            );
            // Fire confetti immediately — returns a cleanup fn for the timeouts
            const cancel = fireConfetti();
            // Cleanup if the component unmounts before the 20s sequence finishes
            return () => cancel();
          }
        }
      }
    } catch (e) {
      console.error("Parse error", e);
    }
  }, []);

  if (!feedbackData) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        {redirecting ? (
          <>
            <p>Loading your results…</p>
            <div className={styles.toastBanner}>
              No evaluation found. Please complete a challenge first.
            </div>
          </>
        ) : (
          <p>Crunching the numbers and formulating feedback…</p>
        )}
      </div>
    );
  }

  if (feedbackData.notAttempted) {
    return (
      <div className={styles.page}>
        <motion.div
          className={styles.notAttemptedCard}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className={styles.notAttemptedIcon}>
            <AlertCircle size={40} color="#F59E0B" />
          </div>
          <h1 className={styles.notAttemptedTitle}>Time&apos;s up — challenge not attempted</h1>
          <p className={styles.notAttemptedDesc}>
            You didn&apos;t submit an answer before the timer ran out. No score was recorded for this session.
          </p>
          {feedbackData.question && (
            <div className={styles.notAttemptedQuestion}>
              <p className={styles.notAttemptedQLabel}>The question was</p>
              <p className={styles.notAttemptedQText}>{feedbackData.question}</p>
            </div>
          )}
          <div className={styles.notAttemptedActions}>
            <button
              className={styles.retryBtn}
              onClick={() => {
                if (feedbackData.question) {
                  sessionStorage.setItem("mindloop_retry_question", feedbackData.question);
                }
                const sid = feedbackData.streakId;
                const ridx = feedbackData.dayIndex != null ? feedbackData.dayIndex - 1 : 0;
                router.push(sid ? `/question?streakId=${sid}&retry=true&retryDayIndex=${ridx}` : `/question?retry=true&retryDayIndex=${ridx}`);
              }}
            >
              <RotateCcw size={16} />
              Try again
            </button>
            <button className={styles.homeBtn} onClick={() => router.push("/home")}>
              <House size={16} />
              Go home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const readiness = feedbackData.InterviewReadiness || "Almost Ready";
  const readinessBadgeClass =
    readiness === "Ready" ? styles.badgeReady :
    readiness === "Needs Work" ? styles.badgeNeedsWork :
    styles.badgeAlmost;
  const readinessLabel =
    readiness === "Ready" ? "READY" :
    readiness === "Needs Work" ? "NEEDS WORK" :
    "ALMOST READY";
  const readinessIcon =
    readiness === "Ready" ? <Check size={16} style={{marginRight:'4px'}} /> :
    readiness === "Needs Work" ? <X size={14} style={{marginRight:'4px'}} /> :
    <Zap size={16} style={{marginRight:'4px'}} />;

  const maxBar = scoreHistory.length > 0 ? Math.max(...scoreHistory, 1) : 1;
  const clarQ = feedbackData.ClarificationFeedback;

  return (
    <>
      {/* ── Nudge 2: submission encouragement banner ── */}
      {submissionNudge && (
        <div className={styles.nudgeBanner}>
          <Target size={16} style={{marginRight:'6px'}} />{submissionNudge}
          <button className={styles.nudgeBannerClose} onClick={() => setSubmissionNudge(null)} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}
      <div className={styles.page}>
        {/* ── Page header ── */}
        <motion.div className={styles.pageHeader} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className={styles.pageTitle}>Challenge Results</h1>
            <p className={styles.pageSubtitle}>Here is your AI-powered evaluation</p>
          </div>
          <button className={styles.downloadBtn} onClick={() => window.print()}>
            <Download size={16} style={{marginRight:'6px'}} />Download Report
          </button>
        </motion.div>

        {/* ── S1: Overall Evaluation + Accuracy Trend ── */}
        <motion.div className={styles.row} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          {/* Overall Evaluation */}
          <div className={styles.evalCard}>
            <div className={styles.evalTop}>
              <div className={styles.evalIcon}><Target size={16} /></div>
              <span className={styles.evalTitle}>Overall Evaluation</span>
              <span className={`${styles.readinessBadge} ${readinessBadgeClass}`}>{readinessIcon}{readinessLabel}</span>
            </div>
            <p className={styles.evalBody}>{feedbackData.VerdictLine}</p>
          </div>

          {/* Accuracy Trend */}
          <div className={styles.trendCard}>
            <p className={styles.trendTitle}>Recent Accuracy Trend</p>
            <div className={styles.trendBars}>
              {scoreHistory.map((score, i) => (
                <div key={i} className={styles.trendBarCol}>
                  <div
                    className={styles.trendBar}
                    style={{
                      height: `${Math.round((score / maxBar) * 100)}%`,
                      opacity: i === scoreHistory.length - 1 ? 1 : 0.45,
                    }}
                  />
                  <span className={styles.trendBarPct}>{score}%</span>
                </div>
              ))}
              {scoreHistory.length === 0 && (
                <p className={styles.noTrend}>No history yet</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── S2: Score cards ── */}
        <motion.div className={styles.row} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className={styles.scoreCard}>
            <DonutChart pct={feedbackData.AccuracyScore} color="#4A6CF7" />
            <div>
              <p className={styles.scoreCardLabel}>Accuracy Score <span className={styles.infoIcon}>ℹ</span></p>
              <p className={styles.scoreCardDesc}>
                {feedbackData.AccuracyScore >= 70
                  ? "Your estimate was close to the ideal answer."
                  : feedbackData.AccuracyScore >= 40
                  ? "Your estimate was reasonably close."
                  : "Your estimate was far from the ideal answer."}
              </p>
            </div>
          </div>
          <div className={styles.scoreCard}>
            <DonutChart pct={feedbackData.StructureScore} color="#F5A623" />
            <div>
              <p className={styles.scoreCardLabel}>Structure Score <span className={styles.infoIcon}>ℹ</span></p>
              <p className={styles.scoreCardDesc}>
                {feedbackData.StructureScore >= 70
                  ? "Your approach was well-structured."
                  : feedbackData.StructureScore >= 40
                  ? "Your approach had decent structure."
                  : "Your approach lacked proper structure."}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── S3: Step Breakdown + Assumption Analysis ── */}
        {(feedbackData.StepScores?.length > 0 || feedbackData.AssumptionComparison?.length > 0) && (
          <motion.div className={styles.row} style={{ alignItems: "start" }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            {feedbackData.StepScores?.length > 0 && (
              <div className={styles.halfCol}>
                <h2 className={styles.sectionHeading}>Step-by-Step Breakdown</h2>
                <div className={styles.stepsCard}>
                  {feedbackData.StepScores.map((s: any, i: number) => (
                    <div key={i} className={styles.stepRow}>
                      <div className={styles.stepTop}>
                        <div className={styles.stepBadge}>{i + 1}</div>
                        <span className={styles.stepTitle}>{s.step}</span>
                        <span className={styles.stepScore}>{s.score}%</span>
                      </div>
                      <div className={styles.stepBar}>
                        <div
                          className={styles.stepFill}
                          style={{
                            width: `${s.score}%`,
                            background: s.score > 70 ? "#22C55E" : s.score > 40 ? "#F59E0B" : "#EF4444",
                          }}
                        />
                      </div>
                      <p className={styles.stepComment}>{s.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {feedbackData.AssumptionComparison?.length > 0 && (
              <div className={styles.halfCol}>
                <h2 className={styles.sectionHeading}>Assumption Analysis</h2>
                <div className={styles.tableCard}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Parameter</th>
                        <th>Your Assumption</th>
                        <th>Ideal Assumption</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedbackData.AssumptionComparison.map((c: any, i: number) => (
                        <tr key={i} className={c.isMatch ? styles.matchRow : styles.mismatchRow}>
                          <td>{c.parameter}</td>
                          <td>{c.userAssumption || <em className={styles.missed}>Missed</em>}</td>
                          <td>{c.idealAssumption}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── S4: Clarification Phase ── */}
        {clarQ && (
          <motion.div className={styles.clarCard} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className={styles.clarLeft}>
              <div className={styles.clarTop}>
                <span className={styles.clarIcon}><MessageSquare size={16} /></span>
                <span className={styles.clarCount}>{clarQ.questionsAsked} question{clarQ.questionsAsked !== 1 ? "s" : ""} asked</span>
                <span className={`${styles.clarBadge} ${
                  clarQ.quality === "Good" ? styles.qualGood :
                  clarQ.quality === "Adequate" ? styles.qualAdequate :
                  clarQ.quality === "Poor" ? styles.qualPoor : styles.qualNone
                }`}>{clarQ.quality?.toUpperCase() || "NONE"}</span>
              </div>
              <p className={styles.clarText}>{clarQ.feedback}</p>
            </div>
            {clarQ.suggestedQuestions?.length > 0 && (
              <div className={styles.clarRight}>
                <p className={styles.clarSugTitle}>Questions you should have asked:</p>
                <ul className={styles.clarList}>
                  {clarQ.suggestedQuestions.map((q: string, i: number) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}

        {/* ── S5: Qualitative Feedback ── */}
        <h2 className={styles.sectionHeading}>Qualitative Feedback</h2>
        <motion.div className={styles.qualRow} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className={`${styles.qualCard} ${styles.qualGreen}`}>
            <div className={styles.qualHeader}>
              <span className={styles.qualIconGreen}><ThumbsUp size={16} /></span>
              <span className={styles.qualTitle}>What you did well</span>
            </div>
            <p className={styles.qualBody}>{feedbackData.GoodPoints}</p>
          </div>
          <div className={`${styles.qualCard} ${styles.qualRed}`}>
            <div className={styles.qualHeader}>
              <span className={styles.qualIconRed}><AlertCircle size={16} /></span>
              <span className={styles.qualTitle}>Areas for improvement</span>
            </div>
            <p className={styles.qualBody}>{feedbackData.BadPoints}</p>
          </div>
          {feedbackData.Improvement && (
            <div className={`${styles.qualCard} ${styles.qualAmber}`}>
              <div className={styles.qualHeader}>
                <span className={styles.qualIconAmber}><Lightbulb size={16} /></span>
                <span className={styles.qualTitle}>How to improve</span>
              </div>
              <p className={styles.qualBody}>{feedbackData.Improvement}</p>
            </div>
          )}
        </motion.div>

        {/* ── S6: Ideal Model Answer ── */}
        {feedbackData.ModelAnswer?.length > 0 && (
          <>
            <h2 className={styles.sectionHeading}>The Ideal Model Answer</h2>
            <motion.div className={styles.modelCard} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className={styles.modelSteps}>
                {feedbackData.ModelAnswer.map((step: string, i: number) => {
                  const isFinal = i === feedbackData.ModelAnswer.length - 1;
                  return (
                    <div key={i} className={`${styles.modelStep} ${isFinal ? styles.modelStepFinal : ""}`}>
                      <div className={`${styles.stepNum} ${isFinal ? styles.stepNumFinal : ""}`}>{i + 1}</div>
                      <p
                        className={`${styles.modelStepText} ${isFinal ? styles.modelStepTextFinal : ""}`}
                        dangerouslySetInnerHTML={{
                          __html: (typeof step === "object" && step !== null
                            ? Object.entries(step).map(([k, v]) => `${k}: ${v}`).join(" · ")
                            : String(step)
                          ).replace(/^Step \d+:?\s*/i, "")
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className={styles.modelOwl}>
                <Image src="/owlly-icon.png" alt="Mindloop" width={100} height={100} style={{ objectFit: "contain" }} />
              </div>
            </motion.div>
          </>
        )}

        {/* spacer above sticky footer */}
        <div style={{ height: "5rem" }} />
      </div>

      {/* ── Sticky footer ── */}
      <div className={styles.stickyFooter}>
        <button className={styles.footerBtnPrimary} onClick={() => router.push("/home")}>
          <House size={16} style={{marginRight:'6px'}} />Go to Home Page
        </button>
        <button
          className={styles.footerBtnSecondary}
          onClick={() => {
            const streakId = feedbackData.streakId;
            if (feedbackData.question) {
              sessionStorage.setItem("mindloop_retry_question", feedbackData.question);
            }
            const ridx = feedbackData.dayIndex != null ? feedbackData.dayIndex - 1 : 0;
            router.push(streakId ? `/question?streakId=${streakId}&retry=true&retryDayIndex=${ridx}` : `/question?retry=true&retryDayIndex=${ridx}`);
          }}
        >
          <RotateCcw size={16} style={{marginRight:'6px'}} />Try Again
        </button>
      </div>
    </>
  );
}
