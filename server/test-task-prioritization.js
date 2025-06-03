import { generateTaskPrioritization } from './utils/aiUtils.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test data - a mix of tasks with different priorities, statuses, and due dates
const mockTasks = [
  {
    id: 'task1',
    title: 'Finish quarterly report',
    description: 'Complete the Q3 financial report for the board meeting',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    category: 'Finance',
    dueDate: new Date(Date.now() + 86400000), // Due tomorrow
    createdAt: new Date(Date.now() - 86400000 * 5),
  },
  {
    id: 'task2',
    title: 'Fix critical security bug',
    description: 'Address the authentication vulnerability in the login system',
    status: 'PENDING',
    priority: 'URGENT',
    category: 'Development',
    dueDate: new Date(Date.now() - 86400000), // Overdue by 1 day
    createdAt: new Date(Date.now() - 86400000 * 2),
  },
  {
    id: 'task3',
    title: 'Prepare for client presentation',
    description: 'Create slides for the new product demo',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    category: 'Marketing',
    dueDate: new Date(Date.now() + 86400000 * 3), // Due in 3 days
    createdAt: new Date(Date.now() - 86400000 * 3),
  },
  {
    id: 'task4',
    title: 'Update team documentation',
    description: 'Refresh the onboarding guide with new procedures',
    status: 'PENDING',
    priority: 'LOW',
    category: 'Admin',
    dueDate: new Date(Date.now() + 86400000 * 7), // Due in a week
    createdAt: new Date(Date.now() - 86400000),
  },
  {
    id: 'task5',
    title: 'Weekly team meeting',
    description: 'Regular sync-up with the development team',
    status: 'PENDING',
    priority: 'MEDIUM',
    category: 'Meetings',
    dueDate: new Date(Date.now() + 86400000 * 2), // Due in 2 days
    createdAt: new Date(Date.now() - 86400000 * 4),
  },
  {
    id: 'task6',
    title: 'Review pull requests',
    description: 'Check and approve pending code changes',
    status: 'PENDING',
    priority: 'HIGH',
    category: 'Development',
    dueDate: null, // No due date
    createdAt: new Date(Date.now() - 86400000 * 1),
  },
  {
    id: 'task7',
    title: 'Respond to customer support tickets',
    description: 'Address the backlog of customer inquiries',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    category: 'Support',
    dueDate: new Date(Date.now()), // Due today
    createdAt: new Date(Date.now() - 86400000 * 2),
  },
];

// Test function
async function testTaskPrioritization() {
  console.log('Testing Task Prioritization...\n');
  
  try {
    console.log(`Analyzing ${mockTasks.length} tasks for prioritization...`);
    
    // Generate prioritization suggestions
    const prioritization = await generateTaskPrioritization('test-user', mockTasks);
    
    console.log('\nPrioritization Results:');
    console.log('======================');
    console.log(`Message: ${prioritization.message}`);
    console.log(`Logic: ${prioritization.logic}`);
    
    console.log('\nPrioritized Tasks:');
    console.log('-----------------');
    prioritization.prioritizedTasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title}`);
      console.log(`   Reason: ${task.reason}`);
    });
    
    if (prioritization.atRiskTasks && prioritization.atRiskTasks.length > 0) {
      console.log('\nAt-Risk Tasks:');
      console.log('-------------');
      prioritization.atRiskTasks.forEach((task, index) => {
        console.log(`${index + 1}. ${task.title}`);
        console.log(`   Risk: ${task.risk}`);
      });
    }
    
    if (prioritization.suggestions && prioritization.suggestions.length > 0) {
      console.log('\nSuggestions:');
      console.log('------------');
      prioritization.suggestions.forEach((task, index) => {
        console.log(`${index + 1}. ${task.title}`);
        console.log(`   Suggestion: ${task.suggestion}`);
      });
    }
    
  } catch (error) {
    console.error('Error testing task prioritization:', error);
  }
}

// Run the test
testTaskPrioritization();