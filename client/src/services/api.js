// API Service Layer for Smart Task Manager
const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method to get auth headers
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // Helper method to handle API responses
  async handleResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 401) {
        // Check if it's account deactivation
        if (data.code === 'ACCOUNT_DEACTIVATED') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          alert('Your account has been deactivated by an administrator. Please contact support.');
          window.location.href = '/login';
        } else {
          // Token expired or invalid
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
      throw new Error(data.message || 'An error occurred');
    }
    
    return data;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Authentication APIs
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async verifyToken() {
    return this.request('/auth/verify');
  }

  // User APIs
  async getUserProfile() {
    return this.request('/users/profile');
  }

  async updateUserProfile(userData) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async changePassword(passwordData) {
    return this.request('/users/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  }

  async getAllUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/users${queryString ? `?${queryString}` : ''}`);
  }

  async getUserById(userId) {
    return this.request(`/users/${userId}`);
  }

  async updateUser(userId, userData) {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId) {
    return this.request(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Task APIs
  async getTasks(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/tasks?${queryString}`);
  }

  async getTaskById(taskId) {
    return this.request(`/tasks/${taskId}`);
  }

  async getCategories() {
    return this.request('/tasks/categories');
  }

  async createTask(taskData) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(taskId, taskData) {
    return this.request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  }

  async deleteTask(taskId) {
    return this.request(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  async getTaskStats() {
    return this.request('/tasks/stats/overview');
  }

  // Admin APIs
  async getAdminDashboardStats() {
    return this.request('/admin/dashboard/stats');
  }

  async getAdminSettings() {
    return this.request('/admin/settings');
  }

  async updateAdminSettings(settings) {
    return this.request('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async getAuditLogs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/audit-logs?${queryString}`);
  }

  async createAuditLog(logData) {
    return this.request('/admin/audit-logs', {
      method: 'POST',
      body: JSON.stringify(logData),
    });
  }

  async getSystemHealth() {
    return this.request('/admin/system/health');
  }

  async bulkUserAction(action, userIds) {
    return this.request('/admin/users/bulk-action', {
      method: 'POST',
      body: JSON.stringify({ action, userIds }),
    });
  }

  async createUserByAdmin(userData) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getUserTasks(userId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/users/${userId}/tasks${queryString ? `?${queryString}` : ''}`);
  }

  async bulkTaskAction(action, taskIds) {
    return this.request('/admin/tasks/bulk-action', {
      method: 'POST',
      body: JSON.stringify({ action, taskIds }),
    });
  }
  
  // AI Features
  async getCriticalTasksReport() {
    return this.request('/admin/reports/critical-tasks');
  }
  
  async predictNextCategory(taskTitle) {
    const queryParams = taskTitle ? `?taskTitle=${encodeURIComponent(taskTitle)}` : '';
    return this.request(`/tasks/predict/next-category${queryParams}`);
  }
  
  async generateTaskDescription(title, summary) {
    return this.request('/tasks/generate-description', {
      method: 'POST',
      body: JSON.stringify({ title, summary }),
    });
  }
  
  async getTitleSuggestions(prefix) {
    return this.request(`/tasks/suggest/title?prefix=${encodeURIComponent(prefix)}`);
  }
  
  async getTaskPrioritization() {
    return this.request('/tasks/prioritize');
  }

  // Real-time user status check
  async checkUserStatus() {
    try {
      const response = await this.getUserProfile();
      const user = response.data.user;
      
      // Check if user is deactivated
      if (!user.isActive) {
        // Clear local storage and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Show alert and redirect
        alert('Your account has been deactivated by an administrator. Please contact support.');
        window.location.href = '/login';
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('User status check failed:', error);
      return false;
    }
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;

// Export individual methods for convenience
export const {
  register,
  login,
  verifyToken,
  getUserProfile,
  updateUserProfile,
  changePassword,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getTasks,
  getTaskById,
  getCategories,
  createTask,
  updateTask,
  deleteTask,
  getTaskStats,
  getAdminDashboardStats,
  getAdminSettings,
  updateAdminSettings,
  getAuditLogs,
  createAuditLog,
  getSystemHealth,
  bulkUserAction,
  bulkTaskAction,
  createUserByAdmin,
  getUserTasks,
  checkUserStatus,
  // AI Features
  getCriticalTasksReport,
  predictNextCategory,
  generateTaskDescription,
  getTitleSuggestions,
  getTaskPrioritization,
} = apiService;