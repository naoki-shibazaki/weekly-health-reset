/**
 * lib/mock-calendar.ts
 * MenuProposal の MOCK_MEAL_PLAN を RecipeCard 形式に変換した初期カレンダー状態。
 * ANTHROPIC_API_KEY が未設定の場合のフォールバックとして使用する。
 */

import type { RecipeCard, WeekCalendar } from '@/types/calendar';

// ---------------------------------------------------------------------------
// ピッカー用 AI 提案レシピ（朝昼夜の全 21 品）
// ---------------------------------------------------------------------------

export const AI_RECIPE_POOL: RecipeCard[] = [
  // ── 月 ──
  { id: 'r-mon-b', name: '鶏むね肉の親子丼', description: '高タンパクな朝食。卵でコーティングしてふんわり仕上げ。', caloriesPlanned: 520, proteinG: 32, fatG: 12, carbG: 68, fiberG: 1.5, vegetableG: 100, mainIngredients: ['鶏むね肉', '卵', '玉ねぎ'], cookingTimeMinutes: 15, source: 'ai', isValidated: true, healthTip: '朝のタンパク質で午前中の集中力をサポート' },
  { id: 'r-mon-l', name: '野菜たっぷり豚汁定食', description: '根菜・きのこを使った食物繊維豊富な豚汁と白米。', caloriesPlanned: 680, proteinG: 28, fatG: 18, carbG: 92, fiberG: 5.0, vegetableG: 200, mainIngredients: ['豚バラ肉', '大根', 'にんじん', 'ごぼう'], cookingTimeMinutes: 20, source: 'ai', isValidated: true, healthTip: '根菜の食物繊維が腸内環境を整えます' },
  { id: 'r-mon-d', name: 'サーモンのホイル焼き', description: 'オメガ3が豊富。野菜と一緒にホイルに包んで蒸し焼き。', caloriesPlanned: 480, proteinG: 38, fatG: 22, carbG: 28, fiberG: 4.0, vegetableG: 200, mainIngredients: ['サーモン', 'ブロッコリー', '玉ねぎ'], cookingTimeMinutes: 25, source: 'ai', isValidated: true, healthTip: 'DHA・EPAが豊富で良質な脂質を摂取できます' },
  // ── 火 ──
  { id: 'r-tue-b', name: 'オートミールフルーツボウル', description: 'バナナ・ブルーベリー・ハチミツでトッピング。β-グルカンで腸活。', caloriesPlanned: 440, proteinG: 14, fatG: 8, carbG: 82, fiberG: 5.0, vegetableG: 150, mainIngredients: ['オートミール', 'バナナ', 'ブルーベリー'], cookingTimeMinutes: 5, source: 'ai', isValidated: true, healthTip: 'β-グルカンが腸内環境を整えます' },
  { id: 'r-tue-l', name: '鶏むね肉のサラダチキンラップ', description: '低カロリーで食べ応えあり。トルティーヤで包めば持ち運びも楽。', caloriesPlanned: 620, proteinG: 42, fatG: 14, carbG: 72, fiberG: 3.0, vegetableG: 200, mainIngredients: ['鶏むね肉', 'レタス', 'トマト', 'アボカド'], cookingTimeMinutes: 10, source: 'ai', isValidated: true, healthTip: 'アボカドの不飽和脂肪酸が良質な脂質を補います' },
  { id: 'r-tue-d', name: '豆腐ハンバーグ定食', description: '木綿豆腐で増量してカロリーオフ。和風おろしダレでさっぱりと。', caloriesPlanned: 580, proteinG: 32, fatG: 20, carbG: 58, fiberG: 3.0, vegetableG: 150, mainIngredients: ['木綿豆腐', '合いびき肉', '大根'], cookingTimeMinutes: 25, source: 'ai', isValidated: true, healthTip: '豆腐の大豆タンパクで栄養バランスが豊かになります' },
  // ── 水 ──
  { id: 'r-wed-b', name: '卵かけご飯＋わかめ味噌汁', description: '定番の和食朝食。わかめは食物繊維・ミネラルの補給源。', caloriesPlanned: 480, proteinG: 22, fatG: 10, carbG: 74, fiberG: 1.5, vegetableG: 50, mainIngredients: ['卵', '白米', 'わかめ', '豆腐'], cookingTimeMinutes: 8, source: 'ai', isValidated: true, healthTip: 'わかめのアルギン酸が血糖値の急上昇を穏やかにします' },
  { id: 'r-wed-l', name: '鮭のチャーハン', description: 'ほぐし鮭・卵・ネギの炒飯。フライパン1つで手軽に完成。', caloriesPlanned: 720, proteinG: 30, fatG: 22, carbG: 96, fiberG: 2.0, vegetableG: 100, mainIngredients: ['サーモン', '卵', '長ねぎ', '白米'], cookingTimeMinutes: 15, source: 'ai', isValidated: true, healthTip: 'サーモンの良質なタンパク質と卵を組み合わせた一品' },
  { id: 'r-wed-d', name: '鶏むね肉の塩麹蒸し', description: '塩麹の酵素で柔らかく仕上げた低脂質メイン。腸活にも◎。', caloriesPlanned: 520, proteinG: 45, fatG: 12, carbG: 24, fiberG: 4.0, vegetableG: 200, mainIngredients: ['鶏むね肉', 'ブロッコリー', 'にんじん', '塩麹'], cookingTimeMinutes: 20, source: 'ai', isValidated: true, healthTip: '塩麹の発酵パワーで肉が柔らかく消化も助けます' },
  // ── 木 ──
  { id: 'r-thu-b', name: 'バナナプロテインスムージー', description: 'バナナ・豆乳・プロテインパウダーをブレンド。5分で完成。', caloriesPlanned: 380, proteinG: 28, fatG: 6, carbG: 54, fiberG: 3.0, vegetableG: 100, mainIngredients: ['バナナ', '豆乳', 'プロテインパウダー'], cookingTimeMinutes: 5, source: 'ai', isValidated: true, healthTip: 'バナナのカリウムが筋肉の回復をサポートします' },
  { id: 'r-thu-l', name: 'ひじき煮弁当', description: '鉄分豊富なひじき煮・ほうれん草・白米。前日作り置きでラク。', caloriesPlanned: 640, proteinG: 22, fatG: 14, carbG: 98, fiberG: 6.0, vegetableG: 200, mainIngredients: ['ひじき', 'にんじん', '大豆', 'ほうれん草'], cookingTimeMinutes: 25, source: 'ai', isValidated: true, healthTip: '植物性鉄分とビタミンCを一緒に摂ることで吸収率が上がります' },
  { id: 'r-thu-d', name: 'ブリの照り焼き定食', description: 'DHA・EPAが豊富なブリを甘辛タレで香ばしく。和食の定番。', caloriesPlanned: 600, proteinG: 38, fatG: 26, carbG: 44, fiberG: 3.0, vegetableG: 150, mainIngredients: ['ブリ', 'ほうれん草'], cookingTimeMinutes: 20, source: 'ai', isValidated: true, healthTip: 'ブリの脂は良質なオメガ3脂肪酸で栄養価が高い' },
  // ── 金 ──
  { id: 'r-fri-b', name: '納豆ご飯＋野菜スープ', description: '腸活に欠かせない発酵食品・納豆。野菜スープで食物繊維も。', caloriesPlanned: 480, proteinG: 24, fatG: 10, carbG: 72, fiberG: 4.0, vegetableG: 150, mainIngredients: ['納豆', '白米', 'キャベツ', 'にんじん'], cookingTimeMinutes: 10, source: 'ai', isValidated: true, healthTip: '納豆のナットウキナーゼは腸内環境の改善をサポートします' },
  { id: 'r-fri-l', name: 'ガパオライス', description: 'バジルとひき肉の炒め物。目玉焼きをのせてタンパク質を追加。', caloriesPlanned: 680, proteinG: 32, fatG: 24, carbG: 82, fiberG: 2.0, vegetableG: 100, mainIngredients: ['鶏ひき肉', 'ピーマン', '卵', 'バジル'], cookingTimeMinutes: 20, source: 'ai', isValidated: true, healthTip: 'バジルにはビタミンKやマグネシウムが含まれています' },
  { id: 'r-fri-d', name: '豚しゃぶ野菜鍋', description: 'たっぷりの野菜でビタミン・ミネラルを補給。週末前に軽め。', caloriesPlanned: 520, proteinG: 36, fatG: 16, carbG: 42, fiberG: 5.0, vegetableG: 350, mainIngredients: ['豚ロース', '白菜', '長ねぎ', '豆腐', 'えのき'], cookingTimeMinutes: 15, source: 'ai', isValidated: true, healthTip: '鍋は野菜をたくさん食べられる最強の健康料理です' },
  // ── 土 ──
  { id: 'r-sat-b', name: 'アボカドトースト＋ポーチドエッグ', description: '週末の豪華な朝食。アボカドの良質な脂質とたんぱく質で充実の朝に。', caloriesPlanned: 560, proteinG: 22, fatG: 28, carbG: 52, fiberG: 4.0, vegetableG: 200, mainIngredients: ['アボカド', '食パン', '卵'], cookingTimeMinutes: 15, source: 'ai', isValidated: true, healthTip: 'アボカドの不飽和脂肪酸がビタミンの吸収を助けます' },
  { id: 'r-sat-l', name: '自家製チキンバーガー', description: '揚げないオーブン焼きチキン。カロリー20〜30%オフ。', caloriesPlanned: 740, proteinG: 38, fatG: 22, carbG: 88, fiberG: 2.0, vegetableG: 150, mainIngredients: ['鶏むね肉', 'レタス', 'トマト', 'チーズ'], cookingTimeMinutes: 30, source: 'ai', isValidated: true, healthTip: '揚げずにオーブン焼きにすることで脂質を大幅にカット' },
  { id: 'r-sat-d', name: '手巻き寿司', description: '週末の特別メニュー。刺し身は良質なタンパク源で低カロリー。', caloriesPlanned: 480, proteinG: 36, fatG: 14, carbG: 56, fiberG: 2.0, vegetableG: 200, mainIngredients: ['マグロ', 'サーモン', 'えび', 'アボカド', 'きゅうり'], cookingTimeMinutes: 20, source: 'ai', isValidated: true, healthTip: '刺し身はDHA・EPAをそのまま摂取できます' },
  // ── 日 ──
  { id: 'r-sun-b', name: 'フレンチトースト＋フルーツ', description: '食パン・卵・牛乳でリッチな朝食。バナナ添えでカリウムも。', caloriesPlanned: 480, proteinG: 18, fatG: 16, carbG: 66, fiberG: 2.0, vegetableG: 100, mainIngredients: ['食パン', '卵', '牛乳', 'バナナ'], cookingTimeMinutes: 15, source: 'ai', isValidated: true, healthTip: '週の締めくくりは少し豪華に。精神的満足感も大切です' },
  { id: 'r-sun-l', name: '豚肉と野菜の炒め定食', description: 'にんにく炒めでスタミナチャージ。副菜2品付きでバランス◎。', caloriesPlanned: 720, proteinG: 32, fatG: 24, carbG: 88, fiberG: 4.0, vegetableG: 400, mainIngredients: ['豚肩ロース', 'キャベツ', 'もやし', 'にら'], cookingTimeMinutes: 20, source: 'ai', isValidated: true, healthTip: 'もやしは低カロリーで食物繊維とビタミンCが豊富' },
  { id: 'r-sun-d', name: '鶏むね肉のみぞれ煮', description: '大根おろしで消化を助けるやさしい和食。1週間の締めくくりに。', caloriesPlanned: 500, proteinG: 42, fatG: 10, carbG: 36, fiberG: 2.5, vegetableG: 200, mainIngredients: ['鶏むね肉', '大根'], cookingTimeMinutes: 25, source: 'ai', isValidated: true, healthTip: '大根に含まれるアミラーゼが消化を助けます' },
];

