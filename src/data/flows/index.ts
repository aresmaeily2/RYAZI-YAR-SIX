import type { LessonFlow, FlowStage } from '../../learning/flowTypes';
import type { Question } from '../../types/curriculum';
import { ch2l2Flow } from './ch2l2.flow';

/**
 * مخزن جریان‌های آموزشی. هر درس حداکثر یک جریان دارد؛ درس‌های بدون جریان
 * با تمرین‌های استاندارد درس و موتور یادگیری کار می‌کنند (کاهش باکیفیت ندارد).
 */
export const LESSON_FLOWS: LessonFlow[] = [ch2l2Flow];

export function flowForLesson(lessonId: string): LessonFlow | undefined {
  return LESSON_FLOWS.find((f) => f.lessonId === lessonId);
}

/** همه پرسش‌های inline و بازآزمون همه جریان‌ها با نگاشت به مهارت مربوط */
export function buildFlowQuestionIndex(): ReadonlyMap<string, { skillId: string; lessonId: string }> {
  const index = new Map<string, { skillId: string; lessonId: string }>();
  for (const flow of LESSON_FLOWS) {
    for (const stage of flow.stages) {
      // پرسش‌های inline به مهارت خود جریان تعلق دارند
      for (const q of stage.inlineQuestions ?? []) {
        index.set(q.id, { skillId: flow.skillId, lessonId: flow.lessonId });
      }
      // F10 — گام‌های حذف‌شدهٔ مرحله E نیز شواهد مهارت خود جریان‌اند
      for (const step of stage.completionExample?.missingSteps ?? []) {
        index.set(step.id, { skillId: flow.skillId, lessonId: flow.lessonId });
      }
      // پرسش‌های بازآزمون پیش‌نیاز به مهارت پیش‌نیاز تعلق دارند
      if (stage.prereqSkillId) {
        for (const q of stage.retestQuestions ?? []) {
          index.set(q.id, { skillId: stage.prereqSkillId, lessonId: q.lessonId });
        }
      }
    }
  }
  return index;
}

/** یافتن یک پرسش inline در همه جریان‌ها */
export function findInlineQuestion(questionId: string):
  | { question: Question; flow: LessonFlow; stage: FlowStage }
  | undefined {
  for (const flow of LESSON_FLOWS) {
    for (const stage of flow.stages) {
      const q = stage.inlineQuestions?.find((x) => x.id === questionId);
      if (q) return { question: q, flow, stage };
      const r = stage.retestQuestions?.find((x) => x.id === questionId);
      if (r) return { question: r, flow, stage };
    }
  }
  return undefined;
}
