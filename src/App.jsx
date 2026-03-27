import { Routes, Route, Navigate } from 'react-router-dom';

import Landing from './pages/Landing';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import ForgotPassword from './pages/auth/ForgotPassword';
import OtpVerify from './pages/auth/OtpVerify';
import ConfirmPassword from './pages/auth/ConfirmPassword';
import Studio from './pages/Studio';
import Profile from './pages/Profile';
import Pricing from './pages/Pricing';
import CreateEvent from './pages/CreateEvent';
import EventDetail from './pages/EventDetail';
import Events from './pages/Events';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/otp" element={<OtpVerify />} />
      <Route path="/confirm-password" element={<ConfirmPassword />} />

      <Route path="/studio" element={<ProtectedRoute><Studio /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
      <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
      <Route path="/createevent" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
      <Route path="/events/:id" element={<ProtectedRoute><EventDetail /></ProtectedRoute>} />

      {/* Legacy redirect */}
      <Route path="/events/new" element={<ProtectedRoute><Navigate to="/pricing" replace /></ProtectedRoute>} />
    </Routes>
  );
}

