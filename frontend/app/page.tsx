'use client';

import { useEffect, useState, useMemo } from 'react';
import { PollList } from '@/components/PollList';
import { CreatePollDialog } from '@/components/CreatePollDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, SortAsc, Tag as TagIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
}

type FilterType = 'all' | 'active' | 'closed';
type SortType = 'newest' | 'oldest' | 'most_voted' | 'trending';

export default function Home() {
  const { isAuthenticated } = useAuthStore();
  const [polls, setPolls] = useState([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortType, setSortType] = useState<SortType>('newest');

  useEffect(() => {
    fetchPolls();
    fetchTags();
  }, [searchQuery, filterType, selectedTag, sortType]);

  const fetchPolls = async () => {
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (filterType !== 'all') params.status = filterType;
      if (selectedTag) params.tag = selectedTag;
      if (sortType) params.sort = sortType;

      const response = await api.get('/api/polls', { params });
      setPolls(response.data);
    } catch (error) {
      toast.error('Failed to load polls');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await api.get('/api/tags');
      setTags(response.data);
    } catch (error) {
      // Tags are optional, don't show error
    }
  };

  const getFilterLabel = () => {
    switch (filterType) {
      case 'active': return 'Active';
      case 'closed': return 'Closed';
      default: return 'All';
    }
  };

  const getSortLabel = () => {
    switch (sortType) {
      case 'newest': return 'Newest';
      case 'oldest': return 'Oldest';
      case 'most_voted': return 'Most Voted';
      case 'trending': return 'Trending';
      default: return 'Newest';
    }
  };

  const selectedTagObj = tags.find(t => t.slug === selectedTag);

  const hasActiveFilters = searchQuery || filterType !== 'all' || selectedTag;

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setSelectedTag(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading polls...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">All Polls</h1>
          <p className="text-muted-foreground mt-2">
            Vote on polls and see results update in real-time
          </p>
        </div>
        {isAuthenticated && (
          <CreatePollDialog onPollCreated={fetchPolls}>
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Create Poll
            </Button>
          </CreatePollDialog>
        )}
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search polls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                {getFilterLabel()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterType('all')}>
                All Polls
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('active')}>
                Active Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('closed')}>
                Closed Only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tag Filter */}
          {tags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <TagIcon className="h-4 w-4" />
                  {selectedTagObj ? selectedTagObj.name : 'Tags'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Tag</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedTag(null)}>
                  All Tags
                </DropdownMenuItem>
                {tags.map((tag) => (
                  <DropdownMenuItem 
                    key={tag.id} 
                    onClick={() => setSelectedTag(tag.slug)}
                  >
                    {tag.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <SortAsc className="h-4 w-4" />
                {getSortLabel()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sort By</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortType('newest')}>
                Newest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortType('oldest')}>
                Oldest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortType('most_voted')}>
                Most Voted
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortType('trending')}>
                Trending (24h)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: "{searchQuery}"
              <button
                onClick={() => setSearchQuery('')}
                className="ml-1 hover:text-foreground"
              >
                ×
              </button>
            </Badge>
          )}
          {filterType !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {getFilterLabel()}
              <button
                onClick={() => setFilterType('all')}
                className="ml-1 hover:text-foreground"
              >
                ×
              </button>
            </Badge>
          )}
          {selectedTag && selectedTagObj && (
            <Badge variant="secondary" className="gap-1">
              Tag: {selectedTagObj.name}
              <button
                onClick={() => setSelectedTag(null)}
                className="ml-1 hover:text-foreground"
              >
                ×
              </button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {polls.length} {polls.length === 1 ? 'poll' : 'polls'} found
      </div>

      {/* Poll List */}
      {polls.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No polls match your filters</p>
          {hasActiveFilters && (
            <Button variant="link" onClick={clearAllFilters}>
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <PollList polls={polls} />
      )}
    </div>
  );
}
