import Link from "next/link";

export const metadata = { title: "カート連携 | Weekly Health Reset" };

export default function CartPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-8 inline-block">← ホーム</Link>
      <div className="text-5xl mb-4">🛒</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">カート連携</h1>
      <p className="text-gray-400">土曜日フェーズ（近日実装）</p>
    </div>
  );
}
