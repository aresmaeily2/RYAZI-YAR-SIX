import React, { useState } from 'react';
import { toPersianDigits } from '../utils/mathEngine';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444'];

/** محور اعداد ۰ تا ۲ با نشانگرهای کسرها */
const NumberLine: React.FC<{ values: { num: number; den: number; color: string }[] }> = ({ values }) => (
  <svg viewBox="0 0 320 56" className="w-full" role="img" aria-label="محور اعداد از صفر تا دو">
    <line x1="10" y1="28" x2="310" y2="28" stroke="#475569" strokeWidth="2" />
    {[0, 0.5, 1, 1.5, 2].map((t) => (
      <g key={t}>
        <line x1={10 + t * 150} y1="22" x2={10 + t * 150} y2="34" stroke="#475569" strokeWidth="2" />
        <text x={10 + t * 150} y="50" textAnchor="middle" fontSize="12" fill="#475569">{toPersianDigits(t)}</text>
      </g>
    ))}
    {values.map((v, i) => {
      const x = 10 + (v.num / v.den) * 150;
      return (
        <g key={i}>
          <circle cx={x} cy="28" r="7" fill={v.color} stroke="#fff" strokeWidth="2" />
          <text x={x} y="12" textAnchor="middle" fontSize="11" fontWeight="bold" fill={v.color}>
            {toPersianDigits(v.num)}/{toPersianDigits(v.den)}
          </text>
        </g>
      );
    })}
  </svg>
);

/** آزمایشگاه کسر نسخه ۲ — نوار، دایره، محور اعداد، تساوی و جمع */
export const FractionLabV2: React.FC = () => {
  const [aNum, setANum] = useState(1);
  const [aDen, setADen] = useState(2);
  const [bNum, setBNum] = useState(2);
  const [bDen, setBDen] = useState(6);
  const [mode, setMode] = useState<'bar' | 'circle'>('bar');

  const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
  const sumNum = aNum * bDen + bNum * aDen;
  const sumDen = aDen * bDen;
  const g = gcd(sumNum, sumDen) || 1;

  const slices = (num: number, den: number, color: string, keyPrefix: string) => {
    const angle = 360 / den;
    let paths = '';
    for (let i = 0; i < num; i++) {
      const a1 = ((i * angle - 90) * Math.PI) / 180;
      const a2 = (((i + 1) * angle - 90) * Math.PI) / 180;
      const x1 = 60 + 52 * Math.cos(a1); const y1 = 60 + 52 * Math.sin(a1);
      const x2 = 60 + 52 * Math.cos(a2); const y2 = 60 + 52 * Math.sin(a2);
      paths += `<path d="M60 60 L${x1.toFixed(1)} ${y1.toFixed(1)} A52 52 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${color}" stroke="#fff" stroke-width="1.5"/>`;
    }
    return <g key={keyPrefix} dangerouslySetInnerHTML={{ __html: paths }} />;
  };

  return (
    <div className="card p-5 my-4 border-r-4 border-r-emerald-400" data-testid="fraction-lab-v2">
      <h4 className="font-black text-emerald-900 text-base mb-1">آزمایشگاه کسر — نوار، دایره، محور و جمع</h4>
      <p className="text-xs text-emerald-700 mb-3">دو کسر را با اسلایدر تغییر بده؛ نمایش نوار/دایره، محور اعداد و جمع آن‌ها زنده به‌روز می‌شود.</p>

      <div className="flex gap-2 mb-3" role="group" aria-label="نوع نمایش">
        <button type="button" onClick={() => setMode('bar')} aria-pressed={mode === 'bar'}
          className={`px-3 py-1 rounded-lg text-sm font-bold motion-reduce:transition-none ${mode === 'bar' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>نوار</button>
        <button type="button" onClick={() => setMode('circle')} aria-pressed={mode === 'circle'}
          className={`px-3 py-1 rounded-lg text-sm font-bold motion-reduce:transition-none ${mode === 'circle' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>دایره</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[{ n: aNum, d: aDen, sn: setANum, sd: setADen, c: COLORS[0], name: 'کسر اول' },
          { n: bNum, d: bDen, sn: setBNum, sd: setBDen, c: COLORS[1], name: 'کسر دوم' }].map((f, fi) => (
          <div key={fi} className="bg-white p-3 rounded-xl border border-emerald-100">
            <p className="text-sm font-bold mb-2">{f.name}: <span style={{ color: f.c }}>{toPersianDigits(f.n)}/{toPersianDigits(f.d)}</span></p>
            <label className="block text-xs" htmlFor={`fn${fi}`}>صورت</label>
            <input id={`fn${fi}`} type="range" min={0} max={f.d} value={f.n} aria-label={`صورت ${f.name}`}
              onChange={(e) => f.sn(Number(e.target.value))} className="w-full accent-emerald-600" />
            <label className="block text-xs" htmlFor={`fd${fi}`}>مخرج</label>
            <input id={`fd${fi}`} type="range" min={2} max={12} value={f.d} aria-label={`مخرج ${f.name}`}
              onChange={(e) => { const v = Number(e.target.value); f.sd(v); if (f.n > v) f.sn(v); }} className="w-full accent-emerald-600" />
            {mode === 'bar' ? (
              <div className="flex h-8 rounded-lg overflow-hidden border-2 border-slate-300 mt-2" role="img" aria-label={`نوار ${f.name}`}>
                {Array.from({ length: f.d }).map((_, i) => (
                  <div key={i} className="flex-1 border-l border-white/60" style={{ background: i < f.n ? f.c : '#f1f5f9' }} />
                ))}
              </div>
            ) : (
              <svg viewBox="0 0 120 120" className="w-28 h-28 mt-2" role="img" aria-label={`دایره ${f.name}`}>
                <circle cx="60" cy="60" r="52" fill="#f1f5f9" stroke="#cbd5e1" />
                {slices(f.n, f.d, f.c, `f${fi}`)}
              </svg>
            )}
          </div>
        ))}
      </div>

      <div className="bg-slate-50 rounded-xl p-3 mt-3">
        <p className="text-sm font-bold text-slate-800 mb-1" data-testid="fraction-sum">
          جمع: {toPersianDigits(aNum)}/{toPersianDigits(aDen)} + {toPersianDigits(bNum)}/{toPersianDigits(bDen)} = {' '}
          <span className="text-indigo-700">{toPersianDigits(sumNum)}/{toPersianDigits(sumDen)}</span>
          {g > 1 && <span className="text-emerald-700"> = {toPersianDigits(sumNum / g)}/{toPersianDigits(sumDen / g)}</span>}
        </p>
        <p className="text-xs text-slate-600 mb-2">مخرج‌ها را یکسان کن، صورت‌ها را جمع کن، بعد ساده کن.</p>
        <NumberLine values={[{ num: aNum, den: aDen, color: COLORS[0] }, { num: bNum, den: bDen, color: COLORS[1] }]} />
      </div>
    </div>
  );
};
