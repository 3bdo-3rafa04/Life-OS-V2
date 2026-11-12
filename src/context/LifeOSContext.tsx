import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  auth,
  db,
  googleProvider,
  doc,
  collection,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  handleFirestoreError,
  OperationType,
} from '../firebase.ts';
import {
  UserProfile,
  TaskItem,
  CalendarEventItem,
  StudyModuleItem,
  StudyItemRecord,
  HealthLogRecord,
  FinanceRecordItem,
  KnowledgeItemRecord,
  GoalHabitRecord,
  AiActionLogRecord,
  DailyReviewRecord,
} from '../types.ts';

interface LifeOSContextValue {
  user: User | null;
  authReady: boolean;
  profile: UserProfile | null;
  tasks: TaskItem[];
  events: CalendarEventItem[];
  studyModules: StudyModuleItem[];
  studyItems: StudyItemRecord[];
  healthLogs: HealthLogRecord[];
  financeRecords: FinanceRecordItem[];
  knowledgeItems: KnowledgeItemRecord[];
  goalsHabits: GoalHabitRecord[];
  aiLogs: AiActionLogRecord[];
  dailyReviews: DailyReviewRecord[];
  todayDate: string;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  updateProfileSettings: (partial: Partial<UserProfile>) => Promise<void>;
  awardXpAndCoins: (xpDelta: number, coinsDelta: number) => Promise<void>;
  // Cross-module CRUD actions
  createTask: (data: Omit<TaskItem, 'id' | 'ownerId'>) => Promise<void>;
  updateTask: (
    task: TaskItem,
    partial: Partial<Omit<TaskItem, 'id' | 'ownerId'>>
  ) => Promise<void>;
  updateTaskStatus: (
    task: TaskItem,
    status: TaskItem['status'],
    statusReason?: string
  ) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  createCalendarEvent: (data: Omit<CalendarEventItem, 'id' | 'ownerId'>) => Promise<void>;
  deleteCalendarEvent: (eventId: string) => Promise<void>;
  createStudyModule: (data: Omit<StudyModuleItem, 'id' | 'ownerId'>) => Promise<string>;
  deleteStudyModule: (moduleId: string) => Promise<void>;
  createStudyItem: (data: Omit<StudyItemRecord, 'id' | 'ownerId'>) => Promise<void>;
  deleteStudyItem: (itemId: string) => Promise<void>;
  recordStudyFeedback: (
    item: StudyItemRecord,
    confidenceRating: number,
    durationMinutes: number
  ) => Promise<void>;
  createHealthLog: (
    data: Omit<HealthLogRecord, 'id' | 'ownerId'>,
    scheduleOnCalendar?: boolean
  ) => Promise<void>;
  deleteHealthLog: (logId: string) => Promise<void>;
  createFinanceRecord: (data: Omit<FinanceRecordItem, 'id' | 'ownerId'>) => Promise<void>;
  deleteFinanceRecord: (recordId: string) => Promise<void>;
  createKnowledgeItem: (data: Omit<KnowledgeItemRecord, 'id' | 'ownerId'>) => Promise<void>;
  updateKnowledgeProgress: (
    item: KnowledgeItemRecord,
    newCurrent: number,
    takeaways?: string
  ) => Promise<void>;
  deleteKnowledgeItem: (itemId: string) => Promise<void>;
  createGoalHabit: (data: Omit<GoalHabitRecord, 'id' | 'ownerId'>) => Promise<void>;
  toggleHabitOrGoalCompletion: (record: GoalHabitRecord) => Promise<void>;
  deleteGoalHabit: (recordId: string) => Promise<void>;
  redeemReward: (reward: GoalHabitRecord) => Promise<void>;
  logAiAction: (data: Omit<AiActionLogRecord, 'id' | 'ownerId'>) => Promise<void>;
  resolveAiProposal: (
    log: AiActionLogRecord,
    decision: 'approved' | 'rejected' | 'undone'
  ) => Promise<void>;
  deleteAiLog: (logId: string) => Promise<void>;
  saveDailyReview: (data: Omit<DailyReviewRecord, 'id' | 'ownerId'>) => Promise<void>;
  clearAllWorkspaceData: () => Promise<void>;
}

const LifeOSContext = createContext<LifeOSContextValue | undefined>(undefined);

const sanitizeString = (val: string | undefined, maxLen: number, fallback = ''): string => {
  const s = (val ?? fallback).trim();
  return s.slice(0, maxLen);
};

