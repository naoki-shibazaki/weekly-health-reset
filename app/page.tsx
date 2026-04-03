import Link from "next/link";

const CYCLE_STEPS = [
  {
    day: "月・火",
    phase: "振り返り",
    description: "AI が先週のデータを分析し、改善ポイントをレポート",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: "📊",
    href: "/log",
  },
  {
    day: "水・木",
    phase: "目標設定",
    description: "次週のカロリー・PFC 目標と食の制約を設定",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: "🎯",
    href: "/goal",
  },
  {
    day: "金",
    phase: "献立提案",
    description: "AI が7日分の献立を自動生成。カスタマイズも可能",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: "🍽️",
    href: "/meal-plan",
    highlight: true,
  },
  {
    day: "土",
    phase: "カート連携",
    description: "食材リストを EC サービスのカートへ一括追加",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: "🛒",
    href: "/cart",
  },
  {
    day: "日",
    phase: "食材到着",
    description: "玄関に食材が届く。週のリセットスタート",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: "📦",
    href: "/log",
  },
];

export default function HomePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-3 py-1 rounded-full border border-green-200 mb-4">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          MVP v0.1
        </div>
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-3">
          Weekly Health Reset
        </h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          日曜朝に食材が届く、週次サイクルで<br />
          健康習慣を積み上げるアプリ
        </p>
      </div>

      {/* Cycle */}
      <div className="mb-10">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
          週次サイクル
        </h2>
        <div className="space-y-3">
          {CYCLE_STEPS.map((step) => (
            <Link key={step.phase} href={step.href}>
              <div
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
                  step.highlight
                    ? "ring-2 ring-[#5B8CFF] ring-offset-2 bg-white border-[#5B8CFF]/20"
                    : "bg-white border-gray-100"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl border ${step.color}`}
                >
                  {step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-gray-400">
                      {step.day}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {step.phase}
                    </span>
                    {step.highlight && (
                      <span className="text-xs bg-[#5B8CFF] text-white px-2 py-0.5 rounded-full">
                        今週はここ
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">
                    {step.description}
                  </p>
                </div>
                <span className="text-gray-300 text-lg">›</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Link href="/meal-plan">
        <div className="w-full bg-[#5B8CFF] hover:bg-[#4a7aef] text-white font-bold py-4 px-6 rounded-2xl text-center text-lg transition-colors cursor-pointer shadow-lg shadow-[#5B8CFF]/30">
          今週の献立を確認する →
        </div>
      </Link>
    </div>
  );
}
