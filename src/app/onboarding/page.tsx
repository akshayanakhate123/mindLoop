"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { createBrowserClient } from "@/lib/supabase/client";
import { saveUserProfile } from "@/lib/db";
import styles from "./onboarding.module.css";
import { Brain, TrendingUp, Target, Check } from "lucide-react";

const GOALS = [
  {
    icon: <Brain size={20} />,
    title: "Sharpen my estimation thinking",
    description: "Get better at breaking down complex numbers intuitively",
  },
  {
    icon: <TrendingUp size={20} />,
    title: "Improve my structured problem solving",
    description: "Build frameworks for tackling open-ended business problems",
  },
  {
    icon: <Target size={20} />,
    title: "Practice consistently every day",
    description: "Build a daily thinking habit with streaks and challenges",
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem("mindloop_onboarding_complete") === "true") {
      router.replace("/home");
      return;
    }
    const supabase = createBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      setName(session.user.user_metadata?.full_name || "");
      setEmail(session.user.email || "");
    });
  }, [router]);

  const handleComplete = () => {
    const goalText = selectedGoal !== null ? GOALS[selectedGoal].title : "";
    localStorage.setItem("mindloop_name", name.trim());
    localStorage.setItem("mindloop_goal", goalText);
    localStorage.setItem("mindloop_email", email);
    localStorage.setItem("mindloop_onboarding_complete", "true");
    // Set cookie so proxy.ts can enforce the gate server-side
    document.cookie = "mindloop_onboarding_complete=true; path=/; max-age=31536000; SameSite=Lax";
    // Persist profile to Supabase in background
    saveUserProfile({ name: name.trim(), email, goal: goalText });
    router.push("/home");
  };

  if (!mounted) return null;

  return (
    <div className={styles.container}>
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            className={styles.card}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <div className={styles.logoRow}>
              <Image src="/owlly-icon.png" alt="Mindloop" width={38} height={38} priority />
              <span className={styles.logoName}>MINDLOOP</span>
            </div>

            <div className={styles.progressRow}>
              <span className={styles.dotFilled} />
              <div className={styles.progressLine} />
              <span className={styles.dotEmpty} />
            </div>
            <p className={styles.stepLabel}>Step 1 of 2</p>

            <h1 className={styles.heading}>Welcome to Mindloop</h1>
            <p className={styles.subtext}>Let&apos;s set up your profile</p>

            <div className={styles.fields}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Your name</label>
                <input
                  className={styles.input}
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Full name"
                  autoFocus
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Email <span className={styles.readonlyNote}>(from Google — cannot be changed)</span></label>
                <input
                  className={`${styles.input} ${styles.inputMuted}`}
                  type="email"
                  value={email}
                  readOnly
                  tabIndex={-1}
                />
              </div>
            </div>

            <button
              className={styles.primaryBtn}
              disabled={!name.trim()}
              onClick={() => setStep(2)}
            >
              Continue →
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            className={styles.card}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <div className={styles.logoRow}>
              <Image src="/owlly-icon.png" alt="Mindloop" width={38} height={38} priority />
              <span className={styles.logoName}>MINDLOOP</span>
            </div>

            <div className={styles.progressRow}>
              <span className={styles.dotFilled} />
              <div className={styles.progressLineFilled} />
              <span className={styles.dotFilled} />
            </div>
            <p className={styles.stepLabel}>Step 2 of 2</p>

            <h1 className={styles.heading}>What&apos;s your goal?</h1>
            <p className={styles.subtext}>This helps us personalise your experience</p>

            <div className={styles.goalList}>
              {GOALS.map((goal, i) => (
                <button
                  key={i}
                  className={`${styles.goalCard} ${selectedGoal === i ? styles.goalCardSelected : ""}`}
                  onClick={() => setSelectedGoal(i)}
                >
                  <span className={styles.goalEmoji}>{goal.icon}</span>
                  <div className={styles.goalText}>
                    <p className={styles.goalTitle}>{goal.title}</p>
                    <p className={styles.goalDesc}>{goal.description}</p>
                  </div>
                  {selectedGoal === i && <span className={styles.goalCheck}><Check size={16} /></span>}
                </button>
              ))}
            </div>

            <button
              className={styles.primaryBtn}
              disabled={selectedGoal === null}
              onClick={handleComplete}
            >
              Get Started →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
