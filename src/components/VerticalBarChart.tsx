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

  // Generate Y-axis labels if not provided (reversed for top-to-bottom)
  const yLabels = yAxisLabels || [
    Math.round(max).toString(),
    Math.round(max / 2).toString(),
    '0'
  ];

  return (
    <div className="widget chart-widget">
      {title && <h3>{title}</h3>}
      <div className="terminal-chart">
        {/* Left column: Y-axis labels aligned with grid lines */}
        <div className="y-axis-column">
          <div className="y-axis-labels">
            {yLabels.map((label, i) => (
              <div key={i} className="y-label">{label}</div>
            ))}
          </div>
          <div className="y-axis-bottom-spacer" />
        </div>
        
        {/* Right column: Box with bars and X-axis below */}
        <div className="chart-content">
          {/* The actual chart box with bars inside */}
          <div box-="square" className="chart-box">
            <div className="bars-container">
              {barHeights.map((barHeight, i) => (
                <div 
                  key={i}
                  className="bar-column"
                >
                  <div 
                    className="bar" 
                    data-height={barHeight.toString()}
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* X-axis labels below the box */}
          {xAxisLabels && (
            <div className="x-axis-labels">
              {xAxisLabels.map((label, i) => (
                <div key={i} className="x-label">{label}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}