import React from 'react';

interface HorizontalBarChartProps {
  data: Array<{ label: string; value: number; failed?: number }>;
  width?: number;
  title?: string;
  showFailedStack?: boolean;
}

export function HorizontalBarChart({ 
  data, 
  width = 30,
  title,
  showFailedStack = false
}: HorizontalBarChartProps) {
  const max = Math.max(...data.map(d => d.value), 1);
  
  // Find longest label for padding
  const maxLabelLength = Math.max(...data.map(d => d.label.length));
  
  return (
    <div data-box="square">
      {title && <h3>{title}</h3>}
      
      {/* Labels column | Bars box | Values column */}
      <div className="horizontal-bar-chart">
        {/* Y-axis labels */}
        <div className="chart-labels">
          {data.map((item, i) => (
            <div key={i}>
              <pre>{item.label.padEnd(maxLabelLength)}</pre>
            </div>
          ))}
        </div>
        
        {/* Bars container with box */}
        <div data-box="square" className="bars-box">
          {data.map((item, i) => {
            const ratio = item.value > 0 ? Math.max(0, Math.min(1, item.value / max)) : 0;
            const barWidth = Math.round(ratio * width);
            
            let barDisplay: string;
            if (showFailedStack && item.failed !== undefined) {
              const failedWidth = Math.round((item.failed / item.value) * barWidth);
              const successWidth = barWidth - failedWidth;
              // Use input range for visual bar representation
              barDisplay = `[${'='.repeat(successWidth)}${'-'.repeat(failedWidth)}${' '.repeat(width - barWidth)}]`;
            } else {
              barDisplay = `[${'='.repeat(barWidth)}${' '.repeat(width - barWidth)}]`;
            }
            
            return (
              <div key={i}>
                <pre>{barDisplay}</pre>
              </div>
            );
          })}
        </div>
        
        {/* Values column */}
        <div className="chart-values">
          {data.map((item, i) => (
            <div key={i}>
              <pre>
                {showFailedStack && item.failed !== undefined 
                  ? `${item.value - item.failed} ok, ${item.failed} fail`
                  : item.value.toString()}
              </pre>
            </div>
          ))}
        </div>
      </div>
      
      {/* X-axis scale */}
      <div className="chart-scale">
        <pre>{' '.repeat(maxLabelLength)} 0{' '.repeat(Math.floor(width/2) - 1)}{Math.round(max/2).toString().padStart(3)}{' '.repeat(Math.floor(width/2) - 2)}{max.toString().padStart(3)}</pre>
      </div>
      
      {showFailedStack && (
        <small>Legend: = success, - failed</small>
      )}
    </div>
  );
}