"use client";

import { useState, useEffect, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import styles from "./bookmarks.module.css";
import { loadBookmarks, saveBookmarks, deleteBookmark } from "@/lib/db";
import { DollarSign, Package, Megaphone, Users, Lightbulb } from "lucide-react";

interface Bookmark {
  id: string;
  question: string;
  domain: string;
  difficulty: string;
  category: string;
  addedDate: string;
  questionId: string;
}

const DOMAIN_STYLE: Record<string, { bg: string; icon: ReactElement; color: string }> = {
  finance:    { bg: "#EEF2FF", icon: <DollarSign size={14} />, color: "#3730A3" },
  product:    { bg: "#F0FDF4", icon: <Package size={14} />, color: "#166534" },
  marketing:  { bg: "#FFF7ED", icon: <Megaphone size={14} />, color: "#9A3412" },
  sales:      { bg: "#FDF4FF", icon: <Users size={14} />, color: "#7E22CE" },
  generalist: { bg: "#F5F3FF", icon: <Lightbulb size={14} />, color: "#5B21B6" },
};

function formatAddedDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function DomainTag({ domain }: { domain: string }) {
  const key = domain.toLowerCase();
  const style = DOMAIN_STYLE[key] ?? { bg: "#F3F4F6", icon: <Lightbulb size={14} />, color: "#374151" };
  return (
    <span className={styles.domainTag} style={{ background: style.bg, color: style.color }}>
      {style.icon} {domain.charAt(0).toUpperCase() + domain.slice(1)}
    </span>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const cls =
    difficulty === "Hard" ? styles.diffHard
    : difficulty === "Easy" ? styles.diffEasy
    : styles.diffMedium;
  return <span className={`${styles.diffBadge} ${cls}`}>{difficulty || "Medium"}</span>;
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    loadBookmarks().then(setBookmarks).catch(() => {});
  }, []);

  const removeBookmark = (question: string) => {
    const bm = bookmarks.find(b => b.question === question);
    if (bm) {
      deleteBookmark(bm.id); // writes localStorage + Supabase delete in background
      setBookmarks(prev => prev.filter(b => b.question !== question));
    }
  };

  const clearAll = () => {
    if (!window.confirm(`Remove all ${bookmarks.length} bookmarks?`)) return;
    setBookmarks([]);
    saveBookmarks([]); // writes localStorage + Supabase delete-all in background
  };

  const practiceNow = (bookmark: Bookmark) => {
    const practiceQ = {
      question: bookmark.question,
      category: bookmark.category,
      domain: bookmark.domain,
      difficulty: bookmark.difficulty,
      id: bookmark.questionId,
    };
    localStorage.setItem("mindloop_questions", JSON.stringify([practiceQ]));
    router.push("/question");
  };

  if (!mounted) return null;

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <motion.div className={styles.pageHeader} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 className={styles.pageTitle}>Bookmarks</h1>
          <p className={styles.pageSubtitle}>Questions saved for focused practice.</p>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.countBadge}>{bookmarks.length} saved</span>
          {bookmarks.length > 0 && (
            <button className={styles.clearBtn} onClick={clearAll}>Clear All</button>
          )}
        </div>
      </motion.div>

      {/* ── Empty state ── */}
      {bookmarks.length === 0 && (
        <motion.div
          className={styles.emptyState}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className={styles.emptyIcon}><img src="/owlly-icon.png" alt="" style={{ height: "64px", width: "auto", display: "block" }} /></div>
          <h2 className={styles.emptyTitle}>No bookmarks yet</h2>
          <p className={styles.emptySub}>
            Tap the bookmark icon on any challenge or history card to save it here.
          </p>
        </motion.div>
      )}

      {/* ── Bookmark cards ── */}
      {bookmarks.length > 0 && (
        <div className={styles.cardList}>
          {bookmarks.map((bm, i) => (
            <motion.div
              key={bm.id + i}
              className={styles.card}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 + i * 0.05 }}
            >
              {/* ── Card header ── */}
              <div className={styles.cardHeader}>
                <DomainTag domain={bm.domain} />
                <DifficultyBadge difficulty={bm.difficulty} />
              </div>

              {/* ── Question ── */}
              <p className={styles.questionText}>{bm.question}</p>

              {/* ── Date ── */}
              <p className={styles.addedDate}>Added {formatAddedDate(bm.addedDate)}</p>

              <div className={styles.divider} />

              {/* ── Actions ── */}
              <div className={styles.actions}>
                <button className={styles.practiceBtn} onClick={() => practiceNow(bm)}>
                  Practice Now →
                </button>
                <button className={styles.removeBtn} onClick={() => removeBookmark(bm.question)}>
                  Remove
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
