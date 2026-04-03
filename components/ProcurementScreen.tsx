"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { MOCK_RAW_INGREDIENTS } from "@/lib/mock-ingredients";
import {
  generateShoppingList,
  calcAchievementScore,
  formatShoppingListText,
} from "@/lib/shopping-list-generator";
import { getSupermarketLinks } from "@/lib/supermarket-search";
import { FOOD_CATEGORIES, CATEGORY_EMOJI } from "@/lib/types";
import type { ShoppingItem, WeeklyGoalTargets } from "@/lib/types";

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const WEEKLY_GOALS: WeeklyGoalTargets = {
  targetCalories: 1800,
  targetProteinG: 120,
  targetVegetableG: 350, // 厚生労働省推奨 350g/日
};

// 献立データから算出した週平均（WeeklyMealPlanScreen の MOCK_MEAL_PLAN と同期）
const AVG_DAILY_CALORIES = 1824;
const AVG_DAILY_PROTEIN_G = 102;

// ---------------------------------------------------------------------------
// サブコンポーネント
// ---------------------------------------------------------------------------

function AchievementBar({
  label,
  actual,
  target,
  pct,
  unit,
}: {
  label: string;
  actual: number;
  target: number;
  pct: number;
  unit: string;
}) {
  const capped = Math.min(100, pct);
  const color =
    pct >= 90 && pct <= 115
      ? "bg-emerald-400"
      : pct < 70
      ? "bg-amber-400"
      : pct > 120
      ? "bg-red-400"
      : "bg-blue-400";
  const textColor =
    pct >= 90 && pct <= 115
      ? "text-emerald-600"
      : pct < 70
      ? "text-amber-600"
      : pct > 120
      ? "text-red-600"
      : "text-blue-600";

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-xs text-gray-400">
          <span className={`font-bold ${textColor}`}>
            {actual.toLocaleString()}{unit}
          </span>
          {" "}/ {target.toLocaleString()}{unit}
          <span className={`ml-1.5 font-bold ${textColor}`}>（{pct}%）</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${capped}%` }}
        />
      </div>
    </div>
  );
}

function SupermarketButtons({ foodName }: { foodName: string }) {
  const links = getSupermarketLinks(foodName);
  return (
    <div className="flex gap-1 shrink-0">
      {links.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          title={link.name}
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors ${link.bgClass} ${link.colorClass}`}
        >
          {link.shortName === '楽天西友' ? '楽天' :
           link.shortName === 'Amazon' ? 'AM' :
           'イオン'}
        </a>
      ))}
    </div>
  );
}

interface ShoppingItemRowProps {
  item: ShoppingItem;
  isChecked: boolean;
  onToggle: (id: string) => void;
}

