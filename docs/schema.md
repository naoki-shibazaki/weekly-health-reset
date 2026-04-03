# データベース設計（Supabase / PostgreSQL）

> 食事ログを「学習資産」として蓄積し、週を重ねるごとにパーソナライズ精度を向上させるための設計

---

## 設計方針

1. **食事ログは不変 (immutable)** — 記録したログは削除せず、`deleted_at` で論理削除のみ行う
2. **週サイクルを主キー構造に反映** — `weekly_cycles` を軸に目標・献立・ログを紐付ける
3. **AI 入出力を永続化** — 献立提案プロンプト・レスポンスを保存し、プロンプト改善に活用
4. **食品マスタは共有 + ユーザー拡張** — 共通 DB + ユーザー独自食品の両立
5. **集計はマテリアライズドビューで高速化** — 日次・週次の栄養集計を事前計算

---

## ERD（概略）

```
users
 └──< weekly_cycles
        ├──< daily_goals
        ├──< meal_plans          (AI 提案)
        │     └──< meal_plan_days
        │           └──< meal_plan_items  ──> food_master
        └──< food_logs
              └──< food_log_items ──> food_master

users
 ├──< user_preferences
 ├──< user_allergies
 ├──< body_records
 └──< favorite_recipes
```

---

## テーブル定義

### `users`（Supabase Auth 連携）

```sql
-- Supabase Auth の auth.users を参照する公開プロファイル
create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text        not null,
  avatar_url    text,
  timezone      text        not null default 'Asia/Tokyo',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

---

### `user_preferences`（食習慣・制約）

```sql
create table public.user_preferences (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  diet_style         text,         -- 'standard' | 'low_carb' | 'vegan' | 'vegetarian' | 'keto'
  cooking_skill      text,         -- 'beginner' | 'intermediate' | 'advanced'
  cooking_time_limit int,          -- 調理時間の上限（分）
  budget_per_week    int,          -- 週の食費予算（円）
  household_size     int not null default 1,
  disliked_foods     text[],       -- 苦手食材リスト
  notes              text,         -- 自由記述（AI プロンプトに挿入）
  updated_at         timestamptz not null default now(),
  unique (user_id)
);
```

---

### `user_allergies`（アレルギー情報）

```sql
create type allergy_severity as enum ('intolerance', 'allergy', 'severe');

create table public.user_allergies (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  allergen   text not null,   -- 'gluten' | 'dairy' | 'egg' | 'shellfish' | 'nuts' など
  severity   allergy_severity not null default 'allergy',
  created_at timestamptz not null default now()
);
```

---

### `weekly_cycles`（週サイクルの中心テーブル）

```sql
create table public.weekly_cycles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  week_start_date date not null,   -- 月曜日の日付
  week_end_date   date not null,   -- 日曜日の日付
  status          text not null default 'goal_setting',
  -- 'goal_setting' | 'meal_planning' | 'cart_ready' | 'in_progress' | 'completed'
  created_at      timestamptz not null default now(),
  unique (user_id, week_start_date)
);

-- 直近サイクル取得用インデックス
create index on public.weekly_cycles (user_id, week_start_date desc);
```

---

### `weekly_goals`（週次目標）

```sql
create table public.weekly_goals (
  id                    uuid primary key default gen_random_uuid(),
  weekly_cycle_id       uuid not null references public.weekly_cycles(id) on delete cascade,
  user_id               uuid not null references public.users(id) on delete cascade,

  -- カロリー目標
  target_calories       int not null,        -- kcal/日
  target_protein_g      numeric(5,1),        -- g/日
  target_fat_g          numeric(5,1),        -- g/日
  target_carb_g         numeric(5,1),        -- g/日

  -- 体組成目標
  target_weight_kg      numeric(5,2),
  target_body_fat_pct   numeric(4,1),

  -- 自由テキスト目標（AI に渡す）
  free_goal_text        text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (weekly_cycle_id)
);
```

---

### `food_master`（食品マスタ）

```sql
create table public.food_master (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  name_kana       text,
  brand           text,
  category        text,             -- '野菜' | '肉類' | '魚介' | '乳製品' など
  serving_unit    text not null default 'g',
  calories_per_100 numeric(6,1) not null,
  protein_per_100  numeric(5,2),
  fat_per_100      numeric(5,2),
  carb_per_100     numeric(5,2),
  fiber_per_100    numeric(5,2),
  salt_per_100     numeric(5,2),
  is_public       boolean not null default true,   -- false = ユーザー独自食品
  created_by      uuid references public.users(id),
  created_at      timestamptz not null default now()
);

