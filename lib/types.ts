export type FoodCategory =
  | '野菜・果物'
  | '肉・魚'
  | '乳製品・卵'
  | '穀物・豆類'
  | '調味料・その他';

export const FOOD_CATEGORIES: FoodCategory[] = [
  '野菜・果物',
  '肉・魚',
  '乳製品・卵',
  '穀物・豆類',
  '調味料・その他',
];

export const CATEGORY_EMOJI: Record<FoodCategory, string> = {
  '野菜・果物': '🥬',
  '肉・魚': '🥩',
  '乳製品・卵': '🥚',
  '穀物・豆類': '🌾',
  '調味料・その他': '🧂',
};

/** meal_plan_ingredients テーブルの1行に相当 */
export interface RawIngredient {
  foodName: string;
  amountG: number;
  unitDisplay: string;   // '1/2個', '大さじ2', '200g' など表示用
  category: FoodCategory;
  isStaple: boolean;     // 常備品フラグ（醤油・油など）
  dayLabel: string;      // '月'〜'日'
  recipeName: string;
}

/** 集計後の1買い物アイテム */
export interface ShoppingItem {
  id: string;
  foodName: string;
  totalAmountG: number;
  displayAmount: string;
  category: FoodCategory;
  isStaple: boolean;
  sources: Array<{
    dayLabel: string;
    recipeName: string;
    amountDisplay: string;
  }>;
}

/** generateShoppingList の返り値 */
export interface ShoppingList {
  byCategory: Record<FoodCategory, ShoppingItem[]>;
  staples: ShoppingItem[];
  totalPurchaseItems: number;
  totalVegetableG: number; // 達成度計算用
}

/** weekly_goals テーブルに相当 */
export interface WeeklyGoalTargets {
  targetCalories: number;  // kcal/日
  targetProteinG: number;  // g/日
  targetVegetableG: number; // g/日（厚労省推奨350g）
}

/** 栄養達成度スコア */
export interface AchievementScore {
  calories: { actual: number; target: number; pct: number };
  protein:  { actual: number; target: number; pct: number };
  vegetables: { actual: number; target: number; pct: number };
}
