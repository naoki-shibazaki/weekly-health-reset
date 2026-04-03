"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { calcDayScore, calcWeeklyScore, scoreBarColor } from "@/lib/nutrition-calc";
import type { NutritionGrade, DayNutritionScore } from "@/lib/nutrition-calc";
import type {
  GeneratedMealPlan,
  GeneratedDayPlan,
  GeneratedMealItem,
  WeeklyGoalInput,
  UserProfile,
  PastLogEntry,
} from "@/lib/ai/menu-prompt";

// ---------------------------------------------------------------------------
// モックデータ（ANTHROPIC_API_KEY 未設定時のフォールバック）
// ---------------------------------------------------------------------------

const MOCK_GOAL: WeeklyGoalInput = {
  targetCalories: 1800,
  targetProteinG: 120,
  targetVegetableG: 500,
  targetFiberG: 20,
  focusTags: ["高たんぱく", "野菜多め", "腸活"],
  freeText: "夕食は和食中心、魚を週3回以上",
};

const MOCK_PROFILE: UserProfile = {
  displayName: "Naoki",
  allergies: [],
  dislikedFoods: ["パクチー", "レバー"],
  dietStyle: "standard",
  cookingSkill: "intermediate",
  cookingTimeLimit: 30,
  householdSize: 1,
  budgetPerWeekJpy: 8000,
};

const MOCK_PAST_LOGS: PastLogEntry[] = [
  {
    weekLabel: "先週",
    likedMeals: ["サーモンのホイル焼き", "親子丼", "ひじき煮弁当"],
    dislikedMeals: [],
    skippedMeals: ["ガパオライス（材料不足）"],
    avgCalorieAdherencePct: 96,
    avgProteinAdherencePct: 85,
    keyInsight: "タンパク質が目標の85%でした。今週は意識的に増やしましょう。",
  },
];

