import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';

const bookingApi = axios.create({ baseURL: BASE });

export const getSalonInfo = (slug) => bookingApi.get(`/booking/salon/${slug}`).then(r => r.data);
export const getServices = (slug) => bookingApi.get(`/booking/salon/${slug}/services`).then(r => r.data);
export const getStaff = (slug) => bookingApi.get(`/booking/salon/${slug}/staff`).then(r => r.data);
export const getAvailability = (slug, params) => bookingApi.get(`/booking/salon/${slug}/availability`, { params }).then(r => r.data);
export const createReservation = (slug, data) => bookingApi.post(`/booking/salon/${slug}/reserve`, data).then(r => r.data);
export const cancelReservation = (slug, token) => bookingApi.post(`/booking/salon/${slug}/cancel/${token}`).then(r => r.data);
export const confirmReservation = (token) => bookingApi.get(`/booking/confirm/${token}`).then(r => r.data);
