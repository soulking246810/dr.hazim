import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import ContentManagement from './pages/admin/ContentManagement';
import UserManagement from './pages/admin/UserManagement';
import PagesLibrary from './pages/PagesLibrary';
import PageView from './pages/PageView';
import QuranTracking from './pages/QuranTracking';
import MainLayout from './components/layout/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Placeholders for now
// const QuranTracking = () => <div className="p-6 bg-white rounded-2xl shadow-sm"><h1>متابعة الختمات (قريباً)</h1></div>;
// const PagesLibrary = () => <div className="p-6 bg-white rounded-2xl shadow-sm"><h1>المكتبة (قريباً)</h1></div>;

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/quran-tracking" element={<QuranTracking />} />
          <Route path="/pages/library" element={<PagesLibrary />} />
          <Route path="/pages/:id" element={<PageView />} />

          <Route path="/admin" element={
            <ProtectedRoute requireAdmin>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute requireAdmin>
              <UserManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/content" element={
            <ProtectedRoute requireAdmin>
              <ContentManagement />
            </ProtectedRoute>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default App;
