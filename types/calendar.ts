/**
 * types/calendar.ts
 * カレンダー UI のデータ構造を定義する。
 * meal_plan_days / meal_plan_items テーブルのフロント表現。
 */

export type MealSlotType = 'breakfast' | 'lunch' | 'dinner';

export const MEAL_SLOTS: MealSlotType[] = ['breakfast', 'lunch', 'dinner'];

export const SLOT_CONFIG: Record<
  MealSlotType,
  { label: string; icon: string; headerBg: string; chipBg: string }
> = {
  breakfast: { label: '朝食', icon: '🌅', headerBg: 'bg-orange-50',  chipBg: 'bg-orange-500' },
  lunch:     { label: '昼食', icon: '🌞', headerBg: 'bg-emerald-50', chipBg: 'bg-emerald-500' },
  dinner:    { label: '夕食', icon: '🌆', headerBg: 'bg-blue-50',    chipBg: 'bg-blue-500' },
};

/** カレンダーの1レシピカード（meal_plan_items 1行 + 栄養情報） */
export interface RecipeCard {
  id: string;
  name: string;
  description: string;
  caloriesPlanned: number;
  proteinG: number;
  fatG: number;
  carbG: number;
  fiberG: number;
  vegetableG: number;
  mainIngredients: string[];
  cookingTimeMinutes: number;
  source: 'ai' | 'favorite' | 'custom';
  isValidated: boolean;
  healthTip?: string;
  validationNote?: string;  // AI バリデーターのコメント
}

/** カレンダー上の1日分（3スロット） */
export interface CalendarDay {
  dayIndex: number;    // 0=月 … 6=日
  dayLabel: string;    // '月'〜'日'
  date: string;        // 'YYYY-MM-DD'
  breakfast: RecipeCard | null;
  lunch:     RecipeCard | null;
  dinner:    RecipeCard | null;
}

export type WeekCalendar = CalendarDay[];

// ---------------------------------------------------------------------------
// DnD ヘルパー型
// ---------------------------------------------------------------------------

/** useDraggable の data に格納するオブジェクト */
export interface DragCardData {
  recipe: RecipeCard;
  /** ピッカーからのドラッグは undefined、カレンダー内移動は SlotId を持つ */
  sourceSlotId?: SlotId;
}

/** カレンダースロットの識別子 */
export interface SlotId {
  dayIndex: number;
  slot: MealSlotType;
}

/** useDroppable の id として使う文字列を生成 */
export function makeSlotDropId(dayIndex: number, slot: MealSlotType): string {
  return `slot-${dayIndex}-${slot}`;
}

/** makeSlotDropId の逆変換 */
export function parseSlotDropId(id: string): SlotId | null {
  const m = id.match(/^slot-(\d+)-(.+)$/);
  if (!m) return null;
  return { dayIndex: parseInt(m[1]), slot: m[2] as MealSlotType };
}
