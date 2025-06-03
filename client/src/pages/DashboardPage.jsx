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
    import { Checkbox } from '@/components/ui/checkbox.jsx';
    import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu.jsx';
    import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog.jsx";
    import { PlusCircle, Edit2, Trash2, MoreVertical, CalendarDays, ListChecks, BarChart3, Download, Filter, AlertTriangle, CheckCircle2, Clock, ArrowUpDown, FileText, FileSpreadsheet, FileType } from 'lucide-react';
    import { useToast } from '@/components/ui/use-toast';

    const DashboardPage = () => {
      const { user } = useAuth();
      const { tasks, addTask, updateTask, deleteTask, toggleTaskComplete, getTasksDueToday, getUpcomingTasks, getCompletedTasksLast7Days } = useTasks();
      const [editingTask, setEditingTask] = useState(null);
      const [isFormOpen, setIsFormOpen] = useState(false);
      const [searchTerm, setSearchTerm] = useState('');
      const [sortOption, setSortOption] = useState('dueDate'); 
      const [sortDirection, setSortDirection] = useState('asc');
      const [users, setUsers] = useState([]);
      const [filterCategory, setFilterCategory] = useState('');
      const { toast } = useToast();

      const tasksDueToday = useMemo(() => getTasksDueToday(), [tasks, user]);
      const upcomingTasks = useMemo(() => getUpcomingTasks(), [tasks, user]);
      const completedLast7Days = useMemo(() => getCompletedTasksLast7Days(), [tasks, user]);

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
          setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
          setSortOption(option);
          setSortDirection('asc');
        }
      };
      
      const handleDownload = (format) => {
        toast({
          title: `Download ${format.toUpperCase()}`,
          description: `Preparing to download tasks as ${format.toUpperCase()}. This feature is a placeholder.`,
          variant: "default"
        });
        // Actual download logic would go here
        console.log(`Download tasks as ${format}`);
      };


      const filteredAndSortedTasks = useMemo(() => {
        return tasks
          .filter(task => task.title?.toLowerCase().includes(searchTerm.toLowerCase()))
          .filter(task => filterCategory ? task.priority === filterCategory : true)
          .sort((a, b) => {
            let comparison = 0;
            if (sortOption === 'name') {
              comparison = (a.title || '').localeCompare(b.title || '');
            } else if (sortOption === 'category') {
              comparison = (a.priority || '').localeCompare(b.priority || '');
            } else if (sortOption === 'dueDate') {
              if (!a.dueDate) comparison = 1; 
              else if (!b.dueDate) comparison = -1;
              else comparison = new Date(a.dueDate) - new Date(b.dueDate);
            } else if (sortOption === 'status') {
                comparison = (a.status || '').localeCompare(b.status || '');
            }
            return sortDirection === 'asc' ? comparison : -comparison;
          });
      }, [tasks, searchTerm, filterCategory, sortOption, sortDirection]);


      const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: (i) => ({
          opacity: 1,
          y: 0,
          transition: {
            delay: i * 0.05,
            type: 'spring',
            stiffness: 100,
          },
        }),
        exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
      };
      
      const StatCard = ({ title, value, icon, color }) => (
        <Card className="glassmorphism shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">{title}</CardTitle>
            {React.createElement(icon, { className: `h-5 w-5 ${color || 'text-primary'}` })}
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{value}</div>
          </CardContent>
        </Card>
      );

      return (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <header className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-500">
              Welcome, {user?.username}!
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

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Tasks Due Today" value={tasksDueToday.length} icon={AlertTriangle} color="text-red-400" />
            <StatCard title="Upcoming Tasks" value={upcomingTasks.length} icon={CalendarDays} color="text-yellow-400" />
            <StatCard title="Completed (Last 7 Days)" value={completedLast7Days} icon={CheckCircle2} color="text-green-400" />
            <StatCard title="Total Active Tasks" value={tasks.filter(t => !t.completed).length} icon={ListChecks} color="text-blue-400" />
          </div>
          
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
                        {filterCategory ? `Priority: ${filterCategory.charAt(0) + filterCategory.slice(1).toLowerCase()}` : "Filter by Priority"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                      <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup value={filterCategory} onValueChange={setFilterCategory}>
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
                        <ArrowUpDown className="mr-2 h-4 w-4" /> Sort By
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                      <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup value={sortOption} onValueChange={handleSort}>
                        <DropdownMenuRadioItem value="name" className="hover:!bg-primary/20 focus:!bg-primary/30">Name</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="category" className="hover:!bg-primary/20 focus:!bg-primary/30">Category</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="dueDate" className="hover:!bg-primary/20 focus:!bg-primary/30">Due Date</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="status" className="hover:!bg-primary/20 focus:!bg-primary/30">Status</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 text-white">
                        <Download className="mr-2 h-4 w-4" /> Download
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                      <DropdownMenuItem onSelect={() => handleDownload('csv')} className="hover:!bg-primary/20 focus:!bg-primary/30"><FileText className="mr-2 h-4 w-4 text-green-400"/>CSV</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleDownload('excel')} className="hover:!bg-primary/20 focus:!bg-primary/30"><FileSpreadsheet className="mr-2 h-4 w-4 text-blue-400"/>Excel</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleDownload('pdf')} className="hover:!bg-primary/20 focus:!bg-primary/30"><FileType className="mr-2 h-4 w-4 text-red-400"/>PDF</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {filteredAndSortedTasks.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700 hover:bg-slate-700/30">
                        <TableHead className="w-[50px] text-gray-300 cursor-pointer hover:text-primary" onClick={() => handleSort('status')}>Status</TableHead>
                        <TableHead className="text-gray-300 cursor-pointer hover:text-primary" onClick={() => handleSort('name')}>Title</TableHead>
                        <TableHead className="text-gray-300 hidden md:table-cell cursor-pointer hover:text-primary" onClick={() => handleSort('category')}>Priority</TableHead>
                        <TableHead className="text-gray-300 hidden sm:table-cell cursor-pointer hover:text-primary" onClick={() => handleSort('dueDate')}>Due Date</TableHead>
                        <TableHead className="text-right text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filteredAndSortedTasks.map((task, index) => (
                          <motion.tr 
                            key={task.id}
                            custom={index}
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className={`border-slate-700 hover:bg-slate-700/50 ${task.status === 'COMPLETED' ? 'opacity-60' : ''}`}
                          >
                            <TableCell>
                              <Checkbox 
                                checked={task.status === 'COMPLETED'} 
                                onCheckedChange={() => toggleTaskComplete(task.id)}
                                className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                              />
                            </TableCell>
                            <TableCell className={`font-medium ${task.status === 'COMPLETED' ? 'line-through text-gray-500' : 'text-white'}`}>{task.title}</TableCell>
                            <TableCell className={`hidden md:table-cell ${task.status === 'COMPLETED' ? 'text-gray-500' : 'text-gray-300'}`}>{task.priority || 'N/A'}</TableCell>
                            <TableCell className={`hidden sm:table-cell ${task.status === 'COMPLETED' ? 'text-gray-500' : 'text-gray-300'}`}>
                              {task.dueDate ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString() : 'No due date'}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0 text-gray-300 hover:text-primary hover:bg-slate-700">
                                    <span className="sr-only">Open menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700 text-white">
                                  <DropdownMenuItem onClick={() => openEditForm(task)} className="hover:!bg-primary/20 focus:!bg-primary/30">
                                    <Edit2 className="mr-2 h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-400 hover:!bg-red-500/20 focus:!bg-red-500/30 hover:!text-red-300">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-slate-800/80 backdrop-blur-md border-slate-700 text-white">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This action cannot be undone. This will permanently delete the task "{task.name}".
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="border-slate-600 text-gray-300 hover:bg-slate-700">Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteTask(task.id)} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
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
                <div className="text-center py-12 text-gray-400">
                  <ListChecks className="mx-auto h-16 w-16 mb-4 text-primary/50" />
                  <p className="text-xl font-semibold">No tasks yet!</p>
                  <p>Click "Add New Task" to get started or adjust your filters.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="glassmorphism shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white flex items-center"><BarChart3 className="mr-2 h-5 w-5 text-primary"/>Task Completion (Placeholder)</CardTitle>
                <CardDescription className="text-gray-300">Graph showing tasks completed in the last 7 days.</CardDescription>
              </CardHeader>
              <CardContent className="h-60 flex items-center justify-center">
                <div className="w-full h-full bg-white/5 rounded-md flex flex-col items-center justify-center">
                  <BarChart3 className="h-16 w-16 text-primary/30 mb-2"/>
                  <p className="text-gray-400 italic">{completedLast7Days} tasks completed recently.</p>
                  <p className="text-xs text-gray-500">(Actual graph coming soon)</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glassmorphism shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white flex items-center"><Clock className="mr-2 h-5 w-5 text-primary"/>Upcoming Tasks by Due Date</CardTitle>
                <CardDescription className="text-gray-300">A quick look at what's next.</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingTasks.length > 0 ? (
                  <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {upcomingTasks.slice(0, 5).map(task => (
                      <li key={task.id} className="text-sm p-3 bg-white/5 rounded-md flex justify-between items-center hover:bg-white/10 transition-colors">
                        <span className="text-gray-200">{task.name}</span>
                        <span className="text-xs text-primary font-medium">{task.dueDate ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString() : 'N/A'}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 italic text-center py-8">No upcoming tasks.</p>
                )}
              </CardContent>
            </Card>
          </div>
          
        </motion.div>
      );
    };

    export default DashboardPage;