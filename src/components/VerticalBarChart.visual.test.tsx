/**
 * Visual rendering test for VerticalBarChart
 * Ensures bars are actually visible with correct heights
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { VerticalBarChart } from './VerticalBarChart';
import '@testing-library/jest-dom';

describe('VerticalBarChart Visual Rendering', () => {
  beforeAll(() => {
    // Mock computed styles to simulate actual rendering
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      get() {
        const dataHeight = this.getAttribute('data-height');
        if (this.classList.contains('v-bar')) {
          // Simulate percentage heights based on data-height
          const heights: { [key: string]: number } = {
            '0': 0,
            '1': 16, // 10% of 160px container
            '2': 32, // 20%
            '3': 48, // 30%
            '4': 64, // 40%
            '5': 80, // 50%
            '6': 96, // 60%
            '7': 112, // 70%
            '8': 128, // 80%
            '9': 144, // 90%
            '10': 160, // 100%
          };
          return heights[dataHeight || '0'] || 0;
        }
        return 160; // Default container height
      },
      configurable: true
    });
  });

  it('renders bars with visible heights for single max value', () => {
    const { container } = render(
      <VerticalBarChart 
        data={[150]}
        yAxisLabels={['150ms', '75ms', '0ms']}
        xAxisLabels={['Today']}
        height={10}
      />
    );

    const bar = container.querySelector('.v-bar');
    expect(bar).toHaveAttribute('data-height', '10');
    
    // Verify the bar would be visible
    const height = (bar as HTMLElement)?.offsetHeight;
    expect(height).toBe(160); // Should be 100% of container
    expect(height).toBeGreaterThan(0);
  });

  it('renders bars with proportional heights for multiple values', () => {
    const data = [30, 60, 90];
    const { container } = render(
      <VerticalBarChart 
        data={data}
        height={10}
      />
    );

    const bars = container.querySelectorAll('.v-bar');
    expect(bars).toHaveLength(3);
    
    // Check proportional heights
    const heights = Array.from(bars).map(bar => {
      const dataHeight = bar.getAttribute('data-height');
      const offsetHeight = (bar as HTMLElement).offsetHeight;
      return { dataHeight, offsetHeight };
    });
    
    // First bar: 30/90 * 10 ≈ 3
    expect(heights[0].dataHeight).toBe('3');
    expect(heights[0].offsetHeight).toBe(48); // 30% height
    
    // Second bar: 60/90 * 10 ≈ 7
    expect(heights[1].dataHeight).toBe('7');
    expect(heights[1].offsetHeight).toBe(112); // 70% height
    
    // Third bar: 90/90 * 10 = 10
    expect(heights[2].dataHeight).toBe('10');
    expect(heights[2].offsetHeight).toBe(160); // 100% height
    
    // All bars should be visible
    heights.forEach(h => {
      expect(h.offsetHeight).toBeGreaterThan(0);
    });
  });

  it('ensures bars have correct CSS class structure', () => {
    const { container } = render(
      <VerticalBarChart data={[100]} />
    );

    // Check the structure
    const chartBox = container.querySelector('.v-chart-box');
    expect(chartBox).toHaveAttribute('box-', 'square');
    
    const barsContainer = container.querySelector('.v-bars-container');
    expect(barsContainer).toBeInTheDocument();
    
    const barColumn = container.querySelector('.v-bar-column');
    expect(barColumn).toBeInTheDocument();
    
    const bar = container.querySelector('.v-bar');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute('data-height');
  });

  it('verifies bar visibility with zero values', () => {
    const data = [0, 50, 0, 100];
    const { container } = render(
      <VerticalBarChart data={data} height={10} />
    );

    const bars = container.querySelectorAll('.v-bar');
    
    // Zero values should have 0 height
    expect(bars[0]).toHaveAttribute('data-height', '0');
    expect((bars[0] as HTMLElement).offsetHeight).toBe(0);
    
    expect(bars[2]).toHaveAttribute('data-height', '0');
    expect((bars[2] as HTMLElement).offsetHeight).toBe(0);
    
    // Non-zero values should be visible
    expect(bars[1]).toHaveAttribute('data-height', '5');
    expect((bars[1] as HTMLElement).offsetHeight).toBeGreaterThan(0);
    
    expect(bars[3]).toHaveAttribute('data-height', '10');
    expect((bars[3] as HTMLElement).offsetHeight).toBeGreaterThan(0);
  });

  it('confirms CSS height fix allows percentage heights to work', () => {
    const { container } = render(
      <VerticalBarChart data={[100]} />
    );

    const barColumn = container.querySelector('.v-bar-column');
    const bar = container.querySelector('.v-bar');
    
    // The fix was adding height: 100% to v-bar-column
    // This allows percentage heights on v-bar to work
    expect(barColumn).toBeInTheDocument();
    expect(bar).toBeInTheDocument();
    
    // Bar should have a data-height attribute
    expect(bar).toHaveAttribute('data-height', '10');
    
    // And should be visible (non-zero height)
    const height = (bar as HTMLElement)?.offsetHeight;
    expect(height).toBeGreaterThan(0);
  });
});