import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';
import AppointmentsPage from './pages/AppointmentsPage';
import AppointmentDetail from './pages/AppointmentDetail';
import NewAppointment from './pages/NewAppointment';
import ClientsPage from './pages/ClientsPage';
import ServicesPage from './pages/ServicesPage';
import StaffPage from './pages/StaffPage';
import BookingPage from './pages/BookingPage';
import CancelPage from './pages/CancelPage';
import ConfirmPage from './pages/ConfirmPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public booking portal */}
          <Route path="/book" element={<BookingPage />} />
          <Route path="/book/:slug" element={<BookingPage />} />
          <Route path="/book/cancel/:token" element={<CancelPage />} />
          <Route path="/book/confirm/:token" element={<ConfirmPage />} />

          {/* Internal app */}
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/appointments/new" element={<NewAppointment />} />
            <Route path="/appointments/:id" element={<AppointmentDetail />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/staff" element={<StaffPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
