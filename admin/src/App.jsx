import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SignIn from './pages/SignIn';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Plans from './pages/Plans';

function AdminShell({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/dashboard" element={<AdminShell><Dashboard page="overview" /></AdminShell>} />
        <Route path="/users"     element={<AdminShell><Dashboard page="users" /></AdminShell>} />
        <Route path="/users/:id" element={<AdminShell><Dashboard page="user-detail" /></AdminShell>} />
        <Route path="/plans"     element={<AdminShell><Dashboard page="plans" /></AdminShell>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
