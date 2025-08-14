import React from 'react';

interface VerticalBarChartProps {
  data: number[];
  height?: number;
  yAxisLabels?: string[];
  xAxisLabels?: string[];
  title?: string;
  align?: 'left' | 'right';
}

export function VerticalBarChart({
  data,
  height = 10,
  yAxisLabels,
  xAxisLabels,
  title,
  align = 'left',
}: VerticalBarChartProps) {
  const max = Math.max(...data, 1);

  // Calculate bar heights (0 to height scale)
  const barHeights = data.map(value => Math.round((value / max) * height));

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
              {barHeights.map((barHeight, i) => (
                <div key={`bar-${i}`} className="v-bar-column" style={{ height: '100%' }}>
                  <div
                    className="v-bar"
                    data-height={barHeight.toString()}
                    aria-label={`Value: ${data[i]}`}
                  />
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
