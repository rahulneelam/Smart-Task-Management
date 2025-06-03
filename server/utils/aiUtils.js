import axios from 'axios';
import crypto from 'crypto';
import { shortTermCache, mediumTermCache, longTermCache } from './cacheManager.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Gemini API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBCioN7S2rzQgcmvGO5dcgAWNOJZUsUwO8';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

/**
 * Generate a hash for a string to use as a cache key
 * @param {string} str - The string to hash
 * @returns {string} - The hash
 */
const generateHash = (str) => {
  return crypto.createHash('md5').update(str).digest('hex');
};

/**
 * Call the Gemini API with a prompt
 * @param {string} prompt - The prompt to send to the API
 * @param {boolean} useCache - Whether to use cache (default: true)
 * @param {number} cacheTtl - Cache TTL in milliseconds (default: 1 hour)
 * @param {Function} fallbackFn - Optional fallback function to call if API fails
 * @returns {Promise<string>} - The generated text
 */
export const callGeminiAPI = async (prompt, useCache = true, cacheTtl = 3600000, fallbackFn = null) => {
  try {
    // Generate a cache key based on the prompt
    const cacheKey = generateHash(prompt);
    
    // Check if we have a cached response
    if (useCache) {
      const cachedResponse = mediumTermCache.get(cacheKey);
      if (cachedResponse) {
        console.log('Using cached AI response');
        return cachedResponse;
      }
    }
    
    // No cache hit, call the API
    console.log('Calling Gemini API...');
    try {
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
        {
          contents: {
            role: "user",
            parts: [
              {
                text: prompt
              }
            ]
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        }
      );

      // Extract the generated text from the response
      const generatedText = response.data.candidates[0].content.parts[0].text;
      
      // Cache the response if caching is enabled
      if (useCache) {
        mediumTermCache.set(cacheKey, generatedText, cacheTtl);
      }
      
      return generatedText;
    } catch (apiError) {
      console.error('Error calling Gemini API:', apiError.response?.data || apiError.message);
      
      // If a fallback function is provided, use it
      if (typeof fallbackFn === 'function') {
        console.log('Using fallback function for AI generation');
        const fallbackResult = await fallbackFn(prompt);
        return fallbackResult;
      }
      
      // Otherwise, throw the error
      throw new Error('Failed to generate content with AI');
    }
  } catch (error) {
    console.error('Error in AI processing:', error.message);
    throw new Error('Failed to generate content with AI');
  }
};

/**
 * Predict the next category a user will use based on their task history
 * @param {string} userId - The user ID
 * @param {Array} userTasks - The user's tasks (optional, will be fetched if not provided)
 * @param {string} taskTitle - The title of the new task (optional, for context)
 * @returns {Promise<string>} - The predicted category
 */
