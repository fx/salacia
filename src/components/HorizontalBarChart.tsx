import React from 'react';

interface HorizontalBarChartProps {
  data: Array<{ label: string; value: number; failed?: number }>;
  width?: number;
  title?: string;
  showFailedStack?: boolean;
  align?: 'top' | 'bottom' | 'center';
}

export function HorizontalBarChart({ 
  data, 
  width = 20,
  title,
  showFailedStack = false,
  align = 'center'
}: HorizontalBarChartProps) {
  const max = Math.max(...data.map(d => d.value), 1);
  
  // Calculate bar widths (0 to width scale)
  const bars = data.map(item => {
    const ratio = item.value > 0 ? Math.max(0, Math.min(1, item.value / max)) : 0;
    const barWidth = Math.round(ratio * width);
    
    if (showFailedStack && item.failed !== undefined) {
      const failedWidth = Math.round((item.failed / item.value) * barWidth);
      const successWidth = barWidth - failedWidth;
      return { success: successWidth, failed: failedWidth, total: barWidth };
    }
    
    return { success: barWidth, failed: 0, total: barWidth };
  });
  
  // Generate X-axis labels
  const xLabels = [
    '0',
    Math.round(max / 2).toString(),
    Math.round(max).toString()
  ];
  
  return (
    <div className="widget horizontal-chart">
      {title && <h3>{title}</h3>}
      
      <div className="terminal-h-chart">
        {/* Left column: Y-axis labels */}
        <div className="h-y-axis-column">
          {data.map((item, i) => (
            <div key={i} className="h-y-label">
              {item.label}
            </div>
          ))}
          <div className="h-y-axis-bottom-spacer" />
        </div>
        
        {/* Middle column: Chart box with bars */}
        <div className="h-chart-content">
          <div box-="square" className="h-chart-box">
            {bars.map((bar, i) => (
              <div key={i} className="h-bar-row">
                {bar.success > 0 && (
                  <div 
                    className="h-bar-success" 
                    data-width={bar.success.toString()}
                  />
                )}
                {bar.failed > 0 && (
                  <div 
                    className="h-bar-failed" 
                    data-width={bar.failed.toString()}
                  />
                )}
              </div>
            ))}
          </div>
          
          {/* X-axis scale below the box */}
          <div className="h-x-axis-scale">
            <span>{xLabels[0]}</span>
            <span>{xLabels[1]}</span>
            <span>{xLabels[2]}</span>
          </div>
        </div>
        
        {/* Right column: Values */}
        <div className="h-value-column">
          {data.map((item, i) => (
            <div key={i} className="h-value-label">
              {showFailedStack && item.failed !== undefined 
                ? `${item.value - item.failed}✓ ${item.failed}✗`
                : item.value}
            </div>
          ))}
          <div className="h-value-bottom-spacer" />
        </div>
      </div>
      
      {showFailedStack && (
        <small>Darker = success, lighter = failed</small>
      )}
    </div>
  );
}