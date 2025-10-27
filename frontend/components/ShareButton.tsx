'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Share2, Twitter, Facebook, Linkedin, Link, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ShareButtonProps {
  pollId: string;
  pollTitle: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ShareButton({ pollId, pollTitle, variant = 'outline', size = 'default' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const pollUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/polls/${pollId}`
    : '';

  const shareText = `Check out this poll: ${pollTitle}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(pollUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const shareOnTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pollUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  const shareOnFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pollUrl)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  const shareOnLinkedIn = () => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pollUrl)}`;
    window.open(linkedInUrl, '_blank', 'width=600,height=400');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: pollTitle,
          text: shareText,
          url: pollUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      // Fallback to copy
      copyToClipboard();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <Share2 className="h-4 w-4" />
          {size !== 'icon' && 'Share'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Share this poll</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={copyToClipboard} className="cursor-pointer gap-2">
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <span>Link copied!</span>
            </>
          ) : (
            <>
              <Link className="h-4 w-4" />
              <span>Copy link</span>
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={shareOnTwitter} className="cursor-pointer gap-2">
          <Twitter className="h-4 w-4" />
          <span>Share on Twitter</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={shareOnFacebook} className="cursor-pointer gap-2">
          <Facebook className="h-4 w-4" />
          <span>Share on Facebook</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={shareOnLinkedIn} className="cursor-pointer gap-2">
          <Linkedin className="h-4 w-4" />
          <span>Share on LinkedIn</span>
        </DropdownMenuItem>

        {typeof navigator !== 'undefined' && navigator.share && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={shareNative} className="cursor-pointer gap-2">
              <Share2 className="h-4 w-4" />
              <span>More options...</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

