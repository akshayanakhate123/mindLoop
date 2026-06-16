"use client";

import { motion } from "framer-motion";
import { Target, CalendarCheck, Trophy } from "lucide-react";
import styles from "./hero.module.css";

interface HeroBannerProps {
  name: string;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Hey, night owl";
}

export function HeroBanner({ name }: HeroBannerProps) {
  const firstName = name ? name.split(" ")[0] : null;

  return (
    <div className={styles.hero} role="banner" aria-label="Learning journey overview">
      {/* Background decorations */}
      <div className={styles.glow1} aria-hidden="true" />
      <div className={styles.glow2} aria-hidden="true" />
      <div className={styles.glow3} aria-hidden="true" />
      <div className={styles.dotGrid} aria-hidden="true" />

      {/* Left section */}
      <motion.div
        className={styles.left}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className={styles.greeting}>
          {getGreeting()}{firstName ? (
            <>{", "}<span className={styles.greetName}>{firstName}!</span></>
          ) : "!"}
        </p>
        <p className={styles.greetSub}>
          Consistency builds clarity. You&apos;re doing great.
        </p>
        <h2 className={styles.headline}>
          Master Learning<br />
          Through{" "}
          <span className={styles.accent}>Daily Practice</span>
        </h2>
        <p className={styles.desc}>
          Build clarity through consistent problem solving,
          AI-powered feedback and daily improvement.
        </p>
      </motion.div>

      {/* Right section — journey visualization */}
      <div
        className={styles.right}
        aria-label="Learning journey: Pick a Track, Daily Challenge, Level Up"
      >
        {/* Dashed curved path — drawn with SVG, preserveAspectRatio none so x/y
            coordinates map 1:1 to percentage positions of the milestones below */}
        <svg
          className={styles.pathSvg}
          viewBox="0 0 500 200"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <motion.path
            d="M 60 114 C 60 10 400 140 400 36"
            stroke="#A78BFA"
            strokeWidth="2.5"
            strokeDasharray="7 6"
            strokeLinecap="round"
            fill="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          />
        </svg>

        {/* Milestone 1 — Pick a Track */}
        <motion.div
          className={`${styles.milestone} ${styles.ms1}`}
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ scale: 1.05 }}
          tabIndex={0}
          aria-label="Step 1: Pick a Track — Choose a domain"
        >
          <div className={styles.msCircle} style={{ background: "#F3EEFF" }}>
            <Target size={28} color="#7C3AED" strokeWidth={2} aria-hidden="true" />
            <span className={styles.badge} style={{ background: "#7C3AED" }} aria-hidden="true">
              1
            </span>
          </div>
          <p className={styles.msTitle}>Pick a Track</p>
          <p className={styles.msSub}>Choose a domain</p>
        </motion.div>

        {/* Milestone 2 — Daily Challenge */}
        <motion.div
          className={`${styles.milestone} ${styles.ms2}`}
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          whileHover={{ scale: 1.05 }}
          tabIndex={0}
          aria-label="Step 2: Daily Challenge — Practice thinking"
        >
          <div className={styles.msCircle} style={{ background: "#ECFDF5" }}>
            <CalendarCheck size={28} color="#10B981" strokeWidth={2} aria-hidden="true" />
            <span className={styles.badge} style={{ background: "#10B981" }} aria-hidden="true">
              2
            </span>
          </div>
          <p className={styles.msTitle}>Daily Challenge</p>
          <p className={styles.msSub}>Practice thinking</p>
        </motion.div>

        {/* Milestone 3 — Level Up */}
        <motion.div
          className={`${styles.milestone} ${styles.ms3}`}
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          whileHover={{ scale: 1.05 }}
          tabIndex={0}
          aria-label="Step 3: Level Up — Improve with AI"
        >
          <div className={styles.msCircle} style={{ background: "#FFFBEB" }}>
            <Trophy size={28} color="#F59E0B" strokeWidth={2} aria-hidden="true" />
            <span className={styles.badge} style={{ background: "#F59E0B" }} aria-hidden="true">
              3
            </span>
          </div>
          <p className={styles.msTitle}>Level Up</p>
          <p className={styles.msSub}>Improve with AI</p>
        </motion.div>
      </div>
    </div>
  );
}