const MOCK_MEAL_PLAN: GeneratedMealPlan = {
  version: 1,
  totalEstimatedCostJpy: 8200,
  weeklyHighlight: "魚×腸活で高たんぱく週間",
  nutritionAdvice:
    "先週はタンパク質が目標比85%でした。今週は魚・豆類・卵を各日に組み込み、無理なく120gに近づけます。",
  continuityTip: "夕食だけでも献立通りにできれば十分です。昼は柔軟に対応してOK。",
  days: [
    {
      dayDate: "2026-04-06", dayLabel: "月",
      items: [
        { timing: "breakfast", recipeName: "鶏むね肉の親子丼", description: "高タンパクな朝食。卵でコーティングしてふんわり仕上げ。出汁の旨みで満足感あり。", cookingTimeMinutes: 15, caloriesPlanned: 520, proteinG: 32, fatG: 12, carbG: 68, fiberG: 1.5, vegetableG: 100, mainIngredients: ["鶏むね肉", "卵", "玉ねぎ"], healthTip: "朝にタンパク質をしっかり摂ることで、午前中の集中力をサポートします" },
        { timing: "lunch",     recipeName: "野菜たっぷり豚汁定食", description: "根菜・きのこを使った食物繊維豊富な豚汁と白米。作り置きで翌朝の朝食にも。", cookingTimeMinutes: 20, caloriesPlanned: 680, proteinG: 28, fatG: 18, carbG: 92, fiberG: 5.0, vegetableG: 200, mainIngredients: ["豚バラ肉", "大根", "にんじん", "ごぼう"], healthTip: "根菜の食物繊維が腸内環境を整えます" },
        { timing: "dinner",    recipeName: "サーモンのホイル焼き", description: "オメガ3脂肪酸が豊富。野菜と一緒にホイルに包んで蒸し焼き。片付けも楽。", cookingTimeMinutes: 25, caloriesPlanned: 480, proteinG: 38, fatG: 22, carbG: 28, fiberG: 4.0, vegetableG: 200, mainIngredients: ["サーモン", "ブロッコリー", "玉ねぎ"], healthTip: "先週のお気に入りをリピート。DHA・EPAが豊富です" },
        { timing: "snack",     recipeName: "ギリシャヨーグルト＋ベリー", description: "腸活に最適な発酵食品。ベリーのポリフェノールも摂取。", cookingTimeMinutes: 2, caloriesPlanned: 140, proteinG: 12, fatG: 2, carbG: 18, fiberG: 2.0, vegetableG: 100, mainIngredients: ["ギリシャヨーグルト", "ブルーベリー", "いちご"], healthTip: "乳酸菌で腸活をサポートします" },
      ],
    },
    {
      dayDate: "2026-04-07", dayLabel: "火",
      items: [
        { timing: "breakfast", recipeName: "オートミールフルーツボウル", description: "バナナ・ブルーベリー・ハチミツでトッピング。β-グルカンで腸活。", cookingTimeMinutes: 5, caloriesPlanned: 440, proteinG: 14, fatG: 8, carbG: 82, fiberG: 5.0, vegetableG: 150, mainIngredients: ["オートミール", "バナナ", "ブルーベリー"], healthTip: "β-グルカンが豊富で腹持ちがよく、血糖値の急激な上昇を抑えます" },
        { timing: "lunch",     recipeName: "鶏むね肉のサラダチキンラップ", description: "低カロリーで食べ応えあり。トルティーヤで包めば手軽に持ち運びOK。", cookingTimeMinutes: 10, caloriesPlanned: 620, proteinG: 42, fatG: 14, carbG: 72, fiberG: 3.0, vegetableG: 200, mainIngredients: ["鶏むね肉", "レタス", "トマト", "アボカド"], healthTip: "アボカドの不飽和脂肪酸が良質な脂質を補います" },
        { timing: "dinner",    recipeName: "豆腐ハンバーグ定食", description: "木綿豆腐で増量してカロリーオフ。大根おろしの和風ダレでさっぱりと。", cookingTimeMinutes: 25, caloriesPlanned: 580, proteinG: 32, fatG: 20, carbG: 58, fiberG: 3.0, vegetableG: 150, mainIngredients: ["木綿豆腐", "合いびき肉", "大根"], healthTip: "豆腐の大豆タンパクと肉タンパクを組み合わせてアミノ酸バランスが豊かになります" },
        { timing: "snack",     recipeName: "ゆで卵 × 2", description: "手軽な高タンパク間食。必須アミノ酸をバランスよく含む。", cookingTimeMinutes: 12, caloriesPlanned: 140, proteinG: 12, fatG: 10, carbG: 1, fiberG: 0.0, vegetableG: 0, mainIngredients: ["卵"], healthTip: "卵は必須アミノ酸を全て含む優秀なタンパク源です" },
      ],
    },
    {
      dayDate: "2026-04-08", dayLabel: "水",
      items: [
        { timing: "breakfast", recipeName: "卵かけご飯＋わかめ味噌汁", description: "定番の朝食。わかめは食物繊維・ミネラルの補給源。ゆっくり噛んで食べる。", cookingTimeMinutes: 8, caloriesPlanned: 480, proteinG: 22, fatG: 10, carbG: 74, fiberG: 1.5, vegetableG: 50, mainIngredients: ["卵", "白米", "わかめ", "豆腐"], healthTip: "わかめのアルギン酸が食後血糖値の急上昇を穏やかにします" },
        { timing: "lunch",     recipeName: "鮭のチャーハン", description: "ほぐし鮭・卵・ネギの炒飯。フライパン1つで手軽に完成。", cookingTimeMinutes: 15, caloriesPlanned: 720, proteinG: 30, fatG: 22, carbG: 96, fiberG: 2.0, vegetableG: 100, mainIngredients: ["サーモン", "卵", "長ねぎ", "白米"], healthTip: "サーモンのタンパク質と卵の組み合わせでアミノ酸スコアが高くなります" },
        { timing: "dinner",    recipeName: "鶏むね肉の塩麹蒸し", description: "塩麹の酵素で柔らかく仕上げた低脂質メイン。発酵食品で腸活も同時に。", cookingTimeMinutes: 20, caloriesPlanned: 520, proteinG: 45, fatG: 12, carbG: 24, fiberG: 4.0, vegetableG: 200, mainIngredients: ["鶏むね肉", "ブロッコリー", "にんじん", "塩麹"], healthTip: "塩麹の発酵パワーで肉が柔らかくなり、消化も助けます" },
        { timing: "snack",     recipeName: "アーモンド 20粒", description: "良質な脂質・ビタミンE・マグネシウムを補給できる小腹対策。", cookingTimeMinutes: 0, caloriesPlanned: 130, proteinG: 5, fatG: 12, carbG: 5, fiberG: 2.0, vegetableG: 0, mainIngredients: ["アーモンド"], healthTip: "ビタミンEが豊富で抗酸化作用が期待できます" },
      ],
    },
    {
      dayDate: "2026-04-09", dayLabel: "木",
      items: [
        { timing: "breakfast", recipeName: "バナナプロテインスムージー", description: "バナナ・豆乳・プロテインパウダーをブレンド。忙しい朝でも5分で完成。", cookingTimeMinutes: 5, caloriesPlanned: 380, proteinG: 28, fatG: 6, carbG: 54, fiberG: 3.0, vegetableG: 100, mainIngredients: ["バナナ", "豆乳", "プロテインパウダー"], healthTip: "バナナのカリウムが筋肉の回復をサポートします" },
        { timing: "lunch",     recipeName: "ひじき煮弁当", description: "鉄分豊富なひじき煮・ほうれん草のおひたし・白米。前日の作り置きでラク。", cookingTimeMinutes: 25, caloriesPlanned: 640, proteinG: 22, fatG: 14, carbG: 98, fiberG: 6.0, vegetableG: 200, mainIngredients: ["ひじき", "にんじん", "大豆", "ほうれん草"], healthTip: "ひじきと大豆の組み合わせで植物性鉄分を効率よく摂取できます" },
        { timing: "dinner",    recipeName: "ブリの照り焼き定食", description: "DHA・EPAが豊富なブリを甘辛タレで香ばしく焼き上げた和食の定番。", cookingTimeMinutes: 20, caloriesPlanned: 600, proteinG: 38, fatG: 26, carbG: 44, fiberG: 3.0, vegetableG: 150, mainIngredients: ["ブリ", "ほうれん草"], healthTip: "ブリの脂は良質なオメガ3脂肪酸。冬〜春が旬で栄養価が高い時期です" },
        { timing: "snack",     recipeName: "カッテージチーズ＋トマト", description: "低脂質・高タンパクの組み合わせ。リコピンとカルシウムを同時に補給。", cookingTimeMinutes: 3, caloriesPlanned: 140, proteinG: 14, fatG: 4, carbG: 10, fiberG: 1.0, vegetableG: 100, mainIngredients: ["カッテージチーズ", "トマト"], healthTip: "トマトのリコピンは油と一緒に摂ると吸収率が上がります" },
      ],
    },
    {
      dayDate: "2026-04-10", dayLabel: "金",
      items: [
        { timing: "breakfast", recipeName: "納豆ご飯＋野菜スープ", description: "腸活に欠かせない発酵食品・納豆。野菜スープで朝から食物繊維を摂取。", cookingTimeMinutes: 10, caloriesPlanned: 480, proteinG: 24, fatG: 10, carbG: 72, fiberG: 4.0, vegetableG: 150, mainIngredients: ["納豆", "白米", "キャベツ", "にんじん"], healthTip: "納豆のナットウキナーゼは腸内環境の改善に役立ちます" },
        { timing: "lunch",     recipeName: "ガパオライス", description: "バジルとひき肉の炒め物。目玉焼きをのせてタンパク質を追加。", cookingTimeMinutes: 20, caloriesPlanned: 680, proteinG: 32, fatG: 24, carbG: 82, fiberG: 2.0, vegetableG: 100, mainIngredients: ["鶏ひき肉", "ピーマン", "卵", "バジル"], healthTip: "バジルにはビタミンKやマグネシウムが含まれています" },
        { timing: "dinner",    recipeName: "豚しゃぶ野菜鍋", description: "週末前の軽めのメニュー。たっぷりの野菜でビタミン・ミネラルを補給。", cookingTimeMinutes: 15, caloriesPlanned: 520, proteinG: 36, fatG: 16, carbG: 42, fiberG: 5.0, vegetableG: 350, mainIngredients: ["豚ロース", "白菜", "長ねぎ", "豆腐", "えのき"], healthTip: "鍋は野菜をたくさん食べられる最強の健康料理です" },
        { timing: "snack",     recipeName: "フルーツミックス", description: "キウイ・みかん・りんご。ビタミンCと食物繊維を自然な形で摂取。", cookingTimeMinutes: 3, caloriesPlanned: 120, proteinG: 2, fatG: 1, carbG: 28, fiberG: 3.0, vegetableG: 250, mainIngredients: ["キウイ", "みかん", "りんご"], healthTip: "キウイのビタミンCは1個でほぼ1日分の目安量を補給できます" },
      ],
    },
    {
      dayDate: "2026-04-11", dayLabel: "土",
      items: [
        { timing: "breakfast", recipeName: "アボカドトースト＋ポーチドエッグ", description: "週末のゆったり朝食。アボカドの良質な脂質とたんぱく質で充実の朝に。", cookingTimeMinutes: 15, caloriesPlanned: 560, proteinG: 22, fatG: 28, carbG: 52, fiberG: 4.0, vegetableG: 200, mainIngredients: ["アボカド", "食パン", "卵"], healthTip: "アボカドの不飽和脂肪酸がビタミンの吸収を助けます" },
        { timing: "lunch",     recipeName: "自家製チキンバーガー", description: "揚げないオーブン焼きチキンでヘルシーに。たっぷりの野菜と一緒に。", cookingTimeMinutes: 30, caloriesPlanned: 740, proteinG: 38, fatG: 22, carbG: 88, fiberG: 2.0, vegetableG: 150, mainIngredients: ["鶏むね肉", "レタス", "トマト", "チーズ"], healthTip: "揚げずにオーブン焼きにすることでカロリーを20〜30%カットできます" },
        { timing: "dinner",    recipeName: "手巻き寿司", description: "週末の特別メニュー。刺し身は良質なタンパク源で低カロリー。", cookingTimeMinutes: 20, caloriesPlanned: 480, proteinG: 36, fatG: 14, carbG: 56, fiberG: 2.0, vegetableG: 200, mainIngredients: ["マグロ", "サーモン", "えび", "アボカド", "きゅうり"], healthTip: "刺し身は加熱しないので、熱に弱いDHA・EPAをそのまま摂取できます" },
        { timing: "snack",     recipeName: "プロテインバー", description: "活動量が多い土曜の間食に。タンパク質を手軽に補給。", cookingTimeMinutes: 0, caloriesPlanned: 140, proteinG: 16, fatG: 6, carbG: 14, fiberG: 2.0, vegetableG: 0, mainIngredients: ["プロテインバー"], healthTip: "外出時はプロテインバーを携帯して、間食を安定させましょう" },
      ],
    },
    {
      dayDate: "2026-04-12", dayLabel: "日",
      items: [
        { timing: "breakfast", recipeName: "フレンチトースト＋フルーツ", description: "食パン・卵・牛乳でリッチな朝食。バナナ添えでカリウムも補給。", cookingTimeMinutes: 15, caloriesPlanned: 480, proteinG: 18, fatG: 16, carbG: 66, fiberG: 2.0, vegetableG: 100, mainIngredients: ["食パン", "卵", "牛乳", "バナナ"], healthTip: "週の締めくくりの朝食は少し豪華に。精神的な満足感も大切です" },
        { timing: "lunch",     recipeName: "豚肉と野菜の炒め定食", description: "にんにく炒めでスタミナチャージ。副菜2品付きでバランスが完璧。", cookingTimeMinutes: 20, caloriesPlanned: 720, proteinG: 32, fatG: 24, carbG: 88, fiberG: 4.0, vegetableG: 400, mainIngredients: ["豚肩ロース", "キャベツ", "もやし", "にら"], healthTip: "もやしは低カロリーで食物繊維とビタミンCが豊富な優秀食材です" },
        { timing: "dinner",    recipeName: "鶏むね肉のみぞれ煮", description: "大根おろしで消化を助けるやさしい和食。1週間の締めくくりにぴったり。", cookingTimeMinutes: 25, caloriesPlanned: 500, proteinG: 42, fatG: 10, carbG: 36, fiberG: 2.5, vegetableG: 200, mainIngredients: ["鶏むね肉", "大根"], healthTip: "大根に含まれるアミラーゼが消化を助け、胃腸を労わります" },
        { timing: "snack",     recipeName: "小豆入りおしるこ", description: "週の終わりに甘い息抜き。小豆の食物繊維とポリフェノールを摂取。", cookingTimeMinutes: 5, caloriesPlanned: 140, proteinG: 5, fatG: 1, carbG: 30, fiberG: 3.5, vegetableG: 0, mainIngredients: ["小豆缶", "白玉粉"], healthTip: "甘いものを完全に我慢するより、ポリフェノール豊富な和スイーツを選ぶのが継続のコツです" },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const TIMING_CONFIG = {
  breakfast: { label: "朝食", icon: "🌅", bg: "bg-orange-500" },
  lunch:     { label: "昼食", icon: "🌞", bg: "bg-emerald-500" },
  dinner:    { label: "夕食", icon: "🌆", bg: "bg-blue-500" },
  snack:     { label: "間食", icon: "🍎", bg: "bg-purple-500" },
} as const;

// ---------------------------------------------------------------------------
// サブコンポーネント
// ---------------------------------------------------------------------------

function GradeBadge({
  grade,
  score,
  size = "md",
}: {
  grade: NutritionGrade;
  score: number;
  size?: "sm" | "md" | "lg";
}) {
  const STYLE: Record<NutritionGrade, string> = {
    S: "bg-emerald-100 border-emerald-300 text-emerald-700",
    A: "bg-blue-100 border-blue-300 text-blue-700",
    B: "bg-amber-100 border-amber-300 text-amber-700",
    C: "bg-red-100 border-red-300 text-red-700",
  };
  const sizeClass = size === "lg"
    ? "text-2xl font-black px-3 py-1"
    : size === "sm"
    ? "text-xs font-bold px-1.5 py-0.5"
    : "text-sm font-bold px-2 py-0.5";

  return (
    <div className={`inline-flex items-center gap-1 rounded-lg border ${STYLE[grade]} ${sizeClass}`}>
      <span>{grade}</span>
      {size !== "sm" && (
        <span className="text-[10px] opacity-70">{score}</span>
      )}
    </div>
  );
}

function ScoreBar({
  label,
  score,
  actual,
  target,
  unit,
}: {
  label: string;
  score: number;
  actual: number;
  target: number;
  unit: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-gray-600">{label}</span>
        <span className="text-gray-400">
          <span className="font-bold text-gray-700">{actual}{unit}</span>
          {" "}/ {target}{unit}
          <span className={`ml-1 font-bold ${score >= 90 ? "text-emerald-600" : score >= 70 ? "text-blue-600" : "text-amber-600"}`}>
            {score}%
          </span>
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${scoreBarColor(score)}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
    </div>
  );
}

function MealItemRow({ item }: { item: GeneratedMealItem }) {
  const [open, setOpen] = useState(false);
  const cfg = TIMING_CONFIG[item.timing];
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
      >
        <span className={`shrink-0 text-[10px] font-bold text-white px-1.5 py-0.5 rounded ${cfg.bg}`}>
          {cfg.label}
        </span>
        <span className="flex-1 text-sm font-medium text-gray-800 truncate">
          {item.recipeName}
        </span>
        <span className="text-xs text-gray-400 shrink-0">
          {item.caloriesPlanned} kcal
        </span>
        <span className="text-gray-300 text-[10px] shrink-0">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mx-2 mb-2 px-3 py-3 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
          <p className="text-xs text-gray-600 leading-relaxed">{item.description}</p>
          <div className="flex flex-wrap gap-1">
            {item.mainIngredients.map((ing) => (
              <span key={ing} className="text-[10px] bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
                {ing}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 pt-1 border-t border-blue-100">
            <span className="text-[10px]">💡</span>
            <p className="text-[11px] text-blue-600 italic">{item.healthTip}</p>
          </div>
          <div className="flex gap-3 text-[10px] text-gray-400 pt-0.5">
            <span>P {item.proteinG}g</span>
            <span>F {item.fatG}g</span>
            <span>C {item.carbG}g</span>
            <span>食物繊維 {item.fiberG}g</span>
            <span>⏱ {item.cookingTimeMinutes}分</span>
          </div>
        </div>
      )}
    </div>
  );
}

function DayCard({
  day,
  score,
  isOpen,
  onToggle,
}: {
  day: GeneratedDayPlan;
  score: DayNutritionScore;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        {/* 曜日 */}
        <div className="w-9 text-center shrink-0">
          <div className="text-lg font-black text-gray-900">{day.dayLabel}</div>
          <div className="text-[10px] text-gray-400">
            {day.dayDate.slice(5).replace("-", "/")}
          </div>
        </div>

        {/* スコアバー */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400">
              {score.totalCalories.toLocaleString()} kcal
            </span>
            <span className="text-xs text-gray-400">
              P {score.totalProteinG}g · 野菜 {score.totalVegetableG}g
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${scoreBarColor(score.overallScore)}`}
              style={{ width: `${score.overallScore}%` }}
            />
          </div>
        </div>

        <GradeBadge grade={score.grade} score={score.overallScore} size="sm" />
        <span className={`text-gray-300 text-[10px] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>▼</span>
      </button>

      {isOpen && (
        <div className="border-t border-gray-50 px-2 py-2 space-y-0.5">
          {day.items.map((item, i) => (
            <MealItemRow key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// メイン画面
// ---------------------------------------------------------------------------

export default function MenuProposal() {
  const [plan, setPlan] = useState<GeneratedMealPlan>(MOCK_MEAL_PLAN);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDays, setOpenDays] = useState<Set<string>>(
    new Set([MOCK_MEAL_PLAN.days[0].dayDate])
  );

  // スコア計算
  const dayScores = useMemo(
    () => plan.days.map((d) => calcDayScore(d.items, MOCK_GOAL)),
    [plan]
  );
  const weekScore = useMemo(() => calcWeeklyScore(dayScores), [dayScores]);

  const toggleDay = useCallback((date: string) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  }, []);

  // Claude API 呼び出し
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: MOCK_PROFILE,
          goal: MOCK_GOAL,
          pastLogs: MOCK_PAST_LOGS,
          weekStartDate: "2026-04-06",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const newPlan: GeneratedMealPlan = await res.json();
      setPlan(newPlan);
      setIsConfirmed(false);
      setOpenDays(new Set([newPlan.days[0].dayDate]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (!confirm("この献立内容で確定しますか？土曜日の食材調達リストに反映されます。")) return;
    setIsConfirmed(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-end justify-between">
          <div>
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 block mb-0.5">
              ← ホーム
            </Link>
            <h1 className="text-xl font-bold text-gray-900">今週の献立提案</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              4/6（月）〜 4/12（日）· Claude AI 生成 · ver.{plan.version}
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isConfirmed}
            className="text-sm font-semibold text-[#5B8CFF] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGenerating ? "生成中..." : "AI で再生成"}
          </button>
        </div>
      </header>

      {/* 確定バナー */}
      {isConfirmed && (
        <div className="bg-emerald-50 border-b border-emerald-100 text-center py-2">
          <span className="text-sm font-semibold text-emerald-700">
            ✓ 献立確定済み — 土曜の調達リストに反映されます
          </span>
        </div>
      )}

      {/* 生成中オーバーレイ */}
      {isGenerating && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 gap-4">
          <div className="w-14 h-14 rounded-full border-4 border-[#5B8CFF] border-t-transparent animate-spin" />
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800">Claude が献立を考えています...</p>
            <p className="text-sm text-gray-400 mt-1">
              目標・アレルギー・先週の振り返りを反映中
            </p>
          </div>
        </div>
      )}

      {/* エラー */}
      {error && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            ⚠️ {error}
            <span className="ml-2 text-red-500">（モックデータを表示中）</span>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-6 pb-36 space-y-5">

        {/* ── AI インサイトカード ── */}
        <div className="bg-gradient-to-br from-[#5B8CFF] to-[#7B6BF0] rounded-2xl p-5 text-white shadow-lg shadow-[#5B8CFF]/20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">
                AI インサイト
              </div>
              <p className="text-lg font-bold leading-snug mb-2">
                {plan.weeklyHighlight}
              </p>
              <p className="text-sm opacity-90 leading-relaxed">
                {plan.nutritionAdvice}
              </p>
            </div>
            <GradeBadge grade={weekScore.weekGrade} score={weekScore.avgOverallScore} size="lg" />
          </div>

          {/* フォーカスタグ */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {MOCK_GOAL.focusTags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* 継続ヒント */}
          <div className="mt-3 pt-3 border-t border-white/20 flex items-start gap-2">
            <span>💡</span>
            <p className="text-xs opacity-80 italic">{plan.continuityTip}</p>
          </div>
        </div>

        {/* ── 週間栄養スコア ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">
            週間栄養スコア
          </h2>
          <div className="space-y-3.5">
            <ScoreBar
              label="野菜・果物"
              score={weekScore.avgVegetableScore}
              actual={weekScore.avgVegetableG}
              target={MOCK_GOAL.targetVegetableG}
              unit="g/日"
            />
            <ScoreBar
              label="タンパク質"
              score={weekScore.avgProteinScore}
              actual={weekScore.avgProteinG}
              target={MOCK_GOAL.targetProteinG}
              unit="g/日"
            />
            <ScoreBar
              label="食物繊維"
              score={weekScore.avgFiberScore}
              actual={weekScore.avgFiberG}
              target={MOCK_GOAL.targetFiberG}
              unit="g/日"
            />
            <ScoreBar
              label="カロリー達成率"
              score={weekScore.avgCalorieScore}
              actual={weekScore.avgCalories}
              target={MOCK_GOAL.targetCalories}
              unit=" kcal"
            />
          </div>

          {/* 先週比較 */}
          {MOCK_PAST_LOGS[0] && (
            <div className="mt-4 pt-3 border-t border-gray-50 text-xs text-gray-400 flex items-start gap-2">
              <span>📈</span>
              <p>
                先週のタンパク質達成率は{" "}
                <span className="font-bold text-amber-600">
                  {MOCK_PAST_LOGS[0].avgProteinAdherencePct}%
                </span>
                {"でした。今週の予測スコアは "}
                <span className="font-bold text-emerald-600">
                  {weekScore.avgProteinScore}%
                </span>{" "}
                に改善しています。
              </p>
            </div>
          )}
        </div>

        {/* ── 日別献立カード ── */}
        <div>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
            日別献立（タップで展開）
          </h2>
          <div className="space-y-2.5">
            {plan.days.map((day, i) => (
              <DayCard
                key={day.dayDate}
                day={day}
                score={dayScores[i]}
                isOpen={openDays.has(day.dayDate)}
                onToggle={() => toggleDay(day.dayDate)}
              />
            ))}
          </div>
        </div>

        {/* 推定費用 */}
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">週の推定食費</p>
            <p className="text-xl font-bold text-gray-900">
              ¥{plan.totalEstimatedCostJpy.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">予算</p>
            <p className="text-sm font-semibold text-gray-500">
              ¥{MOCK_PROFILE.budgetPerWeekJpy.toLocaleString()}
            </p>
          </div>
          <div className={`text-sm font-bold px-3 py-1.5 rounded-xl ${
            plan.totalEstimatedCostJpy <= MOCK_PROFILE.budgetPerWeekJpy
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}>
            {plan.totalEstimatedCostJpy <= MOCK_PROFILE.budgetPerWeekJpy
              ? "予算内 ✓"
              : "予算超過"}
          </div>
        </div>
      </main>

      {/* ── フッター CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {!isConfirmed ? (
            <button
              onClick={handleConfirm}
              className="w-full bg-[#5B8CFF] hover:bg-[#4a7aef] text-white font-bold py-4 rounded-2xl text-base transition-colors shadow-lg shadow-[#5B8CFF]/30"
            >
              この内容で確定する（土曜の予定反映へ）→
            </button>
          ) : (
            <Link href="/cart">
              <div className="w-full bg-[#4CAF82] hover:bg-[#3d9e72] text-white font-bold py-4 rounded-2xl text-base transition-colors shadow-lg shadow-emerald-500/30 text-center cursor-pointer">
                食材調達リストを確認する →
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