create index on public.food_master using gin(to_tsvector('japanese', name));
```

---

### `meal_plans`（AI 献立提案）

```sql
create table public.meal_plans (
  id                  uuid primary key default gen_random_uuid(),
  weekly_cycle_id     uuid not null references public.weekly_cycles(id) on delete cascade,
  user_id             uuid not null references public.users(id) on delete cascade,
  version             int not null default 1,   -- 再生成のたびにインクリメント
  is_active           boolean not null default true,

  -- AI メタデータ（プロンプト改善・デバッグ用）
  ai_model            text,
  ai_prompt_snapshot  jsonb,   -- 送信したプロンプト全文
  ai_raw_response     jsonb,   -- API レスポンス全文

  total_estimated_cost int,    -- 食材費の推定（円）
  notes               text,
  created_at          timestamptz not null default now()
);
```

---

### `meal_plan_days`（日別献立）

```sql
create table public.meal_plan_days (
  id            uuid primary key default gen_random_uuid(),
  meal_plan_id  uuid not null references public.meal_plans(id) on delete cascade,
  day_date      date not null,
  day_of_week   smallint not null,   -- 0=月 ... 6=日
  total_calories_planned int,
  notes         text,
  unique (meal_plan_id, day_date)
);
```

---

### `meal_plan_items`（献立の各食事）

```sql
create type meal_timing as enum ('breakfast', 'lunch', 'dinner', 'snack');

create table public.meal_plan_items (
  id                uuid primary key default gen_random_uuid(),
  meal_plan_day_id  uuid not null references public.meal_plan_days(id) on delete cascade,
  timing            meal_timing not null,
  sort_order        smallint not null default 0,

  recipe_name       text not null,
  recipe_description text,
  serving_count     int not null default 1,

  calories_planned  int,
  protein_g_planned numeric(5,1),
  fat_g_planned     numeric(5,1),
  carb_g_planned    numeric(5,1),

  is_user_modified  boolean not null default false,
  created_at        timestamptz not null default now()
);
```

---

### `meal_plan_ingredients`（献立の食材リスト）

```sql
create table public.meal_plan_ingredients (
  id                  uuid primary key default gen_random_uuid(),
  meal_plan_item_id   uuid not null references public.meal_plan_items(id) on delete cascade,
  food_id             uuid references public.food_master(id),
  food_name           text not null,   -- food_master 未登録でも保存できるよう冗長化
  amount_g            numeric(7,1) not null,
  unit_display        text,            -- '1/2個' など表示用
  is_staple           boolean not null default false,   -- 調味料等の常備品フラグ
  ec_product_id       text,            -- EC 連携用商品 ID
  estimated_price     int              -- 円
);
```

---

### `food_logs`（食事ログ — 学習資産の中核）

```sql
create table public.food_logs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  weekly_cycle_id   uuid references public.weekly_cycles(id),
  meal_plan_item_id uuid references public.meal_plan_items(id),  -- 計画との紐付け

  logged_at         timestamptz not null,
  timing            meal_timing not null,

  -- 計画との差分追跡
  was_planned       boolean not null default false,
  deviation_reason  text,   -- 'no_ingredient' | 'not_hungry' | 'eating_out' | 'other'

  notes             text,
  photo_url         text,   -- Supabase Storage の URL

  total_calories    int,
  total_protein_g   numeric(5,1),
  total_fat_g       numeric(5,1),
  total_carb_g      numeric(5,1),

  deleted_at        timestamptz,   -- 論理削除
  created_at        timestamptz not null default now()
);

create index on public.food_logs (user_id, logged_at desc);
create index on public.food_logs (weekly_cycle_id) where deleted_at is null;
```

---

### `food_log_items`（食事ログの内訳）

```sql
create table public.food_log_items (
  id           uuid primary key default gen_random_uuid(),
  food_log_id  uuid not null references public.food_logs(id) on delete cascade,
  food_id      uuid references public.food_master(id),
  food_name    text not null,
  amount_g     numeric(7,1) not null,
  calories     int,
  protein_g    numeric(5,1),
  fat_g        numeric(5,1),
  carb_g       numeric(5,1)
);
```

---

### `body_records`（体組成記録）

```sql
create table public.body_records (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  recorded_date  date not null,
  weight_kg      numeric(5,2),
  body_fat_pct   numeric(4,1),
  muscle_mass_kg numeric(5,2),
  sleep_hours    numeric(3,1),
  mood_score     smallint check (mood_score between 1 and 5),
  notes          text,
  created_at     timestamptz not null default now(),
  unique (user_id, recorded_date)
);
```

---

### `weekly_reviews`（週次振り返り — AI 生成）

```sql
create table public.weekly_reviews (
  id                    uuid primary key default gen_random_uuid(),
  weekly_cycle_id       uuid not null references public.weekly_cycles(id) on delete cascade,
  user_id               uuid not null references public.users(id) on delete cascade,

  -- 達成率
  calorie_adherence_pct numeric(5,1),   -- カロリー達成率（%）
  meal_plan_adherence_pct numeric(5,1), -- 献立遵守率（%）
  log_completion_pct    numeric(5,1),   -- ログ記録率（%）

  -- AI 生成コンテンツ
  ai_summary            text,
  ai_insights           jsonb,   -- { strengths: [], improvements: [], next_week_tips: [] }
  ai_model              text,
  ai_raw_response       jsonb,

  -- ユーザーのリアクション
  user_rating           smallint check (user_rating between 1 and 5),
  user_memo             text,

  created_at            timestamptz not null default now(),
  unique (weekly_cycle_id)
);
```

---

### `favorite_recipes`（お気に入りレシピ）

```sql
create table public.favorite_recipes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  recipe_name   text not null,
  source        text,    -- 'meal_plan' | 'manual'
  rating        smallint check (rating between 1 and 5),
  tags          text[],
  notes         text,
  created_at    timestamptz not null default now()
);
```

---

## マテリアライズドビュー（集計高速化）

```sql
-- 日次栄養集計ビュー
create materialized view public.daily_nutrition_summary as
select
  user_id,
  date_trunc('day', logged_at at time zone 'Asia/Tokyo')::date as log_date,
  sum(total_calories)    as total_calories,
  sum(total_protein_g)   as total_protein_g,
  sum(total_fat_g)       as total_fat_g,
  sum(total_carb_g)      as total_carb_g,
  count(*)               as meal_count