// Titles of previously seeded sample records to automatically purge if present
const LEGACY_SAMPLE_TITLES = new Set([
  'Distributed Systems & Consensus',
  'Lecture 4: Raft Leader Election & Log Replication',
  'Lecture 5: Byzantine Fault Tolerance & PBFT',
  'Fajr Prayer & Morning Reflection',
  'CS304 Distributed Systems Lecture',
  'Dhuhr Prayer Anchor',
  'Asr Prayer Anchor',
  'Upper Body Strength Hypertrophy',
  'Complete active recall revision for CS304 Raft Consensus',
  'Reconcile monthly grocery & study material budget',
  'Lab server SSH key rotation (Waiting on DevOps team)',
  'Morning Baseline Check-in',
  'Upper Body Push / Pull Session',
  'Post-Lecture Salmon, Quinoa & Avocado Bowl',
  'Research Assistantship Stipend',
  'Whole Foods Weekly Groceries',
  'Monthly Groceries & Nutrition Cap',
  'Emergency & Post-Grad Relocation Fund',
  'Designing Data-Intensive Applications',
  'Huberman Lab: Optimizing Deep Work & Ultradian Cycles',
  'Achieve First-Class Honours in Computer Science Term',
  '90-Minute Morning Deep Study Block Before Checking Messages',
  'Weekly Consistency Quest: 4 Study Revisions + 3 Strength Workouts',
  'Guilt-Free Specialty Coffee & Sci-Fi Reading Evening',
  'Propose Rebalancing Afternoon Study Block Around Asr Prayer',
  'Cornea & external eye',
  'Revision: Glaucoma pharmacology',
  'Lens & cataract — revision + recall',
]);

