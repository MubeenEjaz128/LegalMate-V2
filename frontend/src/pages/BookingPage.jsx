import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { authAPI, lawyerAPI, appointmentAPI, balanceAPI } from '../services/api';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, DollarSign, Star, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';


const BookingPage = () => {
  const { lawyerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  // Stripe removed
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [consultationType, setConsultationType] = useState('video');
  const [notes, setNotes] = useState('');
  const [lawyer, setLawyer] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [lawyerLoading, setLawyerLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [pkrBalance, setPkrBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  // Fetch PKR balance
  useEffect(() => {
    let isMounted = true;
    const fetchBalance = async () => {
      try {
        const { data } = await balanceAPI.getBalance();
        if (isMounted) {
          setPkrBalance(data.balancePkr);
          setBalanceLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setPkrBalance(0);
          setBalanceLoading(false);
          toast.error('Failed to load account balance');
        }
      }
    };
    fetchBalance();
    return () => {
      isMounted = false;
    };
  }, [user._id]);

  // Fetch lawyer details
  useEffect(() => {
    const fetchLawyer = async () => {
      try {
        setLawyerLoading(true);
        const response = await lawyerAPI.getProfile(lawyerId);
        setLawyer(response.data);
      } catch (error) {
        toast.error('Failed to load lawyer details');
        setLawyer(null);
      } finally {
        setLawyerLoading(false);
      }
    };
    if (lawyerId) fetchLawyer();
  }, [lawyerId]);

  // Fetch availability for selected date
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!selectedDate) {
        setAvailability(null);
        return;
      }
      try {
        setAvailabilityLoading(true);
        const dateStr = selectedDate.toISOString().split('T')[0];
        const response = await lawyerAPI.getAvailability(lawyerId, dateStr);
        setAvailability(response.data);
      } catch (error) {
        toast.error('Failed to load availability');
        setAvailability(null);
      } finally {
        setAvailabilityLoading(false);
      }
    };
    if (selectedDate && lawyerId) fetchAvailability();
  }, [selectedDate, lawyerId]);

  // Handle booking with payment
  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      toast.error('Please select date and time');
      return;
    }
    if (balanceLoading || pkrBalance === null) {
      toast.error('Please wait while we load your PKR balance before booking.');
      return;
    }
    if (pkrBalance !== null && pkrBalance < (lawyer?.hourlyRate || 0)) {
      toast.error('Insufficient PKR balance to book this appointment');
      return;
    }


    const appointmentData = {
      lawyerId,
      date: selectedDate ? selectedDate.toISOString() : '',
      time: selectedTime,
      consultationType,
      description: notes,
    };

    console.log('Booking data to send:', appointmentData);

    try {
      setBookingLoading(true);

  // Stripe payment removed. Directly book appointment (simulate success)
  await appointmentAPI.book(appointmentData);
  toast.success('Appointment booked!');
  navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to process payment or book appointment. Please try again.');
      console.error(error);
    } finally {
      setBookingLoading(false);
    }
  };

  // Render star rating
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-secondary-300'}`}
          aria-label={i < rating ? 'Filled star' : 'Empty star'}
        />
      );
    }
    return stars;
  };

  // Loading state for lawyer details
  if (lawyerLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-secondary-300 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-secondary-300 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  // Lawyer not found
  if (!lawyer) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-secondary-900 mb-2">Lawyer not found</h2>
        <p className="text-secondary-600 mb-4">The lawyer you're looking for doesn't exist or may have been removed.</p>
        <Link to="/search" className="btn-primary">Find Another Lawyer</Link>
      </div>
    );
  }

  // Check if user is logged in (after all hooks)
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-secondary-900 mb-2">Please Log In</h2>
        <p className="text-secondary-600 mb-4">You need to be logged in to book a consultation.</p>
        <Link to="/login" className="btn-primary">Log In</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Lawyer Info */}
        <div className="lg:col-span-2">
          <div className="card mb-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                {lawyer.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold text-secondary-900">{lawyer.name}</h1>
                  {lawyer.isVerified && (
                    <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      Verified
                    </div>
                  )}
                </div>
                <p className="text-secondary-600 mb-2">{lawyer.specialization}</p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-secondary-600">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span>{lawyer.address}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {lawyer.currency || 'PKR'} {lawyer.hourlyRate}/hour
                    </span>
                  </div>
                  {lawyer.rating > 0 && (
                    <div className="flex items-center gap-1">
                      {renderStars(lawyer.rating)}
                      <span>({lawyer.reviewCount} reviews)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {lawyer.bio && (
              <div className="mt-4 pt-4 border-t border-secondary-200">
                <h3 className="font-semibold text-secondary-900 mb-2">About</h3>
                <p className="text-secondary-600">{lawyer.bio}</p>
              </div>
            )}
          </div>

          {/* PKR Balance */}
          <div className="card mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-primary-600 flex-shrink-0" />
                <div className="font-semibold text-secondary-900">Your PKR Balance:</div>
              </div>
              <div className="text-lg font-bold text-primary-600">
                {balanceLoading ? (
                  <div className="animate-pulse">Loading balance...</div>
                ) : (
                  `₨${pkrBalance?.toLocaleString()} PKR`
                )}
              </div>
              <div className="text-sm text-secondary-500">
                Booking will deduct from your PKR balance and hold payment until admin approval.
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <div className="card">
            <h2 className="text-xl font-semibold text-secondary-900 mb-6">Book Consultation</h2>
            <form onSubmit={handleBooking} className="space-y-6">
              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Select Date</label>
                <DatePicker
                  selected={selectedDate}
                  onChange={date => setSelectedDate(date)}
                  minDate={new Date()}
                  className="input-field"
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Select a date"
                  required
                  aria-label="Select consultation date"
                />
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Select Time</label>
                  {availabilityLoading ? (
                    <div className="animate-pulse">
                      <div className="h-10 bg-secondary-300 rounded"></div>
                    </div>
                  ) : availability?.timeSlots?.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {availability.timeSlots.map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setSelectedTime(time)}
                          className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                            selectedTime === time
                              ? 'border-primary-600 bg-primary-50 text-primary-700'
                              : 'border-secondary-300 hover:border-primary-300'
                          }`}
                          aria-pressed={selectedTime === time}
                          aria-label={`Select time slot ${time}`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-secondary-600">No available time slots for this date.</p>
                  )}
                </div>
              )}

              {/* Consultation Type */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Consultation Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center p-4 border border-secondary-300 rounded-lg cursor-pointer hover:border-primary-300">
                    <input
                      type="radio"
                      name="consultationType"
                      value="video"
                      checked={consultationType === 'video'}
                      onChange={(e) => setConsultationType(e.target.value)}
                      className="mr-3"
                      aria-label="Video call consultation"
                    />
                    <div>
                      <div className="font-medium">Video Call</div>
                      <div className="text-sm text-secondary-600">Secure video consultation</div>
                    </div>
                  </label>
                  <label className="flex items-center p-4 border border-secondary-300 rounded-lg cursor-pointer hover:border-primary-300">
                    <input
                      type="radio"
                      name="consultationType"
                      value="chat"
                      checked={consultationType === 'chat'}
                      onChange={(e) => setConsultationType(e.target.value)}
                      className="mr-3"
                      aria-label="Chat consultation"
                    />
                    <div>
                      <div className="font-medium">Chat</div>
                      <div className="text-sm text-secondary-600">Text-based consultation</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Payment Form removed - Stripe integration deleted */}
              <div className="text-secondary-500 text-sm mb-4">Payment will be handled by admin. No online payment required.</div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="input-field"
                  placeholder="Describe your legal issue or any specific questions..."
                  aria-label="Additional notes for consultation"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
              disabled={
                bookingLoading ||
                balanceLoading ||
                !selectedDate ||
                !selectedTime ||
                (pkrBalance !== null && pkrBalance < (lawyer?.hourlyRate || 0))
              }
                className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Book consultation"
              >
                {bookingLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  'Book and Pay'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Price Summary */}
          <div className="card">
            <h3 className="font-semibold text-secondary-900 mb-4">Consultation Fee</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-secondary-600">Hourly Rate</span>
                <span className="font-medium">
                  {lawyer.currency || 'PKR'} {lawyer.hourlyRate}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-600">Duration</span>
                <span className="font-medium">1 hour</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold text-primary-600">
                    {lawyer.currency || 'PKR'} {lawyer.hourlyRate}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* What's Included */}
          <div className="card">
            <h3 className="font-semibold text-secondary-900 mb-4">What's Included</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm text-secondary-600">Initial consultation</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm text-secondary-600">Legal advice</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm text-secondary-600">Document review</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm text-secondary-600">Next steps guidance</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
