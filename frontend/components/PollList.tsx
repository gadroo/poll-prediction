 'use client';

import { PollCard } from './PollCard';
import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface PollOption {
  id: string;
  text: string;
  vote_count: number;
}

interface Poll {
  id: string;
  title: string;
  description?: string;
  creator_id?: string;
  created_at: string;
  expires_at?: string;
  total_votes: number;
  bookmark_count: number;
  option_count: number;
  options?: PollOption[];
}

interface PollListProps {
  polls: Poll[];
  context?: 'default' | 'bookmarks';
  onPollDeleted?: () => void;
}

export function PollList({ polls, context = 'default', onPollDeleted }: PollListProps) {
  const [localPolls, setLocalPolls] = useState<Poll[]>(polls);
  const { lastMessage } = useWebSocket('all');

  useEffect(() => setLocalPolls(polls), [polls]);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'poll_deleted') {
      setLocalPolls((prev) => prev.filter((p) => p.id !== lastMessage.poll_id));
    }
  }, [lastMessage]);

  useEffect(() => {
    if (context !== 'bookmarks') return;
    const listener = (e: any) => {
      const id = e?.detail?.pollId as string | undefined;
      if (id) setLocalPolls((prev) => prev.filter((p) => p.id !== id));
    };
    window.addEventListener('bookmark:removed', listener as EventListener);
    return () => window.removeEventListener('bookmark:removed', listener as EventListener);
  }, [context]);

  if (localPolls.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No polls yet. Create the first one!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {localPolls.map((poll) => (
        <PollCard key={poll.id} poll={poll} context={context} onDelete={onPollDeleted} />
      ))}
    </div>
  );
}

