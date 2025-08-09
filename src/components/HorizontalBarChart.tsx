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
  
  // Generate bars
  const bars = data.map(item => {
    if (max <= 0 || item.value <= 0) return { success: '', failed: '', empty: width };
    
    const ratio = Math.max(0, Math.min(1, item.value / max));
    const totalCols = Math.max(1, Math.round(ratio * width));
    
    if (showFailedStack && item.failed !== undefined) {
      const failedCols = Math.min(totalCols, Math.round((item.failed / item.value) * totalCols));
      const successCols = Math.max(0, totalCols - failedCols);
      const emptyCols = width - totalCols;
      return {
        success: '█'.repeat(successCols),
        failed: '░'.repeat(failedCols),
        empty: ' '.repeat(emptyCols)
      };
    }
    
    return {
      success: '█'.repeat(totalCols),
      failed: '',
      empty: ' '.repeat(width - totalCols)
    };
  });

  // Find longest label for padding
  const maxLabelLength = Math.max(...data.map(d => d.label.length));
  
  // Generate X-axis scale
  const xAxisLabels = [
    '0',
    Math.round(max / 2).toString(),
    Math.round(max).toString()
  ];
  
  return (
    <div data-box="square" className="widget chart-widget horizontal-chart" data-pad="2 1">
      {title && <h4>{title}</h4>}
      <div className="chart-container">
        {/* Y-axis labels (left side) */}
        <div className="chart-column y-axis-labels">
          {data.map((item, i) => (
            <div key={i} className="label-row">
              <span>{item.label.padEnd(maxLabelLength, ' ')}</span>
            </div>
          ))}
        </div>
        
        {/* Vertical separator */}
        <div data-is="separator" data-direction="vertical" data-cap="default edge" />
        
        {/* Chart area with box */}
        <div className="chart-column chart-area" data-self="grow">
          <div data-box="round" className="bars-container" data-pad="1">
            {bars.map((bar, i) => (
              <div key={i} className="bar-row">
                <pre className="bar">
                  {bar.success}{bar.failed}{bar.empty}
                </pre>
              </div>
            ))}
          </div>
          
          {/* X-axis */}
          <div className="x-axis">
            <div data-is="separator" data-self="grow" data-cap="bisect default" />
            <div className="x-axis-labels">
              <span>{xAxisLabels[0]}</span>
              <span>{xAxisLabels[1]}</span>
              <span>{xAxisLabels[2]}</span>
            </div>
          </div>
        </div>
        
        {/* Value labels (right side) */}
        <div className="chart-column value-labels">
          {data.map((item, i) => (
            <div key={i} className="value-row">
              {showFailedStack && item.failed !== undefined ? (
                <span>{item.value - item.failed}✔ {item.failed}✖</span>
              ) : (
                <span>{item.value}</span>
              )}
            </div>
          ))}
        </div>
      </div>
      {showFailedStack && (
        <small>Legend: █ success, ░ failed</small>
      )}
    </div>
  );
}