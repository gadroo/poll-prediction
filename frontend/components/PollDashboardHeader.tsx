'use client';

import { Clock, Flame, Heart, Radio, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CountdownTimer } from '@/components/CountdownTimer';
import { formatDistanceToNow, isPast } from 'date-fns';

type Option = { id: string; text: string; vote_count: number };

type Poll = {
  id: string;
  title: string;
  description?: string;
  creator_id?: string;
  created_at: string;
  expires_at?: string;
  options: Option[];
  bookmark_count: number;
  total_votes: number;
};

interface PollDashboardHeaderProps {
  poll: Poll;
}

export function PollDashboardHeader({ poll }: PollDashboardHeaderProps) {
  const isExpired = !!poll.expires_at && isPast(new Date(poll.expires_at));

  const sorted = [...(poll.options || [])].sort((a, b) => b.vote_count - a.vote_count);
  const top = sorted[0];
  const second = sorted[1];

  const total = Math.max(0, poll.total_votes || 0);
  const topPercent = top && total > 0 ? Math.round((top.vote_count / total) * 100) : 0;
  const lead = top && second ? top.vote_count - second.vote_count : 0;

  const statusChip = (() => {
    if (!poll.expires_at) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Radio className="h-4 w-4 text-primary" />
          <span>Open-ended</span>
        </div>
      );
    }
    if (isExpired) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Closed {formatDistanceToNow(new Date(poll.expires_at), { addSuffix: true })}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 text-sm text-primary">
        <Radio className="h-4 w-4 animate-pulse" />
        <span>LIVE</span>
        <span className="ml-2 font-mono">
          <CountdownTimer targetDate={new Date(poll.expires_at)} />
        </span>
      </div>
    );
  })();

  return (
    <div className="w-full">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold">{poll.title}</h1>
          </div>
          {poll.description && (
            <p className="mt-2 text-muted-foreground">{poll.description}</p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span>Predicted winner</span>
          </div>
          <div className="mt-1 font-semibold">
            {top ? (
              <div className="flex items-center gap-2">
                <span>{top.text}</span>
                <Badge variant="secondary" className="font-mono">{topPercent}%</Badge>
                {lead > 0 && (
                  <span className="text-xs text-muted-foreground">(+{lead.toLocaleString()} votes)</span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">Not enough data</span>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Flame className="h-4 w-4 text-primary" />
            <span>Total votes</span>
          </div>
          <div className="mt-1 font-semibold">{(poll.total_votes || 0).toLocaleString()}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Heart className="h-4 w-4" />
            <span>Bookmarks</span>
          </div>
          <div className="mt-1 font-semibold">{(poll.bookmark_count || 0).toLocaleString()}</div>
        </Card>

        <Card className="p-4">
          {statusChip}
        </Card>
      </div>
    </div>
  );
}


