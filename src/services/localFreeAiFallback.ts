import {
  getNowInTimezone,
  generateContextAwareSchedule,
  runAdaptiveReschedule,
  extractMemoryCorrectionFromText,
  createDefaultPersistentMemory,
  parseTimeToMinutes,
  formatMinutesToTime,
  roundUpToNext5Minutes,
  addDaysToDateStr,
  ScheduleGenerationInput,
} from './schedulingEngine';

export interface LocalAttachmentPayload {
  fileName: string;
  mimeType: string;
  base64Data?: string;
  textContent?: string;
}

/**
 * Extracts readable text from a base64-encoded PDF or text payload directly in the browser
 * so PDF Schedule Import and Lecture Synthesis work 100% free even on static hosting without billing.
 */
export function extractTextFromAttachmentClient(attachment?: LocalAttachmentPayload, rawText?: string): string {
  if (rawText && rawText.trim().length > 0) return rawText.trim();
  if (attachment?.textContent && attachment.textContent.trim().length > 0) {
    return attachment.textContent.trim();
  }
  if (attachment?.base64Data) {
    try {
      const binary = atob(attachment.base64Data);
      const matches = binary.match(/\(([^()]{4,140})\)/g) || [];
      const extracted = matches
        .map((m) => m.slice(1, -1).replace(/\\[nrt]/g, ' '))
        .filter(
          (s) =>
            /[A-Za-z]{3,}/.test(s) &&
            !/Font|Type|Page|Catalog|Filter|FlateDecode|MediaBox|Resources|Parent/i.test(s)
        )
        .join('\n');
      if (extracted.trim().length > 10) {
        return extracted.trim();
      }
    } catch {
      // ignore base64 decode errors
    }
  }
  return '';
}

/**
 * Client-side zero-billing PDF Schedule / Syllabus parser fallback.
 */
