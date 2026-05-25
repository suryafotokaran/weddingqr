import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';

import SignIn from './pages/auth/SignIn';
// import SignUp from './pages/auth/SignUp';
import ForgotPassword from './pages/auth/ForgotPassword';
import OtpVerify from './pages/auth/OtpVerify';
import ConfirmPassword from './pages/auth/ConfirmPassword';
import Studio from './pages/Studio';
import Profile from './pages/Profile';
import CreateEvent from './pages/CreateEvent';
import EventDetail from './pages/EventDetail';
import EventLanding from './pages/EventLanding';
import Events from './pages/Events';
import GuestEventView from './pages/GuestEventView';
import QRUpload from './pages/QRUpload';
import GuestUpload from './pages/GuestUpload';
import QRView from './pages/QRView';
import WebsiteBuilder from './pages/website/WebsiteBuilder';
import PublicWebsite from './pages/website/PublicWebsite';
import ProtectedRoute from './components/ProtectedRoute';
import WebsiteCMS from './pages/WebsiteCMS';
import SubmitReview from './pages/SubmitReview';
import R2Storage from './pages/R2Storage';
import EventManagement from './pages/EventManagement';

import { PhotoProvider } from './photo/context/PhotoContext';
import PhotoHomePage from './photo/PhotoHomePage';
import FullGallery from './photo/pages/FullGallery';
import CategoriesPage from './photo/pages/CategoriesPage';
import CategoryPhotosPage from './photo/pages/CategoryPhotosPage';
import DynamicCategoryPage from './photo/pages/DynamicCategoryPage';
import ScrollToTop from './photo/components/ScrollToTop';
import FloatingButtons from './photo/components/FloatingButtons/FloatingButtons';

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin')
    || location.pathname === '/submit-review'
    || location.pathname.startsWith('/v/')
    || location.pathname.startsWith('/upload/')
    || location.pathname.startsWith('/qr/')
    || location.pathname.startsWith('/w/');

  return (
    <>
      <ScrollToTop />
      {!isAdminRoute && <FloatingButtons />}
      <Routes>
        {/* Photo public website — PhotoProvider only mounts on these routes */}
        <Route element={<PhotoProvider><Outlet /></PhotoProvider>}>
          <Route path="/" element={<PhotoHomePage />} />
          <Route path="/gallery" element={<FullGallery />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/category/:categoryId" element={<CategoryPhotosPage />} />
          <Route path="/portfolio/:portfolioId" element={<DynamicCategoryPage />} />
        </Route>

        {/* Auth */}
        <Route path="/signin" element={<SignIn />} />
        {/* <Route path="/signup" element={<SignUp />} /> */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/otp" element={<OtpVerify />} />
        <Route path="/confirm-password" element={<ConfirmPassword />} />

        {/* Admin — protected routes under /admin/ */}
        <Route path="/admin" element={<Navigate to="/admin/studio" replace />} />
        <Route path="/admin/studio" element={<ProtectedRoute><Studio /></ProtectedRoute>} />
        <Route path="/admin/website-cms" element={<Navigate to="/admin/website-cms/about" replace />} />
        <Route path="/admin/website-cms/:section" element={<ProtectedRoute><WebsiteCMS /></ProtectedRoute>} />
        <Route path="/admin/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/admin/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
        <Route path="/admin/createevent" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
        <Route path="/admin/events/:id" element={<ProtectedRoute><EventLanding /></ProtectedRoute>} />
        <Route path="/admin/events/:id/photos" element={<ProtectedRoute><EventDetail /></ProtectedRoute>} />
        <Route path="/admin/events/:id/qr-upload" element={<ProtectedRoute><QRUpload /></ProtectedRoute>} />
        <Route path="/admin/events/:id/website" element={<ProtectedRoute><WebsiteBuilder /></ProtectedRoute>} />
        <Route path="/admin/events/new" element={<ProtectedRoute><Navigate to="/admin/createevent" replace /></ProtectedRoute>} />
        <Route path="/admin/r2-storage" element={<ProtectedRoute><R2Storage /></ProtectedRoute>} />
        <Route path="/admin/management" element={<ProtectedRoute><EventManagement /></ProtectedRoute>} />

        {/* Public review submission */}
        <Route path="/submit-review" element={<SubmitReview />} />

        {/* Public guest routes */}
        <Route path="/w/:eventId" element={<PublicWebsite />} />
        <Route path="/upload/:id" element={<GuestUpload />} />
        <Route path="/v/:id" element={<GuestEventView />} />
        <Route path="/qr/:id" element={<QRView />} />

      </Routes>
    </>
  );
}

export default function App() {
  return <AppContent />;
}

