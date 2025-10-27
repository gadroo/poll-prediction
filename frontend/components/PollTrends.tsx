'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { getOptionHexColor } from '@/lib/colors';

type Series = { id: string; label: string; data: { x: any; y: number }[] };

type Metric = 'percent' | 'count';
type Range = 'all' | '1h' | '6h' | '1d' | '1w' | '1m';

interface PollTrendsProps {
  pollId: string;
  defaultMetric?: Metric;
  points?: number;
  // external control (optional)
  metric?: Metric;
  range?: Range;
  hideControls?: boolean;
}

export function PollTrends({ pollId, defaultMetric = 'percent', points = 120, metric: metricProp, range: rangeProp, hideControls = false }: PollTrendsProps) {
  const [series, setSeries] = useState<Series[]>([]);
  const [metric, setMetric] = useState<Metric>(defaultMetric);
  const [range, setRange] = useState<Range>('all');
  const { lastMessage } = useWebSocket(pollId);
  const [version, setVersion] = useState(0);
  const chartRef = useRef<HTMLDivElement | null>(null);

  const activeMetric: Metric = metricProp ?? metric;
  const activeRange: Range = rangeProp ?? range;

  const params = useMemo(() => {
    const search = new URLSearchParams({ points: String(points), metric: activeMetric });
    if (activeRange !== 'all') {
      const now = new Date();
      const day = 24 * 60 * 60 * 1000;
      const hour = 60 * 60 * 1000;
      const from = new Date(
        activeRange === '1h' ? now.getTime() - 1 * hour :
        activeRange === '6h' ? now.getTime() - 6 * hour :
        activeRange === '1d' ? now.getTime() - 1 * day :
        activeRange === '1w' ? now.getTime() - 7 * day :
        /* '1m' */ now.getTime() - 30 * day
      ).toISOString();
      search.set('from', from);
    }
    return search.toString();
  }, [points, activeMetric, activeRange, version]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await api.get(`/api/polls/${pollId}/timeseries?${params}`);
      const incoming: Series[] = res.data.series || [];
      const normalized: Series[] = incoming.map((s) => ({
        ...s,
        data: (s.data || [])
          .filter((p: any) => p && p.x)
          .map((p: any) => ({ x: new Date(p.x), y: Number(p.y) }))
      }));
      setSeries(normalized);
    };
    fetchData().catch(() => {});
  }, [pollId, params]);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'vote_update') {
      // debounce via version bump
      const id = setTimeout(() => setVersion((v) => v + 1), 500);
      return () => clearTimeout(id);
    }
  }, [lastMessage]);

  // Listen for theme changes to update chart colors
  const [themeVersion, setThemeVersion] = useState(0);
  useEffect(() => {
    const onThemeChange = () => setThemeVersion(v => v + 1);
    window.addEventListener('theme:changed', onThemeChange);
    return () => window.removeEventListener('theme:changed', onThemeChange);
  }, []);

  // Get computed colors from CSS variables (updates when theme changes)
  const getComputedColor = (variable: string) => {
    if (typeof window === 'undefined') return '#ffffff';
    const color = getComputedStyle(document.documentElement).getPropertyValue(variable);
    return color.trim() || '#ffffff';
  };

  const theme = useMemo(() => {
    const foreground = getComputedColor('--foreground');
    const border = getComputedColor('--border');
    const popover = getComputedColor('--popover');
    const popoverForeground = getComputedColor('--popover-foreground');
    const muted = getComputedColor('--muted');
    
    return {
      textColor: foreground,
      grid: { 
        line: { 
          stroke: border, 
          strokeWidth: 1,
          strokeDasharray: '0', 
          opacity: 0.1 
        } 
      },
      axis: {
        domain: {
          line: {
            stroke: border,
            strokeWidth: 0
          }
        },
        ticks: { 
          text: { 
            fill: foreground,
            fontSize: 11,
            fontWeight: 500
          },
          line: {
            stroke: 'transparent',
            strokeWidth: 0
          }
        },
        legend: { 
          text: { 
            fill: foreground,
            fontSize: 12,
            fontWeight: 600
          } 
        }
      },
      legends: { 
        text: { 
          fill: foreground,
          fontSize: 12
        } 
      },
      tooltip: { 
        container: { 
          background: popover, 
          color: popoverForeground, 
          border: `1px solid ${border}`,
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
        } 
      },
    };
  }, [themeVersion]);

  const rightAxis = null; // use left axis only for clarity

  const formatValue = (v: number) => activeMetric === 'percent' ? `${v.toFixed(1)}%` : `${Math.round(v).toLocaleString()}`;

  // Smart color assignment based on option names (green for yes, red for no)
  const chartColors = useMemo(() => {
    return series.map((s, index) => {
      return getOptionHexColor(s.id, index);
    });
  }, [series]);

  // Compute integer tick values for count metric to avoid duplicates (e.g., 0.2, 0.4 => 0)
  const { maxCountValue, countTickValues, countScaleMax } = useMemo(() => {
    const all = series.flatMap((s) => (s.data || []).map((d: any) => Number(d.y) || 0));
    const maxVal = all.length ? Math.max(...all) : 0;
    if (activeMetric === 'percent') {
      return { maxCountValue: 0, countTickValues: [] as number[], countScaleMax: 0 };
    }
    if (maxVal <= 3) {
      const ticks = Array.from({ length: Math.max(2, Math.floor(maxVal) + 1) }, (_, i) => i);
      return { maxCountValue: maxVal, countTickValues: ticks, countScaleMax: ticks[ticks.length - 1] };
    }
    const approxTicks = 5;
    const step = Math.max(1, Math.ceil(maxVal / approxTicks));
    const top = step * Math.ceil(maxVal / step);
    const ticks: number[] = [];
    for (let v = 0; v <= top; v += step) ticks.push(v);
    return { maxCountValue: maxVal, countTickValues: ticks, countScaleMax: top };
  }, [series, activeMetric]);

  const EndBadges = (props: any) => {
    const { series: sers, xScale, yScale, innerWidth } = props;
    return (
      <g>
        {sers.map((s: any, idx: number) => {
          const last = s.data[s.data.length - 1];
          if (!last) return null;
          const x = xScale(new Date(last.data.x));
          const y = yScale(last.data.y);
          const label = formatValue(last.data.y);
          const bgWidth = 44 + Math.max(0, label.length - 4) * 6;
          const bgHeight = 18;
          const rx = 8;
          const tx = Math.min(x + 8, innerWidth - bgWidth - 2);
          return (
            <g key={s.id + '-end'} transform={`translate(${tx}, ${y - bgHeight / 2})`}>
              <rect width={bgWidth} height={bgHeight} rx={rx} ry={rx} fill="hsl(var(--card))" stroke={s.color} strokeWidth={1.5} />
              <text x={8} y={12} fontSize={12} fill={s.color} style={{ fontWeight: 600 }}>{s.id} {label}</text>
            </g>
          );
        })}
      </g>
    );
  };

  const LastDots = (props: any) => {
    const { series: sers, xScale, yScale } = props;
    return (
      <g>
        {sers.map((s: any) => {
          const last = s.data[s.data.length - 1];
          if (!last) return null;
          const x = xScale(new Date(last.data.x));
          const y = yScale(last.data.y);
          return <circle key={s.id + '-dot'} cx={x} cy={y} r={4} fill={s.color} stroke="white" strokeWidth={1.5} />;
        })}
      </g>
    );
  };

  const exportSVG = () => {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector('svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg as any);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poll-${pollId}-trends.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPNG = async () => {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector('svg') as SVGSVGElement | null;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    const canvas = document.createElement('canvas');
    const rect = svg.getBoundingClientRect();
    canvas.width = Math.ceil(rect.width * 2);
    canvas.height = Math.ceil(rect.height * 2);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    img.onload = () => {
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `poll-${pollId}-trends.png`;
        a.click();
      });
    };
    img.src = url;
  };

  return (
    <div className="relative">
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="h-[500px]" ref={chartRef}>
          {series.every((s) => !s.data || s.data.length === 0) ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Not enough data yet</div>
          ) : (
          <ResponsiveLine
            data={series}
            theme={theme as any}
            margin={{ top: 20, right: 30, bottom: 50, left: 50 }}
            xScale={{ type: 'time', format: 'native', useUTC: true, precision: 'second' }}
            xFormat="time:%d %B"
            yScale={activeMetric === 'percent' ? { type: 'linear', min: 0, max: 100, stacked: false } : { type: 'linear', min: 0, max: countScaleMax || undefined, stacked: false }}
            axisLeft={{
              tickValues: activeMetric === 'percent' ? [0,20,40,60,80,100] : (countTickValues.length ? countTickValues : undefined),
              format: activeMetric === 'percent' ? (v) => `${v}%` : (v) => `${Number(v).toLocaleString()}`,
              tickSize: 0,
              tickPadding: 10
            }}
            axisRight={null}
            axisBottom={{ 
              tickPadding: 10, 
              tickRotation: 0,
              tickSize: 0,
              tickValues: (() => {
                const all = series.flatMap((s) => s.data);
                if (!all.length) return 8;
                
                const times = all.map((d) => new Date(d.x).getTime()).sort((a, b) => a - b);
                const min = times[0];
                const max = times[times.length - 1];
                const spanMs = max - min;
                
                const hour = 3600000;
                const day = 24 * hour;
                
                // Simple approach: return a number of ticks based on span
                // Let Nivo handle the actual tick placement
                if (spanMs <= 12 * hour) return 8;
                if (spanMs <= day) return 8;
                if (spanMs <= 3 * day) return 8;
                if (spanMs <= 7 * day) return 8;
                if (spanMs <= 30 * day) return 10;
                return 8;
              })(), 
              format: (v: Date) => {
                const all = series.flatMap((s) => s.data);
                const times = all.map((d) => +new Date(d.x));
                if (!times.length) return '';
                const min = Math.min(...times);
                const max = Math.max(...times);
                const spanMs = max - min;
                const hour = 3600000;
                const day = 24 * hour;
                const d = new Date(v);
                
                // Format based on time span for better readability
                if (spanMs <= 2 * day) {
                  // Show time for short spans
                  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
                } else if (spanMs <= 7 * day) {
                  // Show day for week view
                  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                } else if (spanMs <= 30 * day) {
                  // Show date for up to a month
                  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                } else {
                  // Show date with year for longer spans
                  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
                }
              } 
            }}
            enablePoints={false}
            useMesh={true}
            curve="monotoneX"
            enableSlices="x"
            lineWidth={2}
            colors={chartColors as any}
            legends={[{ 
              anchor: 'bottom-left', 
              direction: 'row', 
              translateY: -10,
              translateX: 0,
              itemWidth: 100, 
              itemHeight: 20, 
              symbolSize: 10, 
              symbolShape: 'circle',
              itemTextColor: theme.textColor,
              itemDirection: 'left-to-right',
              itemsSpacing: 10,
              effects: [
                {
                  on: 'hover',
                  style: {
                    itemOpacity: 1
                  }
                }
              ]
            }]}
            gridYValues={activeMetric === 'percent' ? [0, 20, 40, 60, 80, 100] : (countTickValues.length ? countTickValues : undefined)}
            enableGridX={false}
            enableArea={false}
            tooltip={({ point }) => {
              const date = new Date(point.data.x as any);
              const dateStr = date.toLocaleString(undefined, { 
                month: 'short', 
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              });
              return (
                <div style={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  boxShadow: '0 2px 8px rgb(0 0 0 / 0.15)',
                  fontSize: '12px'
                }}>
                  <div style={{ 
                    fontWeight: 600, 
                    marginBottom: '6px',
                    fontSize: '11px',
                    color: 'hsl(var(--muted-foreground))',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {dateStr}
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    fontSize: '13px'
                  }}>
                    <div 
                      style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%',
                        backgroundColor: point.seriesColor 
                      }} 
                    />
                    <span style={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}>
                      {point.seriesId}:
                    </span>
                    <span style={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginLeft: 'auto' }}>
                      {formatValue(point.data.y as number)}
                    </span>
                  </div>
                </div>
              );
            }}
            layers={[ 'grid', 'axes', 'areas', 'crosshair', 'lines', 'points', 'slices', 'mesh', 'legends' ]}
          />
          )}
        </div>

        {/* Time range controls at bottom */}
        {!hideControls && (
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <div className="flex gap-1">
              <Button 
                variant={activeRange === '1d' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setRange('1d')}
                className="h-8 px-3 text-xs font-medium"
              >
                1D
              </Button>
              <Button 
                variant={activeRange === '1w' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setRange('1w')}
                className="h-8 px-3 text-xs font-medium"
              >
                1W
              </Button>
              <Button 
                variant={activeRange === '1m' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setRange('1m')}
                className="h-8 px-3 text-xs font-medium"
              >
                1M
              </Button>
              <Button 
                variant={activeRange === 'all' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setRange('all')}
                className="h-8 px-3 text-xs font-medium"
              >
                ALL
              </Button>
            </div>

            <div className="flex gap-1">
              <Button 
                variant={activeMetric === 'percent' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setMetric('percent')}
                className="h-8 px-3 text-xs font-medium"
              >
                Percent
              </Button>
              <Button 
                variant={activeMetric === 'count' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setMetric('count')}
                className="h-8 px-3 text-xs font-medium"
              >
                Votes
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


