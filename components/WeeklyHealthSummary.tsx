"use client";

import type { WeekCalendar, MealSlotType } from "@/types/calendar";
import { MEAL_SLOTS } from "@/types/calendar";
import type { WeeklyGoalInput } from "@/lib/ai/menu-prompt";
import { scoreBarColor } from "@/lib/nutrition-calc";

interface Props {
  calendar: WeekCalendar;
  goals: WeeklyGoalInput;
}

interface NutrientTotal {
  calories:   number;
  proteinG:   number;
  fiberG:     number;
  vegetableG: number;
  mealCount:  number;
}

function sumCalendar(calendar: WeekCalendar): NutrientTotal {
  const totals: NutrientTotal = { calories: 0, proteinG: 0, fiberG: 0, vegetableG: 0, mealCount: 0 };
  for (const day of calendar) {
    for (const slot of MEAL_SLOTS as MealSlotType[]) {
      const recipe = day[slot];
      if (!recipe) continue;
      totals.calories   += recipe.caloriesPlanned;
      totals.proteinG   += recipe.proteinG;
      totals.fiberG     += recipe.fiberG;
      totals.vegetableG += recipe.vegetableG;
      totals.mealCount  += 1;
    }
  }
  return totals;
}

interface BarRowProps {
  label: string;
  icon: string;
  actual: number;
  target: number;  // 7日分の目標合計
  unit: string;
  deficit: number | null;  // null なら達成
}

function BarRow({ label, icon, actual, target, unit, deficit }: BarRowProps) {
  const pct = Math.min(100, Math.round((actual / target) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium text-gray-700">
          <span>{icon}</span>{label}
        </span>
        <span className="text-xs text-gray-400">
          <span className={`font-bold ${pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-blue-600' : 'text-amber-600'}`}>
            {actual.toLocaleString()}{unit}
          </span>
          {' '}/ {target.toLocaleString()}{unit}
          {' '}
          <span className={`font-semibold ${pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-blue-600' : 'text-amber-600'}`}>
            {pct}%
          </span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${scoreBarColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {deficit !== null && deficit > 0 && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <span>⚠️</span>
          あと <span className="font-bold">{deficit.toLocaleString()}{unit}</span> 足りません
        </p>
      )}
    </div>
  );
}

export default function WeeklyHealthSummary({ calendar, goals }: Props) {
  const totals = sumCalendar(calendar);
  const filledSlots = totals.mealCount;
  const totalSlots = calendar.length * MEAL_SLOTS.length;

  // 7日分の目標合計
  const targetCalories   = goals.targetCalories   * 7;
  const targetProtein    = goals.targetProteinG   * 7;
  const targetFiber      = goals.targetFiberG     * 7;
  const targetVegetable  = goals.targetVegetableG * 7;

  const proteinDeficit   = Math.max(0, targetProtein   - totals.proteinG);
  const fiberDeficit     = Math.max(0, targetFiber     - totals.fiberG);
  const vegetableDeficit = Math.max(0, targetVegetable - totals.vegetableG);
  const calorieDeficit   = Math.max(0, targetCalories  - totals.calories);

  // 全体スコア（4軸平均）
  const avgScore = Math.round([
    Math.min(100, (totals.vegetableG / targetVegetable) * 100),
    Math.min(100, (totals.proteinG   / targetProtein)   * 100),
    Math.min(100, (totals.fiberG     / targetFiber)     * 100),
    Math.min(100, (totals.calories   / targetCalories)  * 100),
  ].reduce((a, b) => a + b, 0) / 4);

  const grade =
    avgScore >= 88 ? 'S' :
    avgScore >= 73 ? 'A' :
    avgScore >= 58 ? 'B' : 'C';

  const gradeStyle = {
    S: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    A: 'bg-blue-100 text-blue-700 border-blue-300',
    B: 'bg-amber-100 text-amber-700 border-amber-300',
    C: 'bg-red-100 text-red-700 border-red-300',
  }[grade];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
            週間ヘルススコア
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {filledSlots}/{totalSlots} スロット入力済み
          </p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black text-2xl ${gradeStyle}`}>
          {grade}
          <span className="text-xs font-medium opacity-70">{avgScore}</span>
        </div>
      </div>

      <div className="space-y-4">
        <BarRow
          label="野菜・果物"
          icon="🥬"
          actual={totals.vegetableG}
          target={targetVegetable}
          unit="g"
          deficit={vegetableDeficit > 0 ? vegetableDeficit : null}
        />
        <BarRow
          label="タンパク質"
          icon="🥩"
          actual={totals.proteinG}
          target={targetProtein}
          unit="g"
          deficit={proteinDeficit > 0 ? proteinDeficit : null}
        />
        <BarRow
          label="食物繊維"
          icon="🌾"
          actual={totals.fiberG}
          target={targetFiber}
          unit="g"
          deficit={fiberDeficit > 0 ? fiberDeficit : null}
        />
        <BarRow
          label="カロリー"
          icon="🔥"
          actual={totals.calories}
          target={targetCalories}
          unit=" kcal"
          deficit={calorieDeficit > 100 ? calorieDeficit : null}
        />
      </div>

      {/* 未入力スロットの警告 */}
      {filledSlots < totalSlots && (
        <div className="mt-4 pt-3 border-t border-gray-50 flex items-start gap-2">
          <span className="text-sm">📋</span>
          <p className="text-xs text-gray-500">
            <span className="font-bold text-gray-700">{totalSlots - filledSlots} スロット</span>
            が空です。レシピを追加するとスコアが正確になります。
          </p>
        </div>
      )}
    </div>
  );
}
