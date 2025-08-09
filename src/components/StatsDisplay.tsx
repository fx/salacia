import React, { useEffect, useState, useMemo } from 'react';
import { useStatsSSE } from '../hooks/useStatsSSE.js';
import { VerticalBarChart } from './VerticalBarChart.js';
import { HorizontalBarChart } from './HorizontalBarChart.js';
import type { MessageStats } from '../lib/types/messages.js';

/**
 * Statistics for time series data display.
 */
interface TimeSeriesData {
  day: string;
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
  /** Initial time series data for the last 14 days */
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
  const {
    connectionState,
    isConnected,
    statsData,
    lastUpdate,
    isInitialDataReceived,
    error: sseError,
  } = useStatsSSE();

  // Local state for stats data - use SSE data when available, fallback to initial data
  const [overall, setOverall] = useState<MessageStats | null>(initialOverall);
  const [series, setSeries] = useState<TimeSeriesData[]>(initialSeries);
  const [topModels, setTopModels] = useState<ModelStats[]>(initialTopModels);
  const [error, setError] = useState<string | null>(initialError);

  // Update local state when SSE data is received
  useEffect(() => {
    if (statsData && statsData.overall) {
      setOverall(statsData.overall);
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
  const dayTotals = series.map(r => r.total);
  const dayAvgRt = series.map(r => r.avg_rt);

  const dayLabels = series.map(r => {
    const date = new Date(r.day);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });

  const dailyBars = series.map(r => ({
    label: r.day.substring(5), // MM-DD format
    value: r.total,
    failed: r.failed,
  }));

  const modelBars = topModels.map(m => ({
    label: m.model.length > 20 ? `${m.model.substring(0, 20)}...` : m.model,
    value: m.count,
  }));

  const modelCounts = topModels.map(m => m.count);
  const modelLabels = topModels.map(m =>
    m.model.length > 10 ? `${m.model.substring(0, 10)}...` : m.model
  );

  // Enhanced overall stats that includes SSE connection status
  const enhancedOverall = useMemo(() => {
    if (!overall) return null;

    // Add SSE connection status and last update time to display
    return {
      ...overall,
      sseConnected: isConnected,
      sseConnectionState: connectionState,
      lastUpdate: lastUpdate?.toISOString(),
      isInitialDataReceived,
    };
  }, [overall, isConnected, connectionState, lastUpdate, isInitialDataReceived]);

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
        <h2>STATS OVERVIEW</h2>
        {connectionState === 'connecting' && (
          <p>
            <span is-="badge" variant-="yellow">
              CONNECTING TO REALTIME...
            </span>
          </p>
        )}
        {connectionState === 'reconnecting' && (
          <p>
            <span is-="badge" variant-="yellow">
              RECONNECTING...
            </span>
          </p>
        )}
        {enhancedOverall ? (
          <p>
            <span is-="badge" variant-="surface0">
              TOTAL
            </span>
            <span is-="badge" variant-="green">
              {enhancedOverall.totalMessages}
            </span>
            <span is-="badge" variant-="surface0">
              SUCCESS
            </span>
            <span is-="badge" variant-="teal">
              {enhancedOverall.successfulMessages}
            </span>
            <span is-="badge" variant-="surface0">
              FAILED
            </span>
            <span is-="badge" variant-="maroon">
              {enhancedOverall.failedMessages}
            </span>
            <span is-="badge" variant-="surface0">
              RATE
            </span>
            <span is-="badge" variant-="yellow">
              {enhancedOverall.successRate}%
            </span>
            <span is-="badge" variant-="surface0">
              AVG RT
            </span>
            <span is-="badge" variant-="blue">
              {enhancedOverall.averageResponseTime}ms
            </span>
            <span is-="badge" variant-="surface0">
              TOKENS
            </span>
            <span is-="badge" variant-="peach">
              {enhancedOverall.totalTokens}
            </span>
            {enhancedOverall.mostUsedModel && (
              <>
                <span is-="badge" variant-="surface0">
                  TOP MODEL
                </span>
                <span is-="badge" variant-="foreground0">
                  {enhancedOverall.mostUsedModel}
                </span>
              </>
            )}
            <span is-="badge" variant-="surface0">
              MODELS
            </span>
            <span is-="badge" variant-="foreground1">
              {enhancedOverall.uniqueModels}
            </span>
            <span is-="badge" variant-="surface0">
              SSE
            </span>
            <span is-="badge" variant-={isConnected ? 'green' : 'red'}>
              {isConnected ? 'CONNECTED' : connectionState.toUpperCase()}
            </span>
            {lastUpdate && (
              <>
                <span is-="badge" variant-="surface0">
                  LAST UPDATE
                </span>
                <span is-="badge" variant-="teal">
                  {new Date(lastUpdate).toLocaleTimeString()}
                </span>
              </>
            )}
          </p>
        ) : (
          <p>Loading…</p>
        )}
      </div>

      <table width="100%">
        <tbody>
          <tr>
            <td>
              {dailyBars.length === 0 ? (
                <div box-="square">
                  <h3>LAST 14 DAYS</h3>
                  <p>No data available.</p>
                </div>
              ) : (
                <HorizontalBarChart data={dailyBars} width={30} title="LAST 14 DAYS" />
              )}
            </td>
            <td>
              {dailyBars.length === 0 ? (
                <div box-="square">
                  <h3>SUCCESS VS FAILED (STACKED)</h3>
                  <p>No data available.</p>
                </div>
              ) : (
                <HorizontalBarChart
                  data={dailyBars}
                  width={30}
                  title="SUCCESS VS FAILED (STACKED)"
                  showFailedStack={true}
                />
              )}
            </td>
          </tr>
          <tr>
            <td>
              {dayTotals.length === 0 ? (
                <div box-="square">
                  <h3>DAILY TOTALS</h3>
                  <p>No data available.</p>
                </div>
              ) : (
                <VerticalBarChart
                  data={dayTotals}
                  height={10}
                  xAxisLabels={dayLabels}
                  title="DAILY TOTALS"
                />
              )}
            </td>
            <td>
              {dayAvgRt.length === 0 ? (
                <div box-="square">
                  <h3>AVG RESPONSE TIME</h3>
                  <p>No data available.</p>
                </div>
              ) : (
                <VerticalBarChart
                  data={dayAvgRt}
                  height={10}
                  xAxisLabels={dayLabels}
                  yAxisLabels={[
                    `${Math.max(...dayAvgRt)}ms`,
                    `${Math.round(Math.max(...dayAvgRt) / 2)}ms`,
                    '0ms',
                  ]}
                  title="AVG RESPONSE TIME"
                />
              )}
            </td>
          </tr>
          <tr>
            <td>
              {modelCounts.length === 0 ? (
                <div box-="square">
                  <h3>TOP MODELS</h3>
                  <p>No model data.</p>
                </div>
              ) : (
                <VerticalBarChart
                  data={modelCounts}
                  height={8}
                  xAxisLabels={modelLabels}
                  title="TOP MODELS"
                />
              )}
            </td>
            <td>
              {modelBars.length === 0 ? (
                <div box-="square">
                  <h3>MODEL USAGE (HORIZONTAL)</h3>
                  <p>No model data.</p>
                </div>
              ) : (
                <HorizontalBarChart data={modelBars} width={25} title="MODEL USAGE (HORIZONTAL)" />
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
