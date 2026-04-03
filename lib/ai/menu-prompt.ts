/**
 * lib/ai/menu-prompt.ts
 * Claude API への献立生成プロンプトビルダー。
 * 実際の API 呼び出しは app/api/generate-meal-plan/route.ts が担当する。
 */

// ---------------------------------------------------------------------------
// 入力型定義
// ---------------------------------------------------------------------------

/** user_preferences + user_allergies テーブルに相当 */
export interface UserProfile {
  displayName: string;
  allergies: string[];       // ['小麦', '甲殻類', '卵']
  dislikedFoods: string[];   // ['なす', 'パクチー', 'レバー']
  dietStyle: 'standard' | 'low_carb' | 'vegan' | 'vegetarian' | 'keto';
  cookingSkill: 'beginner' | 'intermediate' | 'advanced';
  cookingTimeLimit: number;  // 分（夕食の調理時間上限）
  householdSize: number;
  budgetPerWeekJpy: number;
}

/** weekly_goals テーブルに相当（水〜木に設定したもの） */
export interface WeeklyGoalInput {
  targetCalories: number;     // kcal/日
  targetProteinG: number;     // g/日
  targetVegetableG: number;   // g/日
  targetFiberG: number;       // g/日（推奨：20g）
  focusTags: string[];        // ['野菜多め', '高たんぱく', '腸活', '低糖質']
  freeText?: string;          // '夕食は和食中心、魚を週3回以上'
}

/**
 * food_logs + weekly_reviews から生成された振り返りサマリー。
 * 「1日1問の振り返り」の回答を蓄積したもの。
 */
export interface PastLogEntry {
  weekLabel: string;           // '先週', '2週前'
  likedMeals: string[];        // ['サーモンのホイル焼き', '親子丼']
  dislikedMeals: string[];     // ['豆腐ハンバーグ（パサついた）']
  skippedMeals: string[];      // ['ガパオライス（材料不足で断念）']
  avgCalorieAdherencePct: number;
  avgProteinAdherencePct: number;
  keyInsight?: string;         // AI が生成した先週の一言サマリー
}

// ---------------------------------------------------------------------------
// AI 出力型定義（JSON スキーマ）
// ---------------------------------------------------------------------------

export type MealTiming = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface GeneratedMealItem {
  timing: MealTiming;
  recipeName: string;
  description: string;         // 2〜3文。料理の特徴と健康ポイント
  cookingTimeMinutes: number;
  caloriesPlanned: number;
  proteinG: number;
  fatG: number;
  carbG: number;
  fiberG: number;              // 食物繊維（g）
  vegetableG: number;          // 野菜・果物の推定量（g）
  mainIngredients: string[];   // 主要食材トップ3〜5
  healthTip: string;           // この食事の1行ポイント（医療的断定なし）
}

export interface GeneratedDayPlan {
  dayDate: string;    // 'YYYY-MM-DD'
  dayLabel: string;   // '月'〜'日'
  items: GeneratedMealItem[];
}

export interface GeneratedMealPlan {
  version: number;
  totalEstimatedCostJpy: number;
  weeklyHighlight: string;   // 今週の献立コンセプト（1行）
  nutritionAdvice: string;   // 先週の振り返りを踏まえた今週のアドバイス（2〜3行）
  continuityTip: string;     // 無理せず続けるためのヒント
  days: GeneratedDayPlan[];
}

// ---------------------------------------------------------------------------
// プロンプトビルダー
// ---------------------------------------------------------------------------

const DIET_STYLE_LABEL: Record<UserProfile['dietStyle'], string> = {
  standard:    '特になし（バランス重視）',
  low_carb:    '低糖質',
  vegan:       'ヴィーガン（動物性食品不使用）',
  vegetarian:  'ベジタリアン（肉・魚不使用）',
  keto:        'ケトジェニック',
};

const SKILL_LABEL: Record<UserProfile['cookingSkill'], string> = {
  beginner:     '初心者（簡単なもの中心）',
  intermediate: '普通（一般的な家庭料理）',
  advanced:     '上級者（手の込んだ料理も可）',
};

