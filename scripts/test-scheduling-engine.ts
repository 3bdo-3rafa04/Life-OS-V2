import {
  generateContextAwareSchedule,
  runAdaptiveReschedule,
  extractMemoryCorrectionFromText,
  createDefaultPersistentMemory,
  parseTimeToMinutes,
  ScheduleGenerationInput,
} from '../src/services/schedulingEngine';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

function runAllTests(): void {
  const results: TestResult[] = [];

  // Base helper date: 2025-05-15 at 13:00 Africa/Cairo (10:00 UTC during Cairo EEST UTC+3)
  // Let's construct an exact UTC ISO that resolves to 13:00 in Africa/Cairo
  // In May, Africa/Cairo is UTC+3 (DST), so 10:00:00Z = 13:00 Africa/Cairo.
  const baseCairo1PmIso = '2025-05-15T10:00:00.000Z';

  // =========================================================================
  // TEST 1: Current time is 1:00 PM -> Nothing may be scheduled before 1:00 PM today
  // =========================================================================
  {
    const memory = createDefaultPersistentMemory('Africa/Cairo');
    const input: ScheduleGenerationInput = {
      nowIso: baseCairo1PmIso,
      timezone: 'Africa/Cairo',
      targetDays: 1,
      existingEvents: [],
      tasks: [
        {
          id: 't1',
          title: 'Review Anatomy Flashcards',
          category: 'study',
          priority: 'high',
          estimatedMinutes: 45,
          completed: false,
        },
        {
          id: 't2',
          title: 'Complete Pharmacology Problem Set',
          category: 'study',
          priority: 'high',
          estimatedMinutes: 60,
          completed: false,
        },
      ],
      studyModules: [],
      studyItems: [],
      memory,
    };

    const res = generateContextAwareSchedule(input);
    const todayBlocks = res.proposedBlocks.filter((b) => b.dateStr === res.currentLocalDate);
    const anyBefore1Pm = todayBlocks.some((b) => parseTimeToMinutes(b.startTime) < 13 * 60);
    const passed =
      res.currentLocalTime === '13:00' &&
      todayBlocks.length > 0 &&
      !anyBefore1Pm &&
      res.constraintCheck.noPastScheduling;

    results.push({
      id: 'TEST 1',
      name: 'Current time 1:00 PM (Africa/Cairo) -> Zero past scheduling before 13:00',
      passed,
      details: `Server local time: ${res.currentLocalDate} ${res.currentLocalTime} (${res.timezone}). Scheduled blocks: ${todayBlocks
        .map((b) => `${b.title} [${b.startTime}-${b.endTime}]`)
        .join(', ')}. Earliest block starts at ${todayBlocks[0]?.startTime || 'N/A'}.`,
    });
  }

  // =========================================================================
  // TEST 2: Fixed event from 2:00 PM to 4:00 PM -> Nothing overlaps 14:00-16:00
  // =========================================================================
  {
    const memory = createDefaultPersistentMemory('Africa/Cairo');
    const input: ScheduleGenerationInput = {
      nowIso: baseCairo1PmIso,
      timezone: 'Africa/Cairo',
      targetDays: 1,
      existingEvents: [
        {
          id: 'ev_fixed_1',
          title: 'Clinical Hospital Rounds',
          dateStr: '2025-05-15',
          startTime: '14:00',
          endTime: '16:00',
          category: 'lecture',
        },
      ],
      tasks: [
        {
          id: 't_cardio',
          title: 'Cardiology ECG Interpretation',
          category: 'study',
          priority: 'high',
          estimatedMinutes: 50,
          completed: false,
        },
        {
          id: 't_notes',
          title: 'Pathology Summary Notes',
          category: 'study',
          priority: 'medium',
          estimatedMinutes: 45,
          completed: false,
        },
      ],
      studyModules: [],
      studyItems: [],
      memory,
    };

    const res = generateContextAwareSchedule(input);
    const overlapsFixed = res.proposedBlocks.some((b) => {
      const s = parseTimeToMinutes(b.startTime);
      const e = parseTimeToMinutes(b.endTime);
      return s < 16 * 60 && e > 14 * 60;
    });
    const passed = res.proposedBlocks.length > 0 && !overlapsFixed && res.constraintCheck.noOverlappingEvents;

    results.push({
      id: 'TEST 2',
      name: 'Fixed event 14:00–16:00 -> Zero overlap with 2:00 PM–4:00 PM',
      passed,
      details: `Proposed blocks around 14:00–16:00: ${res.proposedBlocks
        .map((b) => `${b.title} [${b.startTime}-${b.endTime}]`)
        .join(', ')}. Overlap detected: ${overlapsFixed}.`,
    });
  }

  // =========================================================================
  // TEST 3: Exam in 4 days with 6 unfinished lectures -> Prioritized + Capacity Warning if tight
  // =========================================================================
  {
    const memory = createDefaultPersistentMemory('Africa/Cairo');
    const input: ScheduleGenerationInput = {
      nowIso: baseCairo1PmIso,
      timezone: 'Africa/Cairo',
      targetDays: 3,
      existingEvents: [],
      tasks: [
        {
          id: 't_low_admin',
          title: 'Organize desk folders',
          category: 'personal',
          priority: 'low',
          estimatedMinutes: 40,
          completed: false,
        },
      ],
      studyModules: [
        {
          id: 'mod_cardio',
          name: 'Cardiology Block Exam',
          examDate: '2025-05-19', // 4 days from 2025-05-15
        },
      ],
      studyItems: [1, 2, 3, 4, 5, 6].map((n) => ({
        id: `lec_c_${n}`,
        moduleId: 'mod_cardio',
        title: `Lecture ${n}: Cardiology Topic ${n}`,
        type: 'lecture',
        status: 'unstudied',
        estimatedMinutes: 60,
        lectureNumber: n,
        difficulty: 'high',
      })),
      memory,
    };

    const res = generateContextAwareSchedule(input);
    const examRep = res.examReports.find((r) => r.moduleId === 'mod_cardio');
    const firstBlock = res.proposedBlocks[0];
    const prioritizedExamFirst = firstBlock?.moduleId === 'mod_cardio';
    const passed = Boolean(examRep && examRep.unstudiedLectures === 6 && prioritizedExamFirst);

    results.push({
      id: 'TEST 3',
      name: 'Exam in 4 days with 6 unfinished lectures -> Exam lectures prioritized & workload analyzed',
      passed,
      details: `First scheduled block: "${firstBlock?.title}" (${firstBlock?.subject}). Exam report: ${examRep?.unstudiedLectures} unstudied lectures, ${examRep?.totalRequiredMinutes}m total required (atRisk=${examRep?.isAtRisk}).`,
    });
  }

  // =========================================================================
  // TEST 4: Subject has Lectures 1 to 4 unfinished -> Scheduled in strict sequence 1 -> 2 -> 3 -> 4
  // =========================================================================
  {
    const memory = createDefaultPersistentMemory('Africa/Cairo');
    const input: ScheduleGenerationInput = {
      nowIso: '2025-05-15T05:00:00.000Z', // 08:00 AM Cairo time
      timezone: 'Africa/Cairo',
      targetDays: 2,
      existingEvents: [],
      tasks: [],
      studyModules: [
        {
          id: 'mod_path',
          name: 'Systemic Pathology',
          examDate: '2025-05-25',
        },
      ],
      // Deliberately pass out of order (4, 2, 1, 3) to prove engine sorts & enforces prerequisites
      studyItems: [
        {
          id: 'p4',
          moduleId: 'mod_path',
          title: 'Lecture 4: Clinical Management',
          type: 'lecture',
          status: 'unstudied',
          estimatedMinutes: 50,
        },
        {
          id: 'p2',
          moduleId: 'mod_path',
          title: 'Lecture 2: Anatomy & Histology',
          type: 'lecture',
          status: 'unstudied',
          estimatedMinutes: 50,
        },
        {
          id: 'p1',
          moduleId: 'mod_path',
          title: 'Lecture 1: Introduction',
          type: 'lecture',
          status: 'unstudied',
          estimatedMinutes: 50,
        },
        {
          id: 'p3',
          moduleId: 'mod_path',
          title: 'Lecture 3: Pathology Mechanisms',
          type: 'lecture',
          status: 'unstudied',
          estimatedMinutes: 50,
        },
      ],
      memory,
    };

    const res = generateContextAwareSchedule(input);
    const firstTimeBlocks = res.proposedBlocks.filter(
      (b) => b.moduleId === 'mod_path' && b.stageType === 'first_time_study'
    );
    const seqNums = firstTimeBlocks.map((b) => b.lectureNumber);
    const isStrictlyOrdered =
      seqNums.length === 4 &&
      seqNums[0] === 1 &&
      seqNums[1] === 2 &&
      seqNums[2] === 3 &&
      seqNums[3] === 4 &&
      res.constraintCheck.noBrokenPrerequisites;

    results.push({
      id: 'TEST 4',
      name: 'Lectures 1–4 passed out of order -> Strictly scheduled as Lecture 1 -> 2 -> 3 -> 4',
      passed: isStrictlyOrdered,
      details: `Scheduled sequence: ${firstTimeBlocks
        .map((b) => `Lec #${b.lectureNumber} (${b.dateStr} ${b.startTime})`)
        .join(' -> ')}.`,
    });
  }

  // =========================================================================
  // TEST 5: User has low energy in the evening -> Difficult lectures NOT placed in low-energy evening slots
  // =========================================================================
  {
    const memory = createDefaultPersistentMemory('Africa/Cairo');
    memory.userProfile.morningEnergy = 'high';
    memory.userProfile.afternoonEnergy = 'medium';
    memory.userProfile.eveningEnergy = 'low';
    memory.userProfile.preferredDeepWorkWindows = [{ start: '08:00', end: '12:00' }];
    memory.userProfile.preferredLightWorkWindows = [{ start: '18:00', end: '22:00' }];

    const input: ScheduleGenerationInput = {
      nowIso: '2025-05-15T05:00:00.000Z', // 08:00 AM Cairo
      timezone: 'Africa/Cairo',
      targetDays: 1,
      existingEvents: [],
      tasks: [
        {
          id: 't_light',
          title: 'Light reading & organizing notes',
          category: 'personal',
          priority: 'medium',
          estimatedMinutes: 40,
          completed: false,
          energyLevel: 'low',
        },
      ],
      studyModules: [{ id: 'mod_neuro', name: 'Neuroanatomy', examDate: '2025-05-22' }],
      studyItems: [
        {
          id: 'n1',
          moduleId: 'mod_neuro',
          title: 'Lecture 1: Complex Neuroanatomy Tracts',
          type: 'lecture',
          status: 'unstudied',
          estimatedMinutes: 60,
          difficulty: 'high',
        },
      ],
      memory,
    };

    const res = generateContextAwareSchedule(input);
    const neuroBlock = res.proposedBlocks.find((b) => b.sourceId === 'n1');
    const neuroStartMin = neuroBlock ? parseTimeToMinutes(neuroBlock.startTime) : 9999;
    const passed = Boolean(neuroBlock && neuroStartMin < 12 * 60 && neuroBlock.slotEnergyLevel === 'high');

    results.push({
      id: 'TEST 5',
      name: 'Low evening energy vs High morning energy -> Difficult lecture placed in HIGH energy morning slot',
      passed,
      details: `Difficult lecture "${neuroBlock?.title}" scheduled at ${neuroBlock?.startTime}–${neuroBlock?.endTime} (Slot energy: ${neuroBlock?.slotEnergyLevel.toUpperCase()}).`,
    });
  }

  // =========================================================================
  // TEST 6: User says "I only have 2 hours today" -> Schedule must not exceed 2 hours (120m) today
  // =========================================================================
  {
    const memory = createDefaultPersistentMemory('Africa/Cairo');
    const baseInput: ScheduleGenerationInput = {
      nowIso: baseCairo1PmIso,
      timezone: 'Africa/Cairo',
      targetDays: 2,
      existingEvents: [],
      tasks: [
        { id: 't1', title: 'Study Task A', category: 'study', priority: 'high', estimatedMinutes: 60, completed: false },
        { id: 't2', title: 'Study Task B', category: 'study', priority: 'high', estimatedMinutes: 60, completed: false },
        { id: 't3', title: 'Study Task C', category: 'study', priority: 'medium', estimatedMinutes: 60, completed: false },
        { id: 't4', title: 'Study Task D', category: 'study', priority: 'low', estimatedMinutes: 60, completed: false },
      ],
      studyModules: [],
      studyItems: [],
      memory,
    };

    const adapted = runAdaptiveReschedule({
      utterance: 'Today I have only two hours available',
      baseInput,
    });

    const todayBlocks = adapted.scheduleResult.proposedBlocks.filter((b) => b.dateStr === '2025-05-15');
    const todayMinutes = todayBlocks.reduce((acc, b) => acc + b.durationMinutes, 0);
    const passed =
      adapted.adaptationType === 'constrained_hours' &&
      todayMinutes > 0 &&
      todayMinutes <= 120 &&
      adapted.scheduleResult.constraintCheck.noUnrealisticWorkload;

    results.push({
      id: 'TEST 6',
      name: 'User says "Today I have only two hours available" -> Today workload strictly <= 120m',
      passed,
      details: `Today's total study minutes: ${todayMinutes}m (Cap: 120m). Blocks today: ${todayBlocks
        .map((b) => `${b.title} (${b.durationMinutes}m)`)
        .join(', ')}. Overflow moved to future days.`,
    });
  }

  // =========================================================================
  // TEST 7: User corrects AI ("I have university lectures from 9 AM to 1 PM") -> Saved & respected in future schedules
  // =========================================================================
  {
    const memory = createDefaultPersistentMemory('Africa/Cairo');
    const extraction = extractMemoryCorrectionFromText(
      'I cannot study in the morning because I have university lectures from 9 AM to 1 PM',
      '2025-05-15'
    );
    if (extraction.learnedRule) {
      memory.behavioralMemory.learnedRules.push(extraction.learnedRule);
    }

    // Generate schedule for next Monday (2025-05-19, dayOfWeek=1) starting at 08:00 AM
    const input: ScheduleGenerationInput = {
      nowIso: '2025-05-19T05:00:00.000Z', // 08:00 AM Cairo on Monday
      timezone: 'Africa/Cairo',
      targetDays: 1,
      existingEvents: [],
      tasks: [
        {
          id: 't_mon',
          title: 'Internal Medicine Case Prep',
          category: 'study',
          priority: 'high',
          estimatedMinutes: 60,
          completed: false,
        },
      ],
      studyModules: [],
      studyItems: [],
      memory,
    };

    const res = generateContextAwareSchedule(input);
    const overlapsUni = res.proposedBlocks.some((b) => {
      const s = parseTimeToMinutes(b.startTime);
      const e = parseTimeToMinutes(b.endTime);
      return s < 13 * 60 && e > 9 * 60;
    });
    const passed = Boolean(extraction.detected && extraction.learnedRule && !overlapsUni && res.proposedBlocks.length > 0);

    results.push({
      id: 'TEST 7',
      name: 'User correction ("I have university lectures from 9 AM to 1 PM") -> Stored in Persistent Memory & respected',
      passed,
      details: `Learned rule saved: "${extraction.learnedRule?.ruleText}" (${extraction.learnedRule?.startTime}–${extraction.learnedRule?.endTime}). Next schedule placed "${res.proposedBlocks[0]?.title}" at ${res.proposedBlocks[0]?.startTime}–${res.proposedBlocks[0]?.endTime}.`,
    });
  }

  // =========================================================================
  // TEST 8: Multiple tasks compete for the same time slot -> Ranked & placed sequentially without overlap
  // =========================================================================
  {
    const memory = createDefaultPersistentMemory('Africa/Cairo');
    const input: ScheduleGenerationInput = {
      nowIso: baseCairo1PmIso,
      timezone: 'Africa/Cairo',
      targetDays: 1,
      existingEvents: [],
      tasks: [
        { id: 'c1', title: 'Urgent Exam Revision', category: 'study', priority: 'high', estimatedMinutes: 45, completed: false, dueDate: '2025-05-16' },
        { id: 'c2', title: 'Clinical Pharmacology Notes', category: 'study', priority: 'high', estimatedMinutes: 45, completed: false, dueDate: '2025-05-17' },
        { id: 'c3', title: 'Flashcard Deck Review', category: 'study', priority: 'medium', estimatedMinutes: 30, completed: false, dueDate: '2025-05-19' },
      ],
      studyModules: [],
      studyItems: [],
      memory,
    };

    const res = generateContextAwareSchedule(input);
    const passed =
      res.proposedBlocks.length === 3 &&
      res.proposedBlocks[0].sourceId === 'c1' &&
      res.constraintCheck.noOverlappingEvents;

    results.push({
      id: 'TEST 8',
      name: 'Multiple competing tasks -> Ranked by urgency and placed sequentially with breaks & zero overlap',
      passed,
      details: `Sequential blocks: ${res.proposedBlocks
        .map((b) => `${b.title} [${b.startTime}-${b.endTime}]`)
        .join(' -> ')}. Zero overlaps: ${res.constraintCheck.noOverlappingEvents}.`,
    });
  }

  // =========================================================================
  // TEST 9: User misses a scheduled study session -> Adaptive rescheduling without duplicating completed work
  // =========================================================================
  {
    const memory = createDefaultPersistentMemory('Africa/Cairo');
    const baseInput: ScheduleGenerationInput = {
      nowIso: baseCairo1PmIso, // 1:00 PM after missing morning session
      timezone: 'Africa/Cairo',
      targetDays: 3,
      existingEvents: [],
      tasks: [
        { id: 'done_1', title: 'Completed Biochemistry Quiz', category: 'study', priority: 'high', estimatedMinutes: 45, completed: true },
        { id: 'missed_1', title: 'Missed Morning Cardiology Lecture 1', category: 'study', priority: 'high', estimatedMinutes: 60, completed: false },
        { id: 'pending_2', title: 'Afternoon Pathology Review', category: 'study', priority: 'medium', estimatedMinutes: 45, completed: false },
      ],
      studyModules: [],
      studyItems: [],
      memory,
    };

    const adapted = runAdaptiveReschedule({
      utterance: 'I missed my morning study session',
      baseInput,
    });

    const hasCompletedTaskDuplicated = adapted.scheduleResult.proposedBlocks.some((b) => b.sourceId === 'done_1');
    const hasMissedRescheduled = adapted.scheduleResult.proposedBlocks.some((b) => b.sourceId === 'missed_1');
    const allAfter1Pm = adapted.scheduleResult.proposedBlocks
      .filter((b) => b.dateStr === '2025-05-15')
      .every((b) => parseTimeToMinutes(b.startTime) >= 13 * 60);

    const passed =
      adapted.adaptationType === 'missed_session' &&
      !hasCompletedTaskDuplicated &&
      hasMissedRescheduled &&
      allAfter1Pm;

    results.push({
      id: 'TEST 9',
      name: 'Missed morning study session -> Adaptive reschedule preserves completed tasks & moves missed task after 13:00',
      passed,
      details: `Adaptation: ${adapted.adaptationType}. Completed task duplicated: ${hasCompletedTaskDuplicated}. Rescheduled blocks: ${adapted.scheduleResult.proposedBlocks
        .map((b) => `${b.title} (${b.dateStr} ${b.startTime}-${b.endTime})`)
        .join(', ')}.`,
    });
  }

  // =========================================================================
  // TEST 10: Remaining workload exceeds available time before exam -> Explicit warning & prioritization
  // =========================================================================
  {
    const memory = createDefaultPersistentMemory('Africa/Cairo');
    const input: ScheduleGenerationInput = {
      nowIso: '2025-05-15T17:00:00.000Z', // 20:00 (8:00 PM) Cairo time - only ~2h left today, exam in 1 day!
      timezone: 'Africa/Cairo',
      targetDays: 1,
      existingEvents: [],
      tasks: [],
      studyModules: [
        {
          id: 'mod_surg',
          name: 'General Surgery Final',
          examDate: '2025-05-16', // Tomorrow!
        },
      ],
      studyItems: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
        id: `surg_${n}`,
        moduleId: 'mod_surg',
        title: `Lecture ${n}: Acute Abdomen & Trauma ${n}`,
        type: 'lecture',
        status: 'unstudied',
        estimatedMinutes: 60,
        lectureNumber: n,
        difficulty: 'high',
      })),
      memory,
    };

    const res = generateContextAwareSchedule(input);
    const surgReport = res.examReports.find((r) => r.moduleId === 'mod_surg');
    const hasExplicitWarning = res.warnings.length > 0 && Boolean(surgReport?.isAtRisk && surgReport?.warningMessage);
    const hasUnscheduledWithReason = res.unscheduledTasks.length > 0;
    const passed = hasExplicitWarning && hasUnscheduledWithReason && res.proposedBlocks[0]?.lectureNumber === 1;

    results.push({
      id: 'TEST 10',
      name: 'Remaining workload (8h+) exceeds available time before tomorrow exam -> Explicit warning & Lecture 1 prioritized',
      passed,
      details: `Warning emitted: "${res.warnings[0]}". Unscheduled overflow items explained: ${res.unscheduledTasks.length}. First scheduled: "${res.proposedBlocks[0]?.title}".`,
    });
  }

  // Print formatted report
  console.log('\n================================================================================');
  console.log('LIFE OS — CONTEXT-AWARE SCHEDULING ENGINE AUTOMATED VERIFICATION (TESTS 1 - 10)');
  console.log('================================================================================');
  let passedCount = 0;
  for (const r of results) {
    if (r.passed) passedCount++;
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.id}: ${r.name}`);
    console.log(`       -> ${r.details}`);
  }
  console.log('--------------------------------------------------------------------------------');
  console.log(`TOTAL: ${passedCount}/${results.length} TESTS PASSED`);
  console.log('================================================================================\n');

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runAllTests();
