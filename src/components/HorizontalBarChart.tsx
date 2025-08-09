import React from 'react';

interface HorizontalBarChartProps {
  data: Array<{ label: string; value: number; failed?: number }>;
  width?: number;
  title?: string;
  showFailedStack?: boolean;
}

export function HorizontalBarChart({ 
  data, 
  width = 20,
  title,
  showFailedStack = false
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
    <div data-box="square" className="widget horizontal-chart" data-pad="2 1">
      {title && <h4>{title}</h4>}
      <div className="chart-row">
        {/* Y-axis labels */}
        <div className="chart-column" data-gap="1">
          {data.map((item, i) => (
            <span key={i}>{item.label}</span>
          ))}
        </div>
        
        {/* Vertical separator */}
        <div data-is="separator" data-direction="vertical" data-cap="default edge" />
        
        {/* Chart area */}
        <div className="chart-column" data-self="grow">
          {/* Bars container with box */}
          <div data-box="square" className="bars-container">
            {bars.map((bar, i) => (
              <div key={i} className="bar-row">
                {bar.success > 0 && (
                  <span 
                    className="bar-success" 
                    data-width={bar.success.toString()}
                  />
                )}
                {bar.failed > 0 && (
                  <span 
                    className="bar-failed" 
                    data-width={bar.failed.toString()}
                  />
                )}
              </div>
            ))}
          </div>
          
          {/* X-axis */}
          <div className="chart-row">
            <div data-is="separator" data-self="grow" data-cap="bisect default" />
          </div>
          <div className="chart-row x-labels" data-gap="1">
            {xLabels.map((label, i) => (
              <small key={i}>{label}</small>
            ))}
          </div>
        </div>
        
        {/* Values column */}
        <div className="chart-column value-labels" data-gap="1">
          {data.map((item, i) => (
            <small key={i}>
              {showFailedStack && item.failed !== undefined 
                ? `${item.value - item.failed}✓ ${item.failed}✗`
                : item.value}
            </small>
          ))}
        </div>
      </div>
      {showFailedStack && (
        <small>Darker = success, lighter = failed</small>
      )}
    </div>
  );
}