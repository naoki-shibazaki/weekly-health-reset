import type {
  RawIngredient,
  ShoppingItem,
  ShoppingList,
  FoodCategory,
  AchievementScore,
  WeeklyGoalTargets,
} from './types';
import { FOOD_CATEGORIES } from './types';

// ---------------------------------------------------------------------------
// 単位変換ヘルパー
// ---------------------------------------------------------------------------

/** グラム数を自然な表示量に変換する */
function formatDisplayAmount(foodName: string, totalG: number): string {
  // 卵：60g ≒ 1個
  if (foodName === '卵') {
    const count = Math.round(totalG / 60);
    return `${count}個（約${totalG}g）`;
  }
  // バナナ：100g ≒ 1本
  if (foodName === 'バナナ') {
    const count = Math.round(totalG / 100);
    return `${count}本（約${totalG}g）`;
  }
  // 1kg 以上はkg表示
  if (totalG >= 1000) {
    return `${(totalG / 1000).toFixed(1)}kg`;
  }
  return `${totalG}g`;
}

// ---------------------------------------------------------------------------
// 集計ロジック
// ---------------------------------------------------------------------------

/**
 * 1週間分の生食材リストを集計・分類して ShoppingList を返す。
 *
 * 処理ステップ：
 * 1. foodName でグループ化し、amountG を合算
 * 2. 各グループを ShoppingItem に変換
 * 3. isStaple でスタープ品を分離
 * 4. カテゴリ別に分類
 */
export function generateShoppingList(ingredients: RawIngredient[]): ShoppingList {
  // --- Step 1: foodName でグループ化 ---
  const grouped = new Map<string, {
    totalAmountG: number;
    category: FoodCategory;
    isStaple: boolean;
    sources: Array<{ dayLabel: string; recipeName: string; amountDisplay: string }>;
  }>();

  for (const ing of ingredients) {
    const existing = grouped.get(ing.foodName);
    if (existing) {
      existing.totalAmountG += ing.amountG;
      existing.sources.push({
        dayLabel: ing.dayLabel,
        recipeName: ing.recipeName,
        amountDisplay: ing.unitDisplay,
      });
    } else {
      grouped.set(ing.foodName, {
        totalAmountG: ing.amountG,
        category: ing.category,
        isStaple: ing.isStaple,
        sources: [{
          dayLabel: ing.dayLabel,
          recipeName: ing.recipeName,
          amountDisplay: ing.unitDisplay,
        }],
      });
    }
  }

  // --- Step 2: ShoppingItem に変換 ---
  const allItems: ShoppingItem[] = Array.from(grouped.entries()).map(
    ([foodName, data], index) => ({
      id: `item-${index}`,
      foodName,
      totalAmountG: data.totalAmountG,
      displayAmount: formatDisplayAmount(foodName, data.totalAmountG),
      category: data.category,
      isStaple: data.isStaple,
      sources: data.sources,
    })
  );

  // --- Step 3: 常備品と購入品に分離 ---
  const purchaseItems = allItems.filter((i) => !i.isStaple);
  const staples       = allItems.filter((i) =>  i.isStaple);

  // --- Step 4: カテゴリ別に分類（カテゴリ内は食材名でソート） ---
  const byCategory = Object.fromEntries(
    FOOD_CATEGORIES.map((cat) => [
      cat,
      purchaseItems
        .filter((i) => i.category === cat)
        .sort((a, b) => a.foodName.localeCompare(b.foodName, 'ja')),
    ])
  ) as Record<FoodCategory, ShoppingItem[]>;

  // 野菜・果物カテゴリの合計グラム数（達成度計算用）
  const totalVegetableG = byCategory['野菜・果物'].reduce(
    (sum, i) => sum + i.totalAmountG,
    0
  );

  return {
    byCategory,
    staples: staples.sort((a, b) => a.foodName.localeCompare(b.foodName, 'ja')),
    totalPurchaseItems: purchaseItems.length,
    totalVegetableG,
  };
}

// ---------------------------------------------------------------------------
// 達成度スコア計算
// ---------------------------------------------------------------------------

/**
 * 献立の栄養データと週次目標を比較して達成度を計算する。
 *
 * @param avgDailyCalories  献立から算出した1日平均カロリー
 * @param avgDailyProteinG  献立から算出した1日平均タンパク質(g)
 * @param totalVegetableG   買い物リスト内の野菜・果物の合計重量(7日分)
 * @param goals             weekly_goals の目標値
 */
export function calcAchievementScore(
  avgDailyCalories: number,
  avgDailyProteinG: number,
  totalVegetableG: number,
  goals: WeeklyGoalTargets
): AchievementScore {
  const avgDailyVegetableG = totalVegetableG / 7;

  const pct = (actual: number, target: number) =>
    Math.round((actual / target) * 100);

  return {
    calories: {
      actual: Math.round(avgDailyCalories),
      target: goals.targetCalories,
      pct: pct(avgDailyCalories, goals.targetCalories),
    },
    protein: {
      actual: Math.round(avgDailyProteinG),
      target: goals.targetProteinG,
      pct: pct(avgDailyProteinG, goals.targetProteinG),
    },
    vegetables: {
      actual: Math.round(avgDailyVegetableG),
      target: goals.targetVegetableG,
      pct: pct(avgDailyVegetableG, goals.targetVegetableG),
    },
  };
}

// ---------------------------------------------------------------------------
// クリップボード用テキスト生成
// ---------------------------------------------------------------------------

/**
 * 買い物リストを「【来週の健康リスト】\n・食材名 量」形式のテキストに変換する。
 */
export function formatShoppingListText(list: ShoppingList): string {
  const lines: string[] = ['【来週の健康リスト】', ''];

  for (const cat of FOOD_CATEGORIES) {
    const items = list.byCategory[cat];
    if (!items.length) continue;
    lines.push(`▼ ${cat}`);
    items.forEach((item) => {
      lines.push(`・${item.foodName}　${item.displayAmount}`);
    });
    lines.push('');
  }

  if (list.staples.length) {
    lines.push('▼ 常備品（在庫確認）');
    list.staples.forEach((item) => {
      lines.push(`・${item.foodName}`);
    });
    lines.push('');
  }

  lines.push('※ Weekly Health Reset で自動生成');
  return lines.join('\n');
}
