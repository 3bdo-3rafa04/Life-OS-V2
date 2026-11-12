import React, { createContext, useContext, useEffect, useState } from 'react';
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
  // Cross-module actions
  createTask: (data: Omit<TaskItem, 'id' | 'ownerId'>) => Promise<void>;
  updateTaskStatus: (
    task: TaskItem,
    status: TaskItem['status'],
    statusReason?: string
  ) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  createCalendarEvent: (data: Omit<CalendarEventItem, 'id' | 'ownerId'>) => Promise<void>;
  deleteCalendarEvent: (eventId: string) => Promise<void>;
  createStudyModule: (data: Omit<StudyModuleItem, 'id' | 'ownerId'>) => Promise<string>;
  createStudyItem: (data: Omit<StudyItemRecord, 'id' | 'ownerId'>) => Promise<void>;
  recordStudyFeedback: (
    item: StudyItemRecord,
    confidenceRating: number,
    durationMinutes: number
  ) => Promise<void>;
  createHealthLog: (
    data: Omit<HealthLogRecord, 'id' | 'ownerId'>,
    scheduleOnCalendar?: boolean
  ) => Promise<void>;
  createFinanceRecord: (data: Omit<FinanceRecordItem, 'id' | 'ownerId'>) => Promise<void>;
  deleteFinanceRecord: (recordId: string) => Promise<void>;
  createKnowledgeItem: (data: Omit<KnowledgeItemRecord, 'id' | 'ownerId'>) => Promise<void>;
  updateKnowledgeProgress: (
    item: KnowledgeItemRecord,
    newCurrent: number,
    takeaways?: string
  ) => Promise<void>;
  createGoalHabit: (data: Omit<GoalHabitRecord, 'id' | 'ownerId'>) => Promise<void>;
  toggleHabitOrGoalCompletion: (record: GoalHabitRecord) => Promise<void>;
  redeemReward: (reward: GoalHabitRecord) => Promise<void>;
  logAiAction: (data: Omit<AiActionLogRecord, 'id' | 'ownerId'>) => Promise<void>;
  resolveAiProposal: (log: AiActionLogRecord, decision: 'approved' | 'rejected' | 'undone') => Promise<void>;
  saveDailyReview: (data: Omit<DailyReviewRecord, 'id' | 'ownerId'>) => Promise<void>;
  seedInitialWorkspaceIfEmpty: () => Promise<void>;
}

const LifeOSContext = createContext<LifeOSContextValue | undefined>(undefined);

