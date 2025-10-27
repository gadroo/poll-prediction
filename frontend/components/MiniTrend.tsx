'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { ResponsiveLine } from '@nivo/line';

interface Props { pollId: string }

export function MiniTrend({ pollId }: Props) {
  const [data, setData] = useState<{ id: string; data: { x: any; y: number }[] }[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await api.get(`/api/polls/${pollId}/timeseries?points=40&metric=percent`);
      const series = (res.data.series || []).map((s: any) => ({ id: s.id, data: (s.data || []).map((p: any) => ({ x: new Date(p.x), y: p.y })) }));
      setData(series);
    };
    load().catch(() => {});
  }, [pollId]);

  const theme = useMemo(() => ({
    textColor: 'transparent', grid: { line: { opacity: 0 } }, axis: { ticks: { text: { fill: 'transparent' } } }
  }), []);

  if (!data.length) return null;

  return (
    <ResponsiveLine
      data={data}
      theme={theme as any}
      margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
      xScale={{ type: 'time', format: 'native', useUTC: true }}
      yScale={{ type: 'linear', min: 0, max: 100, stacked: false }}
      axisLeft={null}
      axisBottom={null}
      enableGridX={false}
      enableGridY={false}
      curve="monotoneX"
      enablePoints={false}
      enableSlices={false}
      lineWidth={2}
      colors={{ scheme: 'category10' }}
    />
  );
}



