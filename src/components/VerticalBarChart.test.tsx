/**
 * Unit tests for VerticalBarChart component
 * Tests precise measurements and alignment of axes and bars
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VerticalBarChart } from './VerticalBarChart';
import '@testing-library/jest-dom';

describe('VerticalBarChart', () => {
  describe('Component Rendering', () => {
    it('should render with required props', () => {
      const { container } = render(<VerticalBarChart data={[10, 20, 30]} />);

      expect(container.querySelector('.widget.chart-widget')).toBeInTheDocument();
      expect(container.querySelector('[box-="square"]')).toBeInTheDocument();
    });

    it('should render title when provided', () => {
      render(<VerticalBarChart data={[10, 20, 30]} title="Test Chart" />);

      expect(screen.getByText('Test Chart')).toBeInTheDocument();
    });

    it('should render X-axis labels when provided', () => {
      render(<VerticalBarChart data={[10, 20, 30]} xAxisLabels={['Jan', 'Feb', 'Mar']} />);

      expect(screen.getByText('Jan')).toBeInTheDocument();
      expect(screen.getByText('Feb')).toBeInTheDocument();
      expect(screen.getByText('Mar')).toBeInTheDocument();
    });

    it('should render custom Y-axis labels when provided', () => {
      render(<VerticalBarChart data={[10, 20, 30]} yAxisLabels={['100', '50', '0']} />);

      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Y-Axis Label Alignment', () => {
    it('should have Y-axis labels spanning full chart height', () => {
      const { container } = render(
        <VerticalBarChart data={[10, 20, 30]} yAxisLabels={['30', '15', '0']} height={10} />
      );

      const yAxisContainer = container.querySelector('.vertical-y-axis');
      expect(yAxisContainer).toBeInTheDocument();
      expect(yAxisContainer).toHaveStyle({ height: '5rem' }); // 10 * 0.5rem
    });

    it('should position Y-axis labels with correct padding', () => {
      const { container } = render(
        <VerticalBarChart data={[10, 20, 30]} yAxisLabels={['30', '15', '0']} />
      );

      const yAxisContainer = container.querySelector('.vertical-y-axis');
      expect(yAxisContainer).toHaveAttribute('data-pad', '1 0.5rem 1 0');
    });

    it('should align highest value at top and lowest at bottom', () => {
      const { container } = render(
        <VerticalBarChart data={[10, 20, 30]} yAxisLabels={['30', '15', '0']} />
      );

      const yAxisContainer = container.querySelector('.vertical-y-axis');
      const labels = yAxisContainer?.querySelectorAll('span');

      expect(labels).toHaveLength(3);
      expect(labels?.[0]).toHaveTextContent('30'); // Top (highest)
      expect(labels?.[1]).toHaveTextContent('15'); // Middle
      expect(labels?.[2]).toHaveTextContent('0'); // Bottom (lowest)
    });
  });

  describe('Bar Rendering and Measurements', () => {
    it('should render bars within a square box', () => {
      const { container } = render(<VerticalBarChart data={[10, 20, 30]} height={10} />);

      const barsContainer = container.querySelector('[box-="square"].vertical-bars-container');
      expect(barsContainer).toBeInTheDocument();
      expect(barsContainer).toHaveClass('chart-row', 'bars', 'vertical-bars-container');
      expect(barsContainer).toHaveStyle({ height: '5rem' });
    });

    it('should calculate correct bar heights', () => {
      const { container } = render(<VerticalBarChart data={[10, 20, 30]} height={10} />);

      const bars = container.querySelectorAll('.line');
      expect(bars).toHaveLength(3);

      // Heights should be proportional: 10/30 * 10 = 3.33 ≈ 3
      expect(bars[0]).toHaveAttribute('data-height', '3');
      // 20/30 * 10 = 6.67 ≈ 7
      expect(bars[1]).toHaveAttribute('data-height', '7');
      // 30/30 * 10 = 10
      expect(bars[2]).toHaveAttribute('data-height', '10');
    });

    it('should handle zero values correctly', () => {
      const { container } = render(<VerticalBarChart data={[0, 20, 30]} height={10} />);

      const bars = container.querySelectorAll('.line');
      expect(bars[0]).toHaveAttribute('data-height', '0');
    });

    it('should handle all zero values without errors', () => {
      const { container } = render(<VerticalBarChart data={[0, 0, 0]} height={10} />);

      const bars = container.querySelectorAll('.line');
      expect(bars).toHaveLength(3);
      bars.forEach(bar => {
        expect(bar).toHaveAttribute('data-height', '0');
      });
    });

    it('should align bars at the bottom of the container', () => {
      const { container } = render(<VerticalBarChart data={[10, 20, 30]} />);

      const barsContainer = container.querySelector('[box-="square"].bars');
      expect(barsContainer).toHaveAttribute('data-align', 'end start');
    });
  });

  describe('Layout Structure', () => {
    it('should position Y-axis labels outside the box on the left', () => {
      const { container } = render(<VerticalBarChart data={[10, 20, 30]} />);

      const chartRow = container.querySelector('.widget > .chart-row');
      const children = chartRow?.children;

      // First child should be Y-axis labels
      expect(children?.[0]).toHaveClass('chart-column', 'vertical-y-axis');

      // Second child should be the main chart area
      expect(children?.[1]).toHaveClass('chart-column');
      expect(children?.[1]).toHaveAttribute('data-self', 'grow');
    });

    it('should position X-axis labels outside the box at the bottom', () => {
      const { container } = render(
        <VerticalBarChart data={[10, 20, 30]} xAxisLabels={['A', 'B', 'C']} />
      );

      const mainChartArea = container.querySelector('.chart-column[data-self="grow"]');
      const children = mainChartArea?.children;

      // First child should be the box with bars
      expect(children?.[0]).toHaveAttribute('box-', 'square');

      // Second child should be X-axis labels
      expect(children?.[1]).toHaveClass('chart-row');
      expect(children?.[1]).toHaveAttribute('data-pad', '1 0 0 0');
    });

    it('should have proper gap between bars', () => {
      const { container } = render(<VerticalBarChart data={[10, 20, 30]} />);

      const barsContainer = container.querySelector('[box-="square"].bars');
      expect(barsContainer).toHaveAttribute('data-gap', '1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single data point', () => {
      const { container } = render(<VerticalBarChart data={[50]} />);

      const bars = container.querySelectorAll('.line');
      expect(bars).toHaveLength(1);
      expect(bars[0]).toHaveAttribute('data-height', '10'); // Max height
    });

    it('should handle large datasets', () => {
      const largeData = Array.from({ length: 50 }, (_, i) => i * 2);
      const { container } = render(<VerticalBarChart data={largeData} />);

      const bars = container.querySelectorAll('.line');
      expect(bars).toHaveLength(50);
    });

    it('should handle negative values', () => {
      const { container } = render(<VerticalBarChart data={[-10, 20, 30]} height={10} />);

      const bars = container.querySelectorAll('.line');
      // The component calculates proportions including negative values
      // -10/30 * 10 = -3.33 ≈ -3
      expect(bars[0]).toHaveAttribute('data-height', '-3');
      expect(bars[1]).toHaveAttribute('data-height', '7');
      expect(bars[2]).toHaveAttribute('data-height', '10');
    });

    it('should handle custom height parameter', () => {
      const { container } = render(<VerticalBarChart data={[10, 20, 30]} height={20} />);

      const bars = container.querySelectorAll('.line');
      // With height=20, max value 30 should map to 20
      expect(bars[2]).toHaveAttribute('data-height', '20');
    });
  });
});
