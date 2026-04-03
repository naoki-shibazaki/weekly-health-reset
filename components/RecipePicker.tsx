"use client";

import { useState, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { RecipeCard, DragCardData } from "@/types/calendar";

// ---------------------------------------------------------------------------
// 個別レシピカード（ドラッグ可能）
// ---------------------------------------------------------------------------

function DraggablePickerCard({ recipe }: { recipe: RecipeCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `picker-${recipe.id}`,
    data: { recipe } satisfies DragCardData,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 999 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        group cursor-grab active:cursor-grabbing select-none
        bg-white border border-gray-100 rounded-xl p-3
        hover:border-[#5B8CFF] hover:shadow-sm
        transition-all duration-150
        ${isDragging ? 'opacity-30 shadow-lg' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{recipe.name}</p>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed line-clamp-1">
            {recipe.mainIngredients.slice(0, 3).join('・')}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-bold text-gray-600">{recipe.caloriesPlanned}</p>
          <p className="text-[10px] text-gray-400">kcal</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
        <span>P {recipe.proteinG}g</span>
        <span>·</span>
        <span>食繊 {recipe.fiberG}g</span>
        <span>·</span>
        <span>野菜 {recipe.vegetableG}g</span>
        <span>·</span>
        <span>⏱{recipe.cookingTimeMinutes}分</span>
      </div>
      {/* ドラッグヒント */}
      <div className="mt-2 text-[10px] text-[#5B8CFF] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <span>↕</span> カレンダーにドラッグ
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// カスタムレシピ追加フォーム
// ---------------------------------------------------------------------------

interface AddFormProps {
  onAdd: (recipe: RecipeCard) => void;
}

function AddRecipeForm({ onAdd }: AddFormProps) {
  const [name, setName] = useState('');
  const [ingredientInput, setIngredientInput] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addIngredient = () => {
    const trimmed = ingredientInput.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients((prev) => [...prev, trimmed]);
      setIngredientInput('');
      inputRef.current?.focus();
    }
  };

  const removeIngredient = (ing: string) => {
    setIngredients((prev) => prev.filter((i) => i !== ing));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || ingredients.length === 0) return;

    setIsValidating(true);
    setError(null);
    try {
      const res = await fetch('/api/validate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), ingredients }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const recipe: RecipeCard = await res.json();
      onAdd(recipe);
      setLastAdded(recipe.name);
      setName('');
      setIngredients([]);
      setTimeout(() => setLastAdded(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '追加に失敗しました');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* レシピ名 */}
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">レシピ名</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：鶏のから揚げ"
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5B8CFF]/30 focus:border-[#5B8CFF]"
        />
      </div>

      {/* 食材入力 */}
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">主要食材</label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={ingredientInput}
            onChange={(e) => setIngredientInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addIngredient(); }
            }}
            placeholder="例：鶏もも肉"
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5B8CFF]/30 focus:border-[#5B8CFF]"
          />
          <button
            type="button"
            onClick={addIngredient}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-xl transition-colors"
          >
            追加
          </button>
        </div>

        {/* 食材タグ */}
        {ingredients.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {ingredients.map((ing) => (
              <span
                key={ing}
                className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full"
              >
                {ing}
                <button
                  type="button"
                  onClick={() => removeIngredient(ing)}
                  className="hover:text-red-500 transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* エラー */}
      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          ⚠️ {error}
        </p>
      )}

      {/* 追加成功 */}
      {lastAdded && (
        <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
          ✓ 「{lastAdded}」をリストに追加しました
        </p>
      )}

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={!name.trim() || ingredients.length === 0 || isValidating}
        className="w-full bg-[#5B8CFF] hover:bg-[#4a7aef] disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
      >
        {isValidating ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            AI バリデーション中...
          </span>
        ) : (
          '✨ AI バリデーション付きで追加'
        )}
      </button>

      <p className="text-[10px] text-gray-400 text-center">
        Claude が栄養価を推定してリストに追加します
      </p>
    </form>
  );
}

// ---------------------------------------------------------------------------
// メインパネル
// ---------------------------------------------------------------------------

type TabId = 'ai' | 'favorite' | 'custom';

interface Props {
  aiRecipes:       RecipeCard[];
  favoriteRecipes: RecipeCard[];
  customRecipes:   RecipeCard[];
  onAddCustom:     (recipe: RecipeCard) => void;
}

export default function RecipePicker({
  aiRecipes,
  favoriteRecipes,
  customRecipes,
  onAddCustom,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('ai');

  const TABS: { id: TabId; label: string; count: number }[] = [
    { id: 'ai',       label: 'AI提案',   count: aiRecipes.length },
    { id: 'favorite', label: 'お気に入り', count: favoriteRecipes.length },
    { id: 'custom',   label: 'カスタム',  count: customRecipes.length },
  ];

  const currentList =
    activeTab === 'ai'       ? aiRecipes :
    activeTab === 'favorite' ? favoriteRecipes :
                               customRecipes;

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
      {/* ヘッダー */}
      <div className="px-4 pt-4 pb-0 bg-white border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-700 mb-3">レシピを選択</h3>
        {/* タブ */}
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 text-xs font-semibold py-2 px-1 rounded-t-lg border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-[#5B8CFF] text-[#5B8CFF] bg-blue-50'
                  : 'border-transparent text-gray-400 hover:text-gray-600'}
              `}
            >
              {tab.label}
              <span className={`ml-1 text-[10px] ${activeTab === tab.id ? 'text-[#5B8CFF]' : 'text-gray-300'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'custom' ? (
          <div className="space-y-4">
            <AddRecipeForm onAdd={onAddCustom} />
            {customRecipes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">追加済み</p>
                <div className="space-y-2">
                  {customRecipes.map((r) => (
                    <DraggablePickerCard key={r.id} recipe={r} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : currentList.length > 0 ? (
          <div className="space-y-2">
            {currentList.map((r) => (
              <DraggablePickerCard key={r.id} recipe={r} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-gray-400">
            レシピがありません
          </div>
        )}
      </div>
    </div>
  );
}