function ShoppingItemRow({ item, isChecked, onToggle }: ShoppingItemRowProps) {
  const [showSources, setShowSources] = useState(false);

  return (
    <div className={`transition-opacity ${isChecked ? "opacity-40" : ""}`}>
      <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50">
        {/* チェックボックス */}
        <button
          onClick={() => onToggle(item.id)}
          className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
            isChecked
              ? "bg-emerald-500 border-emerald-500"
              : "border-gray-300 hover:border-emerald-400"
          }`}
        >
          {isChecked && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* 食材名・量 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={`text-sm font-semibold ${isChecked ? "line-through text-gray-400" : "text-gray-800"}`}>
              {item.foodName}
            </span>
            <span className="text-xs text-gray-400 font-medium">
              {item.displayAmount}
            </span>
            {item.sources.length > 1 && (
              <button
                onClick={() => setShowSources((v) => !v)}
                className="text-[10px] text-[#5B8CFF] hover:underline"
              >
                {item.sources.length}日分
              </button>
            )}
          </div>

          {/* 使用日の内訳 */}
          {showSources && (
            <div className="mt-1 space-y-0.5">
              {item.sources.map((s, i) => (
                <div key={i} className="text-[10px] text-gray-400 flex gap-1">
                  <span className="font-semibold text-gray-500">{s.dayLabel}</span>
                  <span>{s.recipeName}</span>
                  <span>({s.amountDisplay})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ネットスーパー検索ボタン */}
        {!isChecked && <SupermarketButtons foodName={item.foodName} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// メイン画面
// ---------------------------------------------------------------------------

export default function ProcurementScreen() {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [showStaples, setShowStaples] = useState(false);

  // 買い物リスト生成（依存変化なし = 初回のみ計算）
  const shoppingList = useMemo(
    () => generateShoppingList(MOCK_RAW_INGREDIENTS),
    []
  );

  // 達成度スコア
  const achievement = useMemo(
    () =>
      calcAchievementScore(
        AVG_DAILY_CALORIES,
        AVG_DAILY_PROTEIN_G,
        shoppingList.totalVegetableG,
        WEEKLY_GOALS
      ),
    [shoppingList.totalVegetableG]
  );

  // 全アイテム（フラット）
  const allPurchaseItems = useMemo(
    () => FOOD_CATEGORIES.flatMap((cat) => shoppingList.byCategory[cat]),
    [shoppingList]
  );

  const checkedCount = allPurchaseItems.filter((i) => checkedIds.has(i.id)).length;
  const totalCount   = shoppingList.totalPurchaseItems;
  const progressPct  = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const toggleItem = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const checkAll = useCallback(() => {
    setCheckedIds(new Set(allPurchaseItems.map((i) => i.id)));
  }, [allPurchaseItems]);

  const uncheckAll = useCallback(() => {
    setCheckedIds(new Set());
  }, []);

  const copyToClipboard = useCallback(async () => {
    const text = formatShoppingListText(shoppingList);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // フォールバック
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shoppingList]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 block mb-0.5">
            ← ホーム
          </Link>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">食材調達リスト</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                4/11（土）· {totalCount}品目 · ¥{(8400).toLocaleString()}（推定）
              </p>
            </div>
            {/* 進捗 */}
            <div className="text-right">
              <div className="text-2xl font-bold text-[#5B8CFF]">{progressPct}%</div>
              <div className="text-xs text-gray-400">{checkedCount}/{totalCount} 確認済み</div>
            </div>
          </div>
          {/* 全体プログレスバー */}
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#5B8CFF] rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-36 space-y-5">
        {/* ── 達成度インジケーター ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
              献立の達成度
            </h2>
            <Link
              href="/meal-plan"
              className="text-xs text-[#5B8CFF] hover:underline"
            >
              献立を見る →
            </Link>
          </div>
          <div className="space-y-4">
            <AchievementBar
              label="カロリー"
              actual={achievement.calories.actual}
              target={achievement.calories.target}
              pct={achievement.calories.pct}
              unit=" kcal"
            />
            <AchievementBar
              label="タンパク質"
              actual={achievement.protein.actual}
              target={achievement.protein.target}
              pct={achievement.protein.pct}
              unit="g"
            />
            <AchievementBar
              label="野菜・果物（1日平均）"
              actual={achievement.vegetables.actual}
              target={achievement.vegetables.target}
              pct={achievement.vegetables.pct}
              unit="g"
            />
          </div>
          {/* 総合判定 */}
          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2">
            {achievement.protein.pct < 85 ? (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 w-full">
                <span className="text-lg">⚠️</span>
                <p className="text-xs text-amber-700">
                  <span className="font-bold">タンパク質が目標の{achievement.protein.pct}%</span>です。
                  鶏むね肉・卵・魚の量を少し増やすか、プロテインを追加することを検討してください。
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-xl p-3 w-full">
                <span className="text-lg">✅</span>
                <p className="text-xs text-emerald-700">
                  <span className="font-bold">栄養バランスは目標通りです！</span>
                  この献立で買い物を進めましょう。
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── カテゴリ別チェックリスト ── */}
        {FOOD_CATEGORIES.map((cat) => {
          const items = shoppingList.byCategory[cat];
          if (!items.length) return null;
          const catChecked = items.filter((i) => checkedIds.has(i.id)).length;
          return (
            <div key={cat} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{CATEGORY_EMOJI[cat]}</span>
                  <span className="font-bold text-gray-800 text-sm">{cat}</span>
                  <span className="text-xs text-gray-400">
                    {catChecked}/{items.length}
                  </span>
                </div>
                {catChecked === items.length && items.length > 0 && (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    完了
                  </span>
                )}
              </div>
              <div className="px-2 py-1">
                {items.map((item) => (
                  <ShoppingItemRow
                    key={item.id}
                    item={item}
                    isChecked={checkedIds.has(item.id)}
                    onToggle={toggleItem}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* ── 常備品セクション ── */}
        {shoppingList.staples.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setShowStaples((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🏠</span>
                <span className="font-bold text-gray-800 text-sm">常備品（在庫確認）</span>
                <span className="text-xs text-gray-400">{shoppingList.staples.length}品目</span>
              </div>
              <span className="text-gray-300 text-xs">{showStaples ? '▲' : '▼'}</span>
            </button>
            {showStaples && (
              <div className="px-5 pb-3 border-t border-gray-50">
                <p className="text-xs text-gray-400 py-2">
                  以下の調味料・常備品は在庫を確認してください
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {shoppingList.staples.map((item) => (
                    <div
                      key={item.id}
                      className="text-sm text-gray-600 flex items-center gap-1.5 py-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                      {item.foodName}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── フッター：アクションボタン ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={copyToClipboard}
              className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-600">コピー完了！</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  リストをコピー
                </>
              )}
            </button>
            <button
              onClick={checkedCount === totalCount ? uncheckAll : checkAll}
              className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              {checkedCount === totalCount ? "全て解除" : "全て確認済みに"}
            </button>
          </div>
          <button
            disabled={checkedCount < totalCount}
            className="w-full bg-[#4CAF82] hover:bg-[#3d9e72] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-4 rounded-2xl text-base transition-colors shadow-lg shadow-emerald-500/20 disabled:shadow-none"
          >
            {checkedCount === totalCount
              ? "買い物完了 — 日曜配達を待ちましょう 🎉"
              : `あと ${totalCount - checkedCount} 品目を確認してください`}
          </button>
        </div>
      </div>
    </div>
  );
}