export function parseSchedulePdfClientFallback(params: {
  attachment?: LocalAttachmentPayload;
  rawText?: string;
  moduleCode?: string;
  todayDate: string;
}) {
  const fileNameHint = params.attachment?.fileName || 'Schedule.pdf';
  const moduleCode = (params.moduleCode || 'MOD101').toUpperCase();
  const cleanName = fileNameHint
    .replace(/\.(pdf|txt|md|csv|ics)$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  const sourceText = extractTextFromAttachmentClient(params.attachment, params.rawText);
  const lines = sourceText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length >= 3 &&
        !/^%[A-Za-z0-9-]/.test(l) &&
        !/^(obj|endobj|stream|endstream|xref|trailer)$/i.test(l)
    );

  const lectures: {
    lectureNumber: number;
    title: string;
    estimatedMinutes: number;
    difficulty: 'HIGH' | 'MEDIUM' | 'LOW';
    date?: string;
    startTime?: string;
    endTime?: string;
  }[] = [];

  const calendarEvents: {
    title: string;
    eventType: 'lecture' | 'exam' | 'study_block' | 'fixed';
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
  }[] = [];

  let seq = 1;
  for (const line of lines.slice(0, 60)) {
    const dateMatch = line.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    const timeRangeMatch = line.match(/\b(\d{1,2}:\d{2})\s*(?:-|–|to)\s*(\d{1,2}:\d{2})\b/i);
    const singleTimeMatch = line.match(/\b(\d{1,2}:\d{2})\b/);
    const lecNumMatch = line.match(/(?:lecture|lec|week|module|session|topic)\s*#?\s*(\d+)/i);
    const num = lecNumMatch ? parseInt(lecNumMatch[1], 10) : seq;

    const eventDate = dateMatch
      ? dateMatch[1]
      : addDaysToDateStr(params.todayDate, (seq - 1) % 7);
    const startTime = timeRangeMatch
      ? timeRangeMatch[1].padStart(5, '0')
      : singleTimeMatch
      ? singleTimeMatch[1].padStart(5, '0')
      : undefined;
    let endTime = timeRangeMatch ? timeRangeMatch[2].padStart(5, '0') : undefined;
    if (startTime && !endTime) {
      const startMin = parseTimeToMinutes(startTime);
      endTime = formatMinutesToTime(Math.min(23 * 60, startMin + 60));
    }

    const isExam = /\b(exam|midterm|final|quiz|assessment)\b/i.test(line);
    const cleanTitle = line
      .replace(/\b(\d{4}-\d{2}-\d{2})\b/g, '')
      .replace(/\b(\d{1,2}:\d{2})\s*(?:-|–|to)\s*(\d{1,2}:\d{2})\b/gi, '')
      .replace(/^[-•*\s|]+|[-•*\s|]+$/g, '')
      .trim();

    if (!cleanTitle || cleanTitle.length < 3) continue;

    const formattedLectureTitle = /^lecture\s*\d+/i.test(cleanTitle)
      ? cleanTitle
      : `Lecture ${String(num).padStart(2, '0')}: ${cleanTitle}`;

    if (!isExam) {
      lectures.push({
        lectureNumber: num,
        title: formattedLectureTitle.slice(0, 160),
        estimatedMinutes: 45,
        difficulty: /pathology|pharmacology|physiology|surgery|neuro|cardio|mechanism/i.test(
          cleanTitle
        )
          ? 'HIGH'
          : 'MEDIUM',
        date: dateMatch ? dateMatch[1] : undefined,
        startTime,
        endTime,
      });
      seq++;
    }

    if (startTime && endTime) {
      calendarEvents.push({
        title: isExam ? cleanTitle.slice(0, 140) : formattedLectureTitle.slice(0, 140),
        eventType: isExam ? 'exam' : 'lecture',
        date: eventDate,
        startTime,
        endTime,
        location: 'University Hall / Study Desk',
      });
    }
  }

  if (lectures.length === 0) {
    for (let i = 1; i <= 4; i++) {
      lectures.push({
        lectureNumber: i,
        title: `Lecture 0${i}: ${cleanName || moduleCode} — Core Topic ${i}`,
        estimatedMinutes: 45,
        difficulty: i >= 3 ? 'HIGH' : 'MEDIUM',
      });
    }
  }

  return {
    detectedModuleCode: moduleCode,
    detectedModuleTitle: cleanName || 'Imported Schedule Module',
    summary: `Extracted ${lectures.length} lectures${
      calendarEvents.length > 0 ? ` and ${calendarEvents.length} scheduled calendar slots` : ''
    } from "${fileNameHint}".`,
    lectures,
    calendarEvents,
  };
}

/**
 * Client-side zero-billing Lecture PDF / Topic Synthesis fallback.
 */
export function synthesizeStudyClientFallback(params: {
  moduleCode: string;
  lectureTitle: string;
  rawContent?: string;
  attachment?: LocalAttachmentPayload;
}) {
  const extracted = extractTextFromAttachmentClient(params.attachment, params.rawContent);
  const sentences = (extracted || params.lectureTitle)
    .split(/(?<=[.!?])\s+|\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);

  const summary =
    sentences.slice(0, 5).join(' ') ||
    `Structured academic synthesis for ${params.moduleCode}: ${params.lectureTitle}. Focus on core physiological/pathological mechanisms, diagnostic criteria, and clinical applications.`;

  return {
    sourceSummary: summary,
    result: summary,
    additionalExplanation: `Review ${params.lectureTitle} using active recall and spaced repetition before your ${params.moduleCode} exam.`,
    estimatedMinutes: 45,
    flashcards: [
      {
        frontPrompt: `What is the primary concept and mechanism covered in ${params.lectureTitle}?`,
        backAnswer:
          sentences[0] ||
          `Core foundational principles and mechanism of ${params.lectureTitle} (${params.moduleCode}).`,
      },
      {
        frontPrompt: `What are the high-yield clinical or exam distinctions in ${params.lectureTitle}?`,
        backAnswer:
          sentences[1] ||
          sentences[0] ||
          `Key diagnostic and analytical takeaways from ${params.lectureTitle}.`,
      },
      {
        frontPrompt: `How does ${params.lectureTitle} connect to sequential lectures in ${params.moduleCode}?`,
        backAnswer:
          sentences[2] ||
          `Builds prerequisite understanding for advanced clinical management and MCQ problem solving in ${params.moduleCode}.`,
      },
    ],
  };
}

/**
 * Client-side zero-billing Spoon Feeder AI execution engine when running without a backend or API key.
 */
export function executeLocalSpoonFeederFallback(
  prompt: string,
  contextSnapshot: Record<string, any>,
  attachment?: LocalAttachmentPayload
) {
  const lower = prompt.toLowerCase();
  const timezone =
    contextSnapshot?.timezone || contextSnapshot?.profile?.timezone || 'Africa/Cairo';
  const nowInfo = getNowInTimezone(timezone);
  const todayDate = contextSnapshot?.todayDate || nowInfo.dateStr;
  const toolCalls: { name: string; args: Record<string, any> }[] = [];
  let reply = '';

  const scheduleInput: ScheduleGenerationInput = {
    nowIso: nowInfo.utcIso,
    timezone,
    targetDays: lower.includes('week') ? 7 : 1,
    existingEvents: Array.isArray(contextSnapshot?.events)
      ? contextSnapshot.events.map((e: any) => ({
          id: String(e.id || ''),
          title: String(e.title || ''),
          dateStr: String(e.date || todayDate),
          startTime: String(e.startTime || '09:00'),
          endTime: String(e.endTime || '10:00'),
          category: String(e.eventType || 'fixed'),
        }))
      : [],
    tasks: Array.isArray(contextSnapshot?.tasks)
      ? contextSnapshot.tasks.map((t: any) => ({
          id: String(t.id || ''),
          title: String(t.title || ''),
          category: String(t.category || 'study'),
          priority:
            t.priority === 'critical' || t.priority === 'high'
              ? 'high'
              : t.priority === 'low'
              ? 'low'
              : 'medium',
          estimatedMinutes: Number(t.estimatedMinutes) || 45,
          completed: t.status === 'completed',
          dueDate: t.dueDate ? String(t.dueDate) : undefined,
        }))
      : [],
    studyModules: Array.isArray(contextSnapshot?.studyModules)
      ? contextSnapshot.studyModules.map((m: any) => ({
          id: String(m.id || ''),
          name: `${m.code || 'MOD'} — ${m.title || 'Study Module'}`,
          examDate: String(m.examDate || todayDate),
        }))
      : [],
    studyItems: Array.isArray(contextSnapshot?.studyItems)
      ? contextSnapshot.studyItems.map((s: any) => ({
          id: String(s.id || ''),
          moduleId: String(s.moduleId || ''),
          title: String(s.title || ''),
          type: String(s.itemType || 'lecture'),
          status: String(s.status || 'unstudied'),
          estimatedMinutes: Number(s.estimatedMinutes) || 45,
        }))
      : [],
    memory: contextSnapshot?.persistentMemory || createDefaultPersistentMemory(timezone),
  };

  // 1. Check for memory preference / correction
  const memoryCheck = extractMemoryCorrectionFromText(prompt, todayDate);
  if (memoryCheck.detected && memoryCheck.learnedRule) {
    toolCalls.push({
      name: 'save_learned_memory_preference',
      args: {
        ruleText: memoryCheck.learnedRule.ruleText,
        category: memoryCheck.learnedRule.ruleType,
        blockedStart: memoryCheck.learnedRule.startTime,
        blockedEnd: memoryCheck.learnedRule.endTime,
        isPermanent: !memoryCheck.requiresUserConfirmation,
      },
    });
  }

  // 2. Adaptive rescheduling triggers
  if (
    /\b(missed|skipped|overslept)\b/i.test(lower) ||
    /\bmove\s+.+?\s+to\s+(tomorrow|next\s+day|\d{4}-\d{2}-\d{2})/i.test(lower) ||
    /\b(exhausted|burned out|very tired|low energy)\b/i.test(lower) ||
    /\bexam\b.*?\b(moved|postponed|rescheduled)\b/i.test(lower) ||
    /\bonly\s+\d+(?:\.\d+)?\s*(?:hours?|hrs?)\s*available/i.test(lower)
  ) {
    const adapted = runAdaptiveReschedule({
      utterance: prompt,
      baseInput: { ...scheduleInput, targetDays: 3 },
    });
    toolCalls.push({
      name: 'adapt_existing_schedule',
      args: {
        reason: prompt,
        scheduleProposal: adapted.scheduleResult,
      },
    });
    reply = `Adapted your schedule around current time ${nowInfo.timeStr} (${timezone}):\n• ${adapted.changesExplained.join('\n• ')}`;
    return {
      reply,
      toolCalls,
      functionCalls: toolCalls,
      scheduleProposal: adapted.scheduleResult,
      usedModel: 'free-local-engine',
    };
  }

  // 3. Context-aware schedule generation triggers
  if (
    lower.includes('plan my day') ||
    lower.includes('plan my week') ||
    lower.includes('generate schedule') ||
    lower.includes('daily schedule') ||
    lower.includes('weekly schedule') ||
    lower.includes('context-aware schedule') ||
    lower.includes('rebalance')
  ) {
    const plan = generateContextAwareSchedule(scheduleInput);
    toolCalls.push({
      name: 'generate_context_aware_schedule',
      args: {
        targetDays: scheduleInput.targetDays,
        scheduleProposal: plan,
      },
    });
    reply = `Generated a context-aware schedule starting after ${nowInfo.timeStr} (${timezone}) with ${plan.proposedBlocks.length} study blocks (${plan.energyDistribution.totalScheduledStudyMinutes}m active study + ${plan.energyDistribution.breakMinutes}m breaks). Review and approve the staged blocks below.`;
    return {
      reply,
      toolCalls,
      functionCalls: toolCalls,
      scheduleProposal: plan,
      usedModel: 'free-local-engine',
    };
  }

  // 4. PDF / Lecture attachment synthesis
  if (
    attachment ||
    lower.includes('flashcard') ||
    lower.includes('summarize') ||
    lower.includes('summary')
  ) {
    const modCode = contextSnapshot?.studyModules?.[0]?.code || 'STUDY';
    const topicTitle = attachment
      ? attachment.fileName.replace(/\.(pdf|txt|md)$/i, '')
      : prompt.replace(/^(summarize|create flashcards for)\s*/i, '').trim() || 'Lecture Topic';
    const synth = synthesizeStudyClientFallback({
      moduleCode: modCode,
      lectureTitle: topicTitle,
      rawContent: prompt,
      attachment,
    });
    toolCalls.push({
      name: 'synthesize_lecture_and_flashcards',
      args: {
        moduleCode: modCode,
        lectureTitle: topicTitle,
        summaryNotes: synth.sourceSummary,
        estimatedMinutes: synth.estimatedMinutes,
        saveToLibraryNotes: true,
        flashcards: synth.flashcards,
      },
    });
    reply = `Synthesized "${topicTitle}" into a structured lecture summary and created ${synth.flashcards.length} active-recall flashcards in your Study workspace.`;
    return { reply, toolCalls, functionCalls: toolCalls, usedModel: 'free-local-engine' };
  }

  // 5. Direct calendar scheduling (never in the past)
  if (lower.includes('schedule') || lower.includes('block')) {
    const timeMatch = prompt.match(/\b(\d{1,2}:\d{2})\b/);
    let startMin = timeMatch
      ? parseTimeToMinutes(timeMatch[1].padStart(5, '0'))
      : roundUpToNext5Minutes(nowInfo.minutesFromMidnight + 15);
    let targetDate = todayDate;
    if (startMin < nowInfo.minutesFromMidnight + 5) {
      startMin = roundUpToNext5Minutes(nowInfo.minutesFromMidnight + 15);
    }
    if (startMin + 45 > 23 * 60) {
      targetDate = addDaysToDateStr(todayDate, 1);
      startMin = 9 * 60;
    }
    const startTime = formatMinutesToTime(startMin);
    const endTime = formatMinutesToTime(startMin + 45);
    const title =
      prompt.replace(/^schedule\s+(a\s+)?/i, '').slice(0, 80).trim() || 'Focused Study Session';
    toolCalls.push({
      name: 'schedule_study_block',
      args: {
        title,
        eventType: 'study_block',
        date: targetDate,
        startTime,
        endTime,
        location: 'Study Desk',
      },
    });
    reply = `Scheduled "${title}" on ${targetDate} from ${startTime} to ${endTime} (${timezone}).`;
    return { reply, toolCalls, functionCalls: toolCalls, usedModel: 'free-local-engine' };
  }

  // 6. Task creation
  if (lower.includes('task') || lower.includes('todo') || lower.includes('create ') || lower.includes('add ')) {
    const cleanTitle =
      prompt
        .replace(/^(create|add)\s+(a\s+)?(high-priority\s+|critical\s+)?(task\s+to\s+|task\s*:?\s*)?/i, '')
        .trim() || prompt;
    toolCalls.push({
      name: 'create_task',
      args: {
        title: cleanTitle.slice(0, 120),
        priority: lower.includes('critical') ? 'critical' : lower.includes('high') ? 'high' : 'medium',
        category: 'study',
        estimatedMinutes: 45,
        dueDate: todayDate,
      },
    });
    reply = `Created task "${cleanTitle}" due ${todayDate}.`;
    return { reply, toolCalls, functionCalls: toolCalls, usedModel: 'free-local-engine' };
  }

  if (memoryCheck.detected && memoryCheck.learnedRule) {
    return {
      reply: memoryCheck.confirmationPrompt,
      toolCalls,
      functionCalls: toolCalls,
      usedModel: 'free-local-engine',
    };
  }

  return {
    reply: `Life OS is active (${todayDate} · ${nowInfo.timeStr} ${timezone}). You can ask me to generate your context-aware schedule, adapt a missed session, create tasks, or upload a Lecture/Schedule PDF.`,
    toolCalls,
    functionCalls: toolCalls,
    usedModel: 'free-local-engine',
  };
}
