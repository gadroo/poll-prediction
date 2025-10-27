'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Check, TrendingUp } from 'lucide-react';

interface Option {
  id: string;
  text: string;
  vote_count: number;
}

interface VoteButtonProps {
  options: Option[];
  totalVotes: number;
  userHasVoted: boolean;
  onVote: (optionId: string) => Promise<void>;
  disabled?: boolean;
  showResults?: boolean;
}

export function VoteButton({ options, totalVotes, userHasVoted, onVote, disabled, showResults = false }: VoteButtonProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [viewResults, setViewResults] = useState(false);

  const handleVote = async (optionId: string) => {
    if (userHasVoted || isVoting || disabled) return;

    setSelectedOption(optionId);
    setIsVoting(true);

    try {
      await onVote(optionId);
    } catch (error) {
      setSelectedOption(null);
    } finally {
      setIsVoting(false);
    }
  };

  const getPercentage = (voteCount: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((voteCount / totalVotes) * 100);
  };

  // Find the leading option
  const maxVotes = Math.max(...options.map(opt => opt.vote_count));
  const shouldShowResults = userHasVoted || viewResults || showResults;

  // Get color for each option based on index or text
  const getOptionColor = (option: Option, index: number) => {
    const text = option.text.toLowerCase();
    
    // Check for yes/no or similar keywords
    if (text.includes('yes') || text.includes('agree') || text.includes('true')) {
      return 'green';
    }
    if (text.includes('no') || text.includes('disagree') || text.includes('false')) {
      return 'red';
    }
    
    // Otherwise alternate colors based on index
    const colors = ['red', 'green', 'blue', 'yellow', 'purple', 'orange'];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-3">
      {options.map((option, index) => {
        const percentage = getPercentage(option.vote_count);
        const isSelected = selectedOption === option.id;
        const isLeading = option.vote_count > 0 && option.vote_count === maxVotes && totalVotes > 0;
        const color = getOptionColor(option, index);

        // Color classes for backgrounds
        const colorClasses = {
          red: 'bg-red-500/20',
          green: 'bg-green-500/20',
          blue: 'bg-blue-500/20',
          yellow: 'bg-yellow-500/20',
          purple: 'bg-purple-500/20',
          orange: 'bg-orange-500/20'
        };

        const colorBorderClasses = {
          red: 'border-red-500/30',
          green: 'border-green-500/30',
          blue: 'border-blue-500/30',
          yellow: 'border-yellow-500/30',
          purple: 'border-purple-500/30',
          orange: 'border-orange-500/30'
        };

        return (
          <div key={option.id} className="relative">
            {shouldShowResults ? (
              // Results view - Colored style
              <div className={cn(
                "relative rounded-md border bg-card overflow-hidden",
                colorBorderClasses[color as keyof typeof colorBorderClasses]
              )}>
                <div className="relative z-10 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium flex items-center gap-2">
                      {option.text}
                      {isLeading && totalVotes > 0 && (
                        <TrendingUp className="h-4 w-4" />
                      )}
                    </span>
                    <span className="font-bold text-lg">{percentage}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {option.vote_count.toLocaleString()} {option.vote_count === 1 ? 'vote' : 'votes'}
                  </div>
                </div>
                <div
                  className={cn(
                    'absolute inset-0 transition-all duration-500 ease-out',
                    colorClasses[color as keyof typeof colorClasses]
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            ) : (
              // Voting view
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left h-auto py-3 px-4',
                  'hover:bg-primary/5 hover:border-primary/50 transition-all',
                  isVoting && isSelected && 'border-primary bg-primary/5'
                )}
                onClick={() => handleVote(option.id)}
                disabled={isVoting || disabled}
              >
                <span className="flex-1">{option.text}</span>
                {isVoting && isSelected && (
                  <Check className="h-4 w-4 text-primary animate-in fade-in" />
                )}
              </Button>
            )}
          </div>
        );
      })}
      
      {!userHasVoted && !disabled && !viewResults && totalVotes > 0 && (
        <button
          onClick={() => setViewResults(true)}
          className="text-sm text-primary hover:underline"
        >
          View results without voting
        </button>
      )}
      
      {viewResults && !userHasVoted && (
        <button
          onClick={() => setViewResults(false)}
          className="text-sm text-muted-foreground hover:text-primary hover:underline"
        >
          Back to voting
        </button>
      )}
    </div>
  );
}

