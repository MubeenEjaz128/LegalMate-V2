import api from './api';

const feedbackAPI = {
  submit: (data) => api.post('/feedback/submit', data),
  getForLawyer: (lawyerId) => api.get(`/feedback/lawyer/${lawyerId}`),
  getByLawyer: (lawyerId) => api.get(`/feedback/lawyer/${lawyerId}`)
};

export default feedbackAPI;
