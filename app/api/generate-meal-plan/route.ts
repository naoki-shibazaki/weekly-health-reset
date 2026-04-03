/**
 * app/api/generate-meal-plan/route.ts
 * Claude API を呼び出して1週間分の献立 JSON を生成する Next.js API ルート。
 *
 * POST /api/generate-meal-plan
 * Body: { profile, goal, pastLogs, weekStartDate }
 * Response: GeneratedMealPlan (JSON)
 */

import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/ai/menu-prompt';
import type { UserProfile, WeeklyGoalInput, PastLogEntry, GeneratedMealPlan } from '@/lib/ai/menu-prompt';

const client = new Anthropic();

export async function POST(req: Request) {
  const { profile, goal, pastLogs, weekStartDate } = (await req.json()) as {
    profile: UserProfile;
    goal: WeeklyGoalInput;
    pastLogs: PastLogEntry[];
    weekStartDate: string;
  };

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: buildSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(profile, goal, pastLogs, weekStartDate),
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== 'text') {
      throw new Error('Unexpected response type from Claude API');
    }

    // JSON のみを抽出（```json ``` ブロックで返ってきた場合にも対応）
    const raw = block.text.trim();
    const jsonText = raw.startsWith('{')
      ? raw
      : raw.replace(/^```json\s*/m, '').replace(/\s*```$/m, '').trim();

    const mealPlan: GeneratedMealPlan = JSON.parse(jsonText);
    return Response.json(mealPlan);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
