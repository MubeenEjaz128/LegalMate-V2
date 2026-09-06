import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { authAPI, lawyerAPI } from '../services/api';
import { User, Mail, Phone, MapPin } from 'lucide-react';
import { getProfilePictureUrl } from '../utils/imageUtils';

const PublicProfilePage = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await lawyerAPI.getProfile(userId);
        setProfile(response.data.user || response.data);
      } catch (err) {
        console.error('Profile fetch error:', err);
        setError(err.response?.status === 404 ? 'Profile not found' : 'Error fetching profile');
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchProfile();
  }, [userId]);

  if (loading) return <div className="p-8 text-center">Loading profile...</div>;
  if (error) return <div className="p-8 text-center text-error-500">{error}</div>;
  if (!profile) return null;

  return (
    <div className="max-w-xl mx-auto p-8 bg-white rounded shadow mt-8">
      <div className="flex flex-col items-center mb-6">
        <img
          src={getProfilePictureUrl(profile.profilePicture, 'lawyer')}
          alt="Profile"
          className="w-24 h-24 rounded-full object-cover border mb-2"
        />
        <h2 className="text-2xl font-bold mb-1">{profile.name}</h2>
        {/* Contact info hidden for privacy */}
        {/* <div className="flex items-center gap-2 text-secondary-600">
          <Mail className="h-4 w-4" /> {profile.email}
        </div>
        <div className="flex items-center gap-2 text-secondary-600">
          <Phone className="h-4 w-4" /> {profile.phone}
        </div>
        <div className="flex items-center gap-2 text-secondary-600">
          <MapPin className="h-4 w-4" /> {profile.address}
        </div> */}
      </div>
      {profile.bio && <div className="mb-4"><strong>Bio:</strong> {profile.bio}</div>}
      {profile.specialization && <div><strong>Specialization:</strong> {profile.specialization}</div>}
      {profile.hourlyRate && <div><strong>Hourly Rate:</strong> PKR {profile.hourlyRate}</div>}
    </div>
  );
};

export default PublicProfilePage;
