import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTasks } from '@/contexts/TaskContext';
import { useAuth } from '@/contexts/AuthContext';
import TaskForm from '@/components/TaskForm';
import TaskFormWithAI from '@/components/tasks/TaskFormWithAI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu.jsx';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog.jsx";
import { 
  PlusCircle, Edit2, Trash2, MoreVertical, CalendarDays, ListChecks, BarChart3, 
  Download, Filter, AlertTriangle, CheckCircle2, Clock, ArrowUpDown, FileText, 
  FileSpreadsheet, FileType, TrendingUp, Calendar, Target, Award, Activity
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

const EnhancedDashboard = () => {
  const { user } = useAuth();
  const { 
    tasks, addTask, updateTask, deleteTask, toggleTaskComplete, 
    getTasksDueToday, getUpcomingTasks, getCompletedTasksLast7Days,
    getCompletedTasksByDay, getTaskCategories, getUpcomingTasksByDate
  } = useTasks();
  
  const [editingTask, setEditingTask] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('dueDate'); 
  const [sortDirection, setSortDirection] = useState('asc');
  const [users, setUsers] = useState([]);
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // Analytics data
  const tasksDueToday = useMemo(() => getTasksDueToday(), [tasks]);
  const upcomingTasks = useMemo(() => getUpcomingTasks(), [tasks]);
  const completedLast7Days = useMemo(() => getCompletedTasksLast7Days(), [tasks]);
  const completionData = useMemo(() => getCompletedTasksByDay(), [tasks]);
  const categoryData = useMemo(() => getTaskCategories(), [tasks]);
  const upcomingByDate = useMemo(() => getUpcomingTasksByDate(), [tasks]);

  const handleAddTask = (taskData) => {
    addTask(taskData);
    setIsFormOpen(false);
  };

  const handleUpdateTask = (taskData) => {
    updateTask(editingTask.id, taskData);
    setEditingTask(null);
    setIsFormOpen(false);
  };

  const openEditForm = (task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };
  
  const taskPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

  const handleSort = (option) => {
    if (sortOption === option) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOption(option);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority = !filterPriority || task.priority === filterPriority;
      const matchesCategory = !filterCategory || task.category === filterCategory;
      return matchesSearch && matchesPriority && matchesCategory;
    });

    return filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortOption) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'priority':
          const priorityOrder = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'URGENT': 4 };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        case 'dueDate':
          aValue = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
          bValue = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tasks, searchTerm, filterPriority, filterCategory, sortOption, sortDirection]);

  const handleDeleteTask = (taskId) => {
    deleteTask(taskId);
    toast({ title: "Task Deleted", description: "Task has been successfully deleted." });
  };

  const exportTasks = (format) => {
    const dataStr = format === 'json' 
      ? JSON.stringify(filteredAndSortedTasks, null, 2)
      : filteredAndSortedTasks.map(task => 
          `${task.title},${task.description || ''},${task.priority},${task.dueDate || ''},${task.status}`
        ).join('\n');
    
    const dataBlob = new Blob([dataStr], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tasks.${format === 'json' ? 'json' : 'csv'}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const taskItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        type: "spring",
        stiffness: 100,
      },
    }),
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
  };
  
  const StatCard = ({ title, value, icon, color, trend }) => (
    <Card className="glassmorphism shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-300">{title}</CardTitle>
        {React.createElement(icon, { className: `h-5 w-5 ${color || 'text-primary'}` })}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-white">{value}</div>
        {trend && (
          <p className="text-xs text-gray-400 mt-1">
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'HIGH': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'LOW': return 'bg-green-500/20 text-green-300 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'IN_PROGRESS': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'CANCELLED': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  // Chart colors
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <header className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-500">
          Welcome, {user?.firstName || user?.username}!
        </h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => { setEditingTask(null); setIsFormOpen(true); }} 
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform transition-all duration-300 ease-in-out hover:scale-105"
            >
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[650px] bg-slate-800/80 backdrop-blur-md border-slate-700 text-white shadow-2xl rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-500">
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </DialogTitle>
            </DialogHeader>
            <TaskFormWithAI 
              onSubmit={editingTask ? handleUpdateTask : handleAddTask} 
              initialData={editingTask}
              onCancel={() => setIsFormOpen(false)}
              users={users}
            />
          </DialogContent>
        </Dialog>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800/50">
          <TabsTrigger value="overview" className="data-[state=active]:bg-pink-500">
            <BarChart3 className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-pink-500">
            <ListChecks className="mr-2 h-4 w-4" />
            All Tasks
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-pink-500">
            <TrendingUp className="mr-2 h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-pink-500">
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard 
              title="Tasks Due Today" 
              value={tasksDueToday.length} 
              icon={AlertTriangle} 
              color="text-red-400"
              trend={tasksDueToday.length > 0 ? "Needs attention!" : "All caught up!"}
            />
            <StatCard 
              title="Upcoming Tasks" 
              value={upcomingTasks.length} 
              icon={CalendarDays} 
              color="text-yellow-400"
              trend={`Next due: ${upcomingTasks[0]?.dueDate ? new Date(upcomingTasks[0].dueDate).toLocaleDateString() : 'None'}`}
            />
            <StatCard 
              title="Completed (7 Days)" 
              value={completedLast7Days} 
              icon={CheckCircle2} 
              color="text-green-400"
              trend="Great progress!"
            />
            <StatCard 
              title="Total Active" 
              value={tasks.filter(t => t.status !== 'COMPLETED').length} 
              icon={ListChecks} 
              color="text-blue-400"
              trend={`${tasks.filter(t => t.status === 'IN_PROGRESS').length} in progress`}
            />
          </div>

          {/* Tasks Due Today */}
          {tasksDueToday.length > 0 && (
            <Card className="glassmorphism shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-white flex items-center">
                  <AlertTriangle className="mr-3 text-red-400" />
                  Tasks Due Today
                </CardTitle>
                <CardDescription className="text-gray-300">
                  {tasksDueToday.length} task{tasksDueToday.length !== 1 ? 's' : ''} need{tasksDueToday.length === 1 ? 's' : ''} your attention today
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasksDueToday.map((task, index) => (
                    <motion.div
                      key={task.id}
                      variants={taskItemVariants}
                      initial="hidden"
                      animate="visible"
                      custom={index}
                      className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-red-500/20"
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={task.status === 'COMPLETED'}
                          onCheckedChange={() => toggleTaskComplete(task.id)}
                          className="border-red-400"
                        />
                        <div>
                          <h4 className="text-white font-medium">{task.title}</h4>
                          <p className="text-gray-400 text-sm">{task.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditForm(task)}
                          className="text-gray-400 hover:text-white"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Analytics */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Completion Trend */}
            <Card className="glassmorphism shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white flex items-center">
                  <TrendingUp className="mr-2 text-green-400" />
                  Completion Trend (7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={completionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="day" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completed" 
                      stroke="#10B981" 
                      strokeWidth={3}
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Popular Categories */}
            <Card className="glassmorphism shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white flex items-center">
                  <Award className="mr-2 text-purple-400" />
                  Popular Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryData.slice(0, 5).map((item, index) => (
                    <div key={item.category} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-white">{item.category}</span>
                      </div>
                      <Badge variant="outline" className="text-gray-300">
                        {item.count} tasks
                      </Badge>
                    </div>
                  ))}
                  {categoryData.length === 0 && (
                    <p className="text-gray-400 text-center py-4">No categories yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <Card className="glassmorphism shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-white">Your Tasks</CardTitle>
              <CardDescription className="text-gray-300">Manage, sort, and filter your tasks efficiently.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-between">
                <Input 
                  placeholder="Search tasks..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-xs bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-pink-500"
                />
                <div className="flex gap-2 flex-wrap">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 text-white">
                        <Filter className="mr-2 h-4 w-4" /> 
                        {filterPriority ? `Priority: ${filterPriority.charAt(0) + filterPriority.slice(1).toLowerCase()}` : "Filter by Priority"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                      <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup value={filterPriority} onValueChange={setFilterPriority}>
                        <DropdownMenuRadioItem value="" className="hover:!bg-primary/20 focus:!bg-primary/30">All Priorities</DropdownMenuRadioItem>
                        {taskPriorities.map(priority => (
                          <DropdownMenuRadioItem key={priority} value={priority} className="hover:!bg-primary/20 focus:!bg-primary/30">
                            {priority.charAt(0) + priority.slice(1).toLowerCase()}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 text-white">
                        <Filter className="mr-2 h-4 w-4" /> 
                        {filterCategory ? `Category: ${filterCategory}` : "Filter by Category"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                      <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup value={filterCategory} onValueChange={setFilterCategory}>
                        <DropdownMenuRadioItem value="" className="hover:!bg-primary/20 focus:!bg-primary/30">All Categories</DropdownMenuRadioItem>
                        {categoryData.map(cat => (
                          <DropdownMenuRadioItem key={cat.category} value={cat.category} className="hover:!bg-primary/20 focus:!bg-primary/30">
                            {cat.category}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 text-white">
                        <ArrowUpDown className="mr-2 h-4 w-4" /> Sort By
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                      <DropdownMenuLabel>Sort Options</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleSort('title')} className="hover:!bg-primary/20 focus:!bg-primary/30">
                        Title {sortOption === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSort('dueDate')} className="hover:!bg-primary/20 focus:!bg-primary/30">
                        Due Date {sortOption === 'dueDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSort('priority')} className="hover:!bg-primary/20 focus:!bg-primary/30">
                        Priority {sortOption === 'priority' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSort('status')} className="hover:!bg-primary/20 focus:!bg-primary/30">
                        Status {sortOption === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 text-white">
                        <Download className="mr-2 h-4 w-4" /> Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                      <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => exportTasks('json')} className="hover:!bg-primary/20 focus:!bg-primary/30">
                        <FileText className="mr-2 h-4 w-4" /> JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportTasks('csv')} className="hover:!bg-primary/20 focus:!bg-primary/30">
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {filteredAndSortedTasks.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700 hover:bg-slate-700/30">
                        <TableHead className="text-gray-300">Task</TableHead>
                        <TableHead className="text-gray-300">Priority</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Due Date</TableHead>
                        <TableHead className="text-gray-300">Category</TableHead>
                        <TableHead className="text-right text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filteredAndSortedTasks.map((task, index) => (
                          <motion.tr
                            key={task.id}
                            variants={taskItemVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            custom={index}
                            className="border-slate-700 hover:bg-slate-700/50"
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-3">
                                <Checkbox
                                  checked={task.status === 'COMPLETED'}
                                  onCheckedChange={() => toggleTaskComplete(task.id)}
                                />
                                <div>
                                  <div className={`text-white ${task.status === 'COMPLETED' ? 'line-through opacity-60' : ''}`}>
                                    {task.title}
                                  </div>
                                  {task.description && (
                                    <div className="text-gray-400 text-sm mt-1 max-w-xs truncate">
                                      {task.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(task.status)}>
                                {task.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {task.category || 'Uncategorized'}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700 text-white">
                                  <DropdownMenuItem onClick={() => openEditForm(task)} className="hover:!bg-primary/20 focus:!bg-primary/30">
                                    <Edit2 className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="hover:!bg-red-500/20 focus:!bg-red-500/30 text-red-400">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-gray-300">
                                          This action cannot be undone. This will permanently delete the task "{task.title}".
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleDeleteTask(task.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <ListChecks className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No tasks found</h3>
                  <p className="text-gray-400 mb-4">
                    {searchTerm || filterPriority || filterCategory ? 'Try adjusting your search or filters.' : 'Get started by creating your first task.'}
                  </p>
                  {!searchTerm && !filterPriority && !filterCategory && (
                    <Button 
                      onClick={() => setIsFormOpen(true)}
                      className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create Your First Task
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Completion Chart */}
            <Card className="glassmorphism shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white flex items-center">
                  <Activity className="mr-2 text-green-400" />
                  Tasks Completed (Last 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={completionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="day" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }} 
                    />
                    <Bar dataKey="completed" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card className="glassmorphism shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white flex items-center">
                  <Target className="mr-2 text-purple-400" />
                  Most Popular Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F9FAFB'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-400">
                    <div className="text-center">
                      <Target className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>No categories to display</p>
                      <p className="text-sm">Add categories to your tasks to see the distribution</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          {/* Upcoming Tasks by Date */}
          <Card className="glassmorphism shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-white flex items-center">
                <Calendar className="mr-3 text-cyan-400" />
                Upcoming Tasks by Due Date
              </CardTitle>
              <CardDescription className="text-gray-300">
                Your tasks organized by due date for better planning
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingByDate.length > 0 ? (
                <div className="space-y-4">
                  {upcomingByDate.map((dateGroup, index) => (
                    <motion.div
                      key={dateGroup.date}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border border-slate-700 rounded-lg p-4 bg-slate-800/30"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-white">
                          {dateGroup.dateFormatted}
                        </h3>
                        <Badge variant="outline" className="text-cyan-400 border-cyan-400">
                          {dateGroup.count} task{dateGroup.count !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {dateGroup.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={task.status === 'COMPLETED'}
                                onCheckedChange={() => toggleTaskComplete(task.id)}
                              />
                              <div>
                                <h4 className="text-white font-medium">{task.title}</h4>
                                {task.description && (
                                  <p className="text-gray-400 text-sm">{task.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                              <Badge className={getStatusColor(task.status)}>
                                {task.status}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditForm(task)}
                                className="text-gray-400 hover:text-white"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No upcoming tasks</h3>
                  <p className="text-gray-400">All caught up! Create new tasks with due dates to see them here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default EnhancedDashboard;