import React from 'react';
    import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
    import { AuthProvider, useAuth } from '@/contexts/AuthContext';
    import { TaskProvider } from '@/contexts/TaskContext';
    import LoginPage from '@/pages/LoginPage';
    import SignupPage from '@/pages/SignupPage';
    import EnhancedDashboard from '@/pages/EnhancedDashboard';
    import AdminDashboard from '@/pages/AdminDashboard';
    import Layout from '@/components/Layout';
    import { Toaster } from '@/components/ui/toaster';

    function ProtectedRoute({ children, adminOnly = false }) {
      const { user } = useAuth();
      if (!user) {
        return <Navigate to="/login" replace />;
      }
      if (adminOnly && user.role !== 'ADMIN') {
        return <Navigate to="/dashboard" replace />; 
      }
      return children;
    }

    function App() {
      return (
        <AuthProvider>
          <TaskProvider>
            <Router>
              <Layout>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route 
                    path="/" 
                    element={
                      <ProtectedRoute>
                        <EnhancedDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute>
                        <EnhancedDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute adminOnly={true}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                   {/* Fallback route for non-authenticated users or unknown paths */}
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              </Layout>
            </Router>
            <Toaster />
          </TaskProvider>
        </AuthProvider>
      );
    }

    export default App;