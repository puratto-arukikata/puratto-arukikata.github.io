// 自動チェック：node check.js
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const grab = id => html.match(new RegExp(`<script id="${id}">([\\s\\S]*?)</script>`))[1];
const ctx = {};
new Function('ctx', grab('data') + grab('logic') +
  '\nObject.assign(ctx,{TYPE_ORDER,QUESTIONS,SHELVES,SHELVES_PER_RESULT,calcType,pickShelves,shelfText});')(ctx);
const { TYPE_ORDER, QUESTIONS, SHELVES, calcType, pickShelves } = ctx;

let ok = true;
const check = (label, cond, detail = '') => { console.log(`${cond ? '✅' : '❌'} ${label}${detail ? '　' + detail : ''}`); if (!cond) ok = false; };

// ── チェック①：配点と同点ルール ──
console.log('\n■ チェック①：配点と同点ルール（Q4優先）');
const mainCnt = {}, subCnt = {};
TYPE_ORDER.forEach(t => { mainCnt[t] = 0; subCnt[t] = 0; });
QUESTIONS.forEach(q => q.choices.forEach(c => { mainCnt[c.main]++; subCnt[c.sub]++; }));
check('選択肢は18個（3・4・4・4・3）', QUESTIONS.map(q => q.choices.length).join('・') === '3・4・4・4・3');
check('6タイプとも メイン3回・サブ3回', TYPE_ORDER.every(t => mainCnt[t] === 3 && subCnt[t] === 3));

const counts = {}; TYPE_ORDER.forEach(t => counts[t] = 0);
let n = 0, undecided = 0;
(function walk(i, ans) {
  if (i === QUESTIONS.length) {
    n++;
    const t = calcType(ans);
    if (!TYPE_ORDER.includes(t)) undecided++; else counts[t]++;
    return;
  }
  QUESTIONS[i].choices.forEach((_, k) => walk(i + 1, { ...ans, [QUESTIONS[i].key]: k }));
})(0, {});
const expected = { 深海: 83, 窓辺: 86, 地図: 115, 夕暮れ: 93, 焚き火: 113, 迷子: 86 };
check('答え方は全576通り', n === 576, `${n}通り`);
check('どの答え方でも1タイプに決まる', undecided === 0);
check('タイプごとの回数が確定版と一致', TYPE_ORDER.every(t => counts[t] === expected[t]),
  TYPE_ORDER.map(t => `${t}${counts[t]}`).join('・'));
const vals = Object.values(counts);
console.log(`   最多÷最少 = ${(Math.max(...vals) / Math.min(...vals)).toFixed(2)}倍`);
// 同じ答え方なら毎回同じ結果（再現性）
const sample = { q1: 2, q2: 1, q3: 3, q4: 0, q5: 2 };
check('同じ答え方なら毎回同じタイプ', new Set(Array.from({ length: 100 }, () => calcType(sample))).size === 1);

// ── チェック②：シャッフルの公平さ ──
console.log('\n■ チェック②：シャッフルの公平さ（10万回）');
check('棚は10棚', SHELVES.length === 10);
check('棚番号の重複なし', new Set(SHELVES.map(s => s.id)).size === SHELVES.length);
const N = 100000, hit = {}; SHELVES.forEach(s => hit[s.id] = 0);
let dup = 0;
for (let i = 0; i < N; i++) {
  const p = pickShelves(SHELVES, 3);
  if (new Set(p.map(s => s.id)).size !== 3) dup++;
  p.forEach(s => hit[s.id]++);
}
check('同じ回に同じ棚が2回出ない', dup === 0);
const rates = SHELVES.map(s => hit[s.id] / N * 100);
check('各棚の出る割合がほぼ30%（29〜31%）', rates.every(r => r > 29 && r < 31),
  SHELVES.map((s, i) => `棚${s.id}:${rates[i].toFixed(1)}%`).join(' '));

// ── チェック③：名称 ──
console.log('\n■ チェック③：名称');
check('旧称「ぷらっと散歩」が残っていない', !html.includes('ぷらっと散歩'));
check('外部への読み込み・リンク（http）がない', !/https?:\/\//.test(html));
check('Instagramへのリンクがない', !/instagram/i.test(html));
check('棚の写真を出す仕組みがない', !/photo|<img/i.test(html));
check('検索エンジンに載らない設定（noindex）がある', /<meta name="robots" content="noindex/.test(html));

console.log(ok ? '\nすべてOK' : '\n要確認あり');
process.exit(ok ? 0 : 1);