export const predictNextCategory = async (userId, userTasks = null, taskTitle = null) => {
  try {
    // If userTasks is not provided, fetch them
    if (!userTasks) {
      userTasks = await prisma.task.findMany({
        where: { createdById: userId },
        select: {
          id: true,
          title: true,
          category: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50, // Get more tasks for better prediction
      });
    }
    
    // If user has no tasks, return null
    if (!userTasks || userTasks.length === 0) {
      return null;
    }
    
    // Generate a cache key based on user ID, task IDs, and the new task title
    const taskIds = userTasks.slice(0, 10).map(task => task.id).join(',');
    const cacheKey = `predict_category_${userId}_${generateHash(taskIds + (taskTitle || ''))}`;
    
    // Check if we have a cached prediction
    const cachedPrediction = shortTermCache.get(cacheKey);
    if (cachedPrediction) {
      console.log('Using cached category prediction');
      return cachedPrediction;
    }

    // If we have a task title, try to use AI for a more contextual prediction
    if (taskTitle && userTasks.length >= 5) {
      try {
        // Get distinct categories
        const categories = [...new Set(userTasks
          .filter(task => task.category)
          .map(task => task.category))];
        
        if (categories.length > 0) {
          // Get category usage patterns
          const categoryUsage = {};
          categories.forEach(category => {
            categoryUsage[category] = userTasks.filter(task => task.category === category).length;
          });
          
          // Get recent tasks with their categories
          const recentTasks = userTasks
            .slice(0, 10)
            .filter(task => task.title && task.category)
            .map(task => ({
              title: task.title,
              category: task.category
            }));
          
          const prompt = `
          As an AI assistant for a task management application, predict the most appropriate category for a new task.
          
          New Task Title: "${taskTitle}"
          
          Available Categories:
          ${categories.map(c => `- ${c}`).join('\n')}
          
          Category Usage Frequency:
          ${Object.entries(categoryUsage).map(([category, count]) => `${category}: ${count} tasks`).join('\n')}
          
          Recent Tasks:
          ${recentTasks.map(t => `Title: "${t.title}" - Category: "${t.category}"`).join('\n')}
          
          Based on the user's task history and the new task title, predict the most appropriate category from the available categories.
          Return ONLY the category name without any additional text, quotes, or explanation.
          `;
          
          // Define a fallback function for category prediction
          const categoryPredictionFallback = (prompt) => {
            // Extract categories from the prompt
            const categoriesMatch = prompt.match(/Available Categories:\s*((?:- [^\n]+\s*)+)/);
            if (categoriesMatch) {
              const categoriesText = categoriesMatch[1];
              const categories = categoriesText.split('\n')
                .map(line => line.trim())
                .filter(line => line.startsWith('- '))
                .map(line => line.substring(2).trim());
              
              // Extract task title for better matching
              const titleMatch = prompt.match(/New Task Title: "([^"]+)"/);
              const taskTitle = titleMatch ? titleMatch[1].toLowerCase() : '';
              
              if (categories.length > 0) {
                // Try to find a category that matches part of the task title
                if (taskTitle) {
                  const matchingCategory = categories.find(category => 
                    taskTitle.includes(category.toLowerCase()) || 
                    category.toLowerCase().includes(taskTitle)
                  );
                  
                  if (matchingCategory) {
                    return matchingCategory;
                  }
                }
                
                // Extract category usage frequency for better selection
                const usageMatch = prompt.match(/Category Usage Frequency:\s*((?:[^\n]+\s*)+)/);
                if (usageMatch) {
                  const usageText = usageMatch[1];
                  const usageLines = usageText.split('\n').map(line => line.trim());
                  
                  // Find the category with the highest usage
                  let highestUsage = 0;
                  let mostUsedCategory = null;
                  
                  for (const line of usageLines) {
                    const match = line.match(/([^:]+): (\d+) tasks/);
                    if (match) {
                      const category = match[1].trim();
                      const count = parseInt(match[2]);
                      
                      if (count > highestUsage) {
                        highestUsage = count;
                        mostUsedCategory = category;
                      }
                    }
                  }
                  
                  if (mostUsedCategory) {
                    return mostUsedCategory;
                  }
                }
                
                // Return the first category as a last resort
                return categories[0];
              }
            }
            return null;
          };
          
          const aiPrediction = await callGeminiAPI(prompt, true, 300000, categoryPredictionFallback);
          const cleanedPrediction = aiPrediction.trim().replace(/^"(.+)"$/, '$1').replace(/\.$/, '');
          
          // Check if the prediction is in the list of available categories
          if (categories.includes(cleanedPrediction)) {
            // Cache the prediction for 5 minutes
            shortTermCache.set(cacheKey, cleanedPrediction, 300000);
            return cleanedPrediction;
          }
          
          // If the AI prediction isn't in our categories, find the closest match
          const closestMatch = categories.find(c => 
            c.toLowerCase().includes(cleanedPrediction.toLowerCase()) || 
            cleanedPrediction.toLowerCase().includes(c.toLowerCase())
          );
          
          if (closestMatch) {
            // Cache the prediction for 5 minutes
            shortTermCache.set(cacheKey, closestMatch, 300000);
            return closestMatch;
          }
        }
      } catch (error) {
        console.error('Error using AI for category prediction:', error);
        // Fall back to statistical prediction
      }
    }

    // Statistical prediction approach
    // Extract categories and their frequencies
    const categoryFrequency = {};
    const recentCategories = [];
    
    // Sort tasks by creation date (newest first)
    const sortedTasks = [...userTasks].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    // Get the 5 most recent categories (if they exist)
    for (let i = 0; i < Math.min(5, sortedTasks.length); i++) {
      if (sortedTasks[i].category) {
        recentCategories.push(sortedTasks[i].category);
      }
    }
    
    // Count category frequencies
    userTasks.forEach(task => {
      if (task.category) {
        categoryFrequency[task.category] = (categoryFrequency[task.category] || 0) + 1;
      }
    });
    
    // If no categories found, return null
    if (Object.keys(categoryFrequency).length === 0) {
      return null;
    }
    
    // Simple prediction: if the user has used the same category for the last 2-3 tasks, suggest that
    if (recentCategories.length >= 2) {
      const mostRecentCategory = recentCategories[0];
      if (recentCategories.slice(0, 3).filter(c => c === mostRecentCategory).length >= 2) {
        // Cache the prediction for 5 minutes
        shortTermCache.set(cacheKey, mostRecentCategory, 300000);
        return mostRecentCategory;
      }
    }
    
    // Otherwise, return the most frequently used category
    const sortedCategories = Object.entries(categoryFrequency)
      .sort((a, b) => b[1] - a[1]);
    
    const prediction = sortedCategories[0][0];
    
    // Cache the prediction for 5 minutes
    shortTermCache.set(cacheKey, prediction, 300000);
    
    return prediction;
  } catch (error) {
    console.error('Error predicting next category:', error);
    return null;
  }
};

