import React from 'react';

interface StackedVerticalBarChartProps {
  data: Array<{ total: number; failed: number }>;
  height?: number;
  yAxisLabels?: string[];
  xAxisLabels?: string[];
  title?: string;
  align?: 'left' | 'right';
}

export function StackedVerticalBarChart({
  data,
  height = 10,
  yAxisLabels,
  xAxisLabels,
  title,
  align = 'left',
}: StackedVerticalBarChartProps) {
  const totals = data.map(d => d.total);
  const max = Math.max(...totals, 1);

  // Calculate bar heights and failed portions (0 to height scale)
  const bars = data.map(item => {
    const totalHeight = Math.round((item.total / max) * height);
    const successCount = item.total - item.failed;
    const successHeight =
      item.total > 0 ? Math.round((successCount / item.total) * totalHeight) : 0;
    const failedHeight = totalHeight - successHeight;

    return { totalHeight, successHeight, failedHeight };
  });

  // Generate Y-axis labels if not provided (reversed for top-to-bottom)
  const yLabels = yAxisLabels || [Math.round(max).toString(), Math.round(max / 2).toString(), '0'];

  const alignClass = align === 'right' ? 'align-right' : 'align-left';

  return (
    <div className="widget chart-widget">
      {title && <h3>{title}</h3>}
      <div className={`terminal-v-chart ${alignClass}`}>
        {/* Left column: Y-axis labels aligned with grid lines */}
        <div className="v-y-axis-column">
          <div className="v-y-axis-labels">
            {yLabels.map((label, i) => (
              <div key={i} className="v-y-label">
                {label}
              </div>
            ))}
          </div>
          <div className="v-y-axis-bottom-spacer" />
        </div>

        {/* Right column: Box with bars and X-axis below */}
        <div className="v-chart-content">
          {/* The actual chart box with bars inside */}
          <div box-="square" className="v-chart-box">
            <div className="v-bars-container">
              {bars.map((bar, i) => (
                <div key={`bar-${i}`} className="v-bar-column" style={{ height: '100%' }}>
                  <div
                    className="v-bar-stacked"
                    data-height={bar.totalHeight.toString()}
                    aria-label={`Total: ${data[i].total}, Failed: ${data[i].failed}`}
                  >
                    {/* Success portion (bottom) */}
                    {bar.successHeight > 0 && (
                      <div
                        className="v-bar-success"
                        data-height={bar.successHeight.toString()}
                        style={{
                          height: `${(bar.successHeight / bar.totalHeight) * 100}%`,
                          background: 'var(--foreground1)',
                        }}
                      />
                    )}
                    {/* Failed portion (top) */}
                    {bar.failedHeight > 0 && (
                      <div
                        className="v-bar-failed"
                        data-height={bar.failedHeight.toString()}
                        style={{
                          height: `${(bar.failedHeight / bar.totalHeight) * 100}%`,
                          background: 'var(--background2)',
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* X-axis labels below the box */}
          {xAxisLabels && (
            <div className="v-x-axis-labels">
              {xAxisLabels.map((label, i) => (
                <div key={i} className="v-x-label">
                  {label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
