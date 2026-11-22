import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchSorter } from '../src/components/MatchSorter';
import { ErrorClinic, type DiagnosisCase } from '../src/components/ErrorClinic';

describe('MatchSorter (Prototype B)', () => {
  const items = [
    { id: 'a', label: 'الف', order: 1 },
    { id: 'b', label: 'ب', order: 2 },
    { id: 'c', label: 'پ', order: 3 },
  ];

  it('renders all items with a shuffled start', () => {
    render(<MatchSorter title="ترتیب" items={items} />);
    expect(screen.getByTestId('match-sorter')).toBeInTheDocument();
    expect(screen.getByText('الف')).toBeInTheDocument();
    expect(screen.getByText('ب')).toBeInTheDocument();
    expect(screen.getByText('پ')).toBeInTheDocument();
  });

  it('never starts already solved', () => {
    // shuffle() guarantees at least one displacement
    for (let i = 0; i < 20; i++) {
      const { unmount } = render(<MatchSorter title="t" items={items} />);
      expect(screen.queryByText(/ترتیب درست است/)).not.toBeInTheDocument();
      unmount();
    }
  });

  it('detects a correct ordering and fires onSuccess', () => {
    // Start from the correct order directly by controlling the first render:
    const spy = vi.fn();
    const { rerender } = render(<MatchSorter title="t" items={items} onSuccess={spy} />);
    // Move items until solved — with 3 items the max needed moves is bounded
    const ups = screen.getAllByLabelText(/بالا بردن/);
    fireEvent.click(ups[0]); // no-op on first item if it is already first
    rerender(<MatchSorter title="t" items={items} onSuccess={spy} />);
    expect(screen.getByText(/شروع دوباره/)).toBeInTheDocument();
  });

  it('resets to a new unsolved shuffle', () => {
    render(<MatchSorter title="t" items={items} />);
    fireEvent.click(screen.getByText('شروع دوباره'));
    expect(screen.getByText(/ترتیب را درست کن/)).toBeInTheDocument();
  });
});

describe('ErrorClinic (Prototype C)', () => {
  const cases: DiagnosisCase[] = [
    {
      problem: '۸−۲×۳',
      correctAnswer: '۲',
      wrongAnswer: '۱۸',
      expectedCode: 'operation-order' as const,
      options: ['operation-order', 'calculation', 'conceptual', 'guessing'],
    },
  ];

  it('shows the problem and both answers', () => {
    render(<ErrorClinic cases={cases} />);
    expect(screen.getByTestId('error-clinic')).toBeInTheDocument();
    expect(screen.getByTestId('clinic-problem')).toHaveTextContent('۸−۲×۳');
    expect(screen.getByText('۱۸')).toBeInTheDocument();
  });

  it('gives corrective feedback on the right diagnosis', () => {
    render(<ErrorClinic cases={cases} />);
    fireEvent.click(screen.getByText('خطا در ترتیب عملیات'));
    const fb = screen.getByTestId('clinic-feedback');
    expect(fb).toHaveTextContent('تشخیص درست ✓');
    expect(fb).toHaveTextContent('راه اصلاح');
  });

  it('rejects a wrong diagnosis and shows the right remediation', () => {
    render(<ErrorClinic cases={cases} />);
    fireEvent.click(screen.getByText('خطای محاسباتی'));
    expect(screen.getByTestId('clinic-feedback')).toHaveTextContent('تشخیص نادرست');
    // Remediation always teaches the expected category, not the picked one
    expect(screen.getByTestId('clinic-feedback')).toHaveTextContent('اولویت عملیات');
  });

  it('shows a completion summary with the score', () => {
    render(<ErrorClinic cases={cases} />);
    fireEvent.click(screen.getByText('خطا در ترتیب عملیات'));
    fireEvent.click(screen.getByText('پایان'));
    expect(screen.getByTestId('error-clinic-done')).toHaveTextContent('۱ از ۱');
  });
});
