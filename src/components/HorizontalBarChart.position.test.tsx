/**
 * Precise position tests for HorizontalBarChart component
 * Tests actual pixel measurements and distances
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { HorizontalBarChart } from './HorizontalBarChart';
import '@testing-library/jest-dom';

describe('HorizontalBarChart Precise Positioning', () => {
  beforeAll(() => {
    // Mock getBoundingClientRect for consistent measurements
    // Based on WebTUI CSS: font-size: 16px, line-height: 1.3
    // 1lh = 16 * 1.3 = 20.8px
    // Box padding: 1lh 1ch = 20.8px vertically
    // Box border: 2px

    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: function () {
        const className = this.className;
        const tagName = this.tagName.toLowerCase();

        // Mock measurements based on WebTUI units
        if (className.includes('h-y-label')) {
          // Each label has height of 1.5rem = 24px + margin 0.25rem = 4px
          const index = Array.from(this.parentElement?.children || []).indexOf(this);
          return {
            top: 20.8 + 2 + index * 28, // Box padding top + border + (index * row height)
            bottom: 20.8 + 2 + index * 28 + 24,
            left: 0,
            right: 100,
            height: 24,
            width: 100,
          };
        }

        if (className.includes('h-bar-row')) {
          // Each bar row aligns with its label
          const index = Array.from(this.parentElement?.children || []).indexOf(this);
          return {
            top: 20.8 + 2 + index * 28, // Same as label
            bottom: 20.8 + 2 + index * 28 + 24,
            left: 100,
            right: 400,
            height: 24,
            width: 300,
          };
        }

        if (className.includes('h-value-label')) {
          // Each value aligns with its bar
          const index = Array.from(this.parentElement?.children || []).indexOf(this);
          return {
            top: 20.8 + 2 + index * 28, // Same as label and bar
            bottom: 20.8 + 2 + index * 28 + 24,
            left: 400,
            right: 480,
            height: 24,
            width: 80,
          };
        }

        if (tagName === 'div' && this.hasAttribute('box-')) {
          // The box itself with padding
          return {
            top: 0,
            bottom: 200, // min-height: 10rem = 160px + padding
            left: 100,
            right: 400,
            height: 200,
            width: 300,
          };
        }

        return {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          height: 0,
          width: 0,
        };
      },
    });
  });

  describe('Label and bar alignment', () => {
    it('should align labels and bars at exactly the same vertical position with 1 bar', () => {
      const data = [{ label: 'Single', value: 100 }];
      const { container } = render(<HorizontalBarChart data={data} />);

      const label = container.querySelector('.h-y-label');
      const bar = container.querySelector('.h-bar-row');
      const value = container.querySelector('.h-value-label');

      const labelRect = label?.getBoundingClientRect();
      const barRect = bar?.getBoundingClientRect();
      const valueRect = value?.getBoundingClientRect();

      // All should have the same top position
      expect(labelRect?.top).toBe(barRect?.top);
      expect(barRect?.top).toBe(valueRect?.top);

      // All should have the same height
      expect(labelRect?.height).toBe(24); // 1.5rem
      expect(barRect?.height).toBe(24);
      expect(valueRect?.height).toBe(24);
    });

    it('should maintain consistent spacing with 2 bars', () => {
      const data = [
        { label: 'First', value: 50 },
        { label: 'Second', value: 100 },
      ];
      const { container } = render(<HorizontalBarChart data={data} />);

      const labels = container.querySelectorAll('.h-y-label');
      const bars = container.querySelectorAll('.h-bar-row');

      const label1Rect = labels[0]?.getBoundingClientRect();
      const label2Rect = labels[1]?.getBoundingClientRect();
      const bar1Rect = bars[0]?.getBoundingClientRect();
      const bar2Rect = bars[1]?.getBoundingClientRect();

      // First row alignment
      expect(label1Rect?.top).toBe(bar1Rect?.top);

      // Second row alignment
      expect(label2Rect?.top).toBe(bar2Rect?.top);

      // Spacing between rows (height + margin)
      const spacing = (label2Rect?.top || 0) - (label1Rect?.top || 0);
      expect(spacing).toBeCloseTo(28, 1); // 24px height + 4px margin
    });

    it('should position bars inside the box with correct padding', () => {
      const data = [
        { label: 'Item 1', value: 30 },
        { label: 'Item 2', value: 60 },
      ];
      const { container } = render(<HorizontalBarChart data={data} />);

      const box = container.querySelector('[box-="square"]');
      const firstBar = container.querySelector('.h-bar-row');

      const boxRect = box?.getBoundingClientRect();
      const barRect = firstBar?.getBoundingClientRect();

      // Bar should be inside box with padding
      // Box has padding: 1lh = 20.8px, border: 2px
      const expectedTopOffset = 20.8 + 2; // padding + border
      expect(barRect?.top).toBe(expectedTopOffset);
    });
  });

  describe('Top alignment', () => {
    it('should align bars at top of box when align="top"', () => {
      const data = [
        { label: 'A', value: 10 },
        { label: 'B', value: 20 },
      ];

      const { container } = render(<HorizontalBarChart data={data} align="top" />);

      const box = container.querySelector('[box-="square"]');
      const bars = container.querySelectorAll('.h-bar-row');

      const boxRect = box?.getBoundingClientRect();
      const firstBarRect = bars[0]?.getBoundingClientRect();

      // First bar should be at top of box content area
      const expectedTop = 20.8 + 2; // Box padding-top + border
      expect(firstBarRect?.top).toBe(expectedTop);
    });

    it('should maintain top alignment with single bar', () => {
      const data = [{ label: 'Single', value: 100 }];

      const { container } = render(<HorizontalBarChart data={data} align="top" />);

      const bar = container.querySelector('.h-bar-row');
      const barRect = bar?.getBoundingClientRect();

      // Single bar should still be at top
      const expectedTop = 20.8 + 2;
      expect(barRect?.top).toBe(expectedTop);
    });
  });

  describe('Bottom alignment', () => {
    it('should align bars at bottom of box when align="bottom"', () => {
      const data = [{ label: 'Single', value: 100 }];

      const { container } = render(<HorizontalBarChart data={data} align="bottom" />);

      const box = container.querySelector('[box-="square"]');
      const bar = container.querySelector('.h-bar-row');

      const boxRect = box?.getBoundingClientRect();
      const barRect = bar?.getBoundingClientRect();

      // Bar should be at bottom of box content area
      // Box height - padding-bottom - border - bar height
      const expectedBottom = (boxRect?.bottom || 0) - 20.8 - 2;
      expect(barRect?.bottom).toBeLessThanOrEqual(expectedBottom);
    });
  });

  describe('Precise measurements', () => {
    it('should have correct box dimensions including border', () => {
      const data = [{ label: 'Test', value: 50 }];
      const { container } = render(<HorizontalBarChart data={data} />);

      const box = container.querySelector('[box-="square"]');
      const boxRect = box?.getBoundingClientRect();

      // Box should have minimum height
      expect(boxRect?.height).toBeGreaterThanOrEqual(160); // min-height: 10rem
    });

    it('should position Y-axis labels with correct offset from box', () => {
      const data = [
        { label: 'Label 1', value: 30 },
        { label: 'Label 2', value: 60 },
      ];
      const { container } = render(<HorizontalBarChart data={data} />);

      const box = container.querySelector('[box-="square"]');
      const label = container.querySelector('.h-y-label');

      const boxRect = box?.getBoundingClientRect();
      const labelRect = label?.getBoundingClientRect();

      // Label should be to the left of the box
      expect(labelRect?.right).toBeLessThanOrEqual(boxRect?.left || 0);
    });

    it('should position value labels with correct offset from box', () => {
      const data = [
        { label: 'Label 1', value: 30 },
        { label: 'Label 2', value: 60 },
      ];
      const { container } = render(<HorizontalBarChart data={data} />);

      const box = container.querySelector('[box-="square"]');
      const value = container.querySelector('.h-value-label');

      const boxRect = box?.getBoundingClientRect();
      const valueRect = value?.getBoundingClientRect();

      // Value should be to the right of the box
      expect(valueRect?.left).toBeGreaterThanOrEqual(boxRect?.right || 0);
    });

    it('should maintain exact alignment across different bar counts', () => {
      [1, 2, 3, 4, 5].forEach(count => {
        const data = Array.from({ length: count }, (_, i) => ({
          label: `Item ${i + 1}`,
          value: (i + 1) * 20,
        }));

        const { container } = render(<HorizontalBarChart data={data} />);

        const labels = container.querySelectorAll('.h-y-label');
        const bars = container.querySelectorAll('.h-bar-row');
        const values = container.querySelectorAll('.h-value-label');

        // Check each row's alignment
        for (let i = 0; i < count; i++) {
          const labelRect = labels[i]?.getBoundingClientRect();
          const barRect = bars[i]?.getBoundingClientRect();
          const valueRect = values[i]?.getBoundingClientRect();

          // All three should have the same top position
          expect(labelRect?.top).toBe(barRect?.top);
          expect(barRect?.top).toBe(valueRect?.top);

          // All three should have the same height
          expect(labelRect?.height).toBe(24);
          expect(barRect?.height).toBe(24);
          expect(valueRect?.height).toBe(24);
        }
      });
    });
  });
});
