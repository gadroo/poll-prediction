'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PollList } from '@/components/PollList';
import { CreatePollDialog } from '@/components/CreatePollDialog';
import { Button } from '@/components/ui/button';
import { Plus, FileQuestion } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function MyPollsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchMyPolls();

    // Listen for poll refresh events
    const handleRefresh = () => fetchMyPolls();
    window.addEventListener('polls:refresh', handleRefresh);
    
    return () => {
      window.removeEventListener('polls:refresh', handleRefresh);
    };
  }, [isAuthenticated, router]);

  const fetchMyPolls = async () => {
    try {
      const response = await api.get('/api/polls/mine');
      setPolls(response.data);
    } catch (error) {
      toast.error('Failed to load your polls');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePollDeleted = () => {
    fetchMyPolls();
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading your polls...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">My Polls</h1>
          <p className="text-muted-foreground mt-2">
            Manage and track your created polls
          </p>
        </div>
        <CreatePollDialog>
          <Button size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Create Poll
          </Button>
        </CreatePollDialog>
      </div>

      {polls.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <FileQuestion className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No polls yet</h2>
          <p className="text-muted-foreground max-w-md mb-6">
            Create your first poll to start gathering opinions and see real-time results.
          </p>
          <CreatePollDialog>
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Poll
            </Button>
          </CreatePollDialog>
        </div>
      ) : (
        <PollList polls={polls} onPollDeleted={handlePollDeleted} />
      )}
    </div>
  );
}

