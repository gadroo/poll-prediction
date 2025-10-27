'use client';

import { Button } from '@/components/ui/button';

type Metric = 'percent' | 'count';
type Range = 'all' | '1d' | '1w' | '1m';

interface PollDashboardControlsProps {
  metric: Metric;
  onMetricChange: (m: Metric) => void;
  range: Range;
  onRangeChange: (r: Range) => void;
}

export function PollDashboardControls({ metric, onMetricChange, range, onRangeChange }: PollDashboardControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-2">
        <Button variant={metric === 'percent' ? 'default' : 'outline'} size="sm" onClick={() => onMetricChange('percent')}>Percent</Button>
        <Button variant={metric === 'count' ? 'default' : 'outline'} size="sm" onClick={() => onMetricChange('count')}>Votes</Button>
      </div>
      <div className="ml-auto flex gap-2">
        <Button variant={range === '1d' ? 'default' : 'outline'} size="sm" onClick={() => onRangeChange('1d')}>1d</Button>
        <Button variant={range === '1w' ? 'default' : 'outline'} size="sm" onClick={() => onRangeChange('1w')}>1w</Button>
        <Button variant={range === '1m' ? 'default' : 'outline'} size="sm" onClick={() => onRangeChange('1m')}>1m</Button>
        <Button variant={range === 'all' ? 'default' : 'outline'} size="sm" onClick={() => onRangeChange('all')}>All</Button>
      </div>
    </div>
  );
}


