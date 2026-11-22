import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FractionLabV2 } from '../src/components/FractionLabV2';
import { DecimalLabV2 } from '../src/components/DecimalLabV2';
import { RatioLabV2 } from '../src/components/RatioLabV2';
import { PercentLabV2 } from '../src/components/PercentLabV2';
import { GeometryLabV2 } from '../src/components/GeometryLabV2';
import { MeasurementLabV2 } from '../src/components/MeasurementLabV2';
import { DataLabV2 } from '../src/components/DataLabV2';

describe('Visual labs v2', () => {
  it('FractionLabV2 sums two fractions live', () => {
    render(<FractionLabV2 />);
    expect(screen.getByTestId('fraction-lab-v2')).toBeInTheDocument();
    // defaults 1/2 + 2/6 = 5/6
    expect(screen.getByTestId('fraction-sum')).toHaveTextContent('۵/۶');
  });

  it('DecimalLabV2 shows the composed decimal value', () => {
    render(<DecimalLabV2 />);
    expect(screen.getByTestId('decimal-lab-v2')).toBeInTheDocument();
    expect(screen.getByTestId('decimal-value')).toHaveTextContent('۳/۴۷');
  });

  it('RatioLabV2 keeps the ratio constant across the table', () => {
    render(<RatioLabV2 />);
    expect(screen.getByTestId('ratio-table')).toHaveTextContent('۴:۶');
    expect(screen.getByTestId('ratio-table')).toHaveTextContent('۱۰:۱۵');
  });

  it('PercentLabV2 converts percent to fraction and decimal', () => {
    render(<PercentLabV2 />);
    expect(screen.getByTestId('percent-conversions')).toHaveTextContent('۳۵/۱۰۰');
    expect(screen.getByTestId('percent-conversions')).toHaveTextContent('۰/۳۵');
  });

  it('GeometryLabV2 computes area and perimeter', () => {
    render(<GeometryLabV2 />);
    expect(screen.getByTestId('geometry-results')).toHaveTextContent('۲۰');
    expect(screen.getByTestId('geometry-results')).toHaveTextContent('۲۴');
  });

  it('MeasurementLabV2 shows volume result', () => {
    render(<MeasurementLabV2 />);
    expect(screen.getByTestId('volume-result')).toHaveTextContent('۳۶');
  });

  it('DataLabV2 computes mean and simulates coin/dice', () => {
    render(<DataLabV2 />);
    // defaults 4+7+3+6 = 20, mean 5
    expect(screen.getByTestId('mean-result')).toHaveTextContent('۵');
    fireEvent.click(screen.getByText('۲۰ بار سکه بریز'));
    expect(screen.getByTestId('coin-result')).toBeInTheDocument();
    fireEvent.click(screen.getByText('۱۲ بار تاس بریز'));
    expect(screen.getByTestId('dice-result')).toBeInTheDocument();
  });
});
