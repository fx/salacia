/**
 * Unit tests for HorizontalBarChart component
 * Tests user-visible behavior and accessibility
 */

import { describe, it, expect } from 'vitest';
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
      render(<HorizontalBarChart data={basicData} />);

      // Check that labels are visible to users
      expect(screen.getByText('Item A')).toBeInTheDocument();
      expect(screen.getByText('Item B')).toBeInTheDocument();
      expect(screen.getByText('Item C')).toBeInTheDocument();
    });

    it('should render title when provided', () => {
      render(<HorizontalBarChart data={basicData} title="Horizontal Test Chart" />);

      expect(screen.getByText('Horizontal Test Chart')).toBeInTheDocument();
    });

    it('should render Y-axis labels for each data item', () => {
      render(<HorizontalBarChart data={basicData} />);

      expect(screen.getByText('Item A')).toBeInTheDocument();
      expect(screen.getByText('Item B')).toBeInTheDocument();
      expect(screen.getByText('Item C')).toBeInTheDocument();
    });

    it('should render value labels for each data item', () => {
      render(<HorizontalBarChart data={basicData} />);

      // Values should be visible to users - using getAllByText since values may appear in scale too
      expect(screen.getAllByText('10')).toHaveLength(1);
      expect(screen.getAllByText('20')).toHaveLength(1);
      expect(screen.getAllByText('30')).toHaveLength(2); // Appears in value and scale
    });

    it('should render X-axis scale labels', () => {
      render(<HorizontalBarChart data={basicData} />);

      // X-axis should show scale from 0 to max
      expect(screen.getAllByText('0')[0]).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument(); // Half of max (30)
      expect(screen.getAllByText('30')).toHaveLength(2); // Max value appears in scale and value
    });
  });

  describe('Stacked Bar Functionality', () => {
    it('should display stacked values when showFailedStack is true', () => {
      render(<HorizontalBarChart data={stackedData} showFailedStack={true} />);

      // Should show success/failed counts
      expect(screen.getByText('80✓ 20✗')).toBeInTheDocument(); // Test 1: 100 - 20 = 80 success
      expect(screen.getByText('70✓ 10✗')).toBeInTheDocument(); // Test 2: 80 - 10 = 70 success
      expect(screen.getByText('30✓ 30✗')).toBeInTheDocument(); // Test 3: 60 - 30 = 30 success
    });

    it('should show explanation text for stacked bars', () => {
      render(<HorizontalBarChart data={stackedData} showFailedStack={true} />);

      expect(screen.getByText('Darker = success, lighter = failed')).toBeInTheDocument();
    });

    it('should display plain values when showFailedStack is false', () => {
      render(<HorizontalBarChart data={stackedData} showFailedStack={false} />);

      // Should show total values only (may appear in scale too)
      expect(screen.getAllByText('100')).toHaveLength(2); // Value and scale
      expect(screen.getByText('80')).toBeInTheDocument();
      expect(screen.getByText('60')).toBeInTheDocument();

      // Should not show success/failed breakdown
      expect(screen.queryByText('80✓ 20✗')).not.toBeInTheDocument();
    });
  });

  describe('Zero Value Handling', () => {
    it('should handle zero values correctly', () => {
      const dataWithZero = [
        { label: 'Zero Item', value: 0 },
        { label: 'Non-Zero Item', value: 50 },
      ];

      render(<HorizontalBarChart data={dataWithZero} />);

      // Labels and values should still be visible
      expect(screen.getByText('Zero Item')).toBeInTheDocument();
      expect(screen.getAllByText('0')).toHaveLength(2); // Value and scale
      expect(screen.getByText('Non-Zero Item')).toBeInTheDocument();
      expect(screen.getAllByText('50')).toHaveLength(2); // Value and scale
    });

    it('should handle all zero values without errors', () => {
      const allZeroData = [
        { label: 'First', value: 0 },
        { label: 'Second', value: 0 },
        { label: 'Third', value: 0 },
      ];

      render(<HorizontalBarChart data={allZeroData} />);

      // All labels should be visible
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();

      // Scale should still render (0 to 1 as fallback max)
      expect(screen.getAllByText('0')).toHaveLength(4); // 3 values + 1 scale label
      expect(screen.getAllByText('1')).toHaveLength(2); // Fallback max at scale position 1 and 0.5 both round to 1
    });
  });

  describe('Edge Cases', () => {
    it('should handle single data point', () => {
      const singleData = [{ label: 'Only Item', value: 42 }];

      render(<HorizontalBarChart data={singleData} />);

      expect(screen.getByText('Only Item')).toBeInTheDocument();
      expect(screen.getAllByText('42')).toHaveLength(2); // Value and scale
    });

    it('should handle large datasets', () => {
      const largeData = Array.from({ length: 50 }, (_, i) => ({
        label: `Item ${i + 1}`,
        value: (i + 1) * 10,
      }));

      render(<HorizontalBarChart data={largeData} />);

      // Check first and last items are rendered
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getAllByText('10')[0]).toBeInTheDocument();
      expect(screen.getByText('Item 50')).toBeInTheDocument();
      expect(screen.getAllByText('500')).toHaveLength(2); // Value and scale
    });

    it('should handle negative values by treating them as zero', () => {
      const negativeData = [
        { label: 'Negative', value: -10 },
        { label: 'Positive', value: 20 },
      ];

      render(<HorizontalBarChart data={negativeData} />);

      // Negative values should be displayed but treated as 0 for bar width
      expect(screen.getByText('Negative')).toBeInTheDocument();
      expect(screen.getByText('-10')).toBeInTheDocument();
      expect(screen.getByText('Positive')).toBeInTheDocument();
      expect(screen.getAllByText('20')).toHaveLength(2); // Value and scale
    });
  });

  describe('Alignment Options', () => {
    it('should support top alignment', () => {
      const { container } = render(<HorizontalBarChart data={basicData} align="top" />);

      // Just verify it renders without error
      expect(screen.getByText('Item A')).toBeInTheDocument();
    });

    it('should support bottom alignment', () => {
      const { container } = render(<HorizontalBarChart data={basicData} align="bottom" />);

      // Just verify it renders without error
      expect(screen.getByText('Item A')).toBeInTheDocument();
    });
  });
});
