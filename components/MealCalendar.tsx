"use client";

import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type {
  WeekCalendar,
  CalendarDay,
  RecipeCard,
  MealSlotType,
  DragCardData,
} from "@/types/calendar";
import { MEAL_SLOTS, SLOT_CONFIG, makeSlotDropId } from "@/types/calendar";

// ---------------------------------------------------------------------------
// カレンダー内のドラッグ可能レシピカード
// ---------------------------------------------------------------------------

interface CalendarCardProps {
  recipe: RecipeCard;
  dayIndex: number;
  slot: MealSlotType;
  onRemove: () => void;
}

function CalendarCard({ recipe, dayIndex, slot, onRemove }: CalendarCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `cal-${dayIndex}-${slot}`,
    data: {
      recipe,
      sourceSlotId: { dayIndex, slot },
    } satisfies DragCardData,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative group rounded-xl overflow-hidden border transition-all duration-150
        ${isDragging
          ? 'opacity-30 border-dashed border-gray-300'
          : 'border-transparent bg-white shadow-sm hover:shadow-md hover:border-[#5B8CFF]/30'}
      `}
    >
      {/* ドラッグハンドル（カード全体） */}
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing p-2.5"
      >
        <p className="text-xs font-bold text-gray-800 leading-tight line-clamp-2 pr-4">
          {recipe.name}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-gray-400 flex-wrap">
          <span className="font-semibold text-gray-600">{recipe.caloriesPlanned}kcal</span>
          <span>·</span>
          <span>P{recipe.proteinG}g</span>
          <span>·</span>
          <span>🥬{recipe.vegetableG}g</span>
        </div>
        {recipe.healthTip && (
          <p className="text-[10px] text-blue-500 mt-1 line-clamp-1 italic">
            {recipe.healthTip}
          </p>
        )}
      </div>

      {/* 削除ボタン */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="
          absolute top-1.5 right-1.5
          w-4 h-4 rounded-full bg-gray-200 hover:bg-red-400 hover:text-white
          text-gray-400 text-[10px] font-bold
          opacity-0 group-hover:opacity-100
          transition-all flex items-center justify-center
        "
      >
        ×
      </button>

      {/* ソースバッジ */}
      <div className={`
        absolute bottom-1.5 right-1.5 text-[9px] px-1 py-0.5 rounded opacity-60
        ${recipe.source === 'ai'       ? 'bg-blue-100 text-blue-600'    : ''}
        ${recipe.source === 'favorite' ? 'bg-amber-100 text-amber-600'  : ''}
        ${recipe.source === 'custom'   ? 'bg-purple-100 text-purple-600': ''}
      `}>
        {recipe.source === 'ai' ? 'AI' : recipe.source === 'favorite' ? '⭐' : '✏️'}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ドロップ可能スロット
// ---------------------------------------------------------------------------

interface SlotCellProps {
  dayIndex:  number;
  slot:      MealSlotType;
  recipe:    RecipeCard | null;
  onRemove:  () => void;
}

function SlotCell({ dayIndex, slot, recipe, onRemove }: SlotCellProps) {
  const id = makeSlotDropId(dayIndex, slot);
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { dayIndex, slot },
  });

  const cfg = SLOT_CONFIG[slot];

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[90px] rounded-xl border-2 border-dashed transition-all duration-150 p-1
        ${isOver
          ? 'border-[#5B8CFF] bg-blue-50 scale-[1.02]'
          : recipe
          ? 'border-transparent bg-gray-50'
          : 'border-gray-200 bg-white hover:border-gray-300'}
      `}
    >
      {recipe ? (
        <CalendarCard
          recipe={recipe}
          dayIndex={dayIndex}
          slot={slot}
          onRemove={onRemove}
        />
      ) : (
        <div className={`
          h-full min-h-[82px] rounded-lg flex flex-col items-center justify-center gap-1
          ${isOver ? 'text-[#5B8CFF]' : 'text-gray-300'}
          transition-colors
        `}>
          <span className="text-xl">{isOver ? '✚' : cfg.icon}</span>
          <span className="text-[10px] font-medium">ドロップ</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// メインカレンダーグリッド
// ---------------------------------------------------------------------------

interface Props {
  calendar: WeekCalendar;
  onRemoveRecipe: (dayIndex: number, slot: MealSlotType) => void;
}

export default function MealCalendar({ calendar, onRemoveRecipe }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* スクロールラッパー（モバイル対応） */}
      <div className="overflow-x-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: '52px repeat(7, minmax(110px, 1fr))',
            minWidth: '830px',
          }}
        >
          {/* ── ヘッダー行 ── */}
          <div className="bg-gray-50 border-b border-gray-100 p-2" />
          {calendar.map((day) => (
            <div
              key={day.dayIndex}
              className="bg-gray-50 border-b border-gray-100 border-l border-l-gray-100 text-center py-3 px-1"
            >
              <div className="text-base font-black text-gray-900">{day.dayLabel}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                {day.date.slice(5).replace('-', '/')}
              </div>
            </div>
          ))}

          {/* ── 食事行 × 3 ── */}
          {(MEAL_SLOTS as MealSlotType[]).map((slot) => {
            const cfg = SLOT_CONFIG[slot];
            return (
              <>
                {/* 行ラベル */}
                <div
                  key={`label-${slot}`}
                  className={`
                    flex flex-col items-center justify-center gap-1
                    border-b border-b-gray-100 ${cfg.headerBg}
                    py-3 px-1
                  `}
                >
                  <span className="text-base">{cfg.icon}</span>
                  <span
                    className={`
                      text-[9px] font-bold text-white px-1.5 py-0.5 rounded
                      ${cfg.chipBg}
                    `}
                  >
                    {cfg.label}
                  </span>
                </div>

                {/* 各日のスロット */}
                {calendar.map((day: CalendarDay) => (
                  <div
                    key={`${day.dayIndex}-${slot}`}
                    className="border-b border-b-gray-100 border-l border-l-gray-100 p-1.5"
                  >
                    <SlotCell
                      dayIndex={day.dayIndex}
                      slot={slot}
                      recipe={day[slot]}
                      onRemove={() => onRemoveRecipe(day.dayIndex, slot)}
                    />
                  </div>
                ))}
              </>
            );
          })}
        </div>
      </div>

      {/* フッターヒント */}
      <div className="px-4 py-2.5 bg-blue-50 border-t border-blue-100 flex items-center gap-2">
        <span className="text-sm">💡</span>
        <p className="text-xs text-blue-600">
          右のリストからレシピをドラッグ＆ドロップ。カレンダー内でも並べ替えできます。
        </p>
      </div>
    </div>
  );
}
