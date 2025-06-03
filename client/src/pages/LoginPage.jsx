import React, { useState } from 'react';
    import { useNavigate, Link } from 'react-router-dom';
    import { motion } from 'framer-motion';
    import { useAuth } from '@/contexts/AuthContext';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label.jsx';
    import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
    import { LogIn, Mail, KeyRound, Chrome, AlertCircle } from 'lucide-react';
    import { useToast } from '@/components/ui/use-toast';
    import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog.jsx";


    const LoginPage = () => {
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const [loading, setLoading] = useState(false);
      const [showSuspendedAlert, setShowSuspendedAlert] = useState(false);
      const navigate = useNavigate();
      const { login, user } = useAuth();
      const { toast } = useToast();

      const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
          const loginResult = await login({ email, password });
          if (loginResult.success) {
            // Navigation will be handled by useEffect based on `user` state
          } else if (loginResult.message && loginResult.message.includes('deactivated')) {
            setShowSuspendedAlert(true);
          }
        } catch (error) {
          console.error('Login error:', error);
        } finally {
          setLoading(false);
        }
      };

      React.useEffect(() => {
        if (user) {
          if (user.role === 'ADMIN') {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        }
      }, [user, navigate]);
      
      const handleGoogleSignIn = () => {
        toast({
          title: "Coming Soon!",
          description: "Google Sign-In will be implemented in a future update.",
          variant: "default",
        });
      }

      return (
        <>
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            <Card className="w-full max-w-md glassmorphism shadow-2xl">
              <CardHeader className="text-center">
                <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                  <LogIn className="mx-auto h-12 w-12 text-primary mb-4" />
                  <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-500">Welcome Back!</CardTitle>
                  <CardDescription className="text-gray-300">Sign in to continue to SmartTask</CardDescription>
                </motion.div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-200 flex items-center"><Mail className="mr-2 h-4 w-4 text-primary" /> Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="you@example.com" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      className="bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-pink-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-200 flex items-center"><KeyRound className="mr-2 h-4 w-4 text-primary" /> Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                      className="bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-pink-500"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-3 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LogIn className="mr-2 h-5 w-5" /> 
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-400">Or sign in with</p>
                  <Button variant="outline" onClick={handleGoogleSignIn} className="w-full mt-2 bg-white/10 border-white/20 hover:bg-white/20 text-white">
                    <Chrome className="mr-2 h-5 w-5" /> Sign in with Google
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="justify-center">
                <p className="text-sm text-gray-400">
                  Don't have an account?{' '}
                  <Link to="/signup" className="font-medium text-primary hover:underline">
                    Sign up
                  </Link>
                </p>
              </CardFooter>
            </Card>
          </motion.div>
        </div>

        <AlertDialog open={showSuspendedAlert} onOpenChange={setShowSuspendedAlert}>
          <AlertDialogContent className="bg-slate-800/80 backdrop-blur-md border-slate-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center text-red-400">
                <AlertCircle className="mr-2 h-6 w-6" /> Account Suspended
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                Your account has been suspended by an administrator. Please contact support if you believe this is an error.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowSuspendedAlert(false)} className="bg-primary hover:bg-primary/80">OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </>
      );
    };

    export default LoginPage;