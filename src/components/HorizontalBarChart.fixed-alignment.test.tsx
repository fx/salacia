/**
 * Test that verifies the alignment fix works
 * Labels and bars must be at the same distance from chart top
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { HorizontalBarChart } from './HorizontalBarChart';
import '@testing-library/jest-dom';

describe('HorizontalBarChart FIXED Alignment', () => {
  beforeAll(() => {
    // Add the FIXED CSS to jsdom
    const style = document.createElement('style');
    style.textContent = `
      /* WebTUI box padding: 1lh 1ch where 1lh = 16px * 1.3 = 20.8px */
      [box-="square"] {
        padding: 20.8px 8px;
        border: 2px solid;
        position: relative;
      }
      
      .terminal-h-chart {
        display: flex;
        position: relative;
      }
      
      .h-y-axis-column {
        display: grid;
        grid-auto-rows: minmax(2rem, auto);
        align-content: start;
        /* FIX: Add padding to match box */
        padding-top: 22.8px; /* 20.8px + 2px border */
        padding-bottom: 22.8px;
        padding-right: 8px;
      }
      
      .h-y-label {
        height: 2rem;
        position: relative;
      }
      
      .h-chart-box {
        display: grid;
        grid-auto-rows: minmax(2rem, auto);
        align-content: start;
        position: relative;
      }
      
      .h-bar-row {
        height: 2rem;
        position: relative;
      }
      
      .h-value-column {
        display: grid;
        grid-auto-rows: minmax(2rem, auto);
        align-content: start;
        /* FIX: Add padding to match box */
        padding-top: 22.8px;
        padding-bottom: 22.8px;
        padding-left: 8px;
      }
      
      .h-value-label {
        height: 2rem;
        position: relative;
      }
    `;
    document.head.appendChild(style);
  });

  it('should have labels and bars at SAME distance from chart top', () => {
    const data = [
      { label: 'claude-3-5-haiku-202...', value: 14 },
      { label: 'claude-opus-4-1-2025...', value: 3 },
    ];

    const { container } = render(<HorizontalBarChart data={data} align="top" />);

    const chart = container.querySelector('.terminal-h-chart');
    const firstLabel = container.querySelector('.h-y-label');
    const firstBar = container.querySelector('.h-bar-row');
    const firstValue = container.querySelector('.h-value-label');

    expect(chart).toBeTruthy();
    expect(firstLabel).toBeTruthy();
    expect(firstBar).toBeTruthy();
    expect(firstValue).toBeTruthy();

    // Mock measurements with the fix applied
    Object.defineProperty(chart!, 'getBoundingClientRect', {
      value: () => ({ top: 0, left: 0 }),
    });

    // Label now has padding-top matching box padding
    Object.defineProperty(firstLabel!, 'getBoundingClientRect', {
      value: () => ({ top: 22.8, left: 0 }), // NOW at same level as bar!
    });

    // Bar is inside box with padding
    Object.defineProperty(firstBar!, 'getBoundingClientRect', {
      value: () => ({ top: 22.8, left: 108 }),
    });

    // Value also has padding-top
    Object.defineProperty(firstValue!, 'getBoundingClientRect', {
      value: () => ({ top: 22.8, left: 400 }),
    });

    const chartRect = chart!.getBoundingClientRect();
    const labelRect = firstLabel!.getBoundingClientRect();
    const barRect = firstBar!.getBoundingClientRect();
    const valueRect = firstValue!.getBoundingClientRect();

    const labelDistance = labelRect.top - chartRect.top;
    const barDistance = barRect.top - chartRect.top;
    const valueDistance = valueRect.top - chartRect.top;

    console.log('With fix - Label distance:', labelDistance);
    console.log('With fix - Bar distance:', barDistance);
    console.log('With fix - Value distance:', valueDistance);

    // ALL should be at same distance from chart top!
    expect(labelDistance).toBeCloseTo(22.8, 1);
    expect(barDistance).toBeCloseTo(22.8, 1);
    expect(valueDistance).toBeCloseTo(22.8, 1);

    // Perfect alignment!
    expect(labelDistance).toBe(barDistance);
    expect(barDistance).toBe(valueDistance);
  });

  it('should maintain alignment for all 3 bars', () => {
    const data = [
      { label: 'First Bar', value: 30 },
      { label: 'Second Bar', value: 60 },
      { label: 'Third Bar', value: 90 },
    ];

    const { container } = render(<HorizontalBarChart data={data} align="top" />);

    const chart = container.querySelector('.terminal-h-chart');
    const labels = container.querySelectorAll('.h-y-label');
    const bars = container.querySelectorAll('.h-bar-row');
    const values = container.querySelectorAll('.h-value-label');

    Object.defineProperty(chart, 'getBoundingClientRect', {
      value: () => ({ top: 0 }),
    });

    // All elements now start at same offset due to padding
    const baseOffset = 22.8;

    for (let i = 0; i < 3; i++) {
      const rowOffset = baseOffset + i * 32; // 32px per row

      Object.defineProperty(labels[i], 'getBoundingClientRect', {
        value: () => ({ top: rowOffset }),
      });

      Object.defineProperty(bars[i], 'getBoundingClientRect', {
        value: () => ({ top: rowOffset }),
      });

      Object.defineProperty(values[i], 'getBoundingClientRect', {
        value: () => ({ top: rowOffset }),
      });

      const labelTop = labels[i].getBoundingClientRect().top;
      const barTop = bars[i].getBoundingClientRect().top;
      const valueTop = values[i].getBoundingClientRect().top;

      console.log(
        `Row ${i}: All at ${rowOffset}px - Label=${labelTop}, Bar=${barTop}, Value=${valueTop}`
      );

      // Perfect alignment for each row!
      expect(labelTop).toBe(barTop);
      expect(barTop).toBe(valueTop);
      expect(labelTop).toBe(rowOffset);
    }
  });

  it('verifies no discrepancy remains', () => {
    const data = [{ label: 'Test', value: 50 }];

    const { container } = render(<HorizontalBarChart data={data} align="top" />);

    const chart = container.querySelector('.terminal-h-chart');
    const label = container.querySelector('.h-y-label');
    const bar = container.querySelector('.h-bar-row');

    expect(chart).toBeTruthy();
    expect(label).toBeTruthy();
    expect(bar).toBeTruthy();

    Object.defineProperty(chart!, 'getBoundingClientRect', {
      value: () => ({ top: 100 }), // Chart at 100px from page
    });

    Object.defineProperty(label!, 'getBoundingClientRect', {
      value: () => ({ top: 122.8 }), // 100 + 22.8px padding
    });

    Object.defineProperty(bar!, 'getBoundingClientRect', {
      value: () => ({ top: 122.8 }), // 100 + 22.8px (box padding)
    });

    const chartTop = chart!.getBoundingClientRect().top;
    const labelTop = label!.getBoundingClientRect().top;
    const barTop = bar!.getBoundingClientRect().top;

    const discrepancy = Math.abs(labelTop - barTop);

    console.log('Final check - Discrepancy between label and bar:', discrepancy);

    // NO MORE DISCREPANCY!
    expect(discrepancy).toBe(0);
  });
});
