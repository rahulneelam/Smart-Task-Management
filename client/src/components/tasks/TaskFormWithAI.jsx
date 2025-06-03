import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Sparkles, Loader2, BrainCircuit } from 'lucide-react';
import apiService from '@/services/api';

const TaskFormWithAI = ({ onSubmit, initialData = {}, users = [], onCancel }) => {
  const { toast } = useToast();
  const titleInputRef = useRef(null);
  const [titleSuggestions, setTitleSuggestions] = useState([]);
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
  const [loadingTitleSuggestions, setLoadingTitleSuggestions] = useState(false);
  const [loadingDescription, setLoadingDescription] = useState(false);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [categories, setCategories] = useState([]);
  const [titleInputTimeout, setTitleInputTimeout] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    summary: '',
    priority: initialData?.priority || 'MEDIUM',
    category: initialData?.category || 'none',
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : null,
    assignedToId: initialData?.assignedToId || 'unassigned',
    usePredictedCategory: false,
    generateDescription: false,
  });

  // Load categories on component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await apiService.getCategories();
        if (response.success) {
          setCategories(response.data.categories || []);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };

    loadCategories();
  }, []);
  
  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(prevData => ({
        ...prevData,
        title: initialData.title || '',
        description: initialData.description || '',
        priority: initialData.priority || 'MEDIUM',
        category: initialData.category || 'none',
        dueDate: initialData.dueDate ? new Date(initialData.dueDate) : null,
        assignedToId: initialData.assignedToId || 'unassigned',
      }));
    }
  }, [initialData]);

  // Handle title input with debounce for suggestions
  const handleTitleChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, title: value });

    // Clear any existing timeout
    if (titleInputTimeout) {
      clearTimeout(titleInputTimeout);
    }

    // If title is at least 3 characters, fetch suggestions after a delay
    if (value.length >= 3) {
      const timeoutId = setTimeout(() => {
        fetchTitleSuggestions(value);
      }, 500); // 500ms debounce
      setTitleInputTimeout(timeoutId);
    } else {
      setShowTitleSuggestions(false);
    }
  };

  // Fetch title suggestions from API
  const fetchTitleSuggestions = async (prefix) => {
    try {
      setLoadingTitleSuggestions(true);
      const response = await apiService.getTitleSuggestions(prefix);
      if (response.success) {
        setTitleSuggestions(response.data.suggestions || []);
        setShowTitleSuggestions(true);
      }
    } catch (error) {
      console.error('Failed to fetch title suggestions:', error);
    } finally {
      setLoadingTitleSuggestions(false);
    }
  };

  // Handle selecting a title suggestion
  const handleSelectTitleSuggestion = (suggestion) => {
    setFormData({ ...formData, title: suggestion });
    setShowTitleSuggestions(false);
    
    // Predict category based on the selected title
    if (formData.usePredictedCategory) {
      predictCategory(suggestion);
    }
  };

  // Predict category based on title
  const predictCategory = async (title) => {
    try {
      setLoadingCategory(true);
      const response = await apiService.predictNextCategory(title);
      if (response.success && response.data.predictedCategory) {
        setFormData(prev => ({ ...prev, category: response.data.predictedCategory }));
        toast({
          title: "Category Predicted",
          description: `Category set to "${response.data.predictedCategory}" based on your task history.`,
        });
      } else if (response.success) {
        // Handle case where API succeeded but no category was predicted
        toast({
          title: "No Category Predicted",
          description: "Could not predict a category based on your task history.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Failed to predict category:', error);
      toast({
        title: "Category Prediction Failed",
        description: "Using fallback category selection. Please choose a category manually.",
        variant: "default",
      });
    } finally {
      setLoadingCategory(false);
    }
  };

  // Generate description from summary
  const handleGenerateDescription = async () => {
    if (!formData.title || !formData.summary) {
      toast({
        title: "Missing Information",
        description: "Please provide both a title and summary to generate a description.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoadingDescription(true);
      const response = await apiService.generateTaskDescription(formData.title, formData.summary);
      if (response.success && response.data.description) {
        setFormData(prev => ({ ...prev, description: response.data.description }));
        toast({
          title: "Description Generated",
          description: "AI has created a detailed description based on your summary.",
        });
      } else if (response.success) {
        // Handle case where API succeeded but no description was generated
        toast({
          title: "Description Generation",
          description: "Using basic description formatting. You may want to edit it further.",
          variant: "default",
        });
        // Use the summary as a fallback
        setFormData(prev => ({ 
          ...prev, 
          description: `${formData.summary}\n\nThis task involves ${formData.title.toLowerCase()}.` 
        }));
      }
    } catch (error) {
      console.error('Failed to generate description:', error);
      toast({
        title: "Description Generation Failed",
        description: "Using basic description formatting. You may want to edit it further.",
        variant: "default",
      });
      // Use the summary as a fallback
      setFormData(prev => ({ 
        ...prev, 
        description: `${formData.summary}\n\nThis task involves ${formData.title.toLowerCase()}.` 
      }));
    } finally {
      setLoadingDescription(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title) {
      toast({
        title: "Missing Information",
        description: "Please provide a title for the task.",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare data for submission
    const taskData = {
      title: formData.title,
      description: formData.description || '',
      priority: formData.priority || 'MEDIUM',
      category: formData.category === 'none' ? null : formData.category,
      dueDate: formData.dueDate || null,
      assignedToId: formData.assignedToId === 'unassigned' ? null : formData.assignedToId,
    };
    
    // Add AI-specific fields if needed
    if (formData.usePredictedCategory) {
      taskData.usePredictedCategory = true;
    }
    
    if (formData.generateDescription && formData.summary) {
      taskData.generateDescription = true;
      taskData.summary = formData.summary;
    }
    
    try {
      onSubmit(taskData);
    } catch (error) {
      console.error('Error submitting task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit task",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700 text-white shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-emerald-400">
          {initialData?.id ? 'Edit Task' : 'Create New Task'}
        </CardTitle>
        <CardDescription className="text-gray-400">
          {initialData?.id 
            ? 'Update the details of your existing task' 
            : 'Fill in the details to create a new task'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Title with AI suggestions */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-300">Task Title</Label>
            <div className="relative">
              <Input
                id="title"
                ref={titleInputRef}
                value={formData.title}
                onChange={handleTitleChange}
                placeholder="Enter task title"
                required
                className="bg-slate-700/50 border-slate-600 text-white placeholder-gray-400"
              />
              {loadingTitleSuggestions && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              )}
              
              {/* Title suggestions dropdown */}
              {showTitleSuggestions && titleSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg">
                  <ul className="py-1">
                    {titleSuggestions.map((suggestion, index) => (
                      <li 
                        key={index}
                        className="px-4 py-2 hover:bg-slate-700 cursor-pointer flex items-center"
                        onClick={() => handleSelectTitleSuggestion(suggestion)}
                      >
                        <Sparkles className="h-4 w-4 mr-2 text-emerald-400" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400">Type at least 3 characters for AI title suggestions</p>
          </div>
          
          {/* Category with AI prediction */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="category" className="text-gray-300">Category</Label>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="usePredictedCategory" 
                  checked={formData.usePredictedCategory}
                  onCheckedChange={(checked) => {
                    setFormData({ ...formData, usePredictedCategory: checked });
                    if (checked && formData.title) {
                      predictCategory(formData.title);
                    }
                  }}
                />
                <Label 
                  htmlFor="usePredictedCategory" 
                  className="text-xs text-emerald-400 cursor-pointer flex items-center"
                >
                  <BrainCircuit className="h-3 w-3 mr-1" />
                  Use AI prediction
                </Label>
              </div>
            </div>
            <div className="relative">
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="none">None</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingCategory && (
                <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                </div>
              )}
            </div>
          </div>
          
          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority" className="text-gray-300">Priority</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate" className="text-gray-300">Due Date (Optional)</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate ? new Date(formData.dueDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value ? new Date(e.target.value) : null })}
              className="bg-slate-700/50 border-slate-600 text-white placeholder-gray-400"
            />
          </div>
          
          {/* Assigned To */}
          <div className="space-y-2">
            <Label htmlFor="assignedToId" className="text-gray-300">Assign To (Optional)</Label>
            <Select 
              value={formData.assignedToId} 
              onValueChange={(value) => setFormData({ ...formData, assignedToId: value })}
            >
              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Summary for AI description generation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="summary" className="text-gray-300">Brief Summary</Label>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="generateDescription" 
                  checked={formData.generateDescription}
                  onCheckedChange={(checked) => setFormData({ ...formData, generateDescription: checked })}
                />
                <Label 
                  htmlFor="generateDescription" 
                  className="text-xs text-emerald-400 cursor-pointer flex items-center"
                >
                  <BrainCircuit className="h-3 w-3 mr-1" />
                  Generate description with AI
                </Label>
              </div>
            </div>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Enter a brief summary of the task"
              className="bg-slate-700/50 border-slate-600 text-white placeholder-gray-400 min-h-[80px]"
            />
            {formData.generateDescription && (
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                disabled={loadingDescription || !formData.summary || !formData.title}
                onClick={handleGenerateDescription}
                className="w-full bg-emerald-900/30 border-emerald-700/50 hover:bg-emerald-800/40 text-emerald-400"
              >
                {loadingDescription ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Description Now
                  </>
                )}
              </Button>
            )}
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-300">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter detailed task description"
              className="bg-slate-700/50 border-slate-600 text-white placeholder-gray-400 min-h-[120px]"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="bg-slate-700/50 border-slate-600 hover:bg-slate-600 text-white"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white"
          >
            {initialData?.id ? 'Update Task' : 'Create Task'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default TaskFormWithAI;