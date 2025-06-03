import React, { useState, useEffect } from 'react';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label.jsx';
    import { Textarea } from '@/components/ui/textarea'; 
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Save, X } from 'lucide-react';
    import { cn } from '@/lib/utils';
    import { useAuth } from '@/contexts/AuthContext';
    import apiService from '@/services/api';

    const TaskForm = ({ onSubmit, initialData, onCancel }) => {
      const [title, setTitle] = useState('');
      const [description, setDescription] = useState('');
      const [priority, setPriority] = useState('MEDIUM');
      const [status, setStatus] = useState('PENDING');
      const [category, setCategory] = useState('');
      const [dueDate, setDueDate] = useState('');
      const [assignedToId, setAssignedToId] = useState('');
      const [users, setUsers] = useState([]);
      const [categories, setCategories] = useState([]);
      const [loading, setLoading] = useState(false);
      const { user, isAdmin } = useAuth();

      const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
      const statuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

      // Load users for assignment (admin only) and categories
      useEffect(() => {
        if (isAdmin) {
          loadUsers();
        }
        loadCategories();
      }, [isAdmin]);

      useEffect(() => {
        if (initialData) {
          setTitle(initialData.title || '');
          setDescription(initialData.description || '');
          setPriority(initialData.priority || 'MEDIUM');
          setStatus(initialData.status || 'PENDING');
          setCategory(initialData.category || 'none');
          setDueDate(initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '');
          setAssignedToId(initialData.assignedToId || 'unassigned');
        } else {
          setTitle('');
          setDescription('');
          setPriority('MEDIUM');
          setStatus('PENDING');
          setCategory('none');
          setDueDate('');
          setAssignedToId('unassigned');
        }
      }, [initialData]);

      const loadUsers = async () => {
        try {
          const response = await apiService.getAllUsers();
          if (response.success) {
            setUsers(response.data.users);
          }
        } catch (error) {
          console.error('Failed to load users:', error);
        }
      };

      const loadCategories = async () => {
        try {
          const response = await apiService.getCategories();
          if (response.success) {
            setCategories(response.data.categories);
          }
        } catch (error) {
          console.error('Failed to load categories:', error);
        }
      };

      const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
          const taskData = {
            title,
            description,
            priority,
            status,
            // Set these explicitly to null when they have special values
            category: category === 'none' ? null : category,
            dueDate: dueDate && dueDate.trim() !== '' ? dueDate : null,
            assignedToId: assignedToId === 'unassigned' ? null : assignedToId,
          };
          
          await onSubmit(taskData);
        } catch (error) {
          console.error('Task submission error:', error);
        } finally {
          setLoading(false);
        }
      };
      
      return (
        <form onSubmit={handleSubmit} className="space-y-6 p-1">
          <div>
            <Label htmlFor="task-title" className="text-gray-200">Task Title</Label>
            <Input 
              id="task-title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="E.g., Finish project report" 
              required 
              className="bg-slate-700/50 border-slate-600 text-white placeholder-gray-400 focus:ring-pink-500 mt-1"
            />
          </div>
          <div>
            <Label htmlFor="task-description" className="text-gray-200">Description</Label>
            <Textarea 
              id="task-description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Add more details about the task..."
              className="bg-slate-700/50 border-slate-600 text-white placeholder-gray-400 focus:ring-pink-500 mt-1 min-h-[100px]"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="task-priority" className="text-gray-200">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="task-priority" className="w-full bg-slate-700/50 border-slate-600 text-white mt-1">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  {priorities.map(p => (
                    <SelectItem key={p} value={p} className="hover:bg-primary/20 focus:bg-primary/30">
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {initialData && (
              <div>
                <Label htmlFor="task-status" className="text-gray-200">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="task-status" className="w-full bg-slate-700/50 border-slate-600 text-white mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    {statuses.map(s => (
                      <SelectItem key={s} value={s} className="hover:bg-primary/20 focus:bg-primary/30">
                        {s.replace('_', ' ').charAt(0) + s.replace('_', ' ').slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="task-category" className="text-gray-200">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="task-category" className="w-full bg-slate-700/50 border-slate-600 text-white mt-1">
                <SelectValue placeholder="Select or type a category (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                <SelectItem value="none" className="hover:bg-primary/20 focus:bg-primary/30">
                  No Category
                </SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat} className="hover:bg-primary/20 focus:bg-primary/30">
                    {cat}
                  </SelectItem>
                ))}
                <SelectItem value="Work" className="hover:bg-primary/20 focus:bg-primary/30">
                  Work
                </SelectItem>
                <SelectItem value="Personal" className="hover:bg-primary/20 focus:bg-primary/30">
                  Personal
                </SelectItem>
                <SelectItem value="Health" className="hover:bg-primary/20 focus:bg-primary/30">
                  Health
                </SelectItem>
                <SelectItem value="Education" className="hover:bg-primary/20 focus:bg-primary/30">
                  Education
                </SelectItem>
                <SelectItem value="Finance" className="hover:bg-primary/20 focus:bg-primary/30">
                  Finance
                </SelectItem>
                <SelectItem value="Shopping" className="hover:bg-primary/20 focus:bg-primary/30">
                  Shopping
                </SelectItem>
                <SelectItem value="Travel" className="hover:bg-primary/20 focus:bg-primary/30">
                  Travel
                </SelectItem>
                <SelectItem value="Home" className="hover:bg-primary/20 focus:bg-primary/30">
                  Home
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="mt-2">
              <Input
                placeholder="Or type a custom category..."
                value={category === 'none' ? '' : category}
                onChange={(e) => setCategory(e.target.value || 'none')}
                className="bg-slate-700/50 border-slate-600 text-white placeholder-gray-400 focus:ring-pink-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="task-due-date" className="text-gray-200">Due Date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-700/50 border-slate-600 text-white mt-1"
              />
            </div>
            {isAdmin && (
              <div>
                <Label htmlFor="task-assigned-to" className="text-gray-200">Assign To</Label>
                <Select value={assignedToId} onValueChange={setAssignedToId}>
                  <SelectTrigger id="task-assigned-to" className="w-full bg-slate-700/50 border-slate-600 text-white mt-1">
                    <SelectValue placeholder="Select user (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="unassigned" className="hover:bg-primary/20 focus:bg-primary/30">
                      Unassigned
                    </SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id} className="hover:bg-primary/20 focus:bg-primary/30">
                        {u.firstName} {u.lastName} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} className="border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white">
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="mr-2 h-4 w-4" /> 
              {loading ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Task')}
            </Button>
          </div>
        </form>
      );
    };
    
    export default TaskForm;