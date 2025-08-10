/**
 * Test that VerticalBarChart handles 24-hour data with zeros correctly
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { VerticalBarChart } from './VerticalBarChart';
import '@testing-library/jest-dom';

describe('VerticalBarChart 24-Hour Zero Handling', () => {
  it('should render all 24 bars even when some values are 0', () => {
    // Simulate 24 hours of data with some zeros (empty hours)
    const hourlyData = [
      0, 0, 0, 0, 0, 1, 3, 5,  // 00:00 - 07:00 (quiet night hours)
      10, 15, 20, 25, 30, 25, 20, 18,  // 08:00 - 15:00 (busy day)
      15, 12, 8, 5, 3, 2, 1, 0  // 16:00 - 23:00 (evening wind down)
    ];
    
    const hourLabels = Array.from({ length: 24 }, (_, i) => 
      `${i.toString().padStart(2, '0')}:00`
    );

    const { container } = render(
      <VerticalBarChart 
        data={hourlyData}
        xAxisLabels={hourLabels}
        height={10}
        title="24-HOUR ACTIVITY"
      />
    );

    // Should render exactly 24 bars
    const bars = container.querySelectorAll('.v-bar');
    expect(bars).toHaveLength(24);

    // Check that zero-value bars have data-height="0"
    expect(bars[0]).toHaveAttribute('data-height', '0'); // 00:00 has 0 value
    expect(bars[1]).toHaveAttribute('data-height', '0'); // 01:00 has 0 value
    expect(bars[23]).toHaveAttribute('data-height', '0'); // 23:00 has 0 value
    
    // Check that non-zero bars have appropriate heights
    expect(bars[12]).toHaveAttribute('data-height', '10'); // 12:00 has max value (30)
    
    // All bars should be present in the DOM
    bars.forEach(bar => {
      expect(bar).toBeInTheDocument();
    });
  });

  it('should handle all-zero data gracefully', () => {
    // All 24 hours with no activity
    const zeroData = new Array(24).fill(0);
    const hourLabels = Array.from({ length: 24 }, (_, i) => 
      `${i.toString().padStart(2, '0')}:00`
    );

    const { container } = render(
      <VerticalBarChart 
        data={zeroData}
        xAxisLabels={hourLabels}
        height={10}
      />
    );

    const bars = container.querySelectorAll('.v-bar');
    expect(bars).toHaveLength(24);
    
    // All bars should have height 0
    bars.forEach(bar => {
      expect(bar).toHaveAttribute('data-height', '0');
    });
  });

  it('should maintain bar visibility even after data updates', () => {
    const { container, rerender } = render(
      <VerticalBarChart 
        data={[10, 20, 30]}
        xAxisLabels={['A', 'B', 'C']}
        height={10}
      />
    );

    let bars = container.querySelectorAll('.v-bar');
    expect(bars).toHaveLength(3);

    // Update with 24-hour data
    const hourlyData = new Array(24).fill(5);
    const hourLabels = Array.from({ length: 24 }, (_, i) => 
      `${i.toString().padStart(2, '0')}:00`
    );

    rerender(
      <VerticalBarChart 
        data={hourlyData}
        xAxisLabels={hourLabels}
        height={10}
      />
    );

    bars = container.querySelectorAll('.v-bar');
    expect(bars).toHaveLength(24);
    
    // All bars should still be visible with consistent height
    bars.forEach(bar => {
      expect(bar).toHaveAttribute('data-height', '10'); // All same value = all max height
    });
  });

  it('should properly scale mixed zero and non-zero values', () => {
    // Sparse data - mostly zeros with a few spikes
    const sparseData = new Array(24).fill(0);
    sparseData[9] = 100;  // 09:00 spike
    sparseData[12] = 50;  // 12:00 half spike
    sparseData[17] = 25;  // 17:00 quarter spike
    
    const { container } = render(
      <VerticalBarChart 
        data={sparseData}
        height={10}
      />
    );

    const bars = container.querySelectorAll('.v-bar');
    
    // Check scaling is correct
    expect(bars[9]).toHaveAttribute('data-height', '10');  // 100/100 = max
    expect(bars[12]).toHaveAttribute('data-height', '5');  // 50/100 = half
    expect(bars[17]).toHaveAttribute('data-height', '3');  // 25/100 ≈ 0.25 * 10 = 2.5 ≈ 3
    
    // Rest should be zero
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23].forEach(i => {
      expect(bars[i]).toHaveAttribute('data-height', '0');
    });
  });
});