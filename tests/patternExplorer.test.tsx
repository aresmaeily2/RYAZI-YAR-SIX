import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PatternExplorer } from '../src/components/PatternExplorer';

describe('PatternExplorer', () => {
  it('renders term buttons as Persian digits and the relation panel', () => {
    render(<PatternExplorer firstTerm={5} commonDifference={4} termCount={10} />);
    expect(screen.getByTestId('pattern-explorer')).toBeInTheDocument();
    // شماره شکل‌ها ۱ تا ۱۰
    expect(screen.getByRole('button', { name: '۵' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '۱۰' })).toBeInTheDocument();
    // پیش‌فرض جمله اول: ۵ = ۴×۱ + ۱
    expect(screen.getByTestId('pattern-relation')).toHaveTextContent('۵');
  });

  it('shows term value and general relation when a term is selected', () => {
    render(<PatternExplorer firstTerm={5} commonDifference={4} termCount={10} />);
    // جمله ۳ام: ۴×۳ + ۱ = ۱۳
    fireEvent.click(screen.getByRole('button', { name: '۳' }));
    const panel = screen.getByTestId('pattern-relation');
    expect(panel).toHaveTextContent('۳ام');
    expect(panel).toHaveTextContent('۱۳');
  });

  it('marks selected button as pressed and updates via stepper buttons', () => {
    render(<PatternExplorer firstTerm={5} commonDifference={4} termCount={10} />);
    const next = screen.getByRole('button', { name: 'جمله بعدی' });
    fireEvent.click(next);
    fireEvent.click(next);
    expect(screen.getByTestId('pattern-selected')).toHaveTextContent('۳');
    expect(screen.getByRole('button', { name: '۳' })).toHaveAttribute('aria-pressed', 'true');
    const prev = screen.getByRole('button', { name: 'جمله قبلی' });
    fireEvent.click(prev);
    expect(screen.getByTestId('pattern-selected')).toHaveTextContent('۲');
    // حد پایین: از ۱ پایین‌تر نمی‌رود
    fireEvent.click(prev);
    fireEvent.click(prev);
    expect(screen.getByTestId('pattern-selected')).toHaveTextContent('۱');
  });

  it('handles negative adjustment in the displayed relation', () => {
    // الگوی ۲، ۵، ۸: جمله nام = ۳n − ۱
    render(<PatternExplorer firstTerm={2} commonDifference={3} termCount={10} />);
    fireEvent.click(screen.getByRole('button', { name: '۴' }));
    expect(screen.getByTestId('pattern-relation')).toHaveTextContent('۱۱');
  });
});
