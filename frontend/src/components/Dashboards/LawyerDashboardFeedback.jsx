import React, { useEffect, useState } from 'react';
import feedbackAPI from '../../services/feedbackAPI';
import { Star } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const LawyerDashboardFeedback = () => {
  const { user } = useAuthStore();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [average, setAverage] = useState(null);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        setLoading(true);
        const res = await feedbackAPI.getForLawyer(user._id);
        setFeedbacks(res.data || []);
        if (res.data && res.data.length > 0) {
          const avg = res.data.reduce((sum, f) => sum + (f.rating || 0), 0) / res.data.length;
          setAverage(avg.toFixed(2));
        } else {
          setAverage(null);
        }
      } catch (err) {
        setFeedbacks([]);
        setAverage(null);
      } finally {
        setLoading(false);
      }
    };
    if (user?._id) fetchFeedbacks();
  }, [user._id]);

  return (
    <div className="card mt-6">
      <h3 className="text-lg font-semibold mb-2">Client Feedback & Ratings</h3>
      {loading ? (
        <div className="text-secondary-500">Loading feedback...</div>
      ) : feedbacks.length === 0 ? (
        <div className="text-secondary-500">No feedback yet.</div>
      ) : (
        <>
          <div className="flex items-center mb-4">
            <span className="font-bold text-xl mr-2">{average}</span>
            {[1,2,3,4,5].map(i => (
              <Star key={i} className={`h-6 w-6 ${i <= Math.round(average) ? 'text-yellow-400 fill-yellow-400' : 'text-secondary-300'}`} />
            ))}
            <span className="ml-2 text-secondary-600">({feedbacks.length} review{feedbacks.length > 1 ? 's' : ''})</span>
          </div>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {feedbacks.map(fb => (
              <div key={fb._id} className="border rounded p-3 bg-secondary-50">
                <div className="flex items-center gap-2 mb-1">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`h-4 w-4 ${i <= fb.rating ? 'text-yellow-400 fill-yellow-400' : 'text-secondary-300'}`} />
                  ))}
                  <span className="text-xs text-secondary-500 ml-2">{new Date(fb.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="text-secondary-800 mb-1">{fb.comment || <span className="italic text-secondary-400">No comment</span>}</div>
                <div className="text-xs text-secondary-500">By: {fb.client?.name || 'Anonymous'}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LawyerDashboardFeedback;
