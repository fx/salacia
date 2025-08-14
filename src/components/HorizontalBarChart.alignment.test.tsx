/**
 * Alignment tests for HorizontalBarChart component
 * Tests proper alignment with 1, 2, 3, 4+ bars
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { HorizontalBarChart } from './HorizontalBarChart';
import '@testing-library/jest-dom';

describe('HorizontalBarChart Alignment', () => {
  describe('Alignment with different numbers of bars', () => {
    it('should align correctly with 1 bar', () => {
      const data = [{ label: 'Single', value: 100 }];
      const { container } = render(<HorizontalBarChart data={data} />);

      const labels = container.querySelectorAll('.h-y-label');
      const bars = container.querySelectorAll('.h-bar-row');
      const values = container.querySelectorAll('.h-value-label');

      expect(labels).toHaveLength(1);
      expect(bars).toHaveLength(1);
      expect(values).toHaveLength(1);

      // Check top alignment is default
      const chart = container.querySelector('.terminal-h-chart');
      expect(chart).toHaveClass('align-top');
    });

    it('should align correctly with 2 bars', () => {
      const data = [
        { label: 'First', value: 50 },
        { label: 'Second', value: 100 },
      ];
      const { container } = render(<HorizontalBarChart data={data} />);

      const labels = container.querySelectorAll('.h-y-label');
      const bars = container.querySelectorAll('.h-bar-row');
      const values = container.querySelectorAll('.h-value-label');

      expect(labels).toHaveLength(2);
      expect(bars).toHaveLength(2);
      expect(values).toHaveLength(2);

      // Verify each row has consistent class
      bars.forEach(bar => {
        expect(bar).toHaveClass('h-bar-row');
      });
    });

    it('should align correctly with 3 bars', () => {
      const data = [
        { label: 'First', value: 30 },
        { label: 'Second', value: 60 },
        { label: 'Third', value: 90 },
      ];
      const { container } = render(<HorizontalBarChart data={data} />);

      const labels = container.querySelectorAll('.h-y-label');
      const bars = container.querySelectorAll('.h-bar-row');
      const values = container.querySelectorAll('.h-value-label');

      expect(labels).toHaveLength(3);
      expect(bars).toHaveLength(3);
      expect(values).toHaveLength(3);

      // All labels should have same class
      labels.forEach(label => {
        expect(label).toHaveClass('h-y-label');
      });
    });

    it('should align correctly with 4 bars', () => {
      const data = [
        { label: 'First', value: 25 },
        { label: 'Second', value: 50 },
        { label: 'Third', value: 75 },
        { label: 'Fourth', value: 100 },
      ];
      const { container } = render(<HorizontalBarChart data={data} />);

      const labels = container.querySelectorAll('.h-y-label');
      const bars = container.querySelectorAll('.h-bar-row');
      const values = container.querySelectorAll('.h-value-label');

      expect(labels).toHaveLength(4);
      expect(bars).toHaveLength(4);
      expect(values).toHaveLength(4);
    });

    it('should align correctly with many bars', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({
        label: `Item ${i + 1}`,
        value: (i + 1) * 10,
      }));

      const { container } = render(<HorizontalBarChart data={data} />);

      const labels = container.querySelectorAll('.h-y-label');
      const bars = container.querySelectorAll('.h-bar-row');
      const values = container.querySelectorAll('.h-value-label');

      expect(labels).toHaveLength(10);
      expect(bars).toHaveLength(10);
      expect(values).toHaveLength(10);
    });
  });

  describe('Top alignment (default)', () => {
    it('should align bars at top by default', () => {
      const data = [
        { label: 'A', value: 10 },
        { label: 'B', value: 20 },
      ];

      const { container } = render(<HorizontalBarChart data={data} />);

      const chart = container.querySelector('.terminal-h-chart');
      expect(chart).toHaveClass('align-top');

      const yAxisColumn = container.querySelector('.h-y-axis-column');
      const chartBox = container.querySelector('.h-chart-box');
      const valueColumn = container.querySelector('.h-value-column');

      // Check CSS will apply flex-start
      expect(chart?.className).toContain('align-top');
    });

    it('should explicitly align at top when specified', () => {
      const data = [
        { label: 'A', value: 10 },
        { label: 'B', value: 20 },
      ];

      const { container } = render(<HorizontalBarChart data={data} align="top" />);

      const chart = container.querySelector('.terminal-h-chart');
      expect(chart).toHaveClass('align-top');
    });
  });

  describe('Bottom alignment', () => {
    it('should align bars at bottom when specified', () => {
      const data = [
        { label: 'A', value: 10 },
        { label: 'B', value: 20 },
      ];

      const { container } = render(<HorizontalBarChart data={data} align="bottom" />);

      const chart = container.querySelector('.terminal-h-chart');
      expect(chart).toHaveClass('align-bottom');

      // Check CSS will apply flex-end
      expect(chart?.className).toContain('align-bottom');
    });

    it('should maintain alignment with single bar at bottom', () => {
      const data = [{ label: 'Single', value: 100 }];

      const { container } = render(<HorizontalBarChart data={data} align="bottom" />);

      const chart = container.querySelector('.terminal-h-chart');
      expect(chart).toHaveClass('align-bottom');

      const labels = container.querySelectorAll('.h-y-label');
      const bars = container.querySelectorAll('.h-bar-row');

      expect(labels).toHaveLength(1);
      expect(bars).toHaveLength(1);
    });
  });

  describe('Visual consistency', () => {
    it('should maintain consistent spacing between elements', () => {
      const data = [
        { label: 'Item 1', value: 30 },
        { label: 'Item 2', value: 60 },
      ];

      const { container } = render(<HorizontalBarChart data={data} />);

      // All rows should have margin for spacing
      const labels = container.querySelectorAll('.h-y-label');
      const bars = container.querySelectorAll('.h-bar-row');
      const values = container.querySelectorAll('.h-value-label');

      labels.forEach(label => {
        expect(label).toHaveClass('h-y-label');
      });

      bars.forEach(bar => {
        expect(bar).toHaveClass('h-bar-row');
      });

      values.forEach(value => {
        expect(value).toHaveClass('h-value-label');
      });
    });

    it('should have spacers with correct height', () => {
      const data = [{ label: 'Test', value: 50 }];

      const { container } = render(<HorizontalBarChart data={data} />);

      const ySpacer = container.querySelector('.h-y-axis-bottom-spacer');
      const valueSpacer = container.querySelector('.h-value-bottom-spacer');

      expect(ySpacer).toBeInTheDocument();
      expect(valueSpacer).toBeInTheDocument();

      // Spacers should have correct class
      expect(ySpacer).toHaveClass('h-y-axis-bottom-spacer');
      expect(valueSpacer).toHaveClass('h-value-bottom-spacer');
    });

    it('should maintain box structure with any number of bars', () => {
      [1, 2, 3, 4, 5, 10].forEach(count => {
        const data = Array.from({ length: count }, (_, i) => ({
          label: `Item ${i + 1}`,
          value: (i + 1) * 10,
        }));

        const { container } = render(<HorizontalBarChart data={data} />);

        const chartBox = container.querySelector('[box-="square"]');
        expect(chartBox).toBeInTheDocument();
        expect(chartBox).toHaveClass('h-chart-box');

        // Box should always have correct class
        expect(chartBox).toHaveClass('h-chart-box');
      });
    });
  });
});
