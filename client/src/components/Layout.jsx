import React from 'react';
    import { Link, useNavigate } from 'react-router-dom';
    import { motion } from 'framer-motion';
    import { Button } from '@/components/ui/button';
    import { useAuth } from '@/contexts/AuthContext';
    import { Home, LogIn, LogOut, UserPlus, LayoutDashboard, Shield } from 'lucide-react';

    const Layout = ({ children }) => {
      const { user, logout } = useAuth();
      const navigate = useNavigate();

      const handleLogout = () => {
        logout();
        navigate('/login');
      };

      return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-gray-100">
          <motion.nav 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 120 }}
            className="bg-white/10 backdrop-blur-md shadow-lg p-4 sticky top-0 z-50"
          >
            <div className="container mx-auto flex justify-between items-center">
              <Link to="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-500 hover:opacity-80 transition-opacity">
                SmartTask
              </Link>
              <div className="space-x-2">
                {user ? (
                  <>
                    {user.role === 'admin' && (
                       <Button variant="ghost" asChild className="text-cyan-400 hover:text-cyan-300">
                        <Link to="/admin"><Shield className="mr-2 h-4 w-4" /> Admin Panel</Link>
                      </Button>
                    )}
                    <Button variant="ghost" asChild>
                      <Link to="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</Link>
                    </Button>
                    <Button variant="ghost" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" /> Logout ({user.username})
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" asChild>
                      <Link to="/login"><LogIn className="mr-2 h-4 w-4" /> Login</Link>
                    </Button>
                    <Button variant="default" className="bg-primary hover:bg-primary/90" asChild>
                      <Link to="/signup"><UserPlus className="mr-2 h-4 w-4" /> Sign Up</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.nav>
          
          <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </main>

          <footer className="bg-white/5 backdrop-blur-sm text-center p-6 text-sm text-gray-400 border-t border-white/10">
            <p>&copy; {new Date().getFullYear()} SmartTask App. Built with Hostinger Horizons.</p>
            <p className="mt-1">All rights reserved. Manage your tasks smartly!</p>
          </footer>
        </div>
      );
    };

    export default Layout;