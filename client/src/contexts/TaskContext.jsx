import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '@/components/ui/use-toast';
import apiService from '../services/api';

const TaskContext = createContext(null);

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
  });
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Load tasks when user changes or component mounts
  useEffect(() => {
    if (isAuthenticated && user) {
      loadTasks();
      loadStats();
    } else {
      setTasks([]);
      setStats({
        totalTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
      });
    }
  }, [user, isAuthenticated]);

  const loadTasks = async (params = {}) => {
    try {
      setLoading(true);
      const response = await apiService.getTasks(params);
      if (response.success) {
        setTasks(response.data.tasks);
        return response.data;
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load tasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiService.getTaskStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load task stats:', error);
    }
  };

  const addTask = async (taskData) => {
    try {
      const response = await apiService.createTask(taskData);
      if (response.success) {
        const newTask = response.data.task;
        setTasks(prevTasks => [newTask, ...prevTasks]);
        await loadStats(); // Refresh stats
        
        toast({
          title: "Task Created",
          description: `"${newTask.title}" has been created successfully.`,
          variant: "default",
        });
        
        return { success: true, task: newTask };
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create task. Please try again.",
        variant: "destructive",
      });
      return { success: false, message: error.message };
    }
  };

  const updateTask = async (taskId, taskData) => {
    try {
      const response = await apiService.updateTask(taskId, taskData);
      if (response.success) {
        const updatedTask = response.data.task;
        setTasks(prevTasks =>
          prevTasks.map(task => (task.id === taskId ? updatedTask : task))
        );
        await loadStats(); // Refresh stats
        
        toast({
          title: "Task Updated",
          description: `"${updatedTask.title}" has been updated successfully.`,
          variant: "default",
        });
        
        return { success: true, task: updatedTask };
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update task. Please try again.",
        variant: "destructive",
      });
      return { success: false, message: error.message };
    }
  };

  const deleteTask = async (taskId) => {
    try {
      const taskToDelete = tasks.find(t => t.id === taskId);
      const response = await apiService.deleteTask(taskId);
      if (response.success) {
        setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
        await loadStats(); // Refresh stats
        
        toast({
          title: "Task Deleted",
          description: `"${taskToDelete?.title || 'Task'}" has been deleted.`,
          variant: "destructive",
        });
        
        return { success: true };
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete task. Please try again.",
        variant: "destructive",
      });
      return { success: false, message: error.message };
    }
  };

  const toggleTaskComplete = async (taskId) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
      const response = await apiService.updateTask(taskId, { status: newStatus });
      if (response.success) {
        const updatedTask = response.data.task;
        setTasks(prevTasks =>
          prevTasks.map(t => (t.id === taskId ? updatedTask : t))
        );
        await loadStats(); // Refresh stats
        
        toast({
          title: "Task Status Updated",
          description: `"${task.title}" marked as ${newStatus.toLowerCase()}.`,
          variant: "default",
        });
        
        return { success: true, task: updatedTask };
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update task status. Please try again.",
        variant: "destructive",
      });
      return { success: false, message: error.message };
    }
  };

  const getTaskById = async (taskId) => {
    try {
      const response = await apiService.getTaskById(taskId);
      if (response.success) {
        return response.data.task;
      }
    } catch (error) {
      console.error('Failed to get task:', error);
      return null;
    }
  };

  // Filter functions for different task views
  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  const getTasksByPriority = (priority) => {
    return tasks.filter(task => task.priority === priority);
  };

  const getTasksDueToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDueDate = new Date(task.dueDate).toISOString().split('T')[0];
      return taskDueDate === today && task.status !== 'COMPLETED';
    });
  };

  const getUpcomingTasks = () => {
    const today = new Date();
    return tasks
      .filter(task => {
        if (!task.dueDate || task.status === 'COMPLETED') return false;
        const taskDueDate = new Date(task.dueDate);
        return taskDueDate > today;
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  };

  const getOverdueTasks = () => {
    const today = new Date();
    return tasks.filter(task => {
      if (!task.dueDate || task.status === 'COMPLETED') return false;
      const taskDueDate = new Date(task.dueDate);
      return taskDueDate < today;
    });
  };

  const getTasksByUserId = (userId) => {
    return tasks.filter(task => 
      task.createdById === userId || task.assignedToId === userId
    );
  };

  const getMyTasks = () => {
    if (!user) return [];
    return tasks.filter(task => 
      task.createdById === user.id || task.assignedToId === user.id
    );
  };

  const getAssignedTasks = () => {
    if (!user) return [];
    return tasks.filter(task => task.assignedToId === user.id);
  };

  const getCreatedTasks = () => {
    if (!user) return [];
    return tasks.filter(task => task.createdById === user.id);
  };

  const getCompletedTasksLast7Days = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return tasks.filter(task => 
      task.status === 'COMPLETED' && 
      new Date(task.updatedAt) >= sevenDaysAgo
    ).length;
  };

  // Get completed tasks by day for the last 7 days (for chart)
  const getCompletedTasksByDay = () => {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const completedCount = tasks.filter(task => {
        if (task.status !== 'COMPLETED') return false;
        const taskCompletedDate = new Date(task.updatedAt).toISOString().split('T')[0];
        return taskCompletedDate === dateStr;
      }).length;
      
      last7Days.push({
        date: dateStr,
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        completed: completedCount
      });
    }
    
    return last7Days;
  };

  // Get most popular task categories
  const getTaskCategories = () => {
    const categoryCount = {};
    
    tasks.forEach(task => {
      if (task.category) {
        categoryCount[task.category] = (categoryCount[task.category] || 0) + 1;
      }
    });
    
    return Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  };

  // Get upcoming tasks grouped by due date
  const getUpcomingTasksByDate = () => {
    const upcoming = getUpcomingTasks();
    const groupedTasks = {};
    
    upcoming.forEach(task => {
      const dueDate = new Date(task.dueDate).toISOString().split('T')[0];
      if (!groupedTasks[dueDate]) {
        groupedTasks[dueDate] = [];
      }
      groupedTasks[dueDate].push(task);
    });
    
    return Object.entries(groupedTasks)
      .map(([date, tasks]) => ({
        date,
        dateFormatted: new Date(date).toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        }),
        tasks,
        count: tasks.length
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5); // Show next 5 dates
  };

  // Search and filter functions
  const searchTasks = (query) => {
    if (!query.trim()) return tasks;
    const lowercaseQuery = query.toLowerCase();
    return tasks.filter(task =>
      task.title.toLowerCase().includes(lowercaseQuery) ||
      task.description?.toLowerCase().includes(lowercaseQuery)
    );
  };

  const filterTasks = (filters) => {
    return tasks.filter(task => {
      if (filters.status && task.status !== filters.status) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.assignedToId && task.assignedToId !== filters.assignedToId) return false;
      if (filters.createdById && task.createdById !== filters.createdById) return false;
      return true;
    });
  };

  const value = {
    // State
    tasks,
    loading,
    stats,
    
    // Actions
    loadTasks,
    loadStats,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    getTaskById,
    
    // Filters and getters
    getTasksByStatus,
    getTasksByPriority,
    getTasksDueToday,
    getUpcomingTasks,
    getOverdueTasks,
    getTasksByUserId,
    getMyTasks,
    getAssignedTasks,
    getCreatedTasks,
    getCompletedTasksLast7Days,
    getCompletedTasksByDay,
    getTaskCategories,
    getUpcomingTasksByDate,
    searchTasks,
    filterTasks,
    
    // Legacy compatibility
    setTasks,
    toggleTaskComplete: toggleTaskComplete,
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};