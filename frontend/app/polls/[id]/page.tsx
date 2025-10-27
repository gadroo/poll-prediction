'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VoteButton } from '@/components/VoteButton';
import { PollDashboardHeader } from '@/components/PollDashboardHeader';
import { CountdownTimer } from '@/components/CountdownTimer';
import { CommentsSection } from '@/components/CommentsSection';
import { ShareButton } from '@/components/ShareButton';
import { Bookmark, ArrowLeft, Trash2, Clock } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/store/authStore';
import { formatDistanceToNow, isPast, differenceInHours } from 'date-fns';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Option {
  id: string;
  text: string;
  vote_count: number;
}

interface Poll {
  id: string;
  title: string;
  description?: string;
  creator_id?: string;
  expires_at?: string;
  created_at: string;
  options: Option[];
  bookmark_count: number;
  total_votes: number;
  user_has_voted: boolean;
  user_has_bookmarked: boolean;
}

export default function PollDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pollId = params.id as string;
  const { user } = useAuthStore();
  
  const [poll, setPoll] = useState<Poll | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected, lastMessage } = useWebSocket(pollId);


  useEffect(() => {
    fetchPoll();
  }, [pollId]);

  useEffect(() => {
    if (lastMessage) {
      handleWebSocketMessage(lastMessage);
    }
  }, [lastMessage]);

  const fetchPoll = async () => {
    try {
      const response = await api.get(`/api/polls/${pollId}`);
      setPoll(response.data);
    } catch (error) {
      toast.error('Failed to load poll');
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWebSocketMessage = (message: any) => {
    if (!poll) return;

    if (message.type === 'vote_update') {
      setPoll((prev) => {
        if (!prev) return prev;
        const totalVotes = message.options.reduce((sum: number, opt: any) => sum + opt.vote_count, 0);
        return {
          ...prev,
          options: message.options,
          total_votes: totalVotes,
        };
      });
    } else if (message.type === 'bookmark_update') {
      setPoll((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          bookmark_count: message.bookmark_count,
        };
      });
    }
  };

  const handleVote = async (optionId: string) => {
    try {
      await api.post(`/api/polls/${pollId}/vote`, { option_id: optionId });
      toast.success('Vote submitted!');
      setPoll((prev) => prev ? { ...prev, user_has_voted: true } : prev);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to submit vote');
      throw error;
    }
  };

  const handleBookmark = async () => {
    try {
      const response = await api.post(`/api/polls/${pollId}/bookmark`);
      setPoll((prev) => prev ? {
        ...prev,
        bookmark_count: response.data.bookmark_count,
        user_has_bookmarked: response.data.user_has_bookmarked,
      } : prev);
      toast.success(response.data.user_has_bookmarked ? 'Poll bookmarked!' : 'Bookmark removed');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to toggle bookmark');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this poll?')) return;

    try {
      await api.delete(`/api/polls/${pollId}`);
      toast.success('Poll deleted');
      router.push('/');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete poll');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading poll...</p>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Poll not found</p>
      </div>
    );
  }

  const isExpired = !!(poll.expires_at && isPast(new Date(poll.expires_at)));
  const isOwner = user && poll.creator_id === user.id;
  
  const getTimeInfo = () => {
    if (!poll.expires_at) return null;
    
    if (isExpired) {
      return {
        text: 'Poll ended',
        subtext: `Closed ${formatDistanceToNow(new Date(poll.expires_at), { addSuffix: true })}`,
        variant: 'expired' as const,
        showCountdown: false,
      };
    }
    
    const expiryDate = new Date(poll.expires_at);
    const hoursRemaining = differenceInHours(expiryDate, new Date());
    
    if (hoursRemaining < 1) {
      return {
        text: 'Ending soon',
        subtext: '',
        variant: 'urgent' as const,
        showCountdown: true,
        expiryDate,
      };
    }
    
    return {
      text: 'Active poll',
      subtext: '',
      variant: 'active' as const,
      showCountdown: true,
      expiryDate,
    };
  };

  const timeInfo = getTimeInfo();

  // compute top-2 for header blocks and option highlights
  const sortedOptions = [...poll.options].sort((a, b) => b.vote_count - a.vote_count);
  const topOne = sortedOptions[0];
  const topTwo = sortedOptions[1];

  const getPercent = (count: number) => poll.total_votes > 0 ? Math.round((count / poll.total_votes) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <PollDashboardHeader poll={poll} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl">Vote</CardTitle>
            {isExpired && <Badge variant="secondary">Final Results</Badge>}
          </div>
          {poll.description && (
            <CardDescription className="mt-1 text-base">{poll.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <VoteButton
            options={poll.options}
            totalVotes={poll.total_votes}
            userHasVoted={poll.user_has_voted}
            onVote={handleVote}
            disabled={isExpired}
          />

          {/* Top-2 option blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topOne && (
              <div className="rounded-md border p-4 bg-card">
                <div className="text-sm text-muted-foreground">Leading</div>
                <div className="mt-1 font-semibold flex items-center gap-2">
                  <span>{topOne.text}</span>
                  <Badge variant="secondary" className="font-mono">{getPercent(topOne.vote_count)}%</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{topOne.vote_count.toLocaleString()} votes</div>
              </div>
            )}
            {topTwo && (
              <div className="rounded-md border p-4 bg-card">
                <div className="text-sm text-muted-foreground">Second</div>
                <div className="mt-1 font-semibold flex items-center gap-2">
                  <span>{topTwo.text}</span>
                  <Badge variant="secondary" className="font-mono">{getPercent(topTwo.vote_count)}%</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{topTwo.vote_count.toLocaleString()} votes</div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <Button
                variant={poll.user_has_bookmarked ? 'default' : 'outline'}
                onClick={handleBookmark}
                className="gap-2"
              >
                <Bookmark className={poll.user_has_bookmarked ? 'fill-current' : ''} />
                {poll.bookmark_count} {poll.bookmark_count === 1 ? 'Bookmark' : 'Bookmarks'}
              </Button>
              
              <ShareButton pollId={pollId} pollTitle={poll.title} />
            </div>

            {isOwner && (
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Poll
              </Button>
            )}
          </div>
        </CardContent>
      </Card>


      {/* Comments Section */}
      <Card>
        <CardContent className="pt-6">
          <CommentsSection pollId={pollId} />
        </CardContent>
      </Card>
    </div>
  );
}

