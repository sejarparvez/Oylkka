const BN_TO_LATIN: Record<string, string> = {
  অ: 'a',
  আ: 'a',
  ই: 'i',
  ঈ: 'i',
  উ: 'u',
  ঊ: 'u',
  ঋ: 'ri',
  এ: 'e',
  ঐ: 'ai',
  ও: 'o',
  ঔ: 'au',
  'া': 'a',
  'ি': 'i',
  'ী': 'i',
  'ু': 'u',
  'ূ': 'u',
  'ৃ': 'ri',
  'ে': 'e',
  'ৈ': 'ai',
  'ো': 'o',
  'ৌ': 'au',
  '্': '',
  'ং': 'ng',
  'ঃ': '',
  'ঁ': '',
  ক: 'k',
  খ: 'kh',
  গ: 'g',
  ঘ: 'gh',
  ঙ: 'ng',
  চ: 'ch',
  ছ: 'chh',
  জ: 'j',
  ঝ: 'jh',
  ঞ: 'ny',
  ট: 't',
  ঠ: 'th',
  ড: 'd',
  ঢ: 'dh',
  ণ: 'n',
  ত: 't',
  থ: 'th',
  দ: 'd',
  ধ: 'dh',
  ন: 'n',
  প: 'p',
  ফ: 'ph',
  ব: 'b',
  ভ: 'bh',
  ম: 'm',
  য: 'y',
  র: 'r',
  ল: 'l',
  শ: 'sh',
  ষ: 'sh',
  স: 's',
  হ: 'h',
  ড়: 'r',
  ঢ়: 'rh',
  য়: 'y',
  ৎ: 't',
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

function transliterate(text: string): string {
  let out = '';
  for (const ch of text) {
    out += BN_TO_LATIN[ch] ?? ch;
  }
  return out;
}

export function slugify(text: string): string {
  return transliterate(text)
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function fallbackSlug(): string {
  return `shop-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
}
