import React, { useState } from 'react';
    import { useNavigate, Link } from 'react-router-dom';
    import { motion } from 'framer-motion';
    import { useAuth } from '@/contexts/AuthContext';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label.jsx';
    import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
    import { UserPlus, Mail, KeyRound, UserCircle } from 'lucide-react';

    const SignupPage = () => {
      const [firstName, setFirstName] = useState('');
      const [lastName, setLastName] = useState('');
      const [username, setUsername] = useState('');
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const [loading, setLoading] = useState(false);
      const navigate = useNavigate();
      const { register } = useAuth();

      const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
          const result = await register({
            firstName,
            lastName,
            username,
            email,
            password,
          });
          
          if (result.success) {
            navigate('/dashboard');
          }
        } catch (error) {
          console.error('Registration error:', error);
        } finally {
          setLoading(false);
        }
      };

      return (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] py-12">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            <Card className="w-full max-w-md glassmorphism shadow-2xl">
              <CardHeader className="text-center">
                <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                  <UserPlus className="mx-auto h-12 w-12 text-primary mb-4" />
                  <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-500">Create an Account</CardTitle>
                  <CardDescription className="text-gray-300">Join SmartTask and boost your productivity!</CardDescription>
                </motion.div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-gray-200 flex items-center"><UserCircle className="mr-2 h-4 w-4 text-primary" /> First Name</Label>
                      <Input 
                        id="firstName" 
                        type="text" 
                        placeholder="John" 
                        value={firstName} 
                        onChange={(e) => setFirstName(e.target.value)} 
                        required 
                        className="bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-pink-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-gray-200 flex items-center"><UserCircle className="mr-2 h-4 w-4 text-primary" /> Last Name</Label>
                      <Input 
                        id="lastName" 
                        type="text" 
                        placeholder="Doe" 
                        value={lastName} 
                        onChange={(e) => setLastName(e.target.value)} 
                        required 
                        className="bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-pink-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-gray-200 flex items-center"><UserCircle className="mr-2 h-4 w-4 text-primary" /> Username</Label>
                    <Input 
                      id="username" 
                      type="text" 
                      placeholder="Choose a username" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      required 
                      className="bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-pink-500"
                    />
                  </div>
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
                      placeholder="Create a strong password" 
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
                    <UserPlus className="mr-2 h-5 w-5" /> 
                    {loading ? 'Creating Account...' : 'Sign Up'}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="justify-center">
                <p className="text-sm text-gray-400">
                  Already have an account?{' '}
                  <Link to="/login" className="font-medium text-primary hover:underline">
                    Log in
                  </Link>
                </p>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      );
    };

    export default SignupPage;