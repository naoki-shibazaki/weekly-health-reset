export type SupermarketId = 'rakuten' | 'aeon' | 'amazon';

export interface SupermarketLink {
  id: SupermarketId;
  name: string;
  shortName: string;
  url: string;
  colorClass: string;
  bgClass: string;
}

const SUPERMARKETS: Array<{
  id: SupermarketId;
  name: string;
  shortName: string;
  buildUrl: (keyword: string) => string;
  colorClass: string;
  bgClass: string;
}> = [
  {
    id: 'rakuten',
    name: '楽天西友ネットスーパー',
    shortName: '楽天西友',
    buildUrl: (kw) =>
      `https://sm.rakuten.co.jp/search?keyword=${encodeURIComponent(kw)}`,
    colorClass: 'text-red-600',
    bgClass: 'bg-red-50 hover:bg-red-100 border-red-200',
  },
  {
    id: 'aeon',
    name: 'イオンネットスーパー',
    shortName: 'イオン',
    buildUrl: (kw) =>
      `https://shop.aeon.com/netsuper/shop/goods/search.html?keyword=${encodeURIComponent(kw)}`,
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
  },
  {
    id: 'amazon',
    name: 'Amazon Fresh',
    shortName: 'Amazon',
    buildUrl: (kw) =>
      `https://www.amazon.co.jp/s?k=${encodeURIComponent(kw)}&i=amazonfresh`,
    colorClass: 'text-orange-600',
    bgClass: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
  },
];

/**
 * 食材名からネットスーパーの検索URLリストを生成する。
 * URIエンコードは各スーパーの buildUrl 内で実施。
 */
export function getSupermarketLinks(foodName: string): SupermarketLink[] {
  return SUPERMARKETS.map(({ buildUrl, ...rest }) => ({
    ...rest,
    url: buildUrl(foodName),
  }));
}
