'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bookmark, MessageSquare, Clock, Radio, Trash2, BookmarkMinus, Tag as TagIcon } from 'lucide-react';
import { formatDistanceToNow, isPast, formatDistanceToNowStrict } from 'date-fns';
import { CountdownTimer } from '@/components/CountdownTimer';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useState } from 'react';
import { getOptionTailwindBg } from '@/lib/colors';

interface PollOption {
  id: string;
  text: string;
  vote_count: number;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface PollCardProps {
  poll: {
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
    user_has_bookmarked?: boolean;
    tags?: Tag[];
  };
  context?: 'default' | 'bookmarks';
  onDelete?: () => void;
}

export function PollCard({ poll, context = 'default', onDelete }: PollCardProps) {
  const isExpired = poll.expires_at && isPast(new Date(poll.expires_at));
  const hasExpiration = !!poll.expires_at;
  const { user } = useAuthStore();
  const isOwner = !!user && !!poll.creator_id && poll.creator_id === user.id;

  // Local state for bookmark
  const [isBookmarked, setIsBookmarked] = useState(poll.user_has_bookmarked || false);
  const [bookmarkCount, setBookmarkCount] = useState(poll.bookmark_count);

  // Get all options with percentages (show all options, not just leading)
  const optionsWithPercentage = poll.options?.map(option => ({
    ...option,
    percentage: poll.total_votes > 0 
      ? Math.round((option.vote_count / poll.total_votes) * 100)
      : 0
  })) || [];

  // Get color for each option based on index or text
  const getOptionColor = (text: string, index: number) => {
    return getOptionTailwindBg(text, index);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this poll? This cannot be undone.')) return;
    try {
      await api.delete(`/api/polls/${poll.id}`);
      toast.success('Poll deleted');
      // Call the onDelete callback if provided
      if (onDelete) onDelete();
      // Also emit custom event for backward compatibility
      window.dispatchEvent(new CustomEvent('polls:refresh'));
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to delete poll');
    }
  };

  const handleRemoveBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.post(`/api/polls/${poll.id}/bookmark`);
      // Call the onDelete callback if provided (to refresh the list)
      if (onDelete) onDelete();
      // Also emit custom event
      window.dispatchEvent(new CustomEvent('bookmark:removed', { detail: { pollId: poll.id } }));
      toast.success('Removed from bookmarks');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to remove bookmark');
    }
  };

  const handleToggleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await api.post(`/api/polls/${poll.id}/bookmark`);
      const newIsBookmarked = response.data.user_has_bookmarked;
      const newCount = response.data.bookmark_count;
      
      setIsBookmarked(newIsBookmarked);
      setBookmarkCount(newCount);
      
      toast.success(newIsBookmarked ? 'Poll bookmarked' : 'Bookmark removed');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update bookmark');
    }
  };

  return (
    <Link href={`/polls/${poll.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full overflow-hidden">
        {/* Live Status Banner */}
        {hasExpiration && (
          <div className={`px-4 py-2 flex items-center justify-between text-sm font-medium ${
            isExpired 
              ? 'bg-muted text-muted-foreground' 
              : 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary'
          }`}>
            <div className="flex items-center gap-2">
              {isExpired ? (
                <>
                  <Clock className="h-4 w-4" />
                  <span>Poll Closed</span>
                </>
              ) : (
                <>
                  <Radio className="h-4 w-4 animate-pulse" />
                  <span>LIVE</span>
                </>
              )}
            </div>
            {!isExpired && poll.expires_at && (
              <span className="font-mono text-xs">
                <CountdownTimer targetDate={new Date(poll.expires_at)} />
              </span>
            )}
            {isExpired && (
              <span className="text-xs">Results declared</span>
            )}
          </div>
        )}
        
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-xl font-bold line-clamp-2">{poll.title}</CardTitle>
            {context === 'default' && isOwner && (
              <button
                aria-label="Delete poll"
                onClick={handleDelete}
                className="shrink-0 text-red-500 hover:text-red-600 transition-colors"
                title="Delete poll"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Visual Results - All Options with Progress Bars */}
          {optionsWithPercentage.length > 0 ? (
            <div className="space-y-3">
              {optionsWithPercentage.slice(0, 2).map((option, index) => (
                <div key={option.id} className="space-y-1.5">
                  <div className="text-sm text-muted-foreground line-clamp-1">
                    {option.text}
                  </div>
                  <div className="relative h-8 w-full bg-muted rounded-lg overflow-hidden">
                    {/* Colored Progress Bar */}
                    <div 
                      className={`absolute inset-y-0 left-0 transition-all duration-300 rounded-lg ${getOptionColor(option.text, index)}`}
                      style={{ width: `${option.percentage}%` }}
                    />
                    {/* Percentage Label */}
                    <div className="absolute inset-0 flex items-center justify-end px-3">
                      <span className="text-sm font-bold text-foreground">
                        {option.percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {optionsWithPercentage.length > 2 && (
                <div className="text-xs text-muted-foreground text-center pt-1">
                  +{optionsWithPercentage.length - 2} more option{optionsWithPercentage.length - 2 !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          ) : poll.total_votes === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              No votes yet
            </div>
          ) : null}

          {/* Tags */}
          {poll.tags && poll.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {poll.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="text-xs gap-1">
                  <TagIcon className="h-3 w-3" />
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Stats Row */}
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                {poll.total_votes} {poll.total_votes === 1 ? 'vote' : 'votes'}
              </span>
              <span className="text-xs">{formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}</span>
            </div>
            <button
              onClick={handleToggleBookmark}
              className={`flex items-center gap-1.5 transition-colors hover:text-primary ${
                isBookmarked ? 'text-primary' : 'text-muted-foreground'
              }`}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark poll'}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark poll'}
            >
              <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
              <span>{bookmarkCount}</span>
            </button>
          </div>
          
          <div className="text-xs text-muted-foreground">
            {poll.option_count} options
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

