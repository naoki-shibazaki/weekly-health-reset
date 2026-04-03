"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import MealCalendar from "@/components/MealCalendar";
import RecipePicker from "@/components/RecipePicker";
import WeeklyHealthSummary from "@/components/WeeklyHealthSummary";

import { INITIAL_CALENDAR, AI_RECIPE_POOL, FAVORITE_RECIPES } from "@/lib/mock-calendar";
import { generateShoppingList, formatShoppingListText } from "@/lib/shopping-list-generator";
import type { RawIngredient } from "@/lib/types";
import type { WeekCalendar, RecipeCard, MealSlotType, DragCardData } from "@/types/calendar";
import { MEAL_SLOTS, parseSlotDropId } from "@/types/calendar";
import type { WeeklyGoalInput } from "@/lib/ai/menu-prompt";

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const GOALS: WeeklyGoalInput = {
  targetCalories:   1800,
  targetProteinG:   120,
  targetVegetableG: 500,
  targetFiberG:     20,
  focusTags: ['高たんぱく', '野菜多め', '腸活'],
};

// RecipeCard.mainIngredients → FoodCategory の簡易判定
function guessCategory(name: string): import("@/lib/types").FoodCategory {
  const n = name;
  if (/鶏|豚|牛|肉|魚|サーモン|まぐろ|ブリ|えび|アジ|鮭/.test(n)) return '肉・魚';
  if (/卵|豆腐|豆乳|牛乳|チーズ|ヨーグルト/.test(n))               return '乳製品・卵';
  if (/米|パン|麺|オートミール|豆|納豆|大豆|小豆/.test(n))          return '穀物・豆類';
  if (/醤油|味噌|みりん|酒|砂糖|油|酢|塩|マヨ|ナンプラー/.test(n)) return '調味料・その他';
  return '野菜・果物';
}

