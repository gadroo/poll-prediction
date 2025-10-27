'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Reply, Edit2, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '@/store/authStore';

interface Comment {
  id: string;
  poll_id: string;
  user_id?: string;
  content: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
  user_email?: string; // Deprecated - use username instead
  username?: string;
  reply_count: number;
}

interface CommentsSectionProps {
  pollId: string;
}

export function CommentsSection({ pollId }: CommentsSectionProps) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [replies, setReplies] = useState<{ [key: string]: Comment[] }>({});
  const [showReplies, setShowReplies] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchComments();
  }, [pollId]);

  const fetchComments = async () => {
    try {
      const response = await api.get(`/api/polls/${pollId}/comments`);
      setComments(response.data);
    } catch (error) {
      toast.error('Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReplies = async (commentId: string) => {
    try {
      const response = await api.get(`/api/polls/${pollId}/comments`, {
        params: { parent_id: commentId }
      });
      setReplies(prev => ({ ...prev, [commentId]: response.data }));
      setShowReplies(prev => ({ ...prev, [commentId]: true }));
    } catch (error) {
      toast.error('Failed to load replies');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      await api.post(`/api/polls/${pollId}/comments`, {
        content: newComment.trim()
      });
      setNewComment('');
      fetchComments();
      toast.success('Comment added');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to add comment');
    }
  };

  const handleAddReply = async (parentId: string) => {
    if (!replyContent.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    try {
      await api.post(`/api/polls/${pollId}/comments`, {
        content: replyContent.trim(),
        parent_id: parentId
      });
      setReplyContent('');
      setReplyingTo(null);
      fetchReplies(parentId);
      fetchComments(); // Update reply counts
      toast.success('Reply added');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to add reply');
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editContent.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      await api.put(`/api/polls/comments/${commentId}`, {
        content: editContent.trim()
      });
      setEditingId(null);
      setEditContent('');
      fetchComments();
      // Refresh replies if this was a reply
      Object.keys(replies).forEach(parentId => {
        fetchReplies(parentId);
      });
      toast.success('Comment updated');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    try {
      await api.delete(`/api/polls/comments/${commentId}`);
      fetchComments();
      // Refresh replies
      Object.keys(replies).forEach(parentId => {
        fetchReplies(parentId);
      });
      toast.success('Comment deleted');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to delete comment');
    }
  };

  const canEditDelete = (comment: Comment) => {
    if (!user && !comment.user_id) return true; // Anonymous user can edit their own
    if (user && comment.user_id === user.id) return true;
    return false;
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading comments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="h-5 w-5" />
        <h3 className="text-xl font-semibold">
          Comments ({comments.length})
        </h3>
      </div>

      {/* Add New Comment */}
      <div className="flex gap-2">
        <Input
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
          className="flex-1"
        />
        <Button onClick={handleAddComment} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id}>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {/* Comment Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-semibold text-sm">
                        {comment.username || 'Anonymous'}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {canEditDelete(comment) && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditContent(comment.content);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Comment Content */}
                  {editingId === comment.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleUpdateComment(comment.id)}
                      />
                      <Button size="sm" onClick={() => handleUpdateComment(comment.id)}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm">{comment.content}</p>
                  )}

                  {/* Comment Actions */}
                  <div className="flex items-center gap-4 text-xs">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      className="h-7 text-xs"
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      Reply
                    </Button>
                    {comment.reply_count > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (showReplies[comment.id]) {
                            setShowReplies(prev => ({ ...prev, [comment.id]: false }));
                          } else {
                            fetchReplies(comment.id);
                          }
                        }}
                        className="h-7 text-xs"
                      >
                        {showReplies[comment.id] ? 'Hide' : 'Show'} {comment.reply_count} {comment.reply_count === 1 ? 'reply' : 'replies'}
                      </Button>
                    )}
                  </div>

                  {/* Reply Input */}
                  {replyingTo === comment.id && (
                    <div className="flex gap-2 pl-8">
                      <Input
                        placeholder="Write a reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddReply(comment.id)}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={() => handleAddReply(comment.id)}>
                        <Send className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setReplyingTo(null)}>
                        Cancel
                      </Button>
                    </div>
                  )}

                  {/* Replies */}
                  {showReplies[comment.id] && replies[comment.id] && (
                    <div className="pl-8 space-y-3 border-l-2 border-muted">
                      {replies[comment.id].map((reply) => (
                        <div key={reply.id} className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="font-semibold text-sm">
                                {reply.username || 'Anonymous'}
                              </span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            {canEditDelete(reply) && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingId(reply.id);
                                    setEditContent(reply.content);
                                  }}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteComment(reply.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                          {editingId === reply.id ? (
                            <div className="flex gap-2">
                              <Input
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleUpdateComment(reply.id)}
                              />
                              <Button size="sm" onClick={() => handleUpdateComment(reply.id)}>
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <p className="text-sm">{reply.content}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