export const LifeOSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [studyModules, setStudyModules] = useState<StudyModuleItem[]>([]);
  const [studyItems, setStudyItems] = useState<StudyItemRecord[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLogRecord[]>([]);
  const [financeRecords, setFinanceRecords] = useState<FinanceRecordItem[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItemRecord[]>([]);
  const [goalsHabits, setGoalsHabits] = useState<GoalHabitRecord[]>([]);
  const [aiLogs, setAiLogs] = useState<AiActionLogRecord[]>([]);
  const [dailyReviews, setDailyReviews] = useState<DailyReviewRecord[]>([]);

  const purgedRef = useRef(false);
  const todayDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currUser) => {
      setUser(currUser);
      setAuthReady(true);
      if (currUser) {
        const userRef = doc(db, 'users', currUser.uid);
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            const initialProfile = {
              uid: currUser.uid,
              displayName: sanitizeString(currUser.displayName || 'Life OS User', 100, 'User'),
              currency: 'EGP',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
              city: 'Cairo',
              prayerMethod: 'Egypt' as const,
              prayerBufferMinutes: 15,
              xp: 0,
              level: 1,
              coins: 0,
              streakDays: 0,
              calorieTarget: 2350,
              proteinTargetGrams: 165,
              waterTargetMl: 3000,
              waterLoggedTodayMl: 0,
              aiRoutineAutoApprove: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            await setDoc(userRef, initialProfile);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${currUser.uid}`);
        }
      } else {
        setProfile(null);
        setTasks([]);
        setEvents([]);
        setStudyModules([]);
        setStudyItems([]);
        setHealthLogs([]);
        setFinanceRecords([]);
        setKnowledgeItems([]);
        setGoalsHabits([]);
        setAiLogs([]);
        setDailyReviews([]);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    const uid = user.uid;

    const unsubProfile = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
    );

    const bindCollection = <T extends { id: string }>(
      colName: string,
      setter: React.Dispatch<React.SetStateAction<T[]>>
    ) => {
      const q = query(collection(db, colName), where('ownerId', '==', uid));
      return onSnapshot(
        q,
        (snap) => {
          const list: T[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...d.data() } as unknown as T));
          setter(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, colName)
      );
    };

    const unsubs = [
      unsubProfile,
      bindCollection<TaskItem>('tasks', setTasks),
      bindCollection<CalendarEventItem>('calendar_events', setEvents),
      bindCollection<StudyModuleItem>('study_modules', setStudyModules),
      bindCollection<StudyItemRecord>('study_items', setStudyItems),
      bindCollection<HealthLogRecord>('health_logs', setHealthLogs),
      bindCollection<FinanceRecordItem>('finance_records', setFinanceRecords),
      bindCollection<KnowledgeItemRecord>('knowledge_items', setKnowledgeItems),
      bindCollection<GoalHabitRecord>('goals_habits', setGoalsHabits),
      bindCollection<AiActionLogRecord>('ai_action_logs', setAiLogs),
      bindCollection<DailyReviewRecord>('daily_reviews', setDailyReviews),
    ];

    return () => unsubs.forEach((u) => u());
  }, [authReady, user]);

  // Automatically remove any legacy seeded sample records from Firestore once loaded
  useEffect(() => {
    if (!user || purgedRef.current) return;
    const hasSample =
      tasks.some((t) => LEGACY_SAMPLE_TITLES.has(t.title)) ||
      events.some((e) => LEGACY_SAMPLE_TITLES.has(e.title)) ||
      studyModules.some((m) => LEGACY_SAMPLE_TITLES.has(m.title) || m.code === 'CS304') ||
      studyItems.some((s) => LEGACY_SAMPLE_TITLES.has(s.title) || s.moduleCode === 'CS304') ||
      healthLogs.some((h) => LEGACY_SAMPLE_TITLES.has(h.title)) ||
      financeRecords.some((f) => LEGACY_SAMPLE_TITLES.has(f.title)) ||
      knowledgeItems.some((k) => LEGACY_SAMPLE_TITLES.has(k.title)) ||
      goalsHabits.some((g) => LEGACY_SAMPLE_TITLES.has(g.title)) ||
      aiLogs.some((a) => LEGACY_SAMPLE_TITLES.has(a.actionTitle));

    if (!hasSample) return;
    purgedRef.current = true;

    const purge = async () => {
      for (const s of studyItems) {
        if (LEGACY_SAMPLE_TITLES.has(s.title) || s.moduleCode === 'CS304') {
          await deleteDoc(doc(db, 'study_items', s.id)).catch(() => {});
        }
      }
      for (const m of studyModules) {
        if (LEGACY_SAMPLE_TITLES.has(m.title) || m.code === 'CS304') {
          await deleteDoc(doc(db, 'study_modules', m.id)).catch(() => {});
        }
      }
      for (const t of tasks) {
        if (LEGACY_SAMPLE_TITLES.has(t.title)) {
          await deleteDoc(doc(db, 'tasks', t.id)).catch(() => {});
        }
      }
      for (const e of events) {
        if (LEGACY_SAMPLE_TITLES.has(e.title) || e.title.includes('CS304')) {
          await deleteDoc(doc(db, 'calendar_events', e.id)).catch(() => {});
        }
      }
      for (const h of healthLogs) {
        if (LEGACY_SAMPLE_TITLES.has(h.title)) {
          await deleteDoc(doc(db, 'health_logs', h.id)).catch(() => {});
        }
      }
      for (const f of financeRecords) {
        if (LEGACY_SAMPLE_TITLES.has(f.title)) {
          await deleteDoc(doc(db, 'finance_records', f.id)).catch(() => {});
        }
      }
      for (const k of knowledgeItems) {
        if (LEGACY_SAMPLE_TITLES.has(k.title)) {
          await deleteDoc(doc(db, 'knowledge_items', k.id)).catch(() => {});
        }
      }
      for (const g of goalsHabits) {
        if (LEGACY_SAMPLE_TITLES.has(g.title)) {
          await deleteDoc(doc(db, 'goals_habits', g.id)).catch(() => {});
        }
      }
      for (const a of aiLogs) {
        if (LEGACY_SAMPLE_TITLES.has(a.actionTitle)) {
          await deleteDoc(doc(db, 'ai_action_logs', a.id)).catch(() => {});
        }
      }
    };
    purge();
  }, [
    user,
    tasks,
    events,
    studyModules,
    studyItems,
    healthLogs,
    financeRecords,
    knowledgeItems,
    goalsHabits,
    aiLogs,
  ]);

  const signIn = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logOut = async () => {
    await signOut(auth);
  };

  const updateProfileSettings = async (partial: Partial<UserProfile>) => {
    if (!user || !profile) return;
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...partial,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const awardXpAndCoins = async (xpDelta: number, coinsDelta: number) => {
    if (!user || !profile) return;
    const nextXp = Math.max(0, (profile.xp || 0) + xpDelta);
    const nextLevel = Math.max(1, Math.floor(nextXp / 250) + 1);
    const nextCoins = Math.max(0, (profile.coins || 0) + coinsDelta);
    await updateProfileSettings({
      xp: nextXp,
      level: nextLevel,
      coins: nextCoins,
    });
  };

  const createTask = async (data: Omit<TaskItem, 'id' | 'ownerId'>) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        title: sanitizeString(data.title, 200, 'Untitled Task'),
        priority: data.priority,
        status: data.status || 'todo',
        category: data.category || 'personal',
        estimatedMinutes: Math.max(1, Math.min(1440, Math.round(data.estimatedMinutes || 30))),
        dueDate: sanitizeString(data.dueDate, 32, todayDate),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.notes) payload.notes = sanitizeString(data.notes, 2000);
      if (data.statusReason) payload.statusReason = sanitizeString(data.statusReason, 300);
      if (data.scheduledStart) payload.scheduledStart = sanitizeString(data.scheduledStart, 32);
      if (data.linkedGoalId) payload.linkedGoalId = sanitizeString(data.linkedGoalId, 128);
      if (data.linkedModuleId) payload.linkedModuleId = sanitizeString(data.linkedModuleId, 128);
      if (typeof data.isRecurring === 'boolean') payload.isRecurring = data.isRecurring;
      if (data.recurrenceRule) payload.recurrenceRule = sanitizeString(data.recurrenceRule, 64);

      await addDoc(collection(db, 'tasks'), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'tasks');
    }
  };

  const updateTask = async (
    task: TaskItem,
    partial: Partial<Omit<TaskItem, 'id' | 'ownerId'>>
  ) => {
    if (!user) return;
    try {
      const updatePayload: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };
      if (partial.title !== undefined) {
        updatePayload.title = sanitizeString(partial.title, 200, task.title);
      }
      if (partial.notes !== undefined) {
        updatePayload.notes = sanitizeString(partial.notes, 2000);
      }
      if (partial.priority !== undefined) {
        updatePayload.priority = partial.priority;
      }
      if (partial.status !== undefined) {
        updatePayload.status = partial.status;
      }
      if (partial.statusReason !== undefined) {
        updatePayload.statusReason = sanitizeString(partial.statusReason, 300);
      }
      if (partial.category !== undefined) {
        updatePayload.category = partial.category;
      }
      if (partial.estimatedMinutes !== undefined) {
        updatePayload.estimatedMinutes = Math.max(
          1,
          Math.min(1440, Math.round(partial.estimatedMinutes))
        );
      }
      if (partial.actualMinutes !== undefined) {
        updatePayload.actualMinutes = Math.max(
          0,
          Math.min(1440, Math.round(partial.actualMinutes))
        );
      }
      if (partial.dueDate !== undefined) {
        updatePayload.dueDate = sanitizeString(partial.dueDate, 32, todayDate);
      }
      if (partial.scheduledStart !== undefined) {
        updatePayload.scheduledStart = sanitizeString(partial.scheduledStart, 32);
      }
      if (partial.linkedGoalId !== undefined) {
        updatePayload.linkedGoalId = sanitizeString(partial.linkedGoalId, 128);
      }
      if (partial.linkedModuleId !== undefined) {
        updatePayload.linkedModuleId = sanitizeString(partial.linkedModuleId, 128);
      }

      await updateDoc(doc(db, 'tasks', task.id), updatePayload);

      if (partial.status === 'completed' && task.status !== 'completed') {
        const xpGain = task.priority === 'critical' ? 40 : task.priority === 'high' ? 30 : 20;
        await awardXpAndCoins(xpGain, 10);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${task.id}`);
    }
  };

  const updateTaskStatus = async (
    task: TaskItem,
    status: TaskItem['status'],
    statusReason?: string
  ) => {
    await updateTask(task, { status, ...(statusReason !== undefined ? { statusReason } : {}) });
  };

  const deleteTask = async (taskId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tasks/${taskId}`);
    }
  };

  const createCalendarEvent = async (data: Omit<CalendarEventItem, 'id' | 'ownerId'>) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        title: sanitizeString(data.title, 200, 'Scheduled Event'),
        eventType: data.eventType,
        date: sanitizeString(data.date, 16, todayDate),
        startTime: sanitizeString(data.startTime, 10, '09:00'),
        endTime: sanitizeString(data.endTime, 10, '10:00'),
        isProtectedAnchor: Boolean(data.isProtectedAnchor),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.location) payload.location = sanitizeString(data.location, 200);
      if (data.linkedRecordId) payload.linkedRecordId = sanitizeString(data.linkedRecordId, 128);
      await addDoc(collection(db, 'calendar_events'), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'calendar_events');
    }
  };

  const deleteCalendarEvent = async (eventId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'calendar_events', eventId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `calendar_events/${eventId}`);
    }
  };

  const createStudyModule = async (
    data: Omit<StudyModuleItem, 'id' | 'ownerId'>
  ): Promise<string> => {
    if (!user) return '';
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        code: sanitizeString(data.code, 32, 'MOD101'),
        title: sanitizeString(data.title, 200, 'Academic Module'),
        term: sanitizeString(data.term, 64, 'Current Term'),
        examDate: sanitizeString(data.examDate, 32, todayDate),
        totalLectures: Math.max(0, Math.min(500, Math.round(data.totalLectures || 12))),
        completedLectures: Math.max(0, Math.min(500, Math.round(data.completedLectures || 0))),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.targetGrade) payload.targetGrade = sanitizeString(data.targetGrade, 16);
      const ref = await addDoc(collection(db, 'study_modules'), payload);

      await createCalendarEvent({
        title: `Exam: ${data.code} — ${data.title}`,
        eventType: 'exam',
        date: data.examDate || todayDate,
        startTime: '09:00',
        endTime: '12:00',
        location: 'Exam Hall',
        isProtectedAnchor: true,
        linkedRecordId: ref.id,
      });

      return ref.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'study_modules');
      return '';
    }
  };

  const deleteStudyModule = async (moduleId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'study_modules', moduleId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `study_modules/${moduleId}`);
    }
  };

  const createStudyItem = async (data: Omit<StudyItemRecord, 'id' | 'ownerId'>) => {
    if (!user) return;
    try {
      // Ensure parent moduleId exists in study_modules to satisfy Firestore relational rule
      let validModuleId = data.moduleId;
      let validModuleCode = data.moduleCode || 'MOD';

      const existsInState = studyModules.some((m) => m.id === validModuleId);
      if (!existsInState) {
        if (studyModules.length > 0) {
          validModuleId = studyModules[0].id;
          validModuleCode = studyModules[0].code;
        } else {
          const createdId = await createStudyModule({
            code: sanitizeString(data.moduleCode, 32, 'GEN101'),
            title: sanitizeString(data.moduleCode || 'General Study Module', 200),
            term: 'Current Term',
            examDate: todayDate,
            totalLectures: 10,
            completedLectures: 0,
          });
          validModuleId = createdId;
        }
      }

      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        moduleId: sanitizeString(validModuleId, 128),
        moduleCode: sanitizeString(validModuleCode, 32, 'MOD'),
        title: sanitizeString(data.title, 200, 'Lecture Topic'),
        itemType: data.itemType,
        status: data.status || 'unstudied',
        importance: data.importance || 'high',
        estimatedMinutes: Math.max(1, Math.min(600, Math.round(data.estimatedMinutes || 45))),
        confidenceRating: Math.max(1, Math.min(5, Math.round(data.confidenceRating || 3))),
        repetitionCount: Math.max(0, Math.round(data.repetitionCount || 0)),
        nextReviewDate: sanitizeString(data.nextReviewDate, 32, todayDate),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.stabilityDays !== undefined) payload.stabilityDays = data.stabilityDays;
      if (data.difficultyScore !== undefined) payload.difficultyScore = data.difficultyScore;
      if (data.lastStudiedDate) {
        payload.lastStudiedDate = sanitizeString(data.lastStudiedDate, 32);
      }
      if (data.notes) payload.notes = sanitizeString(data.notes, 4000);
      if (data.frontPrompt) payload.frontPrompt = sanitizeString(data.frontPrompt, 500);
      if (data.backAnswer) payload.backAnswer = sanitizeString(data.backAnswer, 2000);
      if (data.sourceRef) payload.sourceRef = sanitizeString(data.sourceRef, 200);

      await addDoc(collection(db, 'study_items'), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'study_items');
    }
  };

  const deleteStudyItem = async (itemId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'study_items', itemId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `study_items/${itemId}`);
    }
  };

  const recordStudyFeedback = async (
    item: StudyItemRecord,
    confidenceRating: number,
    _durationMinutes: number
  ) => {
    if (!user) return;
    const rating = Math.max(1, Math.min(5, Math.round(confidenceRating)));
    const prevReps = item.repetitionCount || 0;
    const prevStability = item.stabilityDays || 1;
    const multiplier =
      rating === 1 ? 0.5 : rating === 2 ? 1.2 : rating === 3 ? 2.2 : rating === 4 ? 3.2 : 4.5;
    const nextStabilityDays = Math.max(1, Math.round(prevStability * multiplier * 10) / 10);
    const intervalDays = Math.max(1, Math.round(nextStabilityDays));

    const nextDateObj = new Date();
    nextDateObj.setDate(nextDateObj.getDate() + intervalDays);
    const nextReviewDate = nextDateObj.toISOString().split('T')[0];

    const newStatus: StudyItemRecord['status'] =
      rating >= 4 && prevReps >= 2 ? 'mastered' : 'studied';

    try {
      await updateDoc(doc(db, 'study_items', item.id), {
        status: newStatus,
        confidenceRating: rating,
        stabilityDays: nextStabilityDays,
        repetitionCount: prevReps + 1,
        lastStudiedDate: todayDate,
        nextReviewDate,
        updatedAt: serverTimestamp(),
      });

      if (item.itemType === 'lecture' && item.status === 'unstudied') {
        const parentMod = studyModules.find((m) => m.id === item.moduleId);
        if (parentMod) {
          await updateDoc(doc(db, 'study_modules', parentMod.id), {
            completedLectures: Math.min(parentMod.totalLectures, parentMod.completedLectures + 1),
            updatedAt: serverTimestamp(),
          });
        }
      }

      await awardXpAndCoins(35, 15);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `study_items/${item.id}`);
    }
  };

  const createHealthLog = async (
    data: Omit<HealthLogRecord, 'id' | 'ownerId'>,
    scheduleOnCalendar = false
  ) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        logType: data.logType,
        date: sanitizeString(data.date, 16, todayDate),
        title: sanitizeString(data.title, 200, 'Health Entry'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.weightKg !== undefined) payload.weightKg = Number(data.weightKg);
      if (data.waistCm !== undefined) payload.waistCm = Number(data.waistCm);
      if (data.chestCm !== undefined) payload.chestCm = Number(data.chestCm);
      if (data.armsCm !== undefined) payload.armsCm = Number(data.armsCm);
      if (data.durationMinutes !== undefined) {
        payload.durationMinutes = Math.round(data.durationMinutes);
      }
      if (data.volumeKg !== undefined) payload.volumeKg = Math.round(data.volumeKg);
      if (data.rpe !== undefined) payload.rpe = Math.max(1, Math.min(10, Math.round(data.rpe)));
      if (data.exercisesSummary) {
        payload.exercisesSummary = sanitizeString(data.exercisesSummary, 1500);
      }
      if (data.calories !== undefined) payload.calories = Math.round(data.calories);
      if (data.proteinGrams !== undefined) payload.proteinGrams = Math.round(data.proteinGrams);
      if (data.carbsGrams !== undefined) payload.carbsGrams = Math.round(data.carbsGrams);
      if (data.fatGrams !== undefined) payload.fatGrams = Math.round(data.fatGrams);
      if (data.notes) payload.notes = sanitizeString(data.notes, 1000);

      const ref = await addDoc(collection(db, 'health_logs'), payload);

      if (data.logType === 'workout') {
        await awardXpAndCoins(40, 15);
        if (scheduleOnCalendar) {
          await createCalendarEvent({
            title: `Workout: ${data.title}`,
            eventType: 'workout',
            date: data.date || todayDate,
            startTime: '17:30',
            endTime: '18:30',
            location: 'Gym',
            isProtectedAnchor: false,
            linkedRecordId: ref.id,
          });
        }
      } else {
        await awardXpAndCoins(10, 5);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'health_logs');
    }
  };

  const deleteHealthLog = async (logId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'health_logs', logId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `health_logs/${logId}`);
    }
  };

  const createFinanceRecord = async (data: Omit<FinanceRecordItem, 'id' | 'ownerId'>) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        recordType: data.recordType,
        title: sanitizeString(data.title, 200, 'Transaction'),
        category: sanitizeString(data.category, 64, 'General'),
        accountName: sanitizeString(data.accountName, 64, 'Cash'),
        amountMinor: Math.max(0, Math.round(data.amountMinor)),
        date: sanitizeString(data.date, 16, todayDate),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.targetAmountMinor !== undefined) {
        payload.targetAmountMinor = Math.max(0, Math.round(data.targetAmountMinor));
      }
      if (typeof data.isRecurring === 'boolean') payload.isRecurring = data.isRecurring;
      if (data.notes) payload.notes = sanitizeString(data.notes, 1000);

      await addDoc(collection(db, 'finance_records'), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'finance_records');
    }
  };

  const deleteFinanceRecord = async (recordId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'finance_records', recordId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `finance_records/${recordId}`);
    }
  };

  const createKnowledgeItem = async (data: Omit<KnowledgeItemRecord, 'id' | 'ownerId'>) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        itemType: data.itemType,
        title: sanitizeString(data.title, 200, 'Resource'),
        status: data.status || 'in_progress',
        progressCurrent: Math.max(0, Math.round(data.progressCurrent || 0)),
        progressTotal: Math.max(1, Math.round(data.progressTotal || 100)),
        progressUnit: sanitizeString(data.progressUnit, 32, 'pages'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.authorOrSource) payload.authorOrSource = sanitizeString(data.authorOrSource, 150);
      if (data.rating !== undefined) {
        payload.rating = Math.max(1, Math.min(5, Math.round(data.rating)));
      }
      if (data.tags) payload.tags = sanitizeString(data.tags, 200);
      if (data.takeaways) payload.takeaways = sanitizeString(data.takeaways, 4000);
      if (data.linkedEntityId) payload.linkedEntityId = sanitizeString(data.linkedEntityId, 128);

      await addDoc(collection(db, 'knowledge_items'), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'knowledge_items');
    }
  };

  const updateKnowledgeProgress = async (
    item: KnowledgeItemRecord,
    newCurrent: number,
    takeaways?: string
  ) => {
    if (!user) return;
    const clamped = Math.max(0, Math.min(item.progressTotal, Math.round(newCurrent)));
    const nextStatus: KnowledgeItemRecord['status'] =
      clamped >= item.progressTotal ? 'completed' : 'in_progress';
    try {
      const payload: Record<string, unknown> = {
        progressCurrent: clamped,
        status: nextStatus,
        updatedAt: serverTimestamp(),
      };
      if (takeaways !== undefined) payload.takeaways = sanitizeString(takeaways, 4000);
      await updateDoc(doc(db, 'knowledge_items', item.id), payload);
      if (nextStatus === 'completed' && item.status !== 'completed') {
        await awardXpAndCoins(50, 25);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `knowledge_items/${item.id}`);
    }
  };

  const deleteKnowledgeItem = async (itemId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'knowledge_items', itemId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `knowledge_items/${itemId}`);
    }
  };

  const createGoalHabit = async (data: Omit<GoalHabitRecord, 'id' | 'ownerId'>) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        recordType: data.recordType,
        title: sanitizeString(data.title, 200, 'Goal / Habit'),
        status: data.status || 'active',
        frequency: data.frequency || 'daily',
        progressPercent: Math.max(0, Math.min(100, Math.round(data.progressPercent || 0))),
        streakCount: Math.max(0, Math.round(data.streakCount || 0)),
        completedToday: Boolean(data.completedToday),
        xpReward: Math.max(0, Math.min(10000, Math.round(data.xpReward || 25))),
        coinCostOrReward: Math.max(0, Math.min(100000, Math.round(data.coinCostOrReward || 15))),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.whyReason) payload.whyReason = sanitizeString(data.whyReason, 500);
      if (data.lastCompletedDate) {
        payload.lastCompletedDate = sanitizeString(data.lastCompletedDate, 16);
      }
      if (data.targetDate) payload.targetDate = sanitizeString(data.targetDate, 16);
      if (data.nextSmallAction) {
        payload.nextSmallAction = sanitizeString(data.nextSmallAction, 300);
      }

      await addDoc(collection(db, 'goals_habits'), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'goals_habits');
    }
  };

  const toggleHabitOrGoalCompletion = async (record: GoalHabitRecord) => {
    if (!user) return;
    const nextDone = !record.completedToday;
    const nextStreak = nextDone ? record.streakCount + 1 : Math.max(0, record.streakCount - 1);
    const nextProgress =
      record.recordType === 'goal'
        ? Math.min(100, record.progressPercent + (nextDone ? 20 : -20))
        : nextDone
        ? 100
        : 0;
    try {
      await updateDoc(doc(db, 'goals_habits', record.id), {
        completedToday: nextDone,
        streakCount: nextStreak,
        progressPercent: Math.max(0, nextProgress),
        lastCompletedDate: todayDate,
        status: nextProgress >= 100 && record.recordType !== 'habit' ? 'completed' : 'active',
        updatedAt: serverTimestamp(),
      });
      if (nextDone) {
        await awardXpAndCoins(record.xpReward || 25, record.coinCostOrReward || 10);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `goals_habits/${record.id}`);
    }
  };

  const deleteGoalHabit = async (recordId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'goals_habits', recordId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `goals_habits/${recordId}`);
    }
  };

  const redeemReward = async (reward: GoalHabitRecord) => {
    if (!user || !profile) return;
    if (profile.coins < reward.coinCostOrReward) return;
    await awardXpAndCoins(0, -reward.coinCostOrReward);
    await logAiAction({
      actionTitle: `Redeemed Reward: ${reward.title}`,
      toolName: 'redeem_reward',
      permissionLevel: 'routine_write',
      status: 'executed',
      targetModule: 'Rank & Rewards',
      summary: `Spent ${reward.coinCostOrReward} coins on "${reward.title}".`,
    });
  };

  const logAiAction = async (data: Omit<AiActionLogRecord, 'id' | 'ownerId'>) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        actionTitle: sanitizeString(data.actionTitle, 200, 'AI Action'),
        toolName: sanitizeString(data.toolName, 100, 'assistant_tool'),
        permissionLevel: data.permissionLevel,
        status: data.status,
        targetModule: sanitizeString(data.targetModule, 64, 'System'),
        summary: sanitizeString(data.summary, 1500, 'Executed action'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.payloadJson) payload.payloadJson = sanitizeString(data.payloadJson, 4000);
      await addDoc(collection(db, 'ai_action_logs'), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'ai_action_logs');
    }
  };

  const resolveAiProposal = async (
    log: AiActionLogRecord,
    decision: 'approved' | 'rejected' | 'undone'
  ) => {
    if (!user) return;
    try {
      if (decision === 'approved' && log.payloadJson) {
        const parsed = JSON.parse(log.payloadJson);
        if (log.toolName === 'propose_finance_record') {
          const amountMinor = Math.round((Number(parsed.amountMajor) || 0) * 100);
          await createFinanceRecord({
            recordType: parsed.recordType || 'expense',
            title: parsed.title || 'Approved AI Entry',
            category: parsed.category || 'General',
            accountName: parsed.accountName || 'Cash',
            amountMinor,
            date: todayDate,
          });
        } else if (log.toolName === 'rebalance_day_schedule' && Array.isArray(parsed.blocks)) {
          for (const b of parsed.blocks) {
            await createCalendarEvent({
              title: b.title || 'Scheduled Block',
              eventType: b.eventType || 'study_block',
              date: todayDate,
              startTime: b.startTime || '14:00',
              endTime: b.endTime || '15:00',
              location: 'Study Desk',
              isProtectedAnchor: false,
            });
          }
        }
      }
      await updateDoc(doc(db, 'ai_action_logs', log.id), {
        status: decision,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `ai_action_logs/${log.id}`);
    }
  };

  const deleteAiLog = async (logId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'ai_action_logs', logId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `ai_action_logs/${logId}`);
    }
  };

  const saveDailyReview = async (data: Omit<DailyReviewRecord, 'id' | 'ownerId'>) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        date: sanitizeString(data.date, 16, todayDate),
        energyLevel: data.energyLevel,
        commitmentScore: Math.max(0, Math.min(100, Math.round(data.commitmentScore))),
        completionScore: Math.max(0, Math.min(100, Math.round(data.completionScore))),
        consistencyScore: Math.max(0, Math.min(100, Math.round(data.consistencyScore))),
        planningAccuracyScore: Math.max(0, Math.min(100, Math.round(data.planningAccuracyScore))),
        wellbeingScore: Math.max(0, Math.min(100, Math.round(data.wellbeingScore))),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.wins) payload.wins = sanitizeString(data.wins, 1000);
      if (data.obstacles) payload.obstacles = sanitizeString(data.obstacles, 1000);
      if (data.tomorrowAdjustment) {
        payload.tomorrowAdjustment = sanitizeString(data.tomorrowAdjustment, 1000);
      }

      await addDoc(collection(db, 'daily_reviews'), payload);
      await awardXpAndCoins(30, 15);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'daily_reviews');
    }
  };

  const clearAllWorkspaceData = async () => {
    if (!user) return;
    for (const s of studyItems) {
      await deleteDoc(doc(db, 'study_items', s.id)).catch(() => {});
    }
    for (const m of studyModules) {
      await deleteDoc(doc(db, 'study_modules', m.id)).catch(() => {});
    }
    for (const t of tasks) {
      await deleteDoc(doc(db, 'tasks', t.id)).catch(() => {});
    }
    for (const e of events) {
      await deleteDoc(doc(db, 'calendar_events', e.id)).catch(() => {});
    }
    for (const h of healthLogs) {
      await deleteDoc(doc(db, 'health_logs', h.id)).catch(() => {});
    }
    for (const f of financeRecords) {
      await deleteDoc(doc(db, 'finance_records', f.id)).catch(() => {});
    }
    for (const k of knowledgeItems) {
      await deleteDoc(doc(db, 'knowledge_items', k.id)).catch(() => {});
    }
    for (const g of goalsHabits) {
      await deleteDoc(doc(db, 'goals_habits', g.id)).catch(() => {});
    }
    for (const a of aiLogs) {
      await deleteDoc(doc(db, 'ai_action_logs', a.id)).catch(() => {});
    }
    for (const r of dailyReviews) {
      await deleteDoc(doc(db, 'daily_reviews', r.id)).catch(() => {});
    }
  };

  return (
    <LifeOSContext.Provider
      value={{
        user,
        authReady,
        profile,
        tasks,
        events,
        studyModules,
        studyItems,
        healthLogs,
        financeRecords,
        knowledgeItems,
        goalsHabits,
        aiLogs,
        dailyReviews,
        todayDate,
        signIn,
        logOut,
        updateProfileSettings,
        awardXpAndCoins,
        createTask,
        updateTask,
        updateTaskStatus,
        deleteTask,
        createCalendarEvent,
        deleteCalendarEvent,
        createStudyModule,
        deleteStudyModule,
        createStudyItem,
        deleteStudyItem,
        recordStudyFeedback,
        createHealthLog,
        deleteHealthLog,
        createFinanceRecord,
        deleteFinanceRecord,
        createKnowledgeItem,
        updateKnowledgeProgress,
        deleteKnowledgeItem,
        createGoalHabit,
        toggleHabitOrGoalCompletion,
        deleteGoalHabit,
        redeemReward,
        logAiAction,
        resolveAiProposal,
        deleteAiLog,
        saveDailyReview,
        clearAllWorkspaceData,
      }}
    >
      {children}
    </LifeOSContext.Provider>
  );
};

export const useLifeOS = () => {
  const ctx = useContext(LifeOSContext);
  if (!ctx) throw new Error('useLifeOS must be used within LifeOSProvider');
  return ctx;
};
