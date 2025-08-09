import React from 'react';

interface VerticalBarChartProps {
  data: number[];
  height?: number;
  yAxisLabels?: string[];
  xAxisLabels?: string[];
  title?: string;
}

export function VerticalBarChart({ 
  data, 
  height = 10, 
  yAxisLabels,
  xAxisLabels,
  title 
}: VerticalBarChartProps) {
  const max = Math.max(...data, 1);
  
  // Calculate bar heights (0 to height scale)
  const barHeights = data.map(value => 
    Math.round((value / max) * height)
  );

  // Generate Y-axis labels if not provided
  const yLabels = yAxisLabels || [
    Math.round(max).toString(),
    Math.round(max / 2).toString(),
    '0'
  ];

  return (
    <div data-box="square" data-align="stretch end" className="widget chart-widget" data-pad="2 1">
      {title && <h3>{title}</h3>}
      <div className="chart-row">
        <div className="chart-row">
          <div className="chart-column" data-gap="1">
            {yLabels.map((label, i) => (
              <span key={i}>{label}</span>
            ))}
          </div>
          <div data-is="separator" data-direction="vertical" data-cap="default edge" />
        </div>
        <div className="chart-column" data-self="grow">
          <div className="chart-row bars" data-self="grow" data-gap="1" data-align="end start">
            {barHeights.map((barHeight, i) => (
              <div 
                key={i}
                className="line" 
                data-height={barHeight.toString()}
              />
            ))}
          </div>
          <div className="chart-row">
            <div data-is="separator" data-self="grow" data-cap="bisect default" />
          </div>
          {xAxisLabels && (
            <div className="chart-row" data-gap="1" data-pad="1 0 0 0">
              {xAxisLabels.map((label, i) => (
                <small key={i}>{label}</small>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}