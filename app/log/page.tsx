import Link from "next/link";

export const metadata = { title: "食事ログ | Weekly Health Reset" };

export default function LogPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block">← ホーム</Link>
      <div className="text-5xl mb-4">📊</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">食事ログ・振り返り</h1>
      <p className="text-gray-400">日〜火曜日フェーズ（近日実装）</p>
    </div>
  );
}