/**
 * Generate a description based on a task title and summary
 * @param {string} title - The task title
 * @param {string} summary - The user's summary
 * @param {string} userId - The user ID for context (optional)
 * @returns {Promise<string>} - The generated description
 */
export const generateTaskDescription = async (title, summary, userId = null) => {
  try {
    if (!summary || summary.trim() === '') {
      return null;
    }
    
    // Generate a cache key
    const cacheKey = `description_${generateHash(title + summary)}`;
    
    // Check if we have a cached description
    const cachedDescription = mediumTermCache.get(cacheKey);
    if (cachedDescription) {
      console.log('Using cached task description');
      return cachedDescription;
    }
    
    // Get additional context if userId is provided
    let userContext = '';
    if (userId) {
      try {
        // Get user's recent tasks for context
        const recentTasks = await prisma.task.findMany({
          where: { createdById: userId },
          select: {
            title: true,
            description: true,
            category: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
        });
        
        if (recentTasks.length > 0) {
          userContext = `
          Here are some examples of the user's previous tasks for context:
          ${recentTasks.map(task => `Title: "${task.title}"
          Description: "${task.description || 'N/A'}"
          Category: ${task.category || 'N/A'}
          `).join('\n')}
          
          Please use a similar style and level of detail as the examples above.
          `;
        }
      } catch (error) {
        console.error('Error getting user context:', error);
        // Continue without context
      }
    }
    
    const prompt = `
    Task Title: "${title}"
    User Summary: "${summary}"
    
    ${userContext}
    
    Based on the task title and user summary above, please generate a detailed, professional task description that:
    1. Expands on the key points mentioned in the summary
    2. Organizes the information in a clear, structured way
    3. Uses professional language appropriate for a task management system
    4. Keeps the description concise (maximum 3-4 paragraphs)
    5. Does not add speculative information not implied by the title or summary
    6. Includes specific actionable items or steps when appropriate
    7. Highlights any deadlines, dependencies, or important considerations
    
    Return ONLY the description text without any additional commentary, prefixes, or formatting.
    `;
    
    // Define a fallback function that enhances the summary
    const descriptionFallback = (prompt) => {
      // Extract the title and summary from the prompt
      const titleMatch = prompt.match(/Task Title: "([^"]+)"/);
      const summaryMatch = prompt.match(/User Summary: "([^"]+)"/);
      
      if (!titleMatch || !summaryMatch) {
        return summary;
      }
      
      const extractedTitle = titleMatch[1];
      const extractedSummary = summaryMatch[1];
      
      // Extract key points from the summary
      const sentences = extractedSummary.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const keyPoints = sentences.map(s => s.trim()).filter(s => s.length > 10);
      
      // Create a more structured description
      let enhancedDescription = `# ${extractedTitle}\n\n`;
      enhancedDescription += `## Overview\n${extractedSummary}\n\n`;
      
      if (keyPoints.length > 1) {
        enhancedDescription += '## Key Points\n';
        keyPoints.forEach(point => {
          enhancedDescription += `- ${point}.\n`;
        });
        enhancedDescription += '\n';
      }
      
      enhancedDescription += `## Implementation Details\nThis task involves implementing changes related to ${extractedTitle.toLowerCase()}. Please ensure all requirements are met and tested thoroughly before completion.\n\n`;
      
      enhancedDescription += '## Acceptance Criteria\n';
      enhancedDescription += '- All functionality works as described in the overview\n';
      enhancedDescription += '- Code is well-documented and follows project standards\n';
      enhancedDescription += '- Tests are included where appropriate\n';
      
      return enhancedDescription;
    };
    
    const generatedDescription = await callGeminiAPI(prompt, true, 3600000, descriptionFallback);
    const cleanedDescription = generatedDescription
      .trim()
      .replace(/^Generated Description:/, '')
      .replace(/^Description:/, '')
      .replace(/^Task Description:/, '')
      .trim();
    
    // Cache the description for 1 hour
    mediumTermCache.set(cacheKey, cleanedDescription, 3600000);
    
    return cleanedDescription;
  } catch (error) {
    console.error('Error generating task description:', error);
    return summary; // Fallback to the original summary
  }
};

