import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.js';
import Login from './pages/Login.js';
import Board from './pages/Board.js';
import CompanyProfilePage from './pages/CompanyProfilePage.js';
import CalendarPage from './pages/CalendarPage.js';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  if (!user && !token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const loadMe = useAuthStore((s) => s.loadMe);
  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (token) void loadMe();
  }, [token, loadMe]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/board"
        element={
          <RequireAuth>
            <Board />
          </RequireAuth>
        }
      />
      <Route
        path="/empresa"
        element={
          <RequireAuth>
            <CompanyProfilePage />
          </RequireAuth>
        }
      />
      <Route
        path="/calendario"
        element={
          <RequireAuth>
            <CalendarPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/board" replace />} />
    </Routes>
  );
}