from public.food_logs
where deleted_at is null
group by user_id, log_date;

create unique index on public.daily_nutrition_summary (user_id, log_date);

-- 週次達成率ビュー
create materialized view public.weekly_adherence_summary as
select
  fl.weekly_cycle_id,
  fl.user_id,
  count(*) filter (where fl.was_planned)     as planned_meal_logged,
  count(*) filter (where not fl.was_planned) as unplanned_meal_count,
  avg(fl.total_calories)                      as avg_daily_calories,
  count(distinct date_trunc('day', fl.logged_at)::date) as days_logged
from public.food_logs fl
where fl.deleted_at is null and fl.weekly_cycle_id is not null
group by fl.weekly_cycle_id, fl.user_id;
```

---

## RLS（Row Level Security）ポリシー

```sql
-- 全テーブルに RLS を有効化
alter table public.users              enable row level security;
alter table public.weekly_cycles      enable row level security;
alter table public.food_logs          enable row level security;
-- ... 他のテーブルも同様

-- ユーザーは自分のデータのみ操作可能
create policy "users_own_data" on public.food_logs
  for all using (user_id = auth.uid());

create policy "users_own_data" on public.weekly_cycles
  for all using (user_id = auth.uid());

-- food_master はパブリックデータを全員が読める
create policy "public_food_master_readable" on public.food_master
  for select using (is_public = true);

create policy "users_own_food_master" on public.food_master
  for all using (created_by = auth.uid() and is_public = false);
```

---

## Edge Functions（サーバーサイドロジック）

| 関数名 | トリガー | 処理 |
|---|---|---|
| `generate-meal-plan` | 金曜 12:00 / ユーザー手動実行 | Claude API で献立生成、`meal_plans` に保存 |
| `refresh-nutrition-summary` | `food_logs` INSERT/UPDATE 後 | マテリアライズドビューを更新 |
| `generate-weekly-review` | 月曜 09:00 | 先週データを集計し Claude API でレビュー生成 |
| `send-push-notifications` | cron | 週次サイクルに応じた通知を送信 |

---

## AI プロンプト構築のためのクエリ例

```sql
-- 献立提案プロンプト用データ取得
select
  u.display_name,
  up.diet_style,
  up.cooking_skill,
  up.cooking_time_limit,
  up.budget_per_week,
  up.household_size,
  up.disliked_foods,
  up.notes                           as free_preferences,
  wg.target_calories,
  wg.target_protein_g,
  wg.target_fat_g,
  wg.target_carb_g,
  wg.free_goal_text,
  array_agg(distinct ua.allergen)    as allergies,
  array_agg(distinct fr.recipe_name) as favorite_recipes
from public.users u
  join public.user_preferences up on up.user_id = u.id
  join public.weekly_goals wg      on wg.user_id = u.id
  left join public.user_allergies ua on ua.user_id = u.id
  left join public.favorite_recipes fr on fr.user_id = u.id and fr.rating >= 4
where u.id = $1
  and wg.weekly_cycle_id = $2
group by u.id, up.id, wg.id;
```

---

## インデックス一覧

```sql
-- 検索・集計でよく使うカラムにインデックス
create index on public.food_logs           (user_id, logged_at desc);
create index on public.food_logs           (weekly_cycle_id) where deleted_at is null;
create index on public.meal_plan_items     (meal_plan_day_id, timing);
create index on public.body_records        (user_id, recorded_date desc);
create index on public.weekly_cycles       (user_id, week_start_date desc);
create index on public.food_master         using gin(to_tsvector('japanese', name));
```
