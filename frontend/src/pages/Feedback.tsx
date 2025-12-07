import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  StarIcon,
  ChatBubbleLeftRightIcon,
  FaceSmileIcon,
  FaceFrownIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { feedbackAPI } from '../services/api';
import type { Feedback } from '../types';

// Demo feedback
const demoFeedback: Feedback[] = [
  {
    id: '1',
    appointmentId: '1',
    rating: 5,
    comment: 'Excellent service! The team was professional and efficient. My car runs like new.',
    sentiment: 'POSITIVE',
    categories: JSON.stringify({ serviceQuality: 5, timeliness: 5, communication: 5 }),
    wouldRecommend: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '2',
    appointmentId: '2',
    rating: 4,
    comment: 'Good service overall. Wait time was a bit longer than expected.',
    sentiment: 'POSITIVE',
    categories: JSON.stringify({ serviceQuality: 4, timeliness: 3, communication: 4 }),
    wouldRecommend: true,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: '3',
    appointmentId: '3',
    rating: 2,
    comment: 'Disappointed with the repair. Had to bring the car back for the same issue.',
    sentiment: 'NEGATIVE',
    categories: JSON.stringify({ serviceQuality: 2, timeliness: 3, communication: 2 }),
    wouldRecommend: false,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: '4',
    appointmentId: '4',
    rating: 5,
    comment: 'The AI predictions were spot on! Caught an issue before it became a major problem.',
    sentiment: 'POSITIVE',
    categories: JSON.stringify({ serviceQuality: 5, timeliness: 5, communication: 5 }),
    wouldRecommend: true,
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
];

interface FeedbackStats {
  totalFeedback: number;
  averageRating: number;
  sentimentCounts: Record<string, number>;
  ratingDistribution: Array<{ rating: number; count: number }>;
  npsIndicator: { promoters: number; detractors: number; passive: number; score: number };
}

const demoStats: FeedbackStats = {
  totalFeedback: 89,
  averageRating: 4.6,
  sentimentCounts: { POSITIVE: 72, NEUTRAL: 12, NEGATIVE: 5 },
  ratingDistribution: [
    { rating: 5, count: 45 },
    { rating: 4, count: 27 },
    { rating: 3, count: 12 },
    { rating: 2, count: 3 },
    { rating: 1, count: 2 },
  ],
  npsIndicator: { promoters: 72, detractors: 5, passive: 12, score: 75 },
};

export default function Feedback() {
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const { data: feedbackList = demoFeedback, isLoading } = useQuery({
    queryKey: ['feedback'],
    queryFn: async () => {
      try {
        const response = await feedbackAPI.getAll();
        return response.data.data as Feedback[];
      } catch {
        return demoFeedback;
      }
    },
  });

  const { data: stats = demoStats } = useQuery<FeedbackStats>({
    queryKey: ['feedbackStats'],
    queryFn: async () => {
      try {
        const response = await feedbackAPI.getStats();
        return response.data.data as FeedbackStats;
      } catch {
        return demoStats;
      }
    },
  });

  const sentimentIcons: Record<string, { icon: React.ElementType; color: string }> = {
    POSITIVE: { icon: FaceSmileIcon, color: 'text-success-500' },
    NEUTRAL: { icon: ChatBubbleLeftRightIcon, color: 'text-warning-500' },
    NEGATIVE: { icon: FaceFrownIcon, color: 'text-danger-500' },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Customer Feedback</h1>
          <p className="text-secondary-400">Review and analyze customer satisfaction</p>
        </div>
        <button
          onClick={() => setShowSubmitModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <StarIcon className="w-5 h-5" />
          Submit Feedback
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <StarIconSolid className="w-6 h-6 text-warning-500" />
            <span className="text-secondary-400">Average Rating</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.averageRating}</p>
          <p className="text-sm text-secondary-500">out of 5 stars</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-primary-400" />
            <span className="text-secondary-400">Total Reviews</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalFeedback}</p>
          <p className="text-sm text-secondary-500">feedback submissions</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <FaceSmileIcon className="w-6 h-6 text-success-500" />
            <span className="text-secondary-400">Positive Sentiment</span>
          </div>
          <p className="text-3xl font-bold text-success-500">
            {Math.round((stats.sentimentCounts.POSITIVE / stats.totalFeedback) * 100)}%
          </p>
          <p className="text-sm text-secondary-500">{stats.sentimentCounts.POSITIVE} positive</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-secondary-400">NPS Score</span>
          </div>
          <p className="text-3xl font-bold text-primary-400">{stats.npsIndicator.score}</p>
          <p className="text-sm text-secondary-500">Net Promoter Score</p>
        </motion.div>
      </div>

      {/* Rating Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-4">Rating Distribution</h2>
        <div className="space-y-3">
          {stats.ratingDistribution.map((item: { rating: number; count: number }) => (
            <div key={item.rating} className="flex items-center gap-4">
              <div className="flex items-center gap-1 w-20">
                {[...Array(item.rating)].map((_, i) => (
                  <StarIconSolid key={i} className="w-4 h-4 text-warning-500" />
                ))}
              </div>
              <div className="flex-1 h-4 bg-secondary-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-warning-500 rounded-full"
                  style={{
                    width: `${(item.count / stats.totalFeedback) * 100}%`,
                  }}
                />
              </div>
              <span className="text-sm text-secondary-400 w-16 text-right">
                {item.count} ({Math.round((item.count / stats.totalFeedback) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Sentiment Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-4">Sentiment Analysis</h2>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(stats.sentimentCounts).map(([sentiment, count]) => {
            const { icon: Icon, color } = sentimentIcons[sentiment];
            return (
              <div key={sentiment} className="text-center p-4 rounded-lg bg-secondary-800/50">
                <Icon className={`w-8 h-8 ${color} mx-auto mb-2`} />
                <p className="text-2xl font-bold text-white">{count as number}</p>
                <p className="text-sm text-secondary-400 capitalize">{sentiment.toLowerCase()}</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Recent Feedback */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Recent Feedback</h2>
        <div className="space-y-4">
          {feedbackList.map((feedback, index) => {
            const { icon: SentimentIcon, color } = sentimentIcons[feedback.sentiment];
            return (
              <motion.div
                key={feedback.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {[...Array(5)].map((_, i) => (
                      <StarIconSolid
                        key={i}
                        className={`w-5 h-5 ${
                          i < feedback.rating ? 'text-warning-500' : 'text-secondary-600'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <SentimentIcon className={`w-5 h-5 ${color}`} />
                    <span className={`text-sm ${color} capitalize`}>
                      {feedback.sentiment.toLowerCase()}
                    </span>
                  </div>
                </div>
                {feedback.comment && (
                  <p className="text-white mb-4">"{feedback.comment}"</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary-500">
                    {new Date(feedback.createdAt).toLocaleDateString()}
                  </span>
                  {feedback.wouldRecommend !== null && (
                    <span className={feedback.wouldRecommend ? 'text-success-500' : 'text-danger-500'}>
                      {feedback.wouldRecommend ? '✓ Would recommend' : '✗ Would not recommend'}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Submit Feedback Modal */}
      {showSubmitModal && (
        <SubmitFeedbackModal onClose={() => setShowSubmitModal(false)} />
      )}
    </div>
  );
}

function SubmitFeedbackModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    appointmentId: '',
    rating: 5,
    comment: '',
    wouldRecommend: true,
  });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => feedbackAPI.submit(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      queryClient.invalidateQueries({ queryKey: ['feedbackStats'] });
      toast.success('Feedback submitted successfully');
      onClose();
    },
    onError: () => {
      toast.error('Failed to submit feedback');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-md p-6"
      >
        <h2 className="text-xl font-bold text-white mb-6">Submit Feedback</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Appointment ID</label>
            <input
              type="text"
              value={formData.appointmentId}
              onChange={(e) => setFormData({ ...formData, appointmentId: e.target.value })}
              className="input"
              placeholder="Enter appointment ID"
              required
            />
          </div>
          <div>
            <label className="label">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData({ ...formData, rating: star })}
                  className="p-1"
                >
                  <StarIconSolid
                    className={`w-8 h-8 ${
                      star <= formData.rating ? 'text-warning-500' : 'text-secondary-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Comment</label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              className="input min-h-[100px]"
              placeholder="Share your experience..."
            />
          </div>
          <div>
            <label className="label">Would you recommend us?</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.wouldRecommend}
                  onChange={() => setFormData({ ...formData, wouldRecommend: true })}
                  className="text-primary-600"
                />
                <span className="text-white">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!formData.wouldRecommend}
                  onChange={() => setFormData({ ...formData, wouldRecommend: false })}
                  className="text-primary-600"
                />
                <span className="text-white">No</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 btn-primary">
              {mutation.isPending ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