/** WeekCalendar の全スロットから RawIngredient[] を生成 */
function extractIngredients(calendar: WeekCalendar): RawIngredient[] {
  const results: RawIngredient[] = [];
  for (const day of calendar) {
    for (const slot of MEAL_SLOTS as MealSlotType[]) {
      const recipe = day[slot];
      if (!recipe) continue;
      for (const ing of recipe.mainIngredients) {
        results.push({
          foodName:    ing,
          amountG:     150,           // カレンダーレシピは量不明のため推定値
          unitDisplay: '適量',
          category:    guessCategory(ing),
          isStaple:    guessCategory(ing) === '調味料・その他',
          dayLabel:    day.dayLabel,
          recipeName:  recipe.name,
        });
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// ドラッグ中のオーバーレイカード
// ---------------------------------------------------------------------------

function DragOverlayCard({ recipe }: { recipe: RecipeCard }) {
  return (
    <div className="bg-white border-2 border-[#5B8CFF] rounded-xl p-3 shadow-2xl shadow-[#5B8CFF]/20 w-44 rotate-2 opacity-95">
      <p className="text-xs font-bold text-gray-800 line-clamp-2">{recipe.name}</p>
      <p className="text-[10px] text-gray-400 mt-1">
        {recipe.caloriesPlanned} kcal · P {recipe.proteinG}g
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ページコンポーネント
// ---------------------------------------------------------------------------

export default function MealCalendarPage() {
  const [calendar, setCalendar]     = useState<WeekCalendar>(INITIAL_CALENDAR);
  const [customRecipes, setCustomRecipes] = useState<RecipeCard[]>([]);
  const [activeDrag, setActiveDrag] = useState<DragCardData | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showMobile, setShowMobile] = useState<'calendar' | 'picker'>('calendar');

  // DnD センサー設定（距離 8px 以上 or 250ms 長押しで開始）
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  // ── DnD ハンドラ ──

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDrag(event.active.data.current as DragCardData);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    const dragData = active.data.current as DragCardData;
    const targetSlot = parseSlotDropId(String(over.id));
    if (!targetSlot) return;

    const { recipe, sourceSlotId } = dragData;
    const { dayIndex: tDay, slot: tSlot } = targetSlot;

    setCalendar((prev) => {
      const next = prev.map((d) => ({ ...d }));

      // ドロップ先に既存レシピがある場合、かつソースがカレンダー内なら入れ替え
      const existingAtTarget = next[tDay][tSlot];

      if (sourceSlotId) {
        // カレンダー内移動
        const { dayIndex: sDay, slot: sSlot } = sourceSlotId;
        if (sDay === tDay && sSlot === tSlot) return prev; // 同じスロットは無視
        next[sDay][sSlot] = existingAtTarget;              // 入れ替え or null に
      }

      next[tDay][tSlot] = recipe;
      return next;
    });

    setIsConfirmed(false);
  }, []);

  const handleDragCancel = useCallback(() => setActiveDrag(null), []);

  // ── カレンダー操作 ──

  const handleRemoveRecipe = useCallback((dayIndex: number, slot: MealSlotType) => {
    setCalendar((prev) => {
      const next = prev.map((d) => ({ ...d }));
      next[dayIndex][slot] = null;
      return next;
    });
    setIsConfirmed(false);
  }, []);

  const handleAddCustom = useCallback((recipe: RecipeCard) => {
    setCustomRecipes((prev) => [recipe, ...prev]);
  }, []);

  // ── 確定 → 買い物リスト生成 ──

  const handleConfirm = useCallback(() => {
    if (!confirm("この献立内容で確定し、買い物リストを生成しますか？")) return;
    setIsConfirmed(true);

    const ingredients = extractIngredients(calendar);
    const list = generateShoppingList(ingredients);
    const text = formatShoppingListText(list);
    // localStorage に保存して /cart で利用
    localStorage.setItem('shopping-list-text', text);
    localStorage.setItem('shopping-list-json', JSON.stringify(list));
  }, [calendar]);

  // 埋まっているスロット数
  const filledCount = useMemo(
    () => calendar.reduce(
      (s, d) => s + MEAL_SLOTS.filter((sl) => d[sl as MealSlotType] !== null).length,
      0
    ),
    [calendar]
  );
  const totalSlots = calendar.length * MEAL_SLOTS.length;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
          <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-end justify-between">
            <div>
              <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 block mb-0.5">
                ← ホーム
              </Link>
              <h1 className="text-xl font-bold text-gray-900">献立カレンダー</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                4/6（月）〜 4/12（日）· {filledCount}/{totalSlots} 入力済み
              </p>
            </div>

            {/* モバイル切り替え */}
            <div className="flex gap-2 md:hidden">
              <button
                onClick={() => setShowMobile('calendar')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  showMobile === 'calendar'
                    ? 'bg-[#5B8CFF] text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                カレンダー
              </button>
              <button
                onClick={() => setShowMobile('picker')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  showMobile === 'picker'
                    ? 'bg-[#5B8CFF] text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                レシピ
              </button>
            </div>
          </div>
        </header>

        {/* 確定バナー */}
        {isConfirmed && (
          <div className="bg-emerald-50 border-b border-emerald-100 text-center py-2">
            <span className="text-sm font-semibold text-emerald-700">
              ✓ 献立確定済み — 買い物リストが生成されました
            </span>
          </div>
        )}

        {/* メインレイアウト */}
        <main className="max-w-screen-xl mx-auto px-4 py-5 pb-32">
          <div className="flex gap-5">

            {/* ── 左：カレンダー + スコア ── */}
            <div className={`flex-1 min-w-0 flex flex-col gap-5 ${showMobile === 'picker' ? 'hidden md:flex' : 'flex'}`}>
              <MealCalendar
                calendar={calendar}
                onRemoveRecipe={handleRemoveRecipe}
              />
              <WeeklyHealthSummary calendar={calendar} goals={GOALS} />
            </div>

            {/* ── 右：レシピピッカー ── */}
            <div className={`
              w-72 shrink-0
              ${showMobile === 'calendar' ? 'hidden md:flex' : 'flex'}
              flex-col
            `}>
              <div className="sticky top-24" style={{ maxHeight: 'calc(100vh - 120px)' }}>
                <RecipePicker
                  aiRecipes={AI_RECIPE_POOL}
                  favoriteRecipes={FAVORITE_RECIPES}
                  customRecipes={customRecipes}
                  onAddCustom={handleAddCustom}
                />
              </div>
            </div>
          </div>
        </main>

        {/* フッター CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 z-10">
          <div className="max-w-screen-xl mx-auto flex gap-3">
            <Link href="/meal-plan" className="shrink-0">
              <div className="h-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold px-4 py-4 rounded-2xl text-sm transition-colors text-center cursor-pointer flex items-center">
                ← AI提案を見る
              </div>
            </Link>

            {!isConfirmed ? (
              <button
                onClick={handleConfirm}
                disabled={filledCount === 0}
                className="flex-1 bg-[#5B8CFF] hover:bg-[#4a7aef] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-4 rounded-2xl text-base transition-colors shadow-lg shadow-[#5B8CFF]/30 disabled:shadow-none"
              >
                この献立で確定する（買い物リストを生成）
              </button>
            ) : (
              <Link href="/cart" className="flex-1">
                <div className="w-full bg-[#4CAF82] hover:bg-[#3d9e72] text-white font-bold py-4 rounded-2xl text-base transition-colors shadow-lg shadow-emerald-500/30 text-center cursor-pointer">
                  食材調達リストを確認する →
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ドラッグ中のゴースト */}
      <DragOverlay dropAnimation={null}>
        {activeDrag?.recipe ? (
          <DragOverlayCard recipe={activeDrag.recipe} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
