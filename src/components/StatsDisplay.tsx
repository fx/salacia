import React, { useEffect, useState } from 'react';
import { useStatsSSE } from '../hooks/useStatsSSE.js';
import { VerticalBarChart } from './VerticalBarChart.js';
import { StackedVerticalBarChart } from './StackedVerticalBarChart.js';
import { HorizontalBarChart } from './HorizontalBarChart.js';
import type { MessageStats } from '../lib/types/messages.js';

/**
 * Statistics for time series data display.
 */
interface TimeSeriesData {
  hour: string;
  total: number;
  failed: number;
  avg_rt: number;
  tokens: number;
}

/**
 * Model usage statistics.
 */
interface ModelStats {
  model: string;
  count: number;
}

/**
 * Props for the StatsDisplay component.
 */
interface StatsDisplayProps {
  /** Initial overall statistics data */
  initialOverall: MessageStats | null;
  /** Initial time series data for the last 24 hours (hourly) */
  initialSeries: TimeSeriesData[];
  /** Initial top models data */
  initialTopModels: ModelStats[];
  /** Initial error message if any */
  initialError: string | null;
}

/**
 * Reactive stats dashboard component that updates in realtime via SSE.
 *
 * This component displays AI interaction statistics including overall metrics,
 * time series charts, and model usage data. It automatically refreshes when
 * new messages are received through the realtime SSE connection.
 *
 * The component uses WebTUI design system exclusively for styling and follows
 * the established terminal-like aesthetic with proper box attributes and badges.
 */
export function StatsDisplay({
  initialOverall,
  initialSeries,
  initialTopModels,
  initialError,
}: StatsDisplayProps) {
  // Stats SSE connection
  const { statsData, error: sseError } = useStatsSSE();

  // Local state for stats data - use SSE data when available, fallback to initial data
  const [overall, setOverall] = useState<MessageStats | null>(initialOverall);
  const [series, setSeries] = useState<TimeSeriesData[]>(initialSeries);
  const [topModels, setTopModels] = useState<ModelStats[]>(initialTopModels);
  const [error, setError] = useState<string | null>(initialError);

  // Update local state when SSE data is received
  useEffect(() => {
    if (statsData && statsData.twentyFourHour) {
      // Use 24-hour stats for the stats page
      setOverall(statsData.twentyFourHour);
      setSeries(statsData.series);
      setTopModels(statsData.topModels);
      setError(null);
    }
  }, [statsData]);

  // Handle SSE errors
  useEffect(() => {
    if (sseError) {
      console.error('Stats SSE error:', sseError);
      setError(sseError instanceof Error ? sseError.message : 'SSE connection error');
    }
  }, [sseError]);

  // Prepare chart data
  const hourlyAvgRt = series.map(r => r.avg_rt);
  const hourLabels = series.map(r => r.hour); // Already in HH:MI format

  // Prepare success/failed data for stacked chart
  const hourlyMessages = series.map(r => ({
    total: r.total,
    failed: r.failed,
  }));

  const modelCounts = topModels.map(m => m.count);

  if (error) {
    return (
      <div box-="square" variant-="red" role="alert">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  return (
    <div>
      <div box-="square">
        <h2>STATS OVERVIEW (24 HOURS)</h2>
        {overall ? (
          <p>
            <span is-="badge" variant-="surface0">
              TOTAL
            </span>
            <span is-="badge" variant-="green">
              {overall.totalMessages}
            </span>
            <span is-="badge" variant-="surface0">
              SUCCESS
            </span>
            <span is-="badge" variant-="teal">
              {overall.successfulMessages}
            </span>
            <span is-="badge" variant-="surface0">
              FAILED
            </span>
            <span is-="badge" variant-="maroon">
              {overall.failedMessages}
            </span>
            <span is-="badge" variant-="surface0">
              RATE
            </span>
            <span is-="badge" variant-="yellow">
              {overall.successRate}%
            </span>
            <span is-="badge" variant-="surface0">
              AVG RT
            </span>
            <span is-="badge" variant-="blue">
              {overall.averageResponseTime}ms
            </span>
            <span is-="badge" variant-="surface0">
              TOKENS
            </span>
            <span is-="badge" variant-="peach">
              {overall.totalTokens}
            </span>
            {overall.mostUsedModel && (
              <>
                <span is-="badge" variant-="surface0">
                  TOP MODEL
                </span>
                <span is-="badge" variant-="foreground0">
                  {overall.mostUsedModel}
                </span>
              </>
            )}
            <span is-="badge" variant-="surface0">
              MODELS
            </span>
            <span is-="badge" variant-="foreground1">
              {overall.uniqueModels}
            </span>
          </p>
        ) : (
          <p>Loading…</p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Messages Chart - Success vs Failed */}
        <div style={{ width: '100%' }}>
          {hourlyMessages.length === 0 ? (
            <div box-="square">
              <h3>MESSAGES</h3>
              <p>No data available.</p>
            </div>
          ) : (
            <StackedVerticalBarChart
              data={hourlyMessages}
              height={10}
              xAxisLabels={hourLabels}
              title="MESSAGES"
            />
          )}
        </div>

        {/* Average Response Time Chart */}
        <div style={{ width: '100%' }}>
          {hourlyAvgRt.length === 0 ? (
            <div box-="square">
              <h3>AVG RESPONSE TIME</h3>
              <p>No data available.</p>
            </div>
          ) : (
            <VerticalBarChart
              data={hourlyAvgRt}
              height={10}
              xAxisLabels={hourLabels}
              yAxisLabels={[
                `${Math.max(...hourlyAvgRt)}ms`,
                `${Math.round(Math.max(...hourlyAvgRt) / 2)}ms`,
                '0ms',
              ]}
              title="AVG RESPONSE TIME"
            />
          )}
        </div>

        {/* Model Usage Chart */}
        <div style={{ width: '100%' }}>
          {modelCounts.length === 0 ? (
            <div box-="square">
              <h3>MODEL USAGE</h3>
              <p>No model data.</p>
            </div>
          ) : (
            <HorizontalBarChart
              data={topModels.map(m => ({
                label: m.model.length > 15 ? `${m.model.substring(0, 15)}...` : m.model,
                value: m.count
              }))}
              width={20}
              title="MODEL USAGE"
            />
          )}
        </div>
      </div>
    </div>
  );
}
