/**
 * Unit tests for VerticalBarChart component
 * Tests user-visible behavior and accessibility
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VerticalBarChart } from './VerticalBarChart';
import '@testing-library/jest-dom';

describe('VerticalBarChart', () => {
  const basicData = [10, 20, 30];

  describe('Component Rendering', () => {
    it('should render with required props', () => {
      render(<VerticalBarChart data={basicData} />);

      // Y-axis labels should be visible (default: max, half, 0)
      expect(screen.getByText('30')).toBeInTheDocument(); // Max value
      expect(screen.getByText('15')).toBeInTheDocument(); // Half of max
      expect(screen.getByText('0')).toBeInTheDocument(); // Min value
    });

    it('should render title when provided', () => {
      render(<VerticalBarChart data={basicData} title="Vertical Test Chart" />);

      expect(screen.getByText('Vertical Test Chart')).toBeInTheDocument();
    });

    it('should render custom Y-axis labels when provided', () => {
      const yLabels = ['High', 'Medium', 'Low'];
      render(<VerticalBarChart data={basicData} yAxisLabels={yLabels} />);

      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
    });

    it('should render X-axis labels when provided', () => {
      const xLabels = ['Jan', 'Feb', 'Mar'];
      render(<VerticalBarChart data={basicData} xAxisLabels={xLabels} />);

      expect(screen.getByText('Jan')).toBeInTheDocument();
      expect(screen.getByText('Feb')).toBeInTheDocument();
      expect(screen.getByText('Mar')).toBeInTheDocument();
    });

    it('should render bars with aria-labels for accessibility', () => {
      render(<VerticalBarChart data={basicData} />);

      // Bars should have accessible labels
      expect(screen.getByLabelText('Value: 10')).toBeInTheDocument();
      expect(screen.getByLabelText('Value: 20')).toBeInTheDocument();
      expect(screen.getByLabelText('Value: 30')).toBeInTheDocument();
    });
  });

  describe('Zero Value Handling', () => {
    it('should handle zero values correctly', () => {
      const dataWithZero = [0, 25, 50];
      render(<VerticalBarChart data={dataWithZero} />);

      // Should still render Y-axis scale
      expect(screen.getByText('50')).toBeInTheDocument(); // Max
      expect(screen.getByText('25')).toBeInTheDocument(); // Half
      expect(screen.getByText('0')).toBeInTheDocument(); // Min

      // Bars should have accessible labels
      expect(screen.getByLabelText('Value: 0')).toBeInTheDocument();
      expect(screen.getByLabelText('Value: 25')).toBeInTheDocument();
      expect(screen.getByLabelText('Value: 50')).toBeInTheDocument();
    });

    it('should handle all zero values without errors', () => {
      const allZeroData = [0, 0, 0];
      render(<VerticalBarChart data={allZeroData} />);

      // Should render with fallback max of 1
      // Note: When max is 1, both max and half(0.5 rounds to 1) show as "1"
      expect(screen.getAllByText('1')).toHaveLength(2); // Max and half both show 1
      expect(screen.getByText('0')).toBeInTheDocument(); // Min

      // All bars should have accessible labels
      expect(screen.getAllByLabelText('Value: 0')).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single data point', () => {
      const singleData = [42];
      const xLabels = ['Only'];

      render(<VerticalBarChart data={singleData} xAxisLabels={xLabels} />);

      expect(screen.getByText('42')).toBeInTheDocument(); // Max value on Y-axis
      expect(screen.getByText('21')).toBeInTheDocument(); // Half value
      expect(screen.getByText('0')).toBeInTheDocument(); // Min value
      expect(screen.getByText('Only')).toBeInTheDocument(); // X-axis label
      expect(screen.getByLabelText('Value: 42')).toBeInTheDocument();
    });

    it('should handle large datasets', () => {
      const largeData = Array.from({ length: 50 }, (_, i) => (i + 1) * 10);
      const xLabels = Array.from({ length: 50 }, (_, i) => `Item ${i + 1}`);

      render(<VerticalBarChart data={largeData} xAxisLabels={xLabels} />);

      // Check Y-axis scale
      expect(screen.getByText('500')).toBeInTheDocument(); // Max (50 * 10)
      expect(screen.getByText('250')).toBeInTheDocument(); // Half
      expect(screen.getByText('0')).toBeInTheDocument(); // Min

      // Check first and last X-axis labels
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 50')).toBeInTheDocument();

      // Check accessibility labels
      expect(screen.getByLabelText('Value: 10')).toBeInTheDocument();
      expect(screen.getByLabelText('Value: 500')).toBeInTheDocument();
    });

    it('should handle negative values', () => {
      const negativeData = [-10, 20, -30];
      render(<VerticalBarChart data={negativeData} />);

      // Y-axis should show based on max positive value (20)
      expect(screen.getByText('20')).toBeInTheDocument(); // Max
      expect(screen.getByText('10')).toBeInTheDocument(); // Half
      expect(screen.getByText('0')).toBeInTheDocument(); // Min

      // Bars should have accessible labels with actual values
      expect(screen.getByLabelText('Value: -10')).toBeInTheDocument();
      expect(screen.getByLabelText('Value: 20')).toBeInTheDocument();
      expect(screen.getByLabelText('Value: -30')).toBeInTheDocument();
    });

    it('should handle custom height parameter', () => {
      render(<VerticalBarChart data={basicData} height={20} />);

      // Just verify it renders without error
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByLabelText('Value: 30')).toBeInTheDocument();
    });
  });

  describe('Alignment Options', () => {
    it('should support left alignment', () => {
      render(<VerticalBarChart data={basicData} align="left" />);

      // Just verify it renders without error
      expect(screen.getByText('30')).toBeInTheDocument();
    });

    it('should support right alignment', () => {
      render(<VerticalBarChart data={basicData} align="right" />);

      // Just verify it renders without error
      expect(screen.getByText('30')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should provide proper aria-labels for screen readers', () => {
      const data = [15, 25, 35];
      const xLabels = ['Q1', 'Q2', 'Q3'];

      render(<VerticalBarChart data={data} xAxisLabels={xLabels} />);

      // Each bar should have an accessible label
      expect(screen.getByLabelText('Value: 15')).toBeInTheDocument();
      expect(screen.getByLabelText('Value: 25')).toBeInTheDocument();
      expect(screen.getByLabelText('Value: 35')).toBeInTheDocument();

      // Labels should be visible
      expect(screen.getByText('Q1')).toBeInTheDocument();
      expect(screen.getByText('Q2')).toBeInTheDocument();
      expect(screen.getByText('Q3')).toBeInTheDocument();
    });

    it('should handle mixed Y-axis label types', () => {
      const yLabels = ['100%', '50%', '0%'];
      render(<VerticalBarChart data={basicData} yAxisLabels={yLabels} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });
});
