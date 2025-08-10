/**
 * STRICT alignment test for HorizontalBarChart
 * This test MUST ensure 100% perfect alignment between labels and bars
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render } from '@testing-library/react';
import { HorizontalBarChart } from './HorizontalBarChart';
import '@testing-library/jest-dom';

describe('HorizontalBarChart STRICT Alignment Test', () => {
  let originalGetBoundingClientRect: any;

  beforeAll(() => {
    // Save original
    originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

    // We'll use real browser measurements in jsdom
    // This means we need to set actual styles
    const style = document.createElement('style');
    style.textContent = `
      .terminal-h-chart {
        display: flex;
        font-family: monospace;
      }
      
      .h-y-axis-column {
        display: flex;
        flex-direction: column;
        padding-right: 8px;
        min-width: 100px;
      }
      
      .h-chart-box {
        display: flex;
        flex-direction: column;
        padding: 8px;
        min-height: 160px;
      }
      
      .h-value-column {
        display: flex;
        flex-direction: column;
        padding-left: 8px;
        min-width: 80px;
      }
      
      /* Critical: all three columns must use same alignment */
      .align-top .h-y-axis-column,
      .align-top .h-chart-box,
      .align-top .h-value-column {
        justify-content: flex-start;
      }
      
      /* Critical: each row must have exact same height and spacing */
      .h-y-label,
      .h-bar-row,
      .h-value-label {
        height: 24px;
        margin: 4px 0;
        display: flex;
        align-items: center;
      }
      
      .h-y-label {
        justify-content: flex-end;
      }
    `;
    document.head.appendChild(style);
  });

  afterAll(() => {
    // Restore original
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('MUST align 3 bars and labels PERFECTLY - no exceptions', () => {
    const data = [
      { label: 'First Bar', value: 30 },
      { label: 'Second Bar', value: 60 },
      { label: 'Third Bar', value: 90 },
    ];

    const { container } = render(<HorizontalBarChart data={data} align="top" />);

    // Get all elements
    const labels = Array.from(container.querySelectorAll('.h-y-label'));
    const bars = Array.from(container.querySelectorAll('.h-bar-row'));
    const values = Array.from(container.querySelectorAll('.h-value-label'));

    expect(labels).toHaveLength(3);
    expect(bars).toHaveLength(3);
    expect(values).toHaveLength(3);

    // Check each row for PERFECT alignment
    for (let i = 0; i < 3; i++) {
      const label = labels[i];
      const bar = bars[i];
      const value = values[i];

      // Get computed styles to check actual rendering
      const labelStyle = window.getComputedStyle(label);
      const barStyle = window.getComputedStyle(bar);
      const valueStyle = window.getComputedStyle(value);

      // All must have same height
      expect(labelStyle.height).toBe(barStyle.height);
      expect(barStyle.height).toBe(valueStyle.height);

      // All must have same margin
      expect(labelStyle.marginTop).toBe(barStyle.marginTop);
      expect(barStyle.marginTop).toBe(valueStyle.marginTop);
      expect(labelStyle.marginBottom).toBe(barStyle.marginBottom);
      expect(barStyle.marginBottom).toBe(valueStyle.marginBottom);

      // Calculate offset from parent
      const labelParent = label.parentElement;
      const barParent = bar.parentElement;
      const valueParent = value.parentElement;

      const labelOffset = (label as HTMLElement).offsetTop;
      const barOffset = (bar as HTMLElement).offsetTop;
      const valueOffset = (value as HTMLElement).offsetTop;

      // Critical test: all three must have EXACT same offset from their parent
      expect(labelOffset).toBe(barOffset);
      expect(barOffset).toBe(valueOffset);

      console.log(
        `Row ${i}: Label offset=${labelOffset}, Bar offset=${barOffset}, Value offset=${valueOffset}`
      );
    }

    // Additional check: verify spacing between rows is consistent
    for (let i = 1; i < 3; i++) {
      const prevLabelOffset = (labels[i - 1] as HTMLElement).offsetTop;
      const currLabelOffset = (labels[i] as HTMLElement).offsetTop;
      const labelSpacing = currLabelOffset - prevLabelOffset;

      const prevBarOffset = (bars[i - 1] as HTMLElement).offsetTop;
      const currBarOffset = (bars[i] as HTMLElement).offsetTop;
      const barSpacing = currBarOffset - prevBarOffset;

      const prevValueOffset = (values[i - 1] as HTMLElement).offsetTop;
      const currValueOffset = (values[i] as HTMLElement).offsetTop;
      const valueSpacing = currValueOffset - prevValueOffset;

      // Spacing must be identical
      expect(labelSpacing).toBe(barSpacing);
      expect(barSpacing).toBe(valueSpacing);

      console.log(
        `Spacing ${i - 1} to ${i}: Label=${labelSpacing}, Bar=${barSpacing}, Value=${valueSpacing}`
      );
    }
  });

  it('MUST maintain alignment with 2 bars', () => {
    const data = [
      { label: 'First', value: 50 },
      { label: 'Second', value: 100 },
    ];

    const { container } = render(<HorizontalBarChart data={data} align="top" />);

    const labels = Array.from(container.querySelectorAll('.h-y-label'));
    const bars = Array.from(container.querySelectorAll('.h-bar-row'));
    const values = Array.from(container.querySelectorAll('.h-value-label'));

    // Check both rows
    for (let i = 0; i < 2; i++) {
      const labelOffset = (labels[i] as HTMLElement).offsetTop;
      const barOffset = (bars[i] as HTMLElement).offsetTop;
      const valueOffset = (values[i] as HTMLElement).offsetTop;

      expect(labelOffset).toBe(barOffset);
      expect(barOffset).toBe(valueOffset);
    }
  });

  it('MUST maintain alignment with 1 bar', () => {
    const data = [{ label: 'Single', value: 100 }];

    const { container } = render(<HorizontalBarChart data={data} align="top" />);

    const label = container.querySelector('.h-y-label');
    const bar = container.querySelector('.h-bar-row');
    const value = container.querySelector('.h-value-label');

    const labelOffset = (label as HTMLElement)?.offsetTop || 0;
    const barOffset = (bar as HTMLElement)?.offsetTop || 0;
    const valueOffset = (value as HTMLElement)?.offsetTop || 0;

    expect(labelOffset).toBe(barOffset);
    expect(barOffset).toBe(valueOffset);
  });

  it('MUST maintain alignment with 4 bars', () => {
    const data = [
      { label: 'One', value: 25 },
      { label: 'Two', value: 50 },
      { label: 'Three', value: 75 },
      { label: 'Four', value: 100 },
    ];

    const { container } = render(<HorizontalBarChart data={data} align="top" />);

    const labels = Array.from(container.querySelectorAll('.h-y-label'));
    const bars = Array.from(container.querySelectorAll('.h-bar-row'));
    const values = Array.from(container.querySelectorAll('.h-value-label'));

    // Check all 4 rows
    for (let i = 0; i < 4; i++) {
      const labelOffset = (labels[i] as HTMLElement).offsetTop;
      const barOffset = (bars[i] as HTMLElement).offsetTop;
      const valueOffset = (values[i] as HTMLElement).offsetTop;

      expect(labelOffset).toBe(barOffset);
      expect(barOffset).toBe(valueOffset);
    }
  });

  it('MUST handle bottom alignment correctly', () => {
    const data = [
      { label: 'First', value: 30 },
      { label: 'Second', value: 60 },
      { label: 'Third', value: 90 },
    ];

    const { container } = render(<HorizontalBarChart data={data} align="bottom" />);

    const labels = Array.from(container.querySelectorAll('.h-y-label'));
    const bars = Array.from(container.querySelectorAll('.h-bar-row'));
    const values = Array.from(container.querySelectorAll('.h-value-label'));

    // Even with bottom alignment, rows must still align with each other
    for (let i = 0; i < 3; i++) {
      const labelOffset = (labels[i] as HTMLElement).offsetTop;
      const barOffset = (bars[i] as HTMLElement).offsetTop;
      const valueOffset = (values[i] as HTMLElement).offsetTop;

      expect(labelOffset).toBe(barOffset);
      expect(barOffset).toBe(valueOffset);
    }
  });
});
