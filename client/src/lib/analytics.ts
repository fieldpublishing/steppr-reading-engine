/** Device-local analytics calculations derived only from Steppr IndexedDB records. */
import { listLocalDocuments, listReadingSessions, type LocalDocument, type ReadingSession } from "@/lib/localStore";

export type WeeklyVolume = { label: string; date: string; words: number };
export type MonthlyPace = { label: string; key: string; wpm: number };

export type AnalyticsSnapshot = {
  wordsRead: number;
  activeDays: number;
  focusSeconds: number;
  averageWpm: number;
  weeklyVolume: WeeklyVolume[];
  monthlyPace: MonthlyPace[];
  remainingWords: number;
  finishSeconds: number;
  documents: LocalDocument[];
  sessions: ReadingSession[];
};

const dayKey = (value: number) => new Date(value).toLocaleDateString("en-CA");
const monthKey = (value: number) => `${new Date(value).getFullYear()}-${String(new Date(value).getMonth() + 1).padStart(2, "0")}`;

const getWeekStart = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  return date;
};

const recentMonths = (count = 6) => Array.from({ length: count }, (_, index) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - (count - 1 - index));
  return date;
});

export const formatFocusTime = (seconds: number) => {
  const minutes = Math.max(0, Math.round(seconds / 60));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
};

export const formatFinishEstimate = (seconds: number) => {
  const minutes = Math.max(0, Math.ceil(seconds / 60));
  if (!minutes) return "No unread documents";
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`;
};

export async function getAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  const [documents, sessions] = await Promise.all([listLocalDocuments(), listReadingSessions()]);
  const completed = sessions.filter((session) => Boolean(session.completedAt));
  const wordsRead = completed.reduce((total, session) => total + session.wordsRead, 0);
  const focusSeconds = completed.reduce((total, session) => total + Math.max(0, ((session.completedAt ?? session.startedAt) - session.startedAt) / 1000), 0);
  const averageWpm = wordsRead ? Math.round(completed.reduce((total, session) => total + session.peakWpm * session.wordsRead, 0) / wordsRead) : 0;
  const weekStart = getWeekStart();
  const weekDays = Array.from({ length: 7 }, (_, index) => { const day = new Date(weekStart); day.setDate(weekStart.getDate() + index); return day; });
  const weeklyVolume = weekDays.map((day) => {
    const date = dayKey(day.getTime());
    return { label: day.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(), date, words: completed.filter((session) => dayKey(session.completedAt ?? session.startedAt) === date).reduce((total, session) => total + session.wordsRead, 0) };
  });
  const monthlyPace = recentMonths().map((month) => {
    const key = monthKey(month.getTime());
    const monthSessions = completed.filter((session) => monthKey(session.completedAt ?? session.startedAt) === key);
    const monthWords = monthSessions.reduce((total, session) => total + session.wordsRead, 0);
    return { key, label: month.toLocaleDateString("en-US", { month: "short" }).toUpperCase(), wpm: monthWords ? Math.round(monthSessions.reduce((total, session) => total + session.peakWpm * session.wordsRead, 0) / monthWords) : 0 };
  });
  const activeDays = new Set(completed.filter((session) => (session.completedAt ?? session.startedAt) >= weekStart.getTime()).map((session) => dayKey(session.completedAt ?? session.startedAt))).size;
  const remainingWords = documents.filter((document) => document.parseStatus === "ready").reduce((total, document) => total + Math.round(document.wordCount * (1 - document.progress / 100)), 0);
  return { wordsRead, activeDays, focusSeconds, averageWpm, weeklyVolume, monthlyPace, remainingWords, finishSeconds: averageWpm ? remainingWords / averageWpm * 60 : 0, documents, sessions };
}
