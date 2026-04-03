"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

type MealTiming = "breakfast" | "lunch" | "dinner" | "snack";

interface MealItem {
  id: string;
  timing: MealTiming;
  recipeName: string;
  description: string;
  caloriesPlanned: number;
  proteinG: number;
  fatG: number;
  carbG: number;
  isUserModified?: boolean;
}

interface DayPlan {
  dayDate: string;
  dayLabel: string;
  totalCalories: number;
  items: MealItem[];
}

interface MealPlan {
  id: string;
  version: number;
  totalEstimatedCost: number;
  days: DayPlan[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// モックデータ
// ---------------------------------------------------------------------------

const MOCK_MEAL_PLAN: MealPlan = {
  id: "plan-001",
  version: 1,
  totalEstimatedCost: 8400,
  generatedAt: new Date().toISOString(),
  days: [
    {
      dayDate: "2026-04-06",
      dayLabel: "月",
      totalCalories: 1820,
      items: [
        { id: "i01", timing: "breakfast", recipeName: "鶏むね肉の親子丼", description: "高タンパクな朝食。卵でコーティングしてふんわり仕上げ。", caloriesPlanned: 520, proteinG: 32, fatG: 12, carbG: 68 },
        { id: "i02", timing: "lunch", recipeName: "野菜たっぷり豚汁定食", description: "根菜・きのこを使った食物繊維豊富な豚汁と白米。", caloriesPlanned: 680, proteinG: 28, fatG: 18, carbG: 92 },
        { id: "i03", timing: "dinner", recipeName: "サーモンのホイル焼き", description: "オメガ3が豊富。野菜と一緒にホイルに包んで蒸し焼き。", caloriesPlanned: 480, proteinG: 38, fatG: 22, carbG: 28 },
        { id: "i04", timing: "snack", recipeName: "ギリシャヨーグルト＋ベリー", description: "間食は低糖質・高タンパクで。", caloriesPlanned: 140, proteinG: 12, fatG: 2, carbG: 18 },
      ],
    },
    {
      dayDate: "2026-04-07",
      dayLabel: "火",
      totalCalories: 1780,
      items: [
        { id: "i05", timing: "breakfast", recipeName: "オートミールフルーツボウル", description: "バナナ・ブルーベリー・ハチミツでトッピング。", caloriesPlanned: 440, proteinG: 14, fatG: 8, carbG: 82 },
        { id: "i06", timing: "lunch", recipeName: "鶏むね肉のサラダチキンラップ", description: "低カロリーで食べ応えあり。トルティーヤで包む。", caloriesPlanned: 620, proteinG: 42, fatG: 14, carbG: 72 },
        { id: "i07", timing: "dinner", recipeName: "豆腐ハンバーグ定食", description: "木綿豆腐で増量してカロリーオフ。和風おろしダレで。", caloriesPlanned: 580, proteinG: 32, fatG: 20, carbG: 58 },
        { id: "i08", timing: "snack", recipeName: "ゆで卵 × 2", description: "手軽な高タンパク間食。", caloriesPlanned: 140, proteinG: 12, fatG: 10, carbG: 1 },
      ],
    },
    {
      dayDate: "2026-04-08",
      dayLabel: "水",
      totalCalories: 1850,
      items: [
        { id: "i09", timing: "breakfast", recipeName: "卵かけご飯＋味噌汁", description: "定番の朝食。豆腐とわかめの味噌汁で栄養補給。", caloriesPlanned: 480, proteinG: 22, fatG: 10, carbG: 74 },
        { id: "i10", timing: "lunch", recipeName: "鮭のチャーハン", description: "ほぐし鮭・卵・ネギの炒飯。フライパンで手軽に。", caloriesPlanned: 720, proteinG: 30, fatG: 22, carbG: 96 },
        { id: "i11", timing: "dinner", recipeName: "鶏むね肉の塩麹蒸し", description: "塩麹で柔らかく仕上げた低脂質メイン。", caloriesPlanned: 520, proteinG: 45, fatG: 12, carbG: 24 },
        { id: "i12", timing: "snack", recipeName: "アーモンド 20粒", description: "良質な脂質とビタミンEを補給。", caloriesPlanned: 130, proteinG: 5, fatG: 12, carbG: 5 },
      ],
    },
    {
      dayDate: "2026-04-09",
      dayLabel: "木",
      totalCalories: 1760,
      items: [
        { id: "i13", timing: "breakfast", recipeName: "バナナプロテインスムージー", description: "バナナ・豆乳・プロテインパウダーをブレンド。", caloriesPlanned: 380, proteinG: 28, fatG: 6, carbG: 54 },
        { id: "i14", timing: "lunch", recipeName: "ひじき煮弁当", description: "鉄分豊富なひじき煮・ほうれん草のおひたし・白米。", caloriesPlanned: 640, proteinG: 22, fatG: 14, carbG: 98 },
        { id: "i15", timing: "dinner", recipeName: "ブリの照り焼き定食", description: "DHA・EPAが豊富なブリを甘辛タレで。", caloriesPlanned: 600, proteinG: 38, fatG: 26, carbG: 44 },
        { id: "i16", timing: "snack", recipeName: "カッテージチーズ＋トマト", description: "低カロリーで満足感のある間食。", caloriesPlanned: 140, proteinG: 14, fatG: 4, carbG: 10 },
      ],
    },
    {
      dayDate: "2026-04-10",
      dayLabel: "金",
      totalCalories: 1800,
      items: [
        { id: "i17", timing: "breakfast", recipeName: "納豆ご飯＋野菜スープ", description: "腸活に良い発酵食品・納豆でスタート。", caloriesPlanned: 480, proteinG: 24, fatG: 10, carbG: 72 },
        { id: "i18", timing: "lunch", recipeName: "ガパオライス", description: "バジルとひき肉の炒め物。目玉焼きをのせて。", caloriesPlanned: 680, proteinG: 32, fatG: 24, carbG: 82 },
        { id: "i19", timing: "dinner", recipeName: "豚しゃぶ野菜鍋", description: "週末前の軽めのメニュー。ポン酢でさっぱりと。", caloriesPlanned: 520, proteinG: 36, fatG: 16, carbG: 42 },
        { id: "i20", timing: "snack", recipeName: "フルーツミックス", description: "キウイ・みかん・りんごを組み合わせて。", caloriesPlanned: 120, proteinG: 2, fatG: 1, carbG: 28 },
      ],
    },
    {
      dayDate: "2026-04-11",
      dayLabel: "土",
      totalCalories: 1920,
      items: [
        { id: "i21", timing: "breakfast", recipeName: "アボカドトースト＋ポーチドエッグ", description: "週末のゆったり朝食。良質な脂質とタンパク質を。", caloriesPlanned: 560, proteinG: 22, fatG: 28, carbG: 52 },
        { id: "i22", timing: "lunch", recipeName: "自家製チキンバーガー", description: "揚げないオーブン焼きチキンでヘルシーに。", caloriesPlanned: 740, proteinG: 38, fatG: 22, carbG: 88 },
        { id: "i23", timing: "dinner", recipeName: "手巻き寿司", description: "週末の特別メニュー。刺し身は良質なタンパク源。", caloriesPlanned: 480, proteinG: 36, fatG: 14, carbG: 56 },
        { id: "i24", timing: "snack", recipeName: "プロテインバー", description: "活動量が多い土曜の間食に。", caloriesPlanned: 140, proteinG: 16, fatG: 6, carbG: 14 },
      ],
    },
    {
      dayDate: "2026-04-12",
      dayLabel: "日",
      totalCalories: 1840,
      items: [
        { id: "i25", timing: "breakfast", recipeName: "フレンチトースト", description: "食パン・卵・牛乳で作るリッチな朝食。フルーツ添え。", caloriesPlanned: 480, proteinG: 18, fatG: 16, carbG: 66 },
        { id: "i26", timing: "lunch", recipeName: "豚肉と野菜の炒め定食", description: "にんにく炒めでスタミナチャージ。副菜2品付き。", caloriesPlanned: 720, proteinG: 32, fatG: 24, carbG: 88 },
        { id: "i27", timing: "dinner", recipeName: "鶏むね肉のみぞれ煮", description: "大根おろしで消化を助ける週末の締めくくり。", caloriesPlanned: 500, proteinG: 42, fatG: 10, carbG: 36 },
        { id: "i28", timing: "snack", recipeName: "小豆入りおしるこ", description: "週の終わりに甘い息抜き。食物繊維も摂取。", caloriesPlanned: 140, proteinG: 5, fatG: 1, carbG: 30 },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

const TIMING_CONFIG: Record<MealTiming, { label: string; color: string; bg: string }> = {
  breakfast: { label: "朝食", color: "text-orange-600", bg: "bg-orange-500" },
  lunch:     { label: "昼食", color: "text-emerald-600", bg: "bg-emerald-500" },
  dinner:    { label: "夕食", color: "text-blue-600", bg: "bg-blue-500" },
  snack:     { label: "間食", color: "text-purple-600", bg: "bg-purple-500" },
};

function calcWeeklyAvg(days: DayPlan[]) {
  const n = days.length || 1;
  const totals = days.reduce(
    (acc, day) => {
      day.items.forEach((item) => {
        acc.cal += item.caloriesPlanned;
        acc.p   += item.proteinG;
        acc.f   += item.fatG;
        acc.c   += item.carbG;
      });
      return acc;
    },
    { cal: 0, p: 0, f: 0, c: 0 }
  );
  return {
    avgCal:     Math.round(totals.cal / n),
    avgProtein: Math.round(totals.p / n),
    avgFat:     Math.round(totals.f / n),
    avgCarb:    Math.round(totals.c / n),
    totalProteinKcal: totals.p * 4,
    totalFatKcal:     totals.f * 9,
    totalCarbKcal:    totals.c * 4,
  };
}

// ---------------------------------------------------------------------------
// サブコンポーネント
// ---------------------------------------------------------------------------

function MealItemRow({ item, onEdit }: { item: MealItem; onEdit: (item: MealItem) => void }) {
  const cfg = TIMING_CONFIG[item.timing];
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
      <span
        className={`shrink-0 text-[10px] font-bold text-white px-1.5 py-0.5 rounded-md ${cfg.bg} mt-0.5`}
      >
        {cfg.label}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-gray-800 truncate">
            {item.recipeName}
          </span>
          <button
            onClick={() => onEdit(item)}
            className="shrink-0 text-xs text-[#5B8CFF] font-medium hover:underline"
          >
            変更
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed line-clamp-1">
          {item.description}
        </p>
        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
          <span className="font-semibold text-gray-700">{item.caloriesPlanned} kcal</span>
          <span>·</span>
          <span>P {item.proteinG}g</span>
          <span>·</span>
          <span>F {item.fatG}g</span>
          <span>·</span>
          <span>C {item.carbG}g</span>
        </div>
      </div>
    </div>
  );
}

function DayCard({
  day,
  isOpen,
  onToggle,
  onEdit,
  targetCalories,
}: {
  day: DayPlan;
  isOpen: boolean;
  onToggle: () => void;
  onEdit: (item: MealItem) => void;
  targetCalories: number;
}) {
  const pct = Math.min(120, Math.round((day.totalCalories / targetCalories) * 100));
  const barColor = pct > 110 ? "bg-red-400" : pct < 85 ? "bg-amber-400" : "bg-emerald-400";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        {/* 曜日 */}
        <div className="w-10 text-center shrink-0">
          <div className="text-lg font-bold text-gray-900">{day.dayLabel}</div>
          <div className="text-[10px] text-gray-400">
            {day.dayDate.slice(5).replace("-", "/")}
          </div>
        </div>

        {/* プログレス + カロリー */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-gray-700">
              {day.totalCalories.toLocaleString()} kcal
            </span>
            <span className="text-xs text-gray-400">{pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>

        <span className={`text-gray-300 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 flex flex-col gap-2 border-t border-gray-50">
          <div className="pt-3 flex flex-col gap-2">
            {day.items.map((item) => (
              <MealItemRow key={item.id} item={item} onEdit={onEdit} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WeeklySummaryCard({ plan, targetCalories }: { plan: MealPlan; targetCalories: number }) {
  const s = calcWeeklyAvg(plan.days);
  const totalMacroKcal = s.totalProteinKcal + s.totalFatKcal + s.totalCarbKcal;
  const proteinPct = totalMacroKcal ? Math.round((s.totalProteinKcal / totalMacroKcal) * 100) : 0;
  const fatPct     = totalMacroKcal ? Math.round((s.totalFatKcal     / totalMacroKcal) * 100) : 0;
  const carbPct    = 100 - proteinPct - fatPct;
  const calPct     = Math.round((s.avgCal / targetCalories) * 100);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">
        週間サマリー
      </h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-center">
          <div className="text-lg font-bold text-[#5B8CFF]">
            {s.avgCal.toLocaleString()}
          </div>
          <div className="text-[10px] text-blue-400 font-medium mt-0.5">平均 kcal/日</div>
        </div>
        <div
          className={`rounded-xl p-3 border text-center ${
            Math.abs(calPct - 100) < 10
              ? "bg-emerald-50 border-emerald-100"
              : "bg-amber-50 border-amber-100"
          }`}
        >
          <div
            className={`text-lg font-bold ${
              Math.abs(calPct - 100) < 10 ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {calPct}%
          </div>
          <div className={`text-[10px] font-medium mt-0.5 ${Math.abs(calPct - 100) < 10 ? "text-emerald-400" : "text-amber-400"}`}>
            目標比
          </div>
        </div>
        <div className="bg-purple-50 rounded-xl p-3 border border-purple-100 text-center">
          <div className="text-lg font-bold text-purple-600">
            ¥{plan.totalEstimatedCost.toLocaleString()}
          </div>
          <div className="text-[10px] text-purple-400 font-medium mt-0.5">推定食費</div>
        </div>
      </div>

      {/* PFC Bar */}
      <div>
        <p className="text-xs text-gray-400 mb-2">PFC バランス（週平均）</p>
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
          <div className="bg-orange-400 rounded-l-full" style={{ width: `${proteinPct}%` }} />
          <div className="bg-amber-300" style={{ width: `${fatPct}%` }} />
          <div className="bg-emerald-400 rounded-r-full" style={{ width: `${carbPct}%` }} />
        </div>
        <div className="flex gap-4 mt-2.5 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
            タンパク質 {proteinPct}% ({s.avgProtein}g)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-300 shrink-0" />
            脂質 {fatPct}% ({s.avgFat}g)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            炭水化物 {carbPct}% ({s.avgCarb}g)
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// メイン画面
// ---------------------------------------------------------------------------

const TARGET_CALORIES = 1800;

export default function WeeklyMealPlanScreen() {
  const [plan] = useState<MealPlan>(MOCK_MEAL_PLAN);
  const [openDays, setOpenDays] = useState<Set<string>>(
    new Set([MOCK_MEAL_PLAN.days[0].dayDate])
  );
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingItem, setEditingItem] = useState<MealItem | null>(null);

  const toggleDay = useCallback((date: string) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  }, []);

  const handleRegenerate = useCallback(async () => {
    if (!confirm("献立を再生成しますか？現在の内容は破棄されます。")) return;
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsGenerating(false);
    setIsConfirmed(false);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!confirm("この献立で確定しますか？")) return;
    setIsConfirmed(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-0.5 block">
              ← ホーム
            </Link>
            <h1 className="text-xl font-bold text-gray-900">今週の献立</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              4/6（月）〜 4/12（日）· ver.{plan.version}
            </p>
          </div>
          <button
            onClick={handleRegenerate}
            disabled={isConfirmed || isGenerating}
            className="text-sm font-semibold text-[#5B8CFF] bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGenerating ? "生成中..." : "再生成"}
          </button>
        </div>
      </header>

      {/* Confirmed Banner */}
      {isConfirmed && (
        <div className="bg-emerald-50 border-b border-emerald-100 text-center py-2">
          <span className="text-sm font-semibold text-emerald-700">
            ✓ 献立確定済み — 土曜に食材を注文しましょう
          </span>
        </div>
      )}

      {/* Generating Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div className="w-12 h-12 rounded-full border-4 border-[#5B8CFF] border-t-transparent animate-spin mb-4" />
          <p className="text-lg font-bold text-gray-800">AI が献立を生成中...</p>
          <p className="text-sm text-gray-400 mt-1">目標と食習慣をもとに最適な献立を考えています</p>
        </div>
      )}

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-32 space-y-4">
        {/* Summary */}
        <WeeklySummaryCard plan={plan} targetCalories={TARGET_CALORIES} />

        {/* Day List */}
        <div>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
            日別献立
          </h2>
          <div className="space-y-2.5">
            {plan.days.map((day) => (
              <DayCard
                key={day.dayDate}
                day={day}
                isOpen={openDays.has(day.dayDate)}
                onToggle={() => toggleDay(day.dayDate)}
                onEdit={setEditingItem}
                targetCalories={TARGET_CALORIES}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {!isConfirmed ? (
            <button
              onClick={handleConfirm}
              className="w-full bg-[#5B8CFF] hover:bg-[#4a7aef] text-white font-bold py-4 rounded-2xl text-base transition-colors shadow-lg shadow-[#5B8CFF]/30"
            >
              この献立で確定する
            </button>
          ) : (
            <Link href="/cart">
              <div className="w-full bg-[#4CAF82] hover:bg-[#3d9e72] text-white font-bold py-4 rounded-2xl text-base transition-colors shadow-lg shadow-emerald-500/30 text-center cursor-pointer">
                食材リストを確認する →
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Edit Modal (placeholder) */}
      {editingItem && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end z-50"
          onClick={() => setEditingItem(null)}
        >
          <div
            className="bg-white w-full max-w-2xl mx-auto rounded-t-3xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">メニューを変更</h3>
            <p className="text-sm text-gray-500 mb-6">
              「{editingItem.recipeName}」を別のメニューに変更します
            </p>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700 mb-4">
              メニュー変更機能は近日実装予定です
            </div>
            <button
              onClick={() => setEditingItem(null)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
