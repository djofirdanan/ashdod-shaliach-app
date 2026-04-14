// ============================================================
// אשדוד-שליח – Rating Model helpers
// ============================================================

import { Rating, UserRole, RatingTag } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function createRating(params: {
  deliveryId: string;
  raterId: string;
  raterRole: UserRole;
  ratedId: string;
  score: number;
  comment?: string;
  tags?: RatingTag[];
}): Rating {
  return {
    id: uuidv4(),
    deliveryId: params.deliveryId,
    raterId: params.raterId,
    raterRole: params.raterRole,
    ratedId: params.ratedId,
    score: params.score,
    comment: params.comment,
    tags: params.tags ?? [],
    createdAt: new Date(),
  };
}

/**
 * Compute new average rating given existing average, count, and new score.
 */
export function computeNewAverage(
  currentAverage: number,
  currentCount: number,
  newScore: number
): { newAverage: number; newCount: number } {
  const newCount = currentCount + 1;
  const newAverage = (currentAverage * currentCount + newScore) / newCount;
  return {
    newAverage: Math.round(newAverage * 100) / 100,
    newCount,
  };
}
