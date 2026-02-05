import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { MainLayout } from "./layouts/MainLayout";
import { Home } from "./pages/Home";
import { Profile } from "./pages/Profile";
import { Notifications } from "./pages/Notifications";
import { Explore } from "./pages/Explore";
import { ComingSoon } from "./pages/ComingSoon";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import Messages from "./pages/Messages";
import { Bookmarks } from "./pages/Bookmarks";
import { Admin } from "./pages/Admin";
import { PostProvider, usePosts } from "./context/PostContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Simple Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { authenticated } = useAuth();
  if (!authenticated) return <Navigate to="/login" replace />;
  return children;
};

// Admin Route Wrapper
const AdminRoute = ({ children }) => {
  const { authenticated } = useAuth();
  const { userProfile, loading } = usePosts();

  if (loading) return <div className="p-10 text-center font-bold">Yükleniyor...</div>;
  if (!authenticated) return <Navigate to="/login" replace />;
  if (userProfile?.handle !== 'tsocial') return <Navigate to="/" replace />;

  return children;
};

// Simple Guest Route Wrapper
const GuestRoute = ({ children }) => {
  const { authenticated } = useAuth();
  if (authenticated) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <PostProvider>
          <BrowserRouter>
            <Routes>
              {/* Public / Guest Routes */}
              <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

              {/* Partially Public Routes (Feed/Explore visible) */}
              <Route element={<MainLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/explore" element={<Explore />} />

                {/* Protected Routes */}
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                <Route path="/bookmarks" element={<ProtectedRoute><Bookmarks /></ProtectedRoute>} />
                <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                <Route path="*" element={<div className="p-10 text-center">Sayfa bulunamadı</div>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </PostProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
