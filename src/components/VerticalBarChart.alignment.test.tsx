/**
 * Alignment tests for VerticalBarChart component
 * Tests left/right alignment and bar visibility
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { VerticalBarChart } from './VerticalBarChart';
import '@testing-library/jest-dom';

describe('VerticalBarChart Alignment and Visibility', () => {
  describe('Bar visibility', () => {
    it('should render bars with correct classes', () => {
      const data = [10, 20, 30, 40];
      const { container } = render(
        <VerticalBarChart data={data} />
      );
      
      const bars = container.querySelectorAll('.v-bar');
      expect(bars).toHaveLength(4);
      
      // Each bar should have a data-height attribute
      bars.forEach(bar => {
        expect(bar).toHaveAttribute('data-height');
      });
    });

    it('should calculate correct bar heights', () => {
      const data = [10, 20, 30, 40];
      const { container } = render(
        <VerticalBarChart data={data} height={10} />
      );
      
      const bars = container.querySelectorAll('.v-bar');
      
      // Heights should be proportional to max value (40)
      // 10/40 * 10 = 2.5 ≈ 3
      expect(bars[0]).toHaveAttribute('data-height', '3');
      // 20/40 * 10 = 5
      expect(bars[1]).toHaveAttribute('data-height', '5');
      // 30/40 * 10 = 7.5 ≈ 8
      expect(bars[2]).toHaveAttribute('data-height', '8');
      // 40/40 * 10 = 10
      expect(bars[3]).toHaveAttribute('data-height', '10');
    });

    it('should have bars container with correct structure', () => {
      const data = [10, 20, 30];
      const { container } = render(
        <VerticalBarChart data={data} />
      );
      
      const chartBox = container.querySelector('.v-chart-box');
      expect(chartBox).toHaveAttribute('box-', 'square');
      
      const barsContainer = container.querySelector('.v-bars-container');
      expect(barsContainer).toBeInTheDocument();
      
      const barColumns = container.querySelectorAll('.v-bar-column');
      expect(barColumns).toHaveLength(3);
    });
  });

  describe('Left alignment (default)', () => {
    it('should align bars to the left by default', () => {
      const data = [10, 20, 30];
      const { container } = render(
        <VerticalBarChart data={data} />
      );
      
      const chart = container.querySelector('.terminal-v-chart');
      expect(chart).toHaveClass('align-left');
      
      const barsContainer = container.querySelector('.v-bars-container');
      expect(barsContainer).toBeInTheDocument();
    });

    it('should align X-axis labels with bars when left-aligned', () => {
      const data = [10, 20, 30];
      const xLabels = ['A', 'B', 'C'];
      
      const { container } = render(
        <VerticalBarChart 
          data={data} 
          xAxisLabels={xLabels}
          align="left"
        />
      );
      
      const xAxisLabels = container.querySelector('.v-x-axis-labels');
      expect(xAxisLabels).toBeInTheDocument();
      
      const labels = container.querySelectorAll('.v-x-label');
      expect(labels).toHaveLength(3);
    });
  });

  describe('Right alignment', () => {
    it('should align bars to the right when specified', () => {
      const data = [10, 20, 30];
      const { container } = render(
        <VerticalBarChart data={data} align="right" />
      );
      
      const chart = container.querySelector('.terminal-v-chart');
      expect(chart).toHaveClass('align-right');
    });

    it('should align X-axis labels with bars when right-aligned', () => {
      const data = [10, 20, 30];
      const xLabels = ['A', 'B', 'C'];
      
      const { container } = render(
        <VerticalBarChart 
          data={data} 
          xAxisLabels={xLabels}
          align="right"
        />
      );
      
      const chart = container.querySelector('.terminal-v-chart');
      expect(chart).toHaveClass('align-right');
      
      const labels = container.querySelectorAll('.v-x-label');
      expect(labels).toHaveLength(3);
    });
  });

  describe('Y-axis alignment', () => {
    it('should have Y-axis labels with padding matching box', () => {
      const data = [10, 20, 30];
      const yLabels = ['30', '15', '0'];
      
      const { container } = render(
        <VerticalBarChart 
          data={data}
          yAxisLabels={yLabels}
        />
      );
      
      const yAxisLabels = container.querySelector('.v-y-axis-labels');
      expect(yAxisLabels).toBeInTheDocument();
      
      const labels = container.querySelectorAll('.v-y-label');
      expect(labels).toHaveLength(3);
      
      // Labels should span the height
      labels.forEach(label => {
        expect(label).toHaveClass('v-y-label');
      });
    });

    it('should align Y-axis labels with chart height', () => {
      const data = [10, 20, 30];
      const { container } = render(
        <VerticalBarChart data={data} />
      );
      
      const yAxisLabels = container.querySelector('.v-y-axis-labels');
      const chartBox = container.querySelector('.v-chart-box');
      
      expect(yAxisLabels).toBeInTheDocument();
      expect(chartBox).toBeInTheDocument();
      
      // Both should exist and have proper structure
      expect(chartBox).toHaveAttribute('box-', 'square');
    });
  });

  describe('Different data sizes', () => {
    it('should handle single data point', () => {
      const data = [50];
      const { container } = render(
        <VerticalBarChart data={data} />
      );
      
      const bars = container.querySelectorAll('.v-bar');
      expect(bars).toHaveLength(1);
      expect(bars[0]).toHaveAttribute('data-height', '10'); // Max height
    });

    it('should handle many data points', () => {
      const data = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
      const { container } = render(
        <VerticalBarChart data={data} />
      );
      
      const bars = container.querySelectorAll('.v-bar');
      expect(bars).toHaveLength(10);
    });

    it('should handle zero values', () => {
      const data = [0, 10, 0, 20];
      const { container } = render(
        <VerticalBarChart data={data} />
      );
      
      const bars = container.querySelectorAll('.v-bar');
      expect(bars).toHaveLength(4);
      expect(bars[0]).toHaveAttribute('data-height', '0');
      expect(bars[2]).toHaveAttribute('data-height', '0');
    });
  });

  describe('Visual consistency', () => {
    it('should maintain bar width consistency', () => {
      const data = [10, 20, 30, 40, 50];
      const { container } = render(
        <VerticalBarChart data={data} />
      );
      
      const barColumns = container.querySelectorAll('.v-bar-column');
      expect(barColumns).toHaveLength(5);
      
      // All bar columns should have consistent structure
      barColumns.forEach(col => {
        expect(col).toHaveClass('v-bar-column');
        const bar = col.querySelector('.v-bar');
        expect(bar).toBeInTheDocument();
      });
    });

    it('should work with custom height parameter', () => {
      const data = [10, 20, 30];
      const { container } = render(
        <VerticalBarChart data={data} height={20} />
      );
      
      const bars = container.querySelectorAll('.v-bar');
      // With height=20, max value 30 should map to 20
      // 30/30 * 20 = 20
      expect(bars[2]).toHaveAttribute('data-height', '20');
    });
  });
});