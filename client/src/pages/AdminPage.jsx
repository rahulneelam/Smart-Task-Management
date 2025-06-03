import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { useAuth } from '@/contexts/AuthContext';
    import { useTasks } from '@/contexts/TaskContext';
    import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label.jsx';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
    import { UserPlus, Users, Eye, ShieldCheck, ShieldOff, Search, XCircle } from 'lucide-react';
    import { useToast } from '@/components/ui/use-toast';

    const AdminPage = () => {
      const { adminCreateUser, adminDeactivateUser, adminReactivateUser, getAllUsers, user: adminUser } = useAuth();
      const { getTasksByUserId } = useTasks(); 
      const { toast } = useToast();

      const [users, setUsers] = useState([]);
      const [selectedUserTasks, setSelectedUserTasks] = useState([]);
      const [viewingUser, setViewingUser] = useState(null);
      const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
      const [newUserUsername, setNewUserUsername] = useState('');
      const [newUserPassword, setNewUserPassword] = useState('');
      const [searchTerm, setSearchTerm] = useState('');

      useEffect(() => {
        if (adminUser?.role === 'admin') {
          setUsers(getAllUsers());
        }
      }, [adminUser, getAllUsers]);

      const handleCreateUser = (e) => {
        e.preventDefault();
        if (adminCreateUser(newUserUsername, newUserPassword)) {
          toast({ title: "User Created", description: `Account for ${newUserUsername} created successfully.` });
          setUsers(getAllUsers());
          setIsCreateUserModalOpen(false);
          setNewUserUsername('');
          setNewUserPassword('');
        } else {
          // Toast for failure is handled in AuthContext
        }
      };

      const handleToggleUserStatus = (userId, isActive) => {
        const targetUser = users.find(u => u.id === userId);
        if (!targetUser) return;

        if (isActive) {
          adminDeactivateUser(userId);
          toast({ title: "User Deactivated", description: `Account ${targetUser.username} deactivated.` });
        } else {
          adminReactivateUser(userId);
          toast({ title: "User Reactivated", description: `Account ${targetUser.username} reactivated.` });
        }
        setUsers(getAllUsers());
      };
      
      const handleViewUserTasks = (selectedUserId) => {
        const targetUser = users.find(u => u.id === selectedUserId);
        if (targetUser) {
          setViewingUser(targetUser);
          const tasksForUser = getTasksByUserId(selectedUserId); // Use TaskContext function
          setSelectedUserTasks(tasksForUser);
        }
      };

      const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));

      if (adminUser?.role !== 'admin') {
        return (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-white">
            <ShieldOff className="w-16 h-16 text-red-500 mb-4" />
            <h1 className="text-3xl font-bold">Access Denied</h1>
            <p className="text-lg text-gray-400">You do not have permission to view this page.</p>
          </div>
        );
      }

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <header className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-500">
              Admin Panel
            </h1>
            <Dialog open={isCreateUserModalOpen} onOpenChange={setIsCreateUserModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white">
                  <UserPlus className="mr-2 h-5 w-5" /> Create New User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-slate-800/80 backdrop-blur-md border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-emerald-400">Create New User Account</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="new-username" className="text-gray-300">Username</Label>
                    <Input
                      id="new-username"
                      value={newUserUsername}
                      onChange={(e) => setNewUserUsername(e.target.value)}
                      placeholder="Enter username"
                      required
                      className="bg-slate-700/50 border-slate-600 mt-1 text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-password" className="text-gray-300">Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      className="bg-slate-700/50 border-slate-600 mt-1 text-white placeholder-gray-400"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600">Create Account</Button>
                </form>
              </DialogContent>
            </Dialog>
          </header>

          <Card className="glassmorphism shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-white flex items-center"><Users className="mr-3 text-cyan-400"/>User Management</CardTitle>
              <CardDescription className="text-gray-300">View, create, and manage user accounts.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input 
                  placeholder="Search users by username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-cyan-500"
                />
              </div>
              {filteredUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700 hover:bg-slate-700/30">
                        <TableHead className="text-gray-300">Username</TableHead>
                        <TableHead className="text-gray-300">Role</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-right text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => (
                        <TableRow key={u.id} className="border-slate-700 hover:bg-slate-700/50">
                          <TableCell className="font-medium text-white">{u.username}</TableCell>
                          <TableCell className="text-gray-300">{u.role}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${u.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                              {u.isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewUserTasks(u.id)} className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300">
                              <Eye className="mr-1 h-4 w-4" /> View Tasks
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleToggleUserStatus(u.id, u.isActive)}
                              className={`${u.isActive ? 'border-red-500 text-red-400 hover:bg-red-500/10 hover:text-red-300' : 'border-green-500 text-green-400 hover:bg-green-500/10 hover:text-green-300'}`}
                            >
                              {u.isActive ? <ShieldOff className="mr-1 h-4 w-4" /> : <ShieldCheck className="mr-1 h-4 w-4" />}
                              {u.isActive ? 'Deactivate' : 'Reactivate'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">No users found or matching search.</p>
              )}
            </CardContent>
          </Card>

          {viewingUser && (
            <Card className="glassmorphism shadow-xl mt-8">
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="text-2xl font-semibold text-white">Tasks for <span className="text-cyan-400">{viewingUser.username}</span></CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setViewingUser(null)} className="text-gray-300 hover:text-white hover:bg-slate-700/50">
                  <XCircle className="h-6 w-6" />
                </Button>
              </CardHeader>
              <CardContent>
                {selectedUserTasks.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="text-gray-300">Task Name</TableHead>
                          <TableHead className="text-gray-300 hidden md:table-cell">Description</TableHead>
                          <TableHead className="text-gray-300">Category</TableHead>
                          <TableHead className="text-gray-300">Due Date</TableHead>
                          <TableHead className="text-gray-300">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedUserTasks.map(task => (
                          <TableRow key={task.id} className="border-slate-700">
                            <TableCell className="text-white font-medium">{task.name}</TableCell>
                            <TableCell className="text-gray-400 hidden md:table-cell max-w-xs truncate">{task.description || 'N/A'}</TableCell>
                            <TableCell className="text-gray-300">{task.category || 'N/A'}</TableCell>
                            <TableCell className="text-gray-300">{task.dueDate ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString() : 'N/A'}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${task.completed ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                {task.completed ? 'Completed' : 'Pending'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center text-gray-400 py-8">No tasks found for this user.</p>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="glassmorphism shadow-xl mt-8">
            <CardHeader>
                <CardTitle className="text-2xl font-semibold text-white">AI Chat (Placeholder)</CardTitle>
                <CardDescription className="text-gray-300">Future integration for AI-powered assistance.</CardDescription>
            </CardHeader>
            <CardContent className="h-60 flex flex-col items-center justify-center bg-white/5 rounded-b-lg">
                <img  alt="AI Chat Bot Icon" class="w-24 h-24 mb-4 opacity-50" src="https://images.unsplash.com/photo-1675023035272-3426884896f8" />
                <p className="text-gray-400 italic">AI Chat functionality will be available soon.</p>
            </CardContent>
          </Card>

        </motion.div>
      );
    };

    export default AdminPage;