/**
 * Generate a report of critical and overdue tasks
 * @param {Array} tasks - The tasks to analyze
 * @returns {Promise<string>} - The generated report
 */
export const generateCriticalTasksReport = async (tasks) => {
  try {
    if (!tasks || tasks.length === 0) {
      return "No tasks found for analysis.";
    }
    
    // Filter critical tasks (HIGH or URGENT priority and not COMPLETED or CANCELLED)
    const criticalTasks = tasks.filter(task => 
      (task.priority === 'HIGH' || task.priority === 'URGENT') && 
      (task.status !== 'COMPLETED' && task.status !== 'CANCELLED')
    );
    
    // Filter overdue tasks (due date in the past and not COMPLETED or CANCELLED)
    const overdueTasks = tasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) < new Date() && 
      (task.status !== 'COMPLETED' && task.status !== 'CANCELLED')
    );
    
    // Sort overdue tasks by how overdue they are (most overdue first)
    const sortedOverdueTasks = [...overdueTasks].sort((a, b) => 
      new Date(a.dueDate) - new Date(b.dueDate)
    );
    
    // Prepare task data for the prompt
    const criticalTasksData = criticalTasks.map(task => ({
      title: task.title,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : 'No due date',
      assignedTo: task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : 'Unassigned',
      createdBy: `${task.createdBy.firstName} ${task.createdBy.lastName}`,
    }));
    
    const overdueTasksData = sortedOverdueTasks.map(task => ({
      title: task.title,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : 'No due date',
      daysOverdue: task.dueDate ? Math.floor((new Date() - new Date(task.dueDate)) / (1000 * 60 * 60 * 24)) : 0,
      assignedTo: task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : 'Unassigned',
      createdBy: `${task.createdBy.firstName} ${task.createdBy.lastName}`,
    }));
    
    const prompt = `
    Generate a professional executive summary report for an admin dashboard based on the following task data:
    
    CRITICAL TASKS (${criticalTasksData.length}):
    ${JSON.stringify(criticalTasksData, null, 2)}
    
    OVERDUE TASKS (${overdueTasksData.length}):
    ${JSON.stringify(overdueTasksData, null, 2)}
    
    Please create a concise report that:
    1. Summarizes the overall status of critical and overdue tasks
    2. Highlights the most urgent issues that need attention
    3. Identifies any patterns or trends (e.g., specific users with many overdue tasks)
    4. Provides actionable recommendations for the admin
    5. Uses professional, clear language suitable for an executive summary
    6. Formats the report with appropriate sections and bullet points for readability
    
    Executive Summary Report:
    `;
    
    // Define a fallback function for the critical tasks report
    const reportFallback = (prompt) => {
      return `
## Executive Summary: Critical and Overdue Tasks

### Overview
The system currently has ${criticalTasks.length} critical tasks and ${overdueTasks.length} overdue tasks that require immediate attention.

### Critical Tasks
${criticalTasks.map(task => `- ${task.title} (${task.priority} priority, assigned to ${task.assignedTo ? task.assignedTo.firstName + ' ' + task.assignedTo.lastName : 'Unassigned'})`).join('\n')}

### Overdue Tasks
${overdueTasks.map(task => {
  const daysOverdue = task.dueDate ? Math.floor((new Date() - new Date(task.dueDate)) / (1000 * 60 * 60 * 24)) : 0;
  return `- ${task.title} (${daysOverdue} days overdue, assigned to ${task.assignedTo ? task.assignedTo.firstName + ' ' + task.assignedTo.lastName : 'Unassigned'})`;
}).join('\n')}

### Recommendations
1. Address the overdue tasks immediately, especially those with high or urgent priority
2. Review resource allocation for team members with multiple critical or overdue tasks
3. Consider implementing stricter deadline monitoring to prevent future overdue tasks

This report was generated automatically based on current task data.
      `;
    };
    
    const generatedReport = await callGeminiAPI(prompt, true, 3600000, reportFallback);
    return generatedReport.trim();
  } catch (error) {
    console.error('Error generating critical tasks report:', error);
    return "Error generating report. Please try again later.";
  }
};

/**
 * Generate title suggestions based on the first few characters
 * @param {string} prefix - The first few characters of the title (minimum 3)
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} - Array of suggested titles
 */
export const generateTitleSuggestions = async (prefix, userId) => {
  try {
    if (!prefix || prefix.length < 3) {
      return [];
    }
    
    // Generate a cache key
    const cacheKey = `title_suggestions_${userId}_${prefix}`;
    
    // Check if we have cached suggestions
    const cachedSuggestions = shortTermCache.get(cacheKey);
    if (cachedSuggestions) {
      console.log('Using cached title suggestions');
      return cachedSuggestions;
    }
    
    // Get user's previous tasks to use as context
    const userTasks = await prisma.task.findMany({
      where: { 
        OR: [
          { createdById: userId },
          { assignedToId: userId }
        ]
      },
      select: {
        title: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    
    // Extract titles and categories for context
    const previousTitles = userTasks.map(task => task.title);
    const categories = [...new Set(userTasks.map(task => task.category).filter(Boolean))];
    
    const prompt = `
    As an AI assistant for a task management application, suggest 5 possible task titles that start with "${prefix}".
    
    Here are some examples of the user's previous task titles for context:
    ${previousTitles.join('\n')}
    
    The user typically works with these categories:
    ${categories.join(', ')}
    
    Please provide 5 professional, clear, and specific task title suggestions that:
    1. Start with or contain "${prefix}"
    2. Are relevant to the user's previous tasks and categories
    3. Are between 3-8 words in length
    4. Are formatted as a JSON array of strings only (no explanations or other text)
    
    Example response format:
    ["Complete quarterly report", "Create marketing presentation", "Review team performance", "Update client database", "Schedule team meeting"]
    `;
    
    // Define a fallback function for title suggestions
    const titleSuggestionsFallback = (prompt) => {
      const prefixMatch = prompt.match(/start with "([^"]+)"/);
      const prefix = prefixMatch ? prefixMatch[1] : prefix;
      
      return JSON.stringify([
        `${prefix} task`,
        `${prefix} project`,
        `${prefix} review`,
        `${prefix} update`,
        `${prefix} meeting`
      ]);
    };
    
    const response = await callGeminiAPI(prompt, true, 300000, titleSuggestionsFallback);
    
    // Parse the response to extract the JSON array
    let suggestions = [];
    try {
      // Look for anything that resembles a JSON array in the response
      const match = response.match(/\[.*\]/s);
      if (match) {
        suggestions = JSON.parse(match[0]);
        // Ensure we only have strings in the array
        suggestions = suggestions.filter(item => typeof item === 'string');
        // Limit to 5 suggestions
        suggestions = suggestions.slice(0, 5);
      } else {
        // Fallback: split by newlines and clean up
        suggestions = response
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('"') && line.includes('"'))
          .map(line => {
            // Extract content between quotes
            const match = line.match(/"([^"]+)"/);
            return match ? match[1] : null;
          })
          .filter(Boolean)
          .slice(0, 5);
      }
    } catch (error) {
      console.error('Error parsing title suggestions:', error);
      // Fallback to simple suggestions
      suggestions = [
        `${prefix} task`,
        `${prefix} project`,
        `${prefix} review`,
        `${prefix} update`,
        `${prefix} meeting`
      ];
    }
    
    // Cache the suggestions for 5 minutes
    shortTermCache.set(cacheKey, suggestions, 300000);
    
    return suggestions;
  } catch (error) {
    console.error('Error generating title suggestions:', error);
    return [
      `${prefix} task`,
      `${prefix} project`,
      `${prefix} review`,
      `${prefix} update`,
      `${prefix} meeting`
    ];
  }
};

export const generateTaskPrioritization = async (userId, userTasks) => {
  try {
    if (!userTasks || userTasks.length === 0) {
      return {
        message: "No tasks found to prioritize.",
        prioritizedTasks: []
      };
    }
    
    // Filter active tasks (not completed or cancelled)
    const activeTasks = userTasks.filter(task => 
      task.status !== 'COMPLETED' && task.status !== 'CANCELLED'
    );
    
    if (activeTasks.length === 0) {
      return {
        message: "No active tasks found to prioritize.",
        prioritizedTasks: []
      };
    }
    
    // Generate a cache key based on the active tasks
    const taskData = activeTasks.map(t => `${t.id}-${t.status}-${t.priority}-${t.dueDate}`).join('|');
    const cacheKey = `task_prioritization_${userId}_${generateHash(taskData)}`;
    
    // Check if we have a cached result
    const cachedResult = mediumTermCache.get(cacheKey);
    if (cachedResult) {
      console.log('Using cached task prioritization');
      return cachedResult;
    }
    
    // Prepare task data for the AI
    const tasksForAI = activeTasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description ? task.description.substring(0, 100) + (task.description.length > 100 ? '...' : '') : 'No description',
      status: task.status,
      priority: task.priority,
      category: task.category || 'Uncategorized',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : 'No due date',
      daysUntilDue: task.dueDate ? Math.ceil((new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : null,
      isOverdue: task.dueDate ? new Date(task.dueDate) < new Date() : false,
    }));
    
    const prompt = `
    As an AI task prioritization assistant, analyze the following tasks and provide recommendations for which tasks the user should focus on first.

    USER TASKS:
    ${JSON.stringify(tasksForAI, null, 2)}
    
    Please provide:
    1. A prioritized list of the top 5 tasks the user should focus on, with a brief explanation for each
    2. A short explanation of your prioritization logic
    3. Any tasks that might be at risk of becoming overdue soon
    4. Suggestions for any tasks that could potentially be delegated or rescheduled
    
    Format your response as a JSON object with the following structure:
    {
      "prioritizedTasks": [
        {
          "id": "task-id",
          "title": "Task title",
          "reason": "Reason for prioritization"
        }
      ],
      "logic": "Explanation of prioritization logic",
      "atRiskTasks": [
        {
          "id": "task-id",
          "title": "Task title",
          "risk": "Description of the risk"
        }
      ],
      "suggestions": [
        {
          "id": "task-id",
          "title": "Task title",
          "suggestion": "Suggestion for this task"
        }
      ]
    }
    
    Ensure your response is valid JSON that can be parsed.
    `;
    
    const generatedResponse = await callGeminiAPI(prompt);
    
    // Parse the JSON response
    let parsedResponse;
    try {
      // Extract JSON from the response (in case there's any extra text)
      const jsonMatch = generatedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fallback to a simple prioritization based on due date and priority
      const sortedTasks = [...activeTasks].sort((a, b) => {
        // First sort by overdue
        const aOverdue = a.dueDate && new Date(a.dueDate) < new Date();
        const bOverdue = b.dueDate && new Date(b.dueDate) < new Date();
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        
        // Then by priority
        const priorityOrder = { 'URGENT': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        
        // Then by due date
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        
        return 0;
      });
      
      parsedResponse = {
        prioritizedTasks: sortedTasks.slice(0, 5).map(task => ({
          id: task.id,
          title: task.title,
          reason: `${task.priority} priority${task.dueDate ? `, due ${new Date(task.dueDate).toLocaleDateString()}` : ''}`
        })),
        logic: "Tasks are prioritized based on urgency, priority level, and due date.",
        atRiskTasks: [],
        suggestions: []
      };
    }
    
    const result = {
      message: "Here are your prioritized tasks based on urgency, importance, and deadlines.",
      ...parsedResponse
    };
    
    // Cache the result for 30 minutes
    mediumTermCache.set(cacheKey, result, 1800000);
    
    return result;
  } catch (error) {
    console.error('Error generating task prioritization:', error);
    return {
      message: "Error generating task prioritization. Using default sorting by priority and due date.",
      prioritizedTasks: [],
      logic: "Default sorting by priority and due date.",
      atRiskTasks: [],
      suggestions: []
    };
  }
};