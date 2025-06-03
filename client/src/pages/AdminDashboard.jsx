import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  UserPlus, Users, Eye, ShieldCheck, ShieldOff, Search, XCircle, 
  BarChart3, Activity, Clock, CheckCircle, AlertTriangle, Trash2,
  Settings, FileText, TrendingUp, Calendar, User, Mail, Phone,
  BrainCircuit, Sparkles
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import apiService from '@/services/api';
import CriticalTasksReport from '@/components/admin/CriticalTasksReport';

const AdminDashboard = () => {
  const { user: adminUser } = useAuth();
  const { toast } = useToast();

  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [selectedUserTasks, setSelectedUserTasks] = useState([]);
  const [viewingUser, setViewingUser] = useState(null);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Form states
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    role: 'USER'
  });

  // Load data on component mount
  useEffect(() => {
    if (adminUser?.role === 'ADMIN') {
      loadDashboardData();
    }
  }, [adminUser]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [usersResponse, statsResponse] = await Promise.all([
        apiService.getAllUsers(),
        apiService.getAdminDashboardStats()
      ]);

      if (usersResponse.success) {
        setUsers(usersResponse.data.users || []);
      }

      if (statsResponse.success) {
        setDashboardStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await apiService.createUserByAdmin(newUser);
      if (response.success) {
        toast({
          title: "User Created",
          description: `Account for ${newUser.firstName} ${newUser.lastName} created successfully.`,
        });
        setIsCreateUserModalOpen(false);
        setNewUser({
          firstName: '',
          lastName: '',
          email: '',
          username: '',
          password: '',
          role: 'USER'
        });
        loadDashboardData();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to create user",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const handleToggleUserStatus = async (userId, isActive) => {
    try {
      const action = isActive ? 'deactivate' : 'activate';
      const response = await apiService.bulkUserAction(action, [userId]);

      if (response.success) {
        const user = users.find(u => u.id === userId);
        toast({
          title: `User ${action}d`,
          description: `${user?.firstName} ${user?.lastName} has been ${action}d successfully.`,
        });
        loadDashboardData();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await apiService.bulkUserAction('delete', [userId]);

      if (response.success) {
        const user = users.find(u => u.id === userId);
        toast({
          title: "User Deleted",
          description: `${user?.firstName} ${user?.lastName} has been deleted successfully.`,
        });
        loadDashboardData();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const handleViewUserTasks = async (userId) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      setViewingUser(user);
      
      // Get tasks for this user
      const response = await apiService.getUserTasks(userId);
      if (response.success) {
        setSelectedUserTasks(response.data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to load user tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load user tasks",
        variant: "destructive",
      });
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select users to perform bulk action",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to ${action} ${selectedUsers.length} user(s)?`)) {
      return;
    }

    try {
      const response = await apiService.bulkUserAction(action, selectedUsers);

      if (response.success) {
        toast({
          title: "Bulk Action Completed",
          description: `Successfully ${action}d ${response.data.affectedCount} user(s)`,
        });
        setSelectedUsers([]);
        loadDashboardData();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to perform bulk action",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(u => 
    u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500/20 text-green-300';
      case 'IN_PROGRESS': return 'bg-blue-500/20 text-blue-300';
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-300';
      case 'CANCELLED': return 'bg-red-500/20 text-red-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-500/20 text-red-300';
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-300';
      case 'LOW': return 'bg-green-500/20 text-green-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  if (adminUser?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-white">
        <ShieldOff className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="text-lg text-gray-400">You do not have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
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
          Admin Dashboard
        </h1>
        <Dialog open={isCreateUserModalOpen} onOpenChange={setIsCreateUserModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white">
              <UserPlus className="mr-2 h-5 w-5" /> Create New User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-slate-800/80 backdrop-blur-md border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl text-emerald-400">Create New User Account</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-gray-300">First Name</Label>
                  <Input
                    id="firstName"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                    placeholder="Enter first name"
                    required
                    className="bg-slate-700/50 border-slate-600 mt-1 text-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-gray-300">Last Name</Label>
                  <Input
                    id="lastName"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                    placeholder="Enter last name"
                    required
                    className="bg-slate-700/50 border-slate-600 mt-1 text-white placeholder-gray-400"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  placeholder="Enter email address"
                  required
                  className="bg-slate-700/50 border-slate-600 mt-1 text-white placeholder-gray-400"
                />
              </div>
              <div>
                <Label htmlFor="username" className="text-gray-300">Username</Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  placeholder="Enter username"
                  required
                  className="bg-slate-700/50 border-slate-600 mt-1 text-white placeholder-gray-400"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="Enter password"
                  required
                  className="bg-slate-700/50 border-slate-600 mt-1 text-white placeholder-gray-400"
                />
              </div>
              <div>
                <Label htmlFor="role" className="text-gray-300">Role</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({...newUser, role: value})}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 mt-1 text-white">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600">
                Create Account
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-slate-800/50">
          <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-500">
            <BarChart3 className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-emerald-500">
            <Users className="mr-2 h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-emerald-500">
            <Activity className="mr-2 h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="ai-reports" className="data-[state=active]:bg-emerald-500">
            <BrainCircuit className="mr-2 h-4 w-4" />
            AI Reports
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-emerald-500">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {dashboardStats && (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <Card className="glassmorphism">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400">Total Users</p>
                        <p className="text-2xl font-bold text-white">{dashboardStats.overview.totalUsers}</p>
                      </div>
                      <Users className="h-8 w-8 text-emerald-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="glassmorphism">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400">Total Tasks</p>
                        <p className="text-2xl font-bold text-white">{dashboardStats.overview.totalTasks}</p>
                      </div>
                      <FileText className="h-8 w-8 text-cyan-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="glassmorphism">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400">Active Tasks</p>
                        <p className="text-2xl font-bold text-white">{dashboardStats.overview.activeTasks}</p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="glassmorphism">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400">Completed</p>
                        <p className="text-2xl font-bold text-white">{dashboardStats.overview.completedTasks}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="glassmorphism">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-400">Overdue</p>
                        <p className="text-2xl font-bold text-white">{dashboardStats.overview.overdueTasks}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glassmorphism">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <TrendingUp className="mr-2 text-emerald-400" />
                      Recent Users
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {dashboardStats.recent.users.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                          <div>
                            <p className="text-white font-medium">{user.firstName} {user.lastName}</p>
                            <p className="text-gray-400 text-sm">{user.email}</p>
                          </div>
                          <p className="text-gray-400 text-sm">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glassmorphism">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Calendar className="mr-2 text-cyan-400" />
                      Recent Tasks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {dashboardStats.recent.tasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                          <div>
                            <p className="text-white font-medium">{task.title}</p>
                            <p className="text-gray-400 text-sm">
                              by {task.createdBy?.firstName} {task.createdBy?.lastName}
                            </p>
                          </div>
                          <Badge className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card className="glassmorphism shadow-xl">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div>
                  <CardTitle className="text-2xl font-semibold text-white flex items-center">
                    <Users className="mr-3 text-cyan-400"/>
                    User Management
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    View, create, and manage user accounts.
                  </CardDescription>
                </div>
                {selectedUsers.length > 0 && (
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleBulkAction('activate')}
                      className="border-green-500 text-green-400 hover:bg-green-500/10"
                    >
                      <ShieldCheck className="mr-1 h-4 w-4" />
                      Activate ({selectedUsers.length})
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleBulkAction('deactivate')}
                      className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
                    >
                      <ShieldOff className="mr-1 h-4 w-4" />
                      Deactivate ({selectedUsers.length})
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleBulkAction('delete')}
                      className="border-red-500 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete ({selectedUsers.length})
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input 
                  placeholder="Search users by name, email, or username..."
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
                        <TableHead className="text-gray-300">
                          <input
                            type="checkbox"
                            checked={selectedUsers.length === filteredUsers.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers(filteredUsers.map(u => u.id));
                              } else {
                                setSelectedUsers([]);
                              }
                            }}
                            className="rounded"
                          />
                        </TableHead>
                        <TableHead className="text-gray-300">Name</TableHead>
                        <TableHead className="text-gray-300">Email</TableHead>
                        <TableHead className="text-gray-300">Username</TableHead>
                        <TableHead className="text-gray-300">Role</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Joined</TableHead>
                        <TableHead className="text-right text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="border-slate-700 hover:bg-slate-700/50">
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUsers([...selectedUsers, user.id]);
                                } else {
                                  setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                }
                              }}
                              className="rounded"
                            />
                          </TableCell>
                          <TableCell className="font-medium text-white">
                            {user.firstName} {user.lastName}
                          </TableCell>
                          <TableCell className="text-gray-300">{user.email}</TableCell>
                          <TableCell className="text-gray-300">{user.username}</TableCell>
                          <TableCell>
                            <Badge className={user.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={user.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                              {user.isActive ? 'Active' : 'Deactivated'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleViewUserTasks(user.id)} 
                              className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
                            >
                              <Eye className="mr-1 h-4 w-4" /> Tasks
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                              className={`${user.isActive ? 'border-red-500 text-red-400 hover:bg-red-500/10 hover:text-red-300' : 'border-green-500 text-green-400 hover:bg-green-500/10 hover:text-green-300'}`}
                            >
                              {user.isActive ? <ShieldOff className="mr-1 h-4 w-4" /> : <ShieldCheck className="mr-1 h-4 w-4" />}
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDeleteUser(user.id)}
                              className="border-red-500 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">No users found matching search criteria.</p>
              )}
            </CardContent>
          </Card>

          {/* User Tasks Modal */}
          {viewingUser && (
            <Card className="glassmorphism shadow-xl">
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="text-2xl font-semibold text-white">
                  Tasks for <span className="text-cyan-400">{viewingUser.firstName} {viewingUser.lastName}</span>
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setViewingUser(null)} 
                  className="text-gray-300 hover:text-white hover:bg-slate-700/50"
                >
                  <XCircle className="h-6 w-6" />
                </Button>
              </CardHeader>
              <CardContent>
                {selectedUserTasks.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="text-gray-300">Task Title</TableHead>
                          <TableHead className="text-gray-300 hidden md:table-cell">Description</TableHead>
                          <TableHead className="text-gray-300">Priority</TableHead>
                          <TableHead className="text-gray-300">Due Date</TableHead>
                          <TableHead className="text-gray-300">Status</TableHead>
                          <TableHead className="text-gray-300">Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedUserTasks.map(task => (
                          <TableRow key={task.id} className="border-slate-700">
                            <TableCell className="text-white font-medium">{task.title}</TableCell>
                            <TableCell className="text-gray-400 hidden md:table-cell max-w-xs truncate">
                              {task.description || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge className={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(task.status)}>
                                {task.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {new Date(task.createdAt).toLocaleDateString()}
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
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <Card className="glassmorphism shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-white flex items-center">
                <Activity className="mr-3 text-cyan-400"/>
                Task Overview
              </CardTitle>
              <CardDescription className="text-gray-300">
                Monitor all tasks across the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {dashboardStats.charts.tasksByStatus.map((item) => (
                    <div key={item.status} className="p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-400">{item.status}</p>
                          <p className="text-2xl font-bold text-white">{item.count}</p>
                        </div>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-reports" className="space-y-6">
          <CriticalTasksReport />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card className="glassmorphism shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-white flex items-center">
                <Settings className="mr-3 text-cyan-400"/>
                System Settings
              </CardTitle>
              <CardDescription className="text-gray-300">
                Configure system-wide settings and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-400 py-8">
                System settings panel will be available in future updates.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default AdminDashboard;