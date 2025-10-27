'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Clock, Tag } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { addHours, addDays, addMinutes } from 'date-fns';

interface CreatePollDialogProps {
  children: React.ReactNode;
  onPollCreated?: () => void;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

type DurationPreset = '1h' | '6h' | '1d' | '3d' | '7d' | 'custom' | null;

const DURATION_OPTIONS = [
  { value: '1h' as const, label: '1 hour' },
  { value: '6h' as const, label: '6 hours' },
  { value: '1d' as const, label: '1 day' },
  { value: '3d' as const, label: '3 days' },
  { value: '7d' as const, label: '7 days' },
  { value: 'custom' as const, label: 'Custom' },
];

export function CreatePollDialog({ children, onPollCreated }: CreatePollDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [duration, setDuration] = useState<DurationPreset>(null);
  const [customHours, setCustomHours] = useState('');
  const [customMinutes, setCustomMinutes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchTags();
    }
  }, [open]);

  const fetchTags = async () => {
    try {
      const response = await api.get('/api/tags');
      setAvailableTags(response.data);
    } catch (error) {
      // Tags are optional, don't show error
    }
  };

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(selectedTagIds.filter(id => id !== tagId));
    } else {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
  };

  const handleAddOption = () => {
    if (options.length >= 10) {
      toast.error('Maximum 10 options allowed');
      return;
    }
    setOptions([...options, '']);
  };

  const calculateExpiresAt = (preset: DurationPreset): Date | null => {
    if (!preset) return null;
    const now = new Date();
    
    if (preset === 'custom') {
      const hours = parseInt(customHours) || 0;
      const minutes = parseInt(customMinutes) || 0;
      
      if (hours === 0 && minutes === 0) {
        return null;
      }
      
      let result = now;
      if (hours > 0) result = addHours(result, hours);
      if (minutes > 0) result = addMinutes(result, minutes);
      return result;
    }
    
    switch (preset) {
      case '1h':
        return addHours(now, 1);
      case '6h':
        return addHours(now, 6);
      case '1d':
        return addDays(now, 1);
      case '3d':
        return addDays(now, 3);
      case '7d':
        return addDays(now, 7);
      default:
        return null;
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a poll title');
      return;
    }

    const validOptions = options.filter((opt) => opt.trim());
    if (validOptions.length < 2) {
      toast.error('Please provide at least 2 options');
      return;
    }

    // Validate custom duration if selected
    if (duration === 'custom') {
      const hours = parseInt(customHours) || 0;
      const minutes = parseInt(customMinutes) || 0;
      if (hours === 0 && minutes === 0) {
        toast.error('Please enter hours and/or minutes for custom duration');
        return;
      }
    }

    setIsLoading(true);

    try {
      const expiresAt = calculateExpiresAt(duration);
      
      const response = await api.post('/api/polls', {
        title: title.trim(),
        description: description.trim() || null,
        options: validOptions.map((text) => ({ text: text.trim() })),
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        tag_ids: selectedTagIds.length > 0 ? selectedTagIds : null,
      });

      toast.success('Poll created successfully!');
      setOpen(false);
      
      // Reset form
      setTitle('');
      setDescription('');
      setOptions(['', '']);
      setDuration(null);
      setCustomHours('');
      setCustomMinutes('');
      setSelectedTagIds([]);
      
      // Call callback if provided
      if (onPollCreated) {
        onPollCreated();
      }
      
      // Navigate to the new poll
      router.push(`/polls/${response.data.id}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create poll');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Poll</DialogTitle>
            <DialogDescription>
              Create a new poll and share it with others to gather opinions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="title" className="text-sm font-medium">
                Poll Question *
              </label>
              <Input
                id="title"
                placeholder="What's your favorite programming language?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description (optional)
              </label>
              <Input
                id="description"
                placeholder="Add more context..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Options * (Max 10)</label>
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    required
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveOption(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddOption}
                className="w-full"
                disabled={options.length >= 10}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option {options.length >= 10 && '(Max reached)'}
              </Button>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Poll Duration (Optional)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DURATION_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={duration === option.value ? 'default' : 'outline'}
                    onClick={() => setDuration(duration === option.value ? null : option.value)}
                    className="text-sm"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              
              {duration === 'custom' && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <label htmlFor="customHours" className="text-xs text-muted-foreground">
                      Hours
                    </label>
                    <Input
                      id="customHours"
                      type="number"
                      min="0"
                      max="720"
                      placeholder="0"
                      value={customHours}
                      onChange={(e) => setCustomHours(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="customMinutes" className="text-xs text-muted-foreground">
                      Minutes
                    </label>
                    <Input
                      id="customMinutes"
                      type="number"
                      min="0"
                      max="59"
                      placeholder="0"
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              {duration && duration !== 'custom' && (
                <p className="text-xs text-muted-foreground">
                  Poll will expire in {DURATION_OPTIONS.find(o => o.value === duration)?.label}
                </p>
              )}
              {duration === 'custom' && (parseInt(customHours) > 0 || parseInt(customMinutes) > 0) && (
                <p className="text-xs text-muted-foreground">
                  Poll will expire in {customHours || '0'} hours and {customMinutes || '0'} minutes
                </p>
              )}
              {!duration && (
                <p className="text-xs text-muted-foreground">
                  No expiration - poll will remain open indefinitely
                </p>
              )}
            </div>
            {availableTags.length > 0 && (
              <div className="grid gap-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags (Optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={selectedTagIds.includes(tag.id) ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-primary/90"
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
                {selectedTagIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedTagIds.length} tag{selectedTagIds.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Poll'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

