import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { stripBidiControls, hasBidiControls, useCleanMathCopy } from '../src/hooks/useCleanMathCopy';
import { LRI, PDI } from '../src/utils/mathBidi';

/**
 * بخش ۳ مأموریت RC1.1 — رفتار copy باید جدا از رفتار نمایش تست شود:
 * نمایش عبارت ریاضی با LRI/PDI محصور می‌شود؛ اما کپی متن نباید نویسهٔ
 * کنترلی مخرب/غیرمنتظره در کلیپ‌بورد بگذارد. کپی متن عادی بی‌دلیل
 * دست‌نخورده می‌ماند.
 */

/** کامپوننت آزمایشی که هوک را نصب می‌کند و متن قابل‌انتخاب می‌گذارد */
const Probe: React.FC<{ text: string }> = ({ text }) => {
  useCleanMathCopy();
  return <div data-testid="probe">{text}</div>;
};

function selectNode(node: Node) {
  const sel = document.getSelection()!;
  const range = document.createRange();
  range.selectNodeContents(node);
  sel.removeAllRanges();
  sel.addRange(range);
}

/** شبیه‌سازی رویداد copy با یک ClipboardData حداقلی (سازگار با jsdom) */
function fireCopy(target: Node): { prevented: boolean; data: Map<string, string> } {
  const data = new Map<string, string>();
  const clipboardData = {
    setData: (type: string, value: string) => data.set(type, value),
    getData: (type: string) => data.get(type) ?? '',
  };
  const evt = new Event('copy', { bubbles: true, cancelable: true });
  Object.defineProperty(evt, 'clipboardData', { value: clipboardData });
  const prevented = !target.dispatchEvent(evt as unknown as Event);
  return { prevented, data };
}

describe('stripBidiControls / hasBidiControls — تابع خالص', () => {
  it('LRI/PDI حذف می‌شود و بقیهٔ متن پیکسل‌به‌پیکسل می‌ماند', () => {
    const s = `مبلغ پرداختی = ${LRI}۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰${PDI} تومان`;
    expect(stripBidiControls(s)).toBe('مبلغ پرداختی = ۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰ تومان');
  });

  it('همهٔ نویسه‌های کنترلی جهت‌دهی پوشش داده می‌شوند', () => {
    const controls = ['\u200E', '\u200F', '\u202A', '\u202B', '\u202C', '\u202D', '\u202E', '\u2066', '\u2067', '\u2068', '\u2069'];
    for (const c of controls) {
      expect(hasBidiControls(`a${c}b`)).toBe(true);
      expect(stripBidiControls(`a${c}b`)).toBe('ab');
    }
  });

  it('متن عادی بدون نویسهٔ کنترلی، دست‌نخورده می‌ماند', () => {
    const s = '۴۰۰٬۰۰۰ تومان — هیچ کنترلی نیست';
    expect(hasBidiControls(s)).toBe(false);
    expect(stripBidiControls(s)).toBe(s);
  });
});

describe('رویداد copy واقعی با نصب هوک', () => {
  it('کپیِ متن حاوی جزیرهٔ ریاضی → کلیپ‌بورد بدون نویسهٔ کنترلی', () => {
    const { getByTestId } = render(
      <Probe text={`حاصل ${LRI}۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰${PDI} تومان است`} />
    );
    const node = getByTestId('probe');
    selectNode(node);
    const { prevented, data } = fireCopy(node);
    expect(prevented).toBe(true);
    const copied = data.get('text/plain') ?? '';
    expect(copied).toBe('حاصل ۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰ تومان است');
    expect(hasBidiControls(copied)).toBe(false);
  });

  it('کپیِ متن عادی → هیچ preventDefault و هیچ بازنویسی کلیپ‌بورد', () => {
    const { getByTestId } = render(<Probe text="۴۰۰٬۰۰۰ تومان — متن ساده" />);
    const node = getByTestId('probe');
    selectNode(node);
    const { prevented, data } = fireCopy(node);
    expect(prevented).toBe(false);
    expect(data.size).toBe(0); // هوک دخالت نکرده — رفتار پیش‌فرض مرورگر
  });

  it('انتخاب خالی → هیچ خطا و هیچ دخالتی', () => {
    const { getByTestId } = render(<Probe text="متن عادی" />);
    const node = getByTestId('probe');
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    const { prevented, data } = fireCopy(node);
    expect(prevented).toBe(false);
    expect(data.size).toBe(0);
  });
});