// お気に入りレシピ（事前登録済みを想定）
export const FAVORITE_RECIPES: RecipeCard[] = [
  { id: 'fav-1', name: '味噌ラーメン', description: '自家製スープのヘルシー味噌ラーメン。野菜をたっぷり追加。', caloriesPlanned: 580, proteinG: 24, fatG: 16, carbG: 82, fiberG: 3.5, vegetableG: 200, mainIngredients: ['中華麺', '味噌', 'もやし', 'チャーシュー'], cookingTimeMinutes: 20, source: 'favorite', isValidated: true },
  { id: 'fav-2', name: 'アジの南蛮漬け', description: '揚げずに焼いて作るヘルシー南蛮漬け。常備菜として◎。', caloriesPlanned: 380, proteinG: 28, fatG: 14, carbG: 32, fiberG: 2.0, vegetableG: 150, mainIngredients: ['アジ', '玉ねぎ', 'にんじん', 'ピーマン'], cookingTimeMinutes: 30, source: 'favorite', isValidated: true },
  { id: 'fav-3', name: '卵とほうれん草のキッシュ', description: '牛乳・卵・チーズで作る栄養豊富なキッシュ。作り置きOK。', caloriesPlanned: 420, proteinG: 22, fatG: 26, carbG: 26, fiberG: 2.0, vegetableG: 150, mainIngredients: ['卵', 'ほうれん草', 'チーズ', '牛乳'], cookingTimeMinutes: 40, source: 'favorite', isValidated: true },
  { id: 'fav-4', name: '豚キムチ炒め定食', description: '発酵食品・キムチで腸活。ビタミンCも摂取できる一品。', caloriesPlanned: 640, proteinG: 30, fatG: 22, carbG: 72, fiberG: 3.0, vegetableG: 200, mainIngredients: ['豚こま肉', 'キムチ', '玉ねぎ', '白米'], cookingTimeMinutes: 15, source: 'favorite', isValidated: true },
  { id: 'fav-5', name: '鶏の水炊き', description: '鶏もも肉と野菜をシンプルに煮込んだ鍋。ポン酢で食べる定番。', caloriesPlanned: 460, proteinG: 38, fatG: 16, carbG: 32, fiberG: 4.0, vegetableG: 300, mainIngredients: ['鶏もも肉', '白菜', '豆腐', '春菊'], cookingTimeMinutes: 20, source: 'favorite', isValidated: true },
];

// ---------------------------------------------------------------------------
// 初期カレンダー（AI 提案ベース）
// ---------------------------------------------------------------------------

const DAYS: Array<{ label: string; date: string }> = [
  { label: '月', date: '2026-04-06' },
  { label: '火', date: '2026-04-07' },
  { label: '水', date: '2026-04-08' },
  { label: '木', date: '2026-04-09' },
  { label: '金', date: '2026-04-10' },
  { label: '土', date: '2026-04-11' },
  { label: '日', date: '2026-04-12' },
];

// AI_RECIPE_POOL を朝昼夜の順で3つずつ使う
export const INITIAL_CALENDAR = DAYS.map((day, i): import('@/types/calendar').CalendarDay => ({
  dayIndex: i,
  dayLabel: day.label,
  date: day.date,
  breakfast: AI_RECIPE_POOL[i * 3]     ?? null,
  lunch:     AI_RECIPE_POOL[i * 3 + 1] ?? null,
  dinner:    AI_RECIPE_POOL[i * 3 + 2] ?? null,
}));
