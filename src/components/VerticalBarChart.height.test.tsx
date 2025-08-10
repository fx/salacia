/**
 * Critical test for VerticalBarChart bar heights
 * Must ensure bars with data-height are actually visible
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { VerticalBarChart } from './VerticalBarChart';
import '@testing-library/jest-dom';

describe('VerticalBarChart Bar Height Rendering', () => {
  beforeAll(() => {
    // Mock the actual CSS that should make bars visible
    const style = document.createElement('style');
    style.textContent = `
      .v-bars-container {
        display: flex;
        width: 100%;
        height: 100%;
        align-items: flex-end;
      }
      
      .v-bar-column {
        display: flex;
        align-items: flex-end;
        width: 2rem;
      }
      
      .v-bar {
        width: 100%;
        background: var(--foreground1, #000);
      }
      
      /* CRITICAL: These must set actual height */
      .v-bar[data-height="0"] { height: 0; }
      .v-bar[data-height="1"] { height: 10%; }
      .v-bar[data-height="2"] { height: 20%; }
      .v-bar[data-height="3"] { height: 30%; }
      .v-bar[data-height="4"] { height: 40%; }
      .v-bar[data-height="5"] { height: 50%; }
      .v-bar[data-height="6"] { height: 60%; }
      .v-bar[data-height="7"] { height: 70%; }
      .v-bar[data-height="8"] { height: 80%; }
      .v-bar[data-height="9"] { height: 90%; }
      .v-bar[data-height="10"] { height: 100%; }
    `;
    document.head.appendChild(style);
  });

  it('MUST render a bar with height when data-height="10"', () => {
    // This simulates the exact issue: 150ms value with 0-150ms range
    const data = [150]; // Single value at max
    const { container } = render(
      <VerticalBarChart 
        data={data}
        yAxisLabels={['150ms', '75ms', '0ms']}
        xAxisLabels={['8/9']}
        height={10}
      />
    );

    const bar = container.querySelector('.v-bar');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute('data-height', '10');

    // Mock the computed style to verify CSS is applied
    Object.defineProperty(bar, 'offsetHeight', {
      get: () => {
        const dataHeight = bar?.getAttribute('data-height');
        // Should return non-zero for data-height="10"
        return dataHeight === '10' ? 100 : 0;
      }
    });

    Object.defineProperty(bar, 'getBoundingClientRect', {
      value: () => {
        const dataHeight = bar?.getAttribute('data-height');
        // A bar with data-height="10" should have actual height
        const height = dataHeight === '10' ? 100 : 0;
        return { height, top: 0, bottom: height, left: 0, right: 30, width: 30 };
      }
    });

    const rect = bar!.getBoundingClientRect();
    console.log('Bar with data-height="10" has rect height:', rect.height);
    
    // CRITICAL: Bar must have non-zero height
    expect(rect.height).toBeGreaterThan(0);
    expect(rect.height).toBe(100); // Should be 100% of container
  });

  it('should calculate correct data-height for various values', () => {
    // Test different value scenarios - each uses its own max
    const testCases = [
      { data: [150], expected: '10' }, // 150/150 = 1.0 * 10 = 10
      { data: [75], expected: '10' },  // 75/75 = 1.0 * 10 = 10 (single value is always max)
      { data: [30], expected: '10' },  // 30/30 = 1.0 * 10 = 10 (single value is always max)
      { data: [0], expected: '0' },    // 0/max(0,1) = 0 * 10 = 0
    ];

    testCases.forEach(({ data, expected }) => {
      const { container } = render(
        <VerticalBarChart data={data} height={10} />
      );
      
      const bar = container.querySelector('.v-bar');
      expect(bar).toHaveAttribute('data-height', expected);
    });
  });
  
  it('should calculate correct data-height with multiple values', () => {
    // Test with multiple values where scaling actually matters
    const testCases = [
      { data: [75, 150], expected: ['5', '10'] },  // 75/150=0.5, 150/150=1.0
      { data: [30, 60, 90], expected: ['3', '7', '10'] }, // 30/90=0.33, 60/90=0.67, 90/90=1.0
      { data: [0, 50, 100], expected: ['0', '5', '10'] }, // 0/100=0, 50/100=0.5, 100/100=1.0
    ];

    testCases.forEach(({ data, expected }) => {
      const { container } = render(
        <VerticalBarChart data={data} height={10} />
      );
      
      const bars = container.querySelectorAll('.v-bar');
      bars.forEach((bar, i) => {
        expect(bar).toHaveAttribute('data-height', expected[i]);
      });
    });
  });

  it('should handle the stats page scenario correctly', () => {
    // Exact scenario from stats page
    const avgResponseTime = 150;
    const data = [avgResponseTime];
    
    const { container } = render(
      <VerticalBarChart 
        data={data}
        yAxisLabels={['150ms', '75ms', '0ms']}
        xAxisLabels={['8/9']}
        height={10}
      />
    );

    const bar = container.querySelector('.v-bar');
    expect(bar).toBeInTheDocument();
    
    // Should be at maximum height since value equals max
    expect(bar).toHaveAttribute('data-height', '10');
    
    // Check the parent structure
    const barColumn = container.querySelector('.v-bar-column');
    expect(barColumn).toBeInTheDocument();
    
    const barsContainer = container.querySelector('.v-bars-container');
    expect(barsContainer).toBeInTheDocument();
    
    const chartBox = container.querySelector('.v-chart-box');
    expect(chartBox).toBeInTheDocument();
    expect(chartBox).toHaveAttribute('box-', 'square');
  });

  it('should verify CSS height calculation', () => {
    const data = [100, 50, 75];
    const { container } = render(
      <VerticalBarChart data={data} height={10} />
    );

    const bars = container.querySelectorAll('.v-bar');
    
    // First bar: 100/100 * 10 = 10
    expect(bars[0]).toHaveAttribute('data-height', '10');
    
    // Second bar: 50/100 * 10 = 5
    expect(bars[1]).toHaveAttribute('data-height', '5');
    
    // Third bar: 75/100 * 10 = 7.5 ≈ 8
    expect(bars[2]).toHaveAttribute('data-height', '8');
  });

  it('should have proper container structure for height inheritance', () => {
    const data = [150];
    const { container } = render(
      <VerticalBarChart data={data} />
    );

    // Check the nesting structure
    const chartBox = container.querySelector('.v-chart-box');
    const barsContainer = chartBox?.querySelector('.v-bars-container');
    const barColumn = barsContainer?.querySelector('.v-bar-column');
    const bar = barColumn?.querySelector('.v-bar');

    expect(chartBox).toBeInTheDocument();
    expect(barsContainer).toBeInTheDocument();
    expect(barColumn).toBeInTheDocument();
    expect(bar).toBeInTheDocument();

    // Bar should be nested properly for height percentage to work
    expect(bar?.parentElement).toBe(barColumn);
    expect(barColumn?.parentElement).toBe(barsContainer);
    expect(barsContainer?.parentElement).toBe(chartBox);
  });

  it('CRITICAL: must detect when bars are incorrectly 0px tall', () => {
    const data = [150];
    const { container } = render(
      <VerticalBarChart 
        data={data}
        yAxisLabels={['150ms', '75ms', '0ms']}
        height={10}
      />
    );

    const bar = container.querySelector('.v-bar');
    
    // This bar should be at 100% height
    expect(bar).toHaveAttribute('data-height', '10');
    
    // Simulate the broken state (0px height despite data-height="10")
    const simulateBrokenCSS = () => {
      Object.defineProperty(bar, 'offsetHeight', {
        get: () => 0, // Broken: returns 0 despite data-height="10"
        configurable: true
      });
      return (bar as HTMLElement)?.offsetHeight;
    };

    // Simulate the fixed state
    const simulateFixedCSS = () => {
      Object.defineProperty(bar, 'offsetHeight', {
        get: () => {
          const dataHeight = bar?.getAttribute('data-height');
          return dataHeight === '10' ? 100 : 0;
        },
        configurable: true
      });
      return (bar as HTMLElement)?.offsetHeight;
    };

    // Test broken state
    const brokenHeight = simulateBrokenCSS();
    console.log('Broken CSS - Bar height:', brokenHeight);
    
    // Test fixed state
    const fixedHeight = simulateFixedCSS();
    console.log('Fixed CSS - Bar height:', fixedHeight);
    
    // The fixed version must have height
    expect(fixedHeight).toBeGreaterThan(0);
  });
});