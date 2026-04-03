/**
 * lib/nutrition-calc.ts
 * 献立の栄養スコアを算出するロジック。
 * GeneratedMealItem（fiberG・vegetableG を含む拡張型）を受け取り、
 * 0〜100 の達成率スコアとグレード（S/A/B/C）を返す。
 */

import type { GeneratedMealItem, WeeklyGoalInput } from './ai/menu-prompt';

// ---------------------------------------------------------------------------
// 出力型定義
// ---------------------------------------------------------------------------

export type NutritionGrade = 'S' | 'A' | 'B' | 'C';

export interface DayNutritionScore {
  vegetableScore: number;  // 0–100
  proteinScore: number;    // 0–100
  fiberScore: number;      // 0–100
  calorieScore: number;    // 0–100（目標 ±10% で 100）
  overallScore: number;    // 0–100（加重平均）
  grade: NutritionGrade;
  gradeColor: string;      // Tailwind テキストカラー
  gradeBg: string;         // Tailwind 背景カラー
  // 日別栄養合計
  totalCalories: number;
  totalProteinG: number;
  totalFiberG: number;
  totalVegetableG: number;
}

export interface WeeklyNutritionScore {
  avgVegetableScore: number;
  avgProteinScore: number;
  avgFiberScore: number;
  avgCalorieScore: number;
  avgOverallScore: number;
  weekGrade: NutritionGrade;
  gradeColor: string;
  gradeBg: string;
  // 週平均の実値
  avgCalories: number;
  avgProteinG: number;
  avgFiberG: number;
  avgVegetableG: number;
}

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

/** 達成率を 0–100 にクランプ */
function scoreFromRatio(actual: number, target: number): number {
  if (target <= 0) return 100;
  return Math.min(100, Math.round((actual / target) * 100));
}

/**
 * カロリーは「目標 ±15% 以内」を満点とし、
 * 離れるほど減点する特殊スコア（過少・過多どちらも減点）。
 */
function calorieScore(actual: number, target: number): number {
  const ratio = actual / target;
  if (ratio >= 0.85 && ratio <= 1.15) return 100;
  const deviation = Math.abs(ratio - 1.0);
  return Math.max(0, Math.round((1 - deviation * 2) * 100));
}

/** スコアからグレードを決定 */
function gradeFromScore(score: number): NutritionGrade {
  if (score >= 88) return 'S';
  if (score >= 73) return 'A';
  if (score >= 58) return 'B';
  return 'C';
}

const GRADE_STYLE: Record<NutritionGrade, { color: string; bg: string }> = {
  S: { color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-300' },
  A: { color: 'text-blue-700',    bg: 'bg-blue-100 border-blue-300'       },
  B: { color: 'text-amber-700',   bg: 'bg-amber-100 border-amber-300'     },
  C: { color: 'text-red-700',     bg: 'bg-red-100 border-red-300'         },
};

// スコアの重み（合計 = 1.0）
const WEIGHT = {
  vegetable: 0.35,
  protein:   0.35,
  fiber:     0.20,
  calorie:   0.10,
} as const;

// ---------------------------------------------------------------------------
// メイン計算関数
// ---------------------------------------------------------------------------

/**
 * 1日分のメニューアイテムから栄養スコアを計算する。
 *
 * @param items   GeneratedMealItem[]（朝・昼・夕・間食）
 * @param targets WeeklyGoalInput（weekly_goals テーブルの値）
 */
export function calcDayScore(
  items: GeneratedMealItem[],
  targets: WeeklyGoalInput
): DayNutritionScore {
  const totalCalories  = items.reduce((s, i) => s + i.caloriesPlanned, 0);
  const totalProteinG  = items.reduce((s, i) => s + i.proteinG, 0);
  const totalFiberG    = items.reduce((s, i) => s + i.fiberG, 0);
  const totalVegetableG = items.reduce((s, i) => s + i.vegetableG, 0);

  const vegetableScore = scoreFromRatio(totalVegetableG, targets.targetVegetableG);
  const proteinScore   = scoreFromRatio(totalProteinG,   targets.targetProteinG);
  const fiberScore     = scoreFromRatio(totalFiberG,     targets.targetFiberG);
  const calScore       = calorieScore(totalCalories,     targets.targetCalories);

  const overallScore = Math.round(
    vegetableScore * WEIGHT.vegetable +
    proteinScore   * WEIGHT.protein   +
    fiberScore     * WEIGHT.fiber     +
    calScore       * WEIGHT.calorie
  );

  const grade = gradeFromScore(overallScore);

  return {
    vegetableScore,
    proteinScore,
    fiberScore,
    calorieScore: calScore,
    overallScore,
    grade,
    gradeColor: GRADE_STYLE[grade].color,
    gradeBg:    GRADE_STYLE[grade].bg,
    totalCalories,
    totalProteinG,
    totalFiberG,
    totalVegetableG,
  };
}

/**
 * 7日分の DayNutritionScore から週単位スコアを集計する。
 */
export function calcWeeklyScore(
  dayScores: DayNutritionScore[]
): WeeklyNutritionScore {
  const n = dayScores.length || 1;
  const avg = (key: keyof DayNutritionScore) =>
    Math.round(dayScores.reduce((s, d) => s + (d[key] as number), 0) / n);

  const avgVeg  = avg('vegetableScore');
  const avgProt = avg('proteinScore');
  const avgFib  = avg('fiberScore');
  const avgCal  = avg('calorieScore');

  const avgOverall = Math.round(
    avgVeg  * WEIGHT.vegetable +
    avgProt * WEIGHT.protein   +
    avgFib  * WEIGHT.fiber     +
    avgCal  * WEIGHT.calorie
  );

  const grade = gradeFromScore(avgOverall);

  return {
    avgVegetableScore: avgVeg,
    avgProteinScore:   avgProt,
    avgFiberScore:     avgFib,
    avgCalorieScore:   avgCal,
    avgOverallScore:   avgOverall,
    weekGrade:   grade,
    gradeColor:  GRADE_STYLE[grade].color,
    gradeBg:     GRADE_STYLE[grade].bg,
    avgCalories:    avg('totalCalories'),
    avgProteinG:    avg('totalProteinG'),
    avgFiberG:      avg('totalFiberG'),
    avgVegetableG:  avg('totalVegetableG'),
  };
}

/**
 * 達成率 (pct) から UI 向けのプログレスバーカラーを返す。
 */
export function scoreBarColor(pct: number): string {
  if (pct >= 90) return 'bg-emerald-400';
  if (pct >= 70) return 'bg-blue-400';
  if (pct >= 50) return 'bg-amber-400';
  return 'bg-red-400';
}
