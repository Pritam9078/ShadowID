import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Reply, 
  Send, 
  User, 
  Clock,
  MoreVertical,
  Flag,
  Edit3,
  Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { backendAPI } from '../services/backendApi';

const ProposalComments = ({ proposalId }) => {
  const { address, isConnected } = useAccount();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (proposalId) {
      loadComments();
    }
  }, [proposalId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const commentsData = await backendAPI.getProposalComments(proposalId);
      setComments(commentsData);
    } catch (error) {
      console.error('Failed to load comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !isConnected) return;

    try {
      setPosting(true);
      await backendAPI.addProposalComment(proposalId, {
        author: address,
        content: newComment.trim()
      });
      
      setNewComment('');
      await loadComments();
      toast.success('Comment posted successfully');
    } catch (error) {
      console.error('Failed to post comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  const handleSubmitReply = async (parentId) => {
    if (!replyText.trim() || !isConnected) return;

    try {
      setPosting(true);
      await backendAPI.addProposalComment(proposalId, {
        author: address,
        content: replyText.trim(),
        parentId
      });
      
      setReplyText('');
      setReplyTo(null);
      await loadComments();
      toast.success('Reply posted successfully');
    } catch (error) {
      console.error('Failed to post reply:', error);
      toast.error('Failed to post reply');
    } finally {
      setPosting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const Comment = ({ comment, isReply = false }) => (
    <motion.div
      className={`${isReply ? 'ml-8 mt-3' : 'mb-6'} bg-white rounded-lg border border-gray-200 p-4`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-dao-100 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-dao-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-gray-900">
              {comment.user?.username || `${comment.author?.slice(0, 6)}...${comment.author?.slice(-4)}`}
            </span>
            <div className="flex items-center gap-1 text-gray-500 text-sm">
              <Clock className="w-3 h-3" />
              <span>{formatDate(comment.createdAt)}</span>
            </div>
          </div>

          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {comment.content}
          </p>

          {!isReply && (
            <div className="flex items-center gap-4 mt-3">
              <button
                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                className="text-dao-600 hover:text-dao-700 text-sm font-medium flex items-center gap-1"
              >
                <Reply className="w-3 h-3" />
                Reply
              </button>
              
              {comment.replies?.length > 0 && (
                <span className="text-gray-500 text-sm">
                  {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                </span>
              )}
            </div>
          )}
        </div>

        <button className="text-gray-400 hover:text-gray-600 p-1">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Reply Form */}
      <AnimatePresence>
        {replyTo === comment.id && (
          <motion.div
            className="mt-4 ml-11"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-dao-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-dao-600" />
              </div>
              <div className="flex-1">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dao-500 focus:border-dao-500 resize-none"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => {
                      setReplyTo(null);
                      setReplyText('');
                    }}
                    className="px-3 py-1 text-gray-600 hover:text-gray-800 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={!replyText.trim() || posting}
                    className="px-4 py-1 bg-dao-600 hover:bg-dao-700 disabled:bg-gray-300 text-white rounded text-sm flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    Reply
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4">
          {comment.replies.map((reply) => (
            <Comment key={reply.id} comment={reply} isReply={true} />
          ))}
        </div>
      )}
    </motion.div>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dao-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        Discussion ({comments.length})
      </h3>

      {/* New Comment Form */}
      {isConnected ? (
        <div className="mb-8">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-dao-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-dao-600" />
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts on this proposal..."
                rows={4}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dao-500 focus:border-dao-500 resize-none"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || posting}
                  className="px-6 py-2 bg-dao-600 hover:bg-dao-700 disabled:bg-gray-300 text-white rounded-lg flex items-center gap-2 font-medium"
                >
                  <Send className="w-4 h-4" />
                  {posting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600">Connect your wallet to join the discussion</p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <Comment key={comment.id} comment={comment} />
          ))
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No comments yet</h4>
            <p className="text-gray-600">Be the first to share your thoughts on this proposal.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProposalComments;
