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
  
  // Generate bars with labels
  const lines = data.map(item => {
    if (max <= 0 || item.value <= 0) {
      return `${item.label.padEnd(maxLabelLength)} │ ${' '.repeat(width)} │ ${item.value}`;
    }
    
    const ratio = Math.max(0, Math.min(1, item.value / max));
    const totalCols = Math.max(1, Math.round(ratio * width));
    
    let bar: string;
    let suffix: string;
    
    if (showFailedStack && item.failed !== undefined) {
      const failedCols = Math.min(totalCols, Math.round((item.failed / item.value) * totalCols));
      const successCols = Math.max(0, totalCols - failedCols);
      const emptyCols = width - totalCols;
      bar = '█'.repeat(successCols) + '░'.repeat(failedCols) + ' '.repeat(emptyCols);
      suffix = `${item.value - item.failed}✔ ${item.failed}✖`;
    } else {
      bar = '█'.repeat(totalCols) + ' '.repeat(width - totalCols);
      suffix = item.value.toString();
    }
    
    return `${item.label.padEnd(maxLabelLength)} │ ${bar} │ ${suffix}`;
  });
  
  // Create axis line
  const axisLine = `${' '.repeat(maxLabelLength)} └${'─'.repeat(width + 2)}┘`;
  const scaleLabels = `${' '.repeat(maxLabelLength)}   0${' '.repeat(Math.floor(width/2) - 1)}${Math.round(max/2)}${' '.repeat(Math.floor(width/2) - 1)}${max}`;
  
  return (
    <div data-box="square">
      {title && <h3>{title}</h3>}
      <div data-box="square">
        <pre>{lines.join('\n')}</pre>
      </div>
      <pre>{axisLine}</pre>
      <small>{scaleLabels}</small>
      {showFailedStack && (
        <small>Legend: █ success, ░ failed</small>
      )}
    </div>
  );
}