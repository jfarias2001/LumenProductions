import { RETENTION_GATE } from '@content-engine/shared';

export interface RetentionAnswer {
  question: string;
  good: boolean;
}

export function evaluateRetention(answers: RetentionAnswer[]): { badCount: number; passed: boolean } {
  const badCount = answers.filter((a) => !a.good).length;
  return { badCount, passed: badCount < RETENTION_GATE.BAD_COUNT_THRESHOLD };
}
