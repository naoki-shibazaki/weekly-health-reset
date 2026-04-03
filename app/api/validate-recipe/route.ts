/**
 * app/api/validate-recipe/route.ts
 * ユーザーが追加したカスタムレシピを Claude が栄養バリデーションする。
 *
 * POST /api/validate-recipe
 * Body: { name: string; ingredients: string[] }
 * Response: RecipeCard
 */

import Anthropic from '@anthropic-ai/sdk';
import type { RecipeCard } from '@/types/calendar';

const client = new Anthropic();

export async function POST(req: Request) {
  const { name, ingredients } = (await req.json()) as {
    name: string;
    ingredients: string[];
  };

  const prompt = `ユーザーが以下のレシピを追加しようとしています。
栄養価を推定し、健康上の注意点があれば簡潔に教えてください。

レシピ名: ${name}
主要食材: ${ingredients.join('、')}

以下の JSON 形式のみで回答してください（コードブロック不要）:
{
  "caloriesPlanned": 数値（1人前のkcal）,
  "proteinG": 数値（g）,
  "fatG": 数値（g）,
  "carbG": 数値（g）,
  "fiberG": 数値（g）,
  "vegetableG": 数値（野菜・果物の推定量g）,
  "cookingTimeMinutes": 数値,
  "healthTip": "この料理の健康ポイント（1文・医療的断定なし）",
  "validationNote": "栄養バランスの総評（1〜2文）"
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const block = message.content[0];
    if (block.type !== 'text') throw new Error('Unexpected response type');

    const raw = block.text.trim();
    const jsonText = raw.startsWith('{')
      ? raw
      : raw.replace(/^```json\s*/m, '').replace(/\s*```$/m, '').trim();

    const validated = JSON.parse(jsonText);

    const recipe: RecipeCard = {
      id: `custom-${Date.now()}`,
      name,
      description: ingredients.slice(0, 3).join('・') + 'を使った料理',
      caloriesPlanned: validated.caloriesPlanned ?? 500,
      proteinG:        validated.proteinG        ?? 20,
      fatG:            validated.fatG             ?? 15,
      carbG:           validated.carbG            ?? 55,
      fiberG:          validated.fiberG           ?? 2,
      vegetableG:      validated.vegetableG       ?? 100,
      mainIngredients: ingredients,
      cookingTimeMinutes: validated.cookingTimeMinutes ?? 20,
      source: 'custom',
      isValidated: true,
      healthTip:      validated.healthTip,
      validationNote: validated.validationNote,
    };

    return Response.json(recipe);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
