/**
 * Unit tests for HorizontalBarChart component
 * Tests precise measurements and alignment of axes and bars
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HorizontalBarChart } from './HorizontalBarChart';
import '@testing-library/jest-dom';

describe('HorizontalBarChart', () => {
  const basicData = [
    { label: 'Item A', value: 10 },
    { label: 'Item B', value: 20 },
    { label: 'Item C', value: 30 },
  ];

  const stackedData = [
    { label: 'Test 1', value: 100, failed: 20 },
    { label: 'Test 2', value: 80, failed: 10 },
    { label: 'Test 3', value: 60, failed: 30 },
  ];

  describe('Component Rendering', () => {
    it('should render with required props', () => {
      const { container } = render(
        <HorizontalBarChart data={basicData} />
      );
      
      expect(container.querySelector('.widget.horizontal-chart')).toBeInTheDocument();
      expect(container.querySelector('[box-="square"]')).toBeInTheDocument();
    });

    it('should render title when provided', () => {
      render(
        <HorizontalBarChart 
          data={basicData} 
          title="Horizontal Test Chart" 
        />
      );
      
      expect(screen.getByText('Horizontal Test Chart')).toBeInTheDocument();
    });

    it('should render Y-axis labels for each data item', () => {
      render(<HorizontalBarChart data={basicData} />);
      
      expect(screen.getByText('Item A')).toBeInTheDocument();
      expect(screen.getByText('Item B')).toBeInTheDocument();
      expect(screen.getByText('Item C')).toBeInTheDocument();
    });

    it('should render value labels for each data item', () => {
      const { container } = render(<HorizontalBarChart data={basicData} />);
      
      const valueLabels = container.querySelector('.value-labels');
      const values = valueLabels?.querySelectorAll('small');
      
      expect(values).toHaveLength(3);
      expect(values?.[0]).toHaveTextContent('10');
      expect(values?.[1]).toHaveTextContent('20');
      expect(values?.[2]).toHaveTextContent('30');
    });
  });

  describe('Precise Label and Bar Alignment', () => {
    describe('Alignment structure', () => {
      it('should have matching row heights for labels and bars', () => {
        const { container } = render(
          <HorizontalBarChart data={basicData} />
        );
        
        const labelRows = container.querySelectorAll('.horizontal-label-row');
        const barRows = container.querySelectorAll('.bar-row');
        const valueRows = container.querySelectorAll('.horizontal-value-row');
        
        expect(labelRows).toHaveLength(3);
        expect(barRows).toHaveLength(3);
        expect(valueRows).toHaveLength(3);
        
        // All rows should have the same height
        labelRows.forEach(row => {
          expect(row).toHaveClass('horizontal-label-row');
        });
      });

      it('should use flexbox with space-between for vertical distribution', () => {
        const { container } = render(
          <HorizontalBarChart data={basicData} />
        );
        
        const yLabels = container.querySelector('.horizontal-y-labels');
        const barsBox = container.querySelector('.horizontal-bars-container');
        const valueLabels = container.querySelector('.horizontal-value-labels');
        
        expect(yLabels).toBeInTheDocument();
        expect(barsBox).toBeInTheDocument();
        expect(valueLabels).toBeInTheDocument();
      });
    });

  });

  describe('Bar Width Calculations', () => {
    it('should calculate correct bar widths', () => {
      const { container } = render(
        <HorizontalBarChart 
          data={basicData}
          width={20}
        />
      );
      
      const bars = container.querySelectorAll('.bar-success');
      expect(bars).toHaveLength(3);
      
      // Widths should be proportional: 10/30 * 20 = 6.67 ≈ 7
      expect(bars[0]).toHaveAttribute('data-width', '7');
      // 20/30 * 20 = 13.33 ≈ 13
      expect(bars[1]).toHaveAttribute('data-width', '13');
      // 30/30 * 20 = 20
      expect(bars[2]).toHaveAttribute('data-width', '20');
    });

    it('should handle zero values correctly', () => {
      const dataWithZero = [
        { label: 'Zero', value: 0 },
        { label: 'Non-zero', value: 10 },
      ];
      
      const { container } = render(
        <HorizontalBarChart data={dataWithZero} />
      );
      
      const bars = container.querySelectorAll('.bar-row');
      expect(bars).toHaveLength(2);
      
      // First bar should have no visible bar elements for zero value
      const firstBarElements = bars[0].querySelectorAll('.bar-success');
      expect(firstBarElements).toHaveLength(0);
    });

    it('should handle custom width parameter', () => {
      const { container } = render(
        <HorizontalBarChart 
          data={basicData}
          width={10}
        />
      );
      
      const bars = container.querySelectorAll('.bar-success');
      // With width=10, max value 30 should map to 10
      expect(bars[2]).toHaveAttribute('data-width', '10');
    });
  });

  describe('Stacked Bar Functionality', () => {
    it('should render stacked bars when showFailedStack is true', () => {
      const { container } = render(
        <HorizontalBarChart 
          data={stackedData}
          showFailedStack={true}
        />
      );
      
      const successBars = container.querySelectorAll('.bar-success');
      const failedBars = container.querySelectorAll('.bar-failed');
      
      expect(successBars.length).toBeGreaterThan(0);
      expect(failedBars.length).toBeGreaterThan(0);
    });

    it('should calculate correct widths for stacked segments', () => {
      const { container } = render(
        <HorizontalBarChart 
          data={stackedData}
          showFailedStack={true}
          width={20}
        />
      );
      
      const barRows = container.querySelectorAll('.bar-row');
      
      // First item: value=100, failed=20
      const firstSuccess = barRows[0].querySelector('.bar-success');
      const firstFailed = barRows[0].querySelector('.bar-failed');
      
      // Total bar width for 100/100 * 20 = 20
      // Failed portion: 20/100 * 20 = 4
      // Success portion: 80/100 * 20 = 16
      expect(firstSuccess).toHaveAttribute('data-width', '16');
      expect(firstFailed).toHaveAttribute('data-width', '4');
    });

    it('should display success/failed counts in value labels', () => {
      render(
        <HorizontalBarChart 
          data={stackedData}
          showFailedStack={true}
        />
      );
      
      // Should show format like "80✓ 20✗"
      expect(screen.getByText('80✓ 20✗')).toBeInTheDocument();
      expect(screen.getByText('70✓ 10✗')).toBeInTheDocument();
      expect(screen.getByText('30✓ 30✗')).toBeInTheDocument();
    });

    it('should show legend for stacked bars', () => {
      render(
        <HorizontalBarChart 
          data={stackedData}
          showFailedStack={true}
        />
      );
      
      expect(screen.getByText('Darker = success, lighter = failed')).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    it('should position Y-axis labels outside the box on the left', () => {
      const { container } = render(
        <HorizontalBarChart data={basicData} />
      );
      
      const chartRow = container.querySelector('.chart-row[data-align="stretch start"]');
      const children = chartRow?.children;
      
      // First child should be Y-axis labels
      expect(children?.[0]).toHaveClass('y-labels', 'horizontal-y-labels');
      expect(children?.[0]).toHaveAttribute('data-pad', '1 0.5rem 1 0');
      
      // Second child should be the main chart area
      expect(children?.[1]).toHaveClass('chart-column');
      expect(children?.[1]).toHaveAttribute('data-self', 'grow');
    });

    it('should position X-axis scale outside the box at the bottom', () => {
      const { container } = render(
        <HorizontalBarChart data={basicData} />
      );
      
      const mainChartArea = container.querySelector('.chart-column[data-self="grow"]');
      const children = mainChartArea?.children;
      
      // First child should be the box with bars
      expect(children?.[0]).toHaveAttribute('box-', 'square');
      
      // Second child should be X-axis scale
      expect(children?.[1]).toHaveClass('x-axis-scale');
    });

    it('should position value labels outside the box on the right', () => {
      const { container } = render(
        <HorizontalBarChart data={basicData} />
      );
      
      const chartRow = container.querySelector('.chart-row[data-align="stretch start"]');
      const children = chartRow?.children;
      
      // Third child should be value labels
      expect(children?.[2]).toHaveClass('value-labels', 'horizontal-value-labels');
      expect(children?.[2]).toHaveAttribute('data-pad', '1 0 1 0.5rem');
    });

    it('should render bars within a square box', () => {
      const { container } = render(
        <HorizontalBarChart data={basicData} />
      );
      
      const barsBox = container.querySelector('[box-="square"].horizontal-bars-container');
      expect(barsBox).toBeInTheDocument();
      expect(barsBox).toHaveClass('bars-box', 'horizontal-bars-container');
      expect(barsBox).toHaveAttribute('data-pad', '1');
    });

    it('should render X-axis scale labels correctly', () => {
      const { container } = render(<HorizontalBarChart data={basicData} />);
      
      const xAxisScale = container.querySelector('.x-axis-scale');
      const labels = xAxisScale?.querySelectorAll('small');
      
      expect(labels).toHaveLength(3);
      expect(labels?.[0]).toHaveTextContent('0');
      expect(labels?.[1]).toHaveTextContent('15'); // 30/2 = 15
      expect(labels?.[2]).toHaveTextContent('30'); // max value
    });
  });

  describe('Edge Cases', () => {
    it('should handle single data point', () => {
      const singleData = [{ label: 'Single', value: 50 }];
      const { container } = render(
        <HorizontalBarChart data={singleData} />
      );
      
      const bars = container.querySelectorAll('.bar-row');
      expect(bars).toHaveLength(1);
    });

    it('should handle empty data array', () => {
      const { container } = render(
        <HorizontalBarChart data={[]} />
      );
      
      const bars = container.querySelectorAll('.bar-row');
      expect(bars).toHaveLength(0);
    });

    it('should handle very long labels', () => {
      const longLabelData = [
        { label: 'This is a very long label that might overflow', value: 10 },
      ];
      
      render(<HorizontalBarChart data={longLabelData} />);
      
      expect(screen.getByText('This is a very long label that might overflow')).toBeInTheDocument();
    });

    it('should handle large datasets', () => {
      const largeData = Array.from({ length: 50 }, (_, i) => ({
        label: `Item ${i}`,
        value: Math.random() * 100,
      }));
      
      const { container } = render(
        <HorizontalBarChart data={largeData} />
      );
      
      const bars = container.querySelectorAll('.bar-row');
      expect(bars).toHaveLength(50);
    });

    it('should handle all zero failed values in stacked mode', () => {
      const noFailuresData = [
        { label: 'All Pass', value: 100, failed: 0 },
      ];
      
      const { container } = render(
        <HorizontalBarChart 
          data={noFailuresData}
          showFailedStack={true}
        />
      );
      
      const successBars = container.querySelectorAll('.bar-success');
      const failedBars = container.querySelectorAll('.bar-failed');
      
      expect(successBars).toHaveLength(1);
      expect(failedBars).toHaveLength(0); // No failed bars should render
    });
  });

  describe('CSS Classes and Styles', () => {
    it('should apply correct CSS classes', () => {
      const { container } = render(
        <HorizontalBarChart data={basicData} />
      );
      
      expect(container.querySelector('.widget')).toBeInTheDocument();
      expect(container.querySelector('.horizontal-chart')).toBeInTheDocument();
      expect(container.querySelector('.y-labels')).toBeInTheDocument();
      expect(container.querySelector('.bars-box')).toBeInTheDocument();
      expect(container.querySelector('.x-axis-scale')).toBeInTheDocument();
      expect(container.querySelector('.value-labels')).toBeInTheDocument();
    });

    it('should apply correct data attributes for bars', () => {
      const { container } = render(
        <HorizontalBarChart data={basicData} />
      );
      
      const bars = container.querySelectorAll('.bar-success');
      bars.forEach(bar => {
        const width = bar.getAttribute('data-width');
        expect(width).toBeTruthy();
        expect(parseInt(width || '0')).toBeGreaterThanOrEqual(0);
        expect(parseInt(width || '0')).toBeLessThanOrEqual(20);
      });
    });
  });
});