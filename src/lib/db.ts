"use client";

/**
 * db.ts — Single source of truth for all Supabase reads and writes.
 *
 * Pattern:
 *  - Reads:  localStorage first; if empty, fetch from Supabase, populate localStorage, return.
 *  - Writes: localStorage immediately (synchronous); Supabase fire-and-forget in background.
 */

import { createBrowserClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Session {
  date: string;
  question: string;
  accuracyScore: number;
  structureScore: number;
  hintUsed: boolean;
  category: string;
  domain: string;
  interviewReadiness: string;
  finalAnswer: string;
  correctAnswer: string;
  difficulty: string;
  dayIndex: number | null;
  totalDays: number | null;
  status?: "submitted" | "forfeited" | "removed";
}

export interface ActiveStreak {
  id: string;
  category: string;
  domain: string;
  totalDays: number;
  currentDay: number;
  completedDates: string[];
  startDate: string;
  lastActivityDate: string | null;
  status: "active" | "completed" | "forfeited" | "expired";
  questions: any[];
  todayScore?: { accuracyScore: number; structureScore: number; clarificationCount?: number } | null;
}

export interface Bookmark {
  id: string;
  question: string;
  domain: string;
  difficulty: string;
  category: string;
  addedDate: string;
  questionId: string;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function supabase() {
  return createBrowserClient();
}

// ── User identity ─────────────────────────────────────────────────────────────

export async function getUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase().auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function loadUserProfile(): Promise<{ name: string; email: string; goal: string; bestStreak: number } | null> {
  const name      = localStorage.getItem("mindloop_name");
  const email     = localStorage.getItem("mindloop_email");
  const goal      = localStorage.getItem("mindloop_goal");
  const bestStr   = localStorage.getItem("mindloop_best_streak");

  // All four present → serve from cache
  if (name !== null && email !== null && goal !== null && bestStr !== null) {
    return { name, email, goal, bestStreak: parseInt(bestStr) || 0 };
  }

  try {
    const userId = await getUserId();
    if (!userId) return null;
    const { data } = await supabase()
      .from("profiles")
      .select("name, email, goal, best_streak")
      .eq("id", userId)
      .single();
    if (!data) return null;
    if (data.name  != null) localStorage.setItem("mindloop_name",         data.name);
    if (data.email != null) localStorage.setItem("mindloop_email",        data.email);
    if (data.goal  != null) localStorage.setItem("mindloop_goal",         data.goal);
    if (data.best_streak != null) localStorage.setItem("mindloop_best_streak", String(data.best_streak));
    return {
      name:        data.name        || "",
      email:       data.email       || "",
      goal:        data.goal        || "",
      bestStreak:  data.best_streak || 0,
    };
  } catch {
    return null;
  }
}

export async function saveUserProfile(profile: {
  name?: string; email?: string; goal?: string; bestStreak?: number;
}): Promise<void> {
  // Write to localStorage immediately
  if (profile.name      !== undefined) localStorage.setItem("mindloop_name",         profile.name);
  if (profile.email     !== undefined) localStorage.setItem("mindloop_email",        profile.email);
  if (profile.goal      !== undefined) localStorage.setItem("mindloop_goal",         profile.goal);
  if (profile.bestStreak !== undefined) localStorage.setItem("mindloop_best_streak", String(profile.bestStreak));

  // Upsert to Supabase in background
  getUserId().then(userId => {
    if (!userId) return;
    const row: Record<string, any> = { id: userId, updated_at: new Date().toISOString() };
    if (profile.name      !== undefined) row.name        = profile.name;
    if (profile.email     !== undefined) row.email       = profile.email;
    if (profile.goal      !== undefined) row.goal        = profile.goal;
    if (profile.bestStreak !== undefined) row.best_streak = profile.bestStreak;
    supabase().from("profiles").upsert(row).then(() => {}, () => {});
  }).catch(() => {});
}

// ── Sessions ──────────────────────────────────────────────────────────────────

function sessionToRow(s: Session, userId: string): Record<string, any> {
  return {
    user_id:           userId,
    date:              s.date,
    question:          s.question,
    accuracy_score:    s.accuracyScore,
    structure_score:   s.structureScore,
    hint_used:         s.hintUsed,
    category:          s.category,
    domain:            s.domain,
    interview_readiness: s.interviewReadiness,
    final_answer:      s.finalAnswer,
    correct_answer:    s.correctAnswer,
    difficulty:        s.difficulty,
    day_index:         s.dayIndex,
    total_days:        s.totalDays,
    status:            s.status || "submitted",
  };
}

function rowToSession(row: Record<string, any>): Session {
  return {
    date:               row.date,
    question:           row.question,
    accuracyScore:      row.accuracy_score,
    structureScore:     row.structure_score,
    hintUsed:           row.hint_used,
    category:           row.category,
    domain:             row.domain,
    interviewReadiness: row.interview_readiness,
    finalAnswer:        row.final_answer  || "",
    correctAnswer:      row.correct_answer || "",
    difficulty:         row.difficulty,
    dayIndex:           row.day_index,
    totalDays:          row.total_days,
    status:             row.status,
  };
}

export async function loadSessions(): Promise<Session[]> {
  const raw = localStorage.getItem("mindloop_sessions");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* fall through to Supabase */ }
  }

  try {
    const userId = await getUserId();
    if (!userId) return [];
    const { data } = await supabase()
      .from("sessions")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: true });
    if (!data?.length) return [];
    const sessions = data.map(rowToSession);
    localStorage.setItem("mindloop_sessions", JSON.stringify(sessions));
    return sessions;
  } catch {
    return [];
  }
}

export async function saveSessions(sessions: Session[]): Promise<void> {
  localStorage.setItem("mindloop_sessions", JSON.stringify(sessions));

  // Delete-then-insert in background (no stable client-side id for upsert)
  getUserId().then(async userId => {
    if (!userId) return;
    try {
      await supabase().from("sessions").delete().eq("user_id", userId);
      if (sessions.length > 0) {
        await supabase().from("sessions").insert(sessions.map(s => sessionToRow(s, userId)));
      }
    } catch { /* non-fatal */ }
  }).catch(() => {});
}

export async function saveSession(session: Session): Promise<void> {
  // Merge into localStorage array
  const raw = localStorage.getItem("mindloop_sessions");
  let all: Session[] = [];
  try { all = raw ? JSON.parse(raw) : []; } catch { all = []; }

  const todayStr = new Date().toLocaleDateString("sv");
  const idx = all.findIndex(s => s.question === session.question && new Date(s.date).toLocaleDateString("sv") === todayStr);
  if (idx >= 0) { all[idx] = session; } else { all.push(session); }
  localStorage.setItem("mindloop_sessions", JSON.stringify(all));

  // Insert to Supabase in background
  getUserId().then(async userId => {
    if (!userId) return;
    try {
      await supabase().from("sessions").insert(sessionToRow(session, userId));
    } catch { /* non-fatal — duplicate on retry is acceptable */ }
  }).catch(() => {});
}

// ── Streaks ───────────────────────────────────────────────────────────────────

function streakToRow(s: ActiveStreak, userId: string): Record<string, any> {
  return {
    id:                 s.id,
    user_id:            userId,
    category:           s.category,
    domain:             s.domain,
    total_days:         s.totalDays,
    current_day:        s.currentDay,
    completed_dates:    s.completedDates,
    start_date:         s.startDate,
    last_activity_date: s.lastActivityDate,
    status:             s.status,
    questions:          s.questions,
    today_score:        s.todayScore ?? null,
    updated_at:         new Date().toISOString(),
  };
}

function rowToStreak(row: Record<string, any>): ActiveStreak {
  return {
    id:               row.id,
    category:         row.category,
    domain:           row.domain,
    totalDays:        row.total_days,
    currentDay:       row.current_day,
    completedDates:   row.completed_dates || [],
    startDate:        row.start_date,
    lastActivityDate: row.last_activity_date,
    status:           row.status,
    questions:        row.questions || [],
    todayScore:       row.today_score,
  };
}

export async function loadStreaks(): Promise<ActiveStreak[]> {
  const raw = localStorage.getItem("mindloop_active_streaks");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* fall through */ }
  }

  try {
    const userId = await getUserId();
    if (!userId) return [];
    const { data } = await supabase()
      .from("streaks")
      .select("*")
      .eq("user_id", userId);
    if (!data?.length) return [];
    const streaks = data.map(rowToStreak);
    localStorage.setItem("mindloop_active_streaks", JSON.stringify(streaks));
    return streaks;
  } catch {
    return [];
  }
}

export async function saveStreaks(streaks: ActiveStreak[]): Promise<void> {
  localStorage.setItem("mindloop_active_streaks", JSON.stringify(streaks));

  // Upsert by (id, user_id) primary key
  getUserId().then(async userId => {
    if (!userId) return;
    try {
      if (streaks.length > 0) {
        await supabase()
          .from("streaks")
          .upsert(streaks.map(s => streakToRow(s, userId)), { onConflict: "id,user_id" });
      }
    } catch { /* non-fatal */ }
  }).catch(() => {});
}

// ── Completed Days ────────────────────────────────────────────────────────────

export async function loadCompletedDays(): Promise<string[]> {
  const raw = localStorage.getItem("mindloop_completed_days");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* fall through */ }
  }

  try {
    const userId = await getUserId();
    if (!userId) return [];
    const { data } = await supabase()
      .from("completed_days")
      .select("day_date")
      .eq("user_id", userId);
    if (!data?.length) return [];
    const days = data.map((d: any) => d.day_date as string);
    localStorage.setItem("mindloop_completed_days", JSON.stringify(days));
    return days;
  } catch {
    return [];
  }
}

export async function saveCompletedDay(day: string): Promise<void> {
  const raw = localStorage.getItem("mindloop_completed_days");
  let days: string[] = [];
  try { days = raw ? JSON.parse(raw) : []; } catch { days = []; }
  if (!days.includes(day)) {
    days.push(day);
    localStorage.setItem("mindloop_completed_days", JSON.stringify(days));
  }

  // Insert in background — ignore duplicate errors (UNIQUE constraint)
  getUserId().then(async userId => {
    if (!userId) return;
    try {
      await supabase().from("completed_days").insert({ user_id: userId, day_date: day });
    } catch { /* duplicate is expected and safe to ignore */ }
  }).catch(() => {});
}

// ── Best Streak ───────────────────────────────────────────────────────────────

export async function loadBestStreak(): Promise<number> {
  const raw = localStorage.getItem("mindloop_best_streak");
  if (raw !== null) return parseInt(raw) || 0;

  try {
    const userId = await getUserId();
    if (!userId) return 0;
    const { data } = await supabase()
      .from("profiles")
      .select("best_streak")
      .eq("id", userId)
      .single();
    const val = data?.best_streak || 0;
    localStorage.setItem("mindloop_best_streak", String(val));
    return val;
  } catch {
    return 0;
  }
}

export async function saveBestStreak(value: number): Promise<void> {
  localStorage.setItem("mindloop_best_streak", String(value));

  getUserId().then(async userId => {
    if (!userId) return;
    try {
      await supabase()
        .from("profiles")
        .upsert({ id: userId, best_streak: value, updated_at: new Date().toISOString() });
    } catch { /* non-fatal */ }
  }).catch(() => {});
}

// ── Bookmarks ─────────────────────────────────────────────────────────────────

function bookmarkToRow(b: Bookmark, userId: string): Record<string, any> {
  return {
    id:          b.id,
    user_id:     userId,
    question:    b.question,
    domain:      b.domain,
    difficulty:  b.difficulty,
    category:    b.category,
    question_id: b.questionId,
    added_date:  b.addedDate,
  };
}

function rowToBookmark(row: Record<string, any>): Bookmark {
  return {
    id:          row.id,
    question:    row.question,
    domain:      row.domain,
    difficulty:  row.difficulty,
    category:    row.category,
    addedDate:   row.added_date,
    questionId:  row.question_id || "",
  };
}

export async function loadBookmarks(): Promise<Bookmark[]> {
  const raw = localStorage.getItem("mindloop_bookmarks");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* fall through */ }
  }

  try {
    const userId = await getUserId();
    if (!userId) return [];
    const { data } = await supabase()
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId);
    if (!data?.length) return [];
    const bookmarks = data.map(rowToBookmark);
    localStorage.setItem("mindloop_bookmarks", JSON.stringify(bookmarks));
    return bookmarks;
  } catch {
    return [];
  }
}

export async function saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
  localStorage.setItem("mindloop_bookmarks", JSON.stringify(bookmarks));

  // Delete-then-insert in background
  getUserId().then(async userId => {
    if (!userId) return;
    try {
      await supabase().from("bookmarks").delete().eq("user_id", userId);
      if (bookmarks.length > 0) {
        await supabase().from("bookmarks").insert(bookmarks.map(b => bookmarkToRow(b, userId)));
      }
    } catch { /* non-fatal */ }
  }).catch(() => {});
}

export async function deleteBookmark(id: string): Promise<void> {
  const raw = localStorage.getItem("mindloop_bookmarks");
  let bookmarks: Bookmark[] = [];
  try { bookmarks = raw ? JSON.parse(raw) : []; } catch { bookmarks = []; }
  const updated = bookmarks.filter(b => b.id !== id);
  localStorage.setItem("mindloop_bookmarks", JSON.stringify(updated));

  getUserId().then(async userId => {
    if (!userId) return;
    try {
      await supabase().from("bookmarks").delete().eq("id", id).eq("user_id", userId);
    } catch { /* non-fatal */ }
  }).catch(() => {});
}
