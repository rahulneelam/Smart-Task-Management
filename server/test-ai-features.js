import { generateTaskDescription, predictNextCategory, generateCriticalTasksReport } from './utils/aiUtils.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test data
const mockTasks = [
  {
    id: '1',
    title: 'Complete project proposal',
    description: 'Draft the initial proposal for the client',
    status: 'PENDING',
    priority: 'HIGH',
    category: 'Work',
    dueDate: new Date(Date.now() - 86400000 * 2), // 2 days ago
    createdAt: new Date(Date.now() - 86400000 * 5),
    createdBy: {
      id: 'user1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com'
    },
    assignedTo: {
      id: 'user2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com'
    }
  },
  {
    id: '2',
    title: 'Review code changes',
    description: 'Review pull request #123',
    status: 'IN_PROGRESS',
    priority: 'URGENT',
    category: 'Development',
    dueDate: new Date(Date.now() - 86400000), // 1 day ago
    createdAt: new Date(Date.now() - 86400000 * 3),
    createdBy: {
      id: 'user1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com'
    },
    assignedTo: {
      id: 'user3',
      firstName: 'Mike',
      lastName: 'Johnson',
      email: 'mike@example.com'
    }
  },
  {
    id: '3',
    title: 'Prepare for client meeting',
    description: 'Create presentation slides',
    status: 'PENDING',
    priority: 'MEDIUM',
    category: 'Work',
    dueDate: new Date(Date.now() + 86400000), // 1 day from now
    createdAt: new Date(Date.now() - 86400000 * 2),
    createdBy: {
      id: 'user2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com'
    },
    assignedTo: null
  }
];

const userTasks = [
  {
    id: '1',
    category: 'Work',
    createdAt: new Date(Date.now() - 86400000 * 5)
  },
  {
    id: '2',
    category: 'Development',
    createdAt: new Date(Date.now() - 86400000 * 3)
  },
  {
    id: '3',
    category: 'Work',
    createdAt: new Date(Date.now() - 86400000 * 2)
  },
  {
    id: '4',
    category: 'Work',
    createdAt: new Date(Date.now() - 86400000)
  }
];

// Test function
async function testAIFeatures() {
  console.log('Testing AI Features...\n');
  
  try {
    // Test 1: Predict next category
    console.log('Test 1: Predict Next Category');
    console.log('-----------------------------');
    const predictedCategory = await predictNextCategory('user1', userTasks);
    console.log(`Predicted category: ${predictedCategory}`);
    console.log('\n');
    
    // Test 2: Generate task description
    console.log('Test 2: Generate Task Description');
    console.log('--------------------------------');
    const title = 'Implement new authentication system';
    const summary = 'Need to replace our current auth with OAuth2 and add MFA support';
    console.log(`Title: ${title}`);
    console.log(`Summary: ${summary}`);
    const description = await generateTaskDescription(title, summary);
    console.log(`Generated description:\n${description}`);
    console.log('\n');
    
    // Test 3: Generate critical tasks report
    console.log('Test 3: Generate Critical Tasks Report');
    console.log('------------------------------------');
    const report = await generateCriticalTasksReport(mockTasks);
    console.log(`Generated report:\n${report}`);
    
  } catch (error) {
    console.error('Error testing AI features:', error);
  }
}

// Run the tests
testAIFeatures();