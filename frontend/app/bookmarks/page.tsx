'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { PollList } from '@/components/PollList';
import { Bookmark } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

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
}

export default function BookmarksPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBookmarkedPolls();
  }, []);

  const fetchBookmarkedPolls = async () => {
    try {
      const response = await api.get('/api/polls/bookmarks');
      setPolls(response.data);
    } catch (error: any) {
      toast.error('Failed to load bookmarked polls');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading bookmarked polls...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Bookmark className="h-8 w-8 text-primary" />
        <h1 className="text-4xl font-bold">My Bookmarks</h1>
      </div>

      {polls.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <Bookmark className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No bookmarks yet</h2>
          <p className="text-muted-foreground max-w-md">
            Bookmark polls you want to revisit later by clicking the bookmark button on any poll.
          </p>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground mb-6">
            {polls.length} {polls.length === 1 ? 'poll' : 'polls'} bookmarked
          </p>
          <PollList polls={polls} context="bookmarks" />
        </>
      )}
    </div>
  );
}