/** システムプロンプト（Claude の役割・制約を定義） */
export function buildSystemPrompt(): string {
  return `あなたは健康的な食習慣をサポートするパーソナル管理栄養士AIです。
ユーザーの目標・制約・過去の食事傾向をもとに、1週間分の献立を提案します。

## 行動原則

1. **継続性を最優先**: 完璧な食事より、70〜80%できれば十分という考え方で提案する。
   ハードルが高すぎるメニューは避け、日常生活に溶け込む献立を提案する。

2. **医療的断定の禁止**: 「○○が治る」「△△に効く」などの医療的・治療的表現を使わない。
   代わりに「〜が豊富に含まれています」「〜の摂取をサポートします」などの表現を使う。

3. **食の多様性**: 同じ料理の繰り返しを避け、食材・調理法・国籍の多様性を意識する。
   同一食材を週に最大3回まで使用可（ただし調理法は変える）。

4. **現実的な食材コスト**: 1週間の食費が予算内に収まるよう食材選定する。
   高級食材に偏らず、スーパーで入手しやすいものを中心にする。

5. **嗜好・制約の厳守**: アレルギー食材は絶対に使用しない。苦手食材も除外する。

## 出力形式

必ず以下の JSON スキーマに従って出力する。JSON 以外のテキストは含めない。

\`\`\`json
{
  "version": 1,
  "totalEstimatedCostJpy": 数値,
  "weeklyHighlight": "今週のコンセプト（30文字以内）",
  "nutritionAdvice": "先週の振り返りを踏まえたアドバイス（100文字以内）",
  "continuityTip": "無理せず続けるヒント（50文字以内）",
  "days": [
    {
      "dayDate": "YYYY-MM-DD",
      "dayLabel": "月",
      "items": [
        {
          "timing": "breakfast | lunch | dinner | snack",
          "recipeName": "料理名",
          "description": "2〜3文の説明",
          "cookingTimeMinutes": 数値,
          "caloriesPlanned": 数値,
          "proteinG": 数値,
          "fatG": 数値,
          "carbG": 数値,
          "fiberG": 数値,
          "vegetableG": 数値,
          "mainIngredients": ["食材1", "食材2", "食材3"],
          "healthTip": "この食事の1行ポイント"
        }
      ]
    }
  ]
}
\`\`\`
`;
}

/** ユーザープロンプト（具体的な入力データを渡す） */
export function buildUserPrompt(
  profile: UserProfile,
  goal: WeeklyGoalInput,
  pastLogs: PastLogEntry[],
  weekStartDate: string  // 'YYYY-MM-DD'（月曜日）
): string {
  const allergyStr = profile.allergies.length > 0
    ? profile.allergies.join('、')
    : 'なし';

  const dislikedStr = profile.dislikedFoods.length > 0
    ? profile.dislikedFoods.join('、')
    : 'なし';

  const focusStr = goal.focusTags.length > 0
    ? goal.focusTags.join('、')
    : '特になし';

  const pastLogSection = pastLogs.length > 0
    ? pastLogs.map((log) => `
### ${log.weekLabel}の振り返り
- 気に入ったメニュー: ${log.likedMeals.join('、') || 'なし'}
- 苦手・不評だったメニュー: ${log.dislikedMeals.join('、') || 'なし'}
- 作れなかったメニュー: ${log.skippedMeals.join('、') || 'なし'}
- カロリー達成率: ${log.avgCalorieAdherencePct}%
- タンパク質達成率: ${log.avgProteinAdherencePct}%
${log.keyInsight ? `- AIサマリー: ${log.keyInsight}` : ''}`).join('\n')
    : '振り返りデータなし（初回生成）';

  return `以下の条件で ${weekStartDate}（月曜）から始まる1週間の献立を生成してください。

## ユーザー情報

- 名前: ${profile.displayName}
- 世帯人数: ${profile.householdSize}人
- 食スタイル: ${DIET_STYLE_LABEL[profile.dietStyle]}
- 調理スキル: ${SKILL_LABEL[profile.cookingSkill]}
- 夕食の調理時間上限: ${profile.cookingTimeLimit}分以内
- 週の食費予算: ¥${profile.budgetPerWeekJpy.toLocaleString()}以内

## アレルギー・除外食材

- アレルギー（絶対禁止）: ${allergyStr}
- 苦手食材（できるだけ避ける）: ${dislikedStr}

## 今週の目標（水〜木に設定済み）

- 1日の目標カロリー: ${goal.targetCalories} kcal
- タンパク質目標: ${goal.targetProteinG}g/日
- 野菜・果物目標: ${goal.targetVegetableG}g/日
- 食物繊維目標: ${goal.targetFiberG}g/日
- 今週のフォーカス: ${focusStr}
${goal.freeText ? `- 追加リクエスト: ${goal.freeText}` : ''}

## 直近の食事振り返り（学習資産）

${pastLogSection}

## 生成条件

- 期間: ${weekStartDate}（月）〜 7日間
- 各日の食事: 朝食・昼食・夕食・間食（snack）の4食
- 昼食は「作り置き弁当」または「簡単に準備できるもの」中心でOK
- 夕食は調理時間 ${profile.cookingTimeLimit} 分以内のレシピのみ採用
- 食材の重複は同一食材を週3回まで（ただし調理法を変えること）
- 推定コスト合計が ¥${profile.budgetPerWeekJpy.toLocaleString()} 以内に収まること

JSON のみを出力してください（コードブロック記法不要）。`;
}