const sanitizeString = (val: string | undefined, maxLen: number, fallback = ''): string => {
  const s = (val ?? fallback).trim();
  return s.slice(0, maxLen);
};

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
              displayName: sanitizeString(currUser.displayName || 'Life OS Owner', 100, 'Owner'),
              currency: 'USD',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
              city: 'London',
              prayerMethod: 'MWL' as const,
              prayerBufferMinutes: 15,
              xp: 340,
              level: 2,
              coins: 120,
              streakDays: 5,
              calorieTarget: 2350,
              proteinTargetGrams: 165,
              waterTargetMl: 3000,
              waterLoggedTodayMl: 1500,
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

  const updateTaskStatus = async (
    task: TaskItem,
    status: TaskItem['status'],
    statusReason?: string
  ) => {
    if (!user) return;
    try {
      const updatePayload: Record<string, unknown> = {
        status,
        updatedAt: serverTimestamp(),
      };
      if (statusReason !== undefined) {
        updatePayload.statusReason = sanitizeString(statusReason, 300);
      }
      await updateDoc(doc(db, 'tasks', task.id), updatePayload);

      // Cross-module event: task.completed -> award XP/coins & advance linked goal
      if (status === 'completed' && task.status !== 'completed') {
        const xpGain = task.priority === 'critical' ? 40 : task.priority === 'high' ? 30 : 20;
        await awardXpAndCoins(xpGain, 10);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${task.id}`);
    }
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

  const createStudyModule = async (data: Omit<StudyModuleItem, 'id' | 'ownerId'>): Promise<string> => {
    if (!user) return '';
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        code: sanitizeString(data.code, 32, 'MOD101'),
        title: sanitizeString(data.title, 200, 'Academic Module'),
        term: sanitizeString(data.term, 64, 'Autumn Term'),
        examDate: sanitizeString(data.examDate, 32, todayDate),
        totalLectures: Math.max(0, Math.min(500, Math.round(data.totalLectures || 12))),
        completedLectures: Math.max(0, Math.min(500, Math.round(data.completedLectures || 0))),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.targetGrade) payload.targetGrade = sanitizeString(data.targetGrade, 16);
      const ref = await addDoc(collection(db, 'study_modules'), payload);

      // Cross-module integration: exam date added -> place exam anchor in Calendar
      await createCalendarEvent({
        title: `Exam: ${data.code} — ${data.title}`,
        eventType: 'exam',
        date: data.examDate,
        startTime: '09:00',
        endTime: '12:00',
        location: 'Examination Hall',
        isProtectedAnchor: true,
        linkedRecordId: ref.id,
      });

      return ref.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'study_modules');
    }
  };

  const createStudyItem = async (data: Omit<StudyItemRecord, 'id' | 'ownerId'>) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        moduleId: sanitizeString(data.moduleId, 128),
        moduleCode: sanitizeString(data.moduleCode, 32, 'MOD'),
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
      if (data.lastStudiedDate) payload.lastStudiedDate = sanitizeString(data.lastStudiedDate, 32);
      if (data.notes) payload.notes = sanitizeString(data.notes, 4000);
      if (data.frontPrompt) payload.frontPrompt = sanitizeString(data.frontPrompt, 500);
      if (data.backAnswer) payload.backAnswer = sanitizeString(data.backAnswer, 2000);
      if (data.sourceRef) payload.sourceRef = sanitizeString(data.sourceRef, 200);

      await addDoc(collection(db, 'study_items'), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'study_items');
    }
  };

  // FSRS-style spaced repetition scheduling calculation
  const recordStudyFeedback = async (
    item: StudyItemRecord,
    confidenceRating: number,
    _durationMinutes: number
  ) => {
    if (!user) return;
    const rating = Math.max(1, Math.min(5, Math.round(confidenceRating)));
    const prevReps = item.repetitionCount || 0;
    const prevStability = item.stabilityDays || 1;
    // FSRS stability multiplier based on recall confidence (1=Again, 2=Hard, 3=Good, 4=Strong, 5=Easy)
    const multiplier = rating === 1 ? 0.5 : rating === 2 ? 1.2 : rating === 3 ? 2.2 : rating === 4 ? 3.2 : 4.5;
    const nextStabilityDays = Math.max(1, Math.round(prevStability * multiplier * 10) / 10);
    const intervalDays = Math.max(1, Math.round(nextStabilityDays));

    const nextDateObj = new Date();
    nextDateObj.setDate(nextDateObj.getDate() + intervalDays);
    const nextReviewDate = nextDateObj.toISOString().split('T')[0];

    const newStatus: StudyItemRecord['status'] = rating >= 4 && prevReps >= 2 ? 'mastered' : 'studied';

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

      // Update parent module completed lecture count if first time studying lecture
      if (item.itemType === 'lecture' && item.status === 'unstudied') {
        const parentMod = studyModules.find((m) => m.id === item.moduleId);
        if (parentMod) {
          await updateDoc(doc(db, 'study_modules', parentMod.id), {
            completedLectures: Math.min(parentMod.totalLectures, parentMod.completedLectures + 1),
            updatedAt: serverTimestamp(),
          });
        }
      }

      // Cross-module event: lecture.studied -> award XP & coins
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
      if (data.durationMinutes !== undefined) payload.durationMinutes = Math.round(data.durationMinutes);
      if (data.volumeKg !== undefined) payload.volumeKg = Math.round(data.volumeKg);
      if (data.rpe !== undefined) payload.rpe = Math.max(1, Math.min(10, Math.round(data.rpe)));
      if (data.exercisesSummary) payload.exercisesSummary = sanitizeString(data.exercisesSummary, 1500);
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
            location: 'Gym / Training Space',
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

  const createFinanceRecord = async (data: Omit<FinanceRecordItem, 'id' | 'ownerId'>) => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        recordType: data.recordType,
        title: sanitizeString(data.title, 200, 'Transaction'),
        category: sanitizeString(data.category, 64, 'General'),
        accountName: sanitizeString(data.accountName, 64, 'Main Checking'),
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
      if (data.rating !== undefined) payload.rating = Math.max(1, Math.min(5, Math.round(data.rating)));
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
      if (data.lastCompletedDate) payload.lastCompletedDate = sanitizeString(data.lastCompletedDate, 16);
      if (data.targetDate) payload.targetDate = sanitizeString(data.targetDate, 16);
      if (data.nextSmallAction) payload.nextSmallAction = sanitizeString(data.nextSmallAction, 300);

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
      summary: `Spent ${reward.coinCostOrReward} coins on "${reward.title}". Rest & recovery honored.`,
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
            accountName: parsed.accountName || 'Main Checking',
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
              location: 'AI Time-Blocked',
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

  const seedInitialWorkspaceIfEmpty = async () => {
    if (!user || tasks.length > 0 || studyModules.length > 0) return;

    // 1. Seed Academic Study Module & Lectures/Flashcards
    const mod1Id = await createStudyModule({
      code: 'CS304',
      title: 'Distributed Systems & Consensus',
      term: 'Autumn Term',
      examDate: '2026-12-14',
      targetGrade: 'A',
      totalLectures: 10,
      completedLectures: 3,
    });

    if (mod1Id) {
      await createStudyItem({
        moduleId: mod1Id,
        moduleCode: 'CS304',
        title: 'Lecture 4: Raft Leader Election & Log Replication',
        itemType: 'lecture',
        status: 'review_due',
        importance: 'high',
        estimatedMinutes: 50,
        confidenceRating: 3,
        stabilityDays: 2.5,
        repetitionCount: 2,
        lastStudiedDate: todayDate,
        nextReviewDate: todayDate,
        notes: 'Safety property: Election safety guarantees at most one leader per term.',
        frontPrompt: 'What condition must a candidate satisfy to win a Raft leader election?',
        backAnswer: 'It must receive votes from a strict majority (quorum) of servers in the cluster for the same term, and its log must be at least as up-to-date as any other node in that quorum.',
        sourceRef: 'CS304_Lecture4_Slides.pdf (p. 14)',
      });

      await createStudyItem({
        moduleId: mod1Id,
        moduleCode: 'CS304',
        title: 'Lecture 5: Byzantine Fault Tolerance & PBFT',
        itemType: 'lecture',
        status: 'unstudied',
        importance: 'high',
        estimatedMinutes: 60,
        confidenceRating: 2,
        stabilityDays: 1,
        repetitionCount: 0,
        nextReviewDate: todayDate,
        notes: 'Requires 3f + 1 total nodes to tolerate f Byzantine faults.',
        frontPrompt: 'Why does PBFT require 3f + 1 replicas to tolerate f Byzantine faults?',
        backAnswer: 'Because f nodes may be unresponsive, so progress must rely on 2f + 1 responses, among which f could still be malicious; thus f + 1 honest responses are needed to outvote f faulty ones.',
        sourceRef: 'CS304_Lecture5_Notes.pdf',
      });
    }

    // 2. Seed Protected Prayer Anchors & Fixed Schedule for Today
    const defaultEvents: Omit<CalendarEventItem, 'id' | 'ownerId'>[] = [
      {
        title: 'Fajr Prayer & Morning Reflection',
        eventType: 'prayer',
        date: todayDate,
        startTime: '05:45',
        endTime: '06:15',
        location: 'Protected Anchor (MWL +15m buffer)',
        isProtectedAnchor: true,
      },
      {
        title: 'CS304 Distributed Systems Lecture',
        eventType: 'lecture',
        date: todayDate,
        startTime: '10:00',
        endTime: '11:30',
        location: 'Engineering Hall 3B',
        isProtectedAnchor: true,
      },
      {
        title: 'Dhuhr Prayer Anchor',
        eventType: 'prayer',
        date: todayDate,
        startTime: '12:30',
        endTime: '13:00',
        location: 'Campus Prayer Room',
        isProtectedAnchor: true,
      },
      {
        title: 'Asr Prayer Anchor',
        eventType: 'prayer',
        date: todayDate,
        startTime: '15:15',
        endTime: '15:40',
        location: 'Protected Anchor',
        isProtectedAnchor: true,
      },
      {
        title: 'Upper Body Strength Hypertrophy',
        eventType: 'workout',
        date: todayDate,
        startTime: '17:30',
        endTime: '18:30',
        location: 'University Athletics Center',
        isProtectedAnchor: false,
      },
    ];
    for (const ev of defaultEvents) {
      await createCalendarEvent(ev);
    }

    // 3. Seed Tasks Due Today
    await createTask({
      title: 'Complete active recall revision for CS304 Raft Consensus',
      priority: 'critical',
      status: 'todo',
      category: 'study',
      estimatedMinutes: 45,
      dueDate: todayDate,
      scheduledStart: '13:30',
      notes: 'Focus on log replication invariants before quiz.',
    });
    await createTask({
      title: 'Reconcile monthly grocery & study material budget',
      priority: 'medium',
      status: 'todo',
      category: 'finance',
      estimatedMinutes: 20,
      dueDate: todayDate,
      scheduledStart: '16:00',
    });
    await createTask({
      title: 'Lab server SSH key rotation (Waiting on DevOps team)',
      priority: 'low',
      status: 'blocked',
      statusReason: 'Blocked by university IT ticket #4821 — not penalized in Daily Rating',
      category: 'work',
      estimatedMinutes: 30,
      dueDate: todayDate,
    });

    // 4. Seed Health Logs
    await createHealthLog({
      logType: 'measurement',
      date: todayDate,
      title: 'Morning Baseline Check-in',
      weightKg: 74.2,
      waistCm: 79.5,
      chestCm: 101.0,
      armsCm: 36.5,
      notes: 'Rested 7.5h, steady hydration.',
    });
    await createHealthLog({
      logType: 'workout',
      date: todayDate,
      title: 'Upper Body Push / Pull Session',
      durationMinutes: 55,
      volumeKg: 4820,
      rpe: 8,
      exercisesSummary: 'Bench Press 4x8 @ 80kg · Weighted Pull-ups 4x6 @ +15kg · Overhead Press 3x10 @ 50kg',
    });
    await createHealthLog({
      logType: 'meal',
      date: todayDate,
      title: 'Post-Lecture Salmon, Quinoa & Avocado Bowl',
      calories: 740,
      proteinGrams: 54,
      carbsGrams: 68,
      fatGrams: 26,
      notes: 'Estimated from Life OS Food Database',
    });

    // 5. Seed Finance Records (in exact integer minor units / cents)
    await createFinanceRecord({
      recordType: 'income',
      title: 'Research Assistantship Stipend',
      category: 'Income',
      accountName: 'Main Checking',
      amountMinor: 245000, // $2,450.00
      date: todayDate,
      isRecurring: true,
    });
    await createFinanceRecord({
      recordType: 'expense',
      title: 'Whole Foods Weekly Groceries',
      category: 'Groceries',
      accountName: 'Main Checking',
      amountMinor: 8450, // $84.50
      date: todayDate,
    });
    await createFinanceRecord({
      recordType: 'budget',
      title: 'Monthly Groceries & Nutrition Cap',
      category: 'Groceries',
      accountName: 'Main Checking',
      amountMinor: 8450,
      targetAmountMinor: 40000, // $400.00 budget
      date: todayDate,
    });
    await createFinanceRecord({
      recordType: 'savings_goal',
      title: 'Emergency & Post-Grad Relocation Fund',
      category: 'Savings',
      accountName: 'High-Yield Vault',
      amountMinor: 320000, // $3,200.00 saved
      targetAmountMinor: 500000, // $5,000.00 target
      date: todayDate,
    });

    // 6. Seed Knowledge Library
    await createKnowledgeItem({
      itemType: 'book',
      title: 'Designing Data-Intensive Applications',
      authorOrSource: 'Martin Kleppmann',
      status: 'in_progress',
      progressCurrent: 284,
      progressTotal: 616,
      progressUnit: 'pages',
      rating: 5,
      tags: 'distributed-systems · databases · cs304',
      takeaways: 'Linearizability is a recency guarantee on single objects; serializability is an isolation property of multi-object transactions.',
    });
    await createKnowledgeItem({
      itemType: 'podcast',
      title: 'Huberman Lab: Optimizing Deep Work & Ultradian Cycles',
      authorOrSource: 'Dr. Andrew Huberman',
      status: 'completed',
      progressCurrent: 90,
      progressTotal: 90,
      progressUnit: 'mins',
      rating: 5,
      tags: 'focus · health · chronobiology',
      takeaways: 'Cap deep cognitive blocks at 90 minutes followed by 15 minutes of non-sleep deep rest or low-visual-load walking.',
    });

    // 7. Seed Goals, Habits, Quests & Rewards
    await createGoalHabit({
      recordType: 'goal',
      title: 'Achieve First-Class Honours in Computer Science Term',
      whyReason: 'Build strong theoretical foundation for systems engineering residency.',
      status: 'active',
      frequency: 'once',
      progressPercent: 65,
      streakCount: 12,
      completedToday: false,
      targetDate: '2026-12-20',
      xpReward: 200,
      coinCostOrReward: 100,
      nextSmallAction: 'Complete CS304 Lecture 4 & 5 active recall flashcards today.',
    });
    await createGoalHabit({
      recordType: 'habit',
      title: '90-Minute Morning Deep Study Block Before Checking Messages',
      whyReason: 'Protect peak cognitive energy for hardest academic modules.',
      status: 'active',
      frequency: 'daily',
      progressPercent: 100,
      streakCount: 9,
      completedToday: true,
      xpReward: 30,
      coinCostOrReward: 15,
    });
    await createGoalHabit({
      recordType: 'quest',
      title: 'Weekly Consistency Quest: 4 Study Revisions + 3 Strength Workouts',
      whyReason: 'Balanced academic and physical momentum without burnout.',
      status: 'active',
      frequency: 'weekly',
      progressPercent: 75,
      streakCount: 3,
      completedToday: false,
      xpReward: 150,
      coinCostOrReward: 80,
    });
    await createGoalHabit({
      recordType: 'reward',
      title: 'Guilt-Free Specialty Coffee & Sci-Fi Reading Evening',
      whyReason: 'Legitimate rest and recovery reward after consistent deep work.',
      status: 'active',
      frequency: 'once',
      progressPercent: 100,
      streakCount: 0,
      completedToday: false,
      xpReward: 0,
      coinCostOrReward: 50,
    });

    // 8. Seed AI Action Log with a Pending Consequential Proposal
    await logAiAction({
      actionTitle: 'Propose Rebalancing Afternoon Study Block Around Asr Prayer',
      toolName: 'rebalance_day_schedule',
      permissionLevel: 'consequential',
      status: 'pending_approval',
      targetModule: 'Calendar & Study',
      summary: 'Detected a 15-minute buffer overlap with Asr Prayer (15:15). Proposed shifting CS304 Revision Block to 13:30–14:30.',
      payloadJson: JSON.stringify({
        summary: 'Insert 60m CS304 Raft Revision at 13:30 with 15m rest buffer before Asr.',
        blocks: [
          {
            title: 'AI Time-Block: CS304 Raft Active Recall',
            startTime: '13:30',
            endTime: '14:30',
            eventType: 'study_block',
          },
        ],
      }),
    });
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
        updateTaskStatus,
        deleteTask,
        createCalendarEvent,
        deleteCalendarEvent,
        createStudyModule,
        createStudyItem,
        recordStudyFeedback,
        createHealthLog,
        createFinanceRecord,
        deleteFinanceRecord,
        createKnowledgeItem,
        updateKnowledgeProgress,
        createGoalHabit,
        toggleHabitOrGoalCompletion,
        redeemReward,
        logAiAction,
        resolveAiProposal,
        saveDailyReview,
        seedInitialWorkspaceIfEmpty,
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
