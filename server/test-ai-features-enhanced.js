import { 
  generateTaskDescription, 
  predictNextCategory, 
  generateCriticalTasksReport,
  generateTitleSuggestions
} from './utils/aiUtils.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test function
async function testAIFeatures() {
  console.log('Testing Enhanced AI Features...\n');
  
  try {
    // Test 1: Title Suggestions
    console.log('Test 1: Title Suggestions');
    console.log('------------------------');
    const prefix = 'upd';
    console.log(`Prefix: "${prefix}"`);
    const suggestions = await generateTitleSuggestions(prefix, 'test-user');
    console.log('Suggested titles:');
    suggestions.forEach((title, index) => {
      console.log(`${index + 1}. ${title}`);
    });
    console.log('\n');
    
    // Test 2: Category Prediction with Title Context
    console.log('Test 2: Category Prediction with Title Context');
    console.log('-------------------------------------------');
    const taskTitle = 'Update marketing presentation for Q3 campaign';
    console.log(`Task Title: "${taskTitle}"`);
    const predictedCategory = await predictNextCategory('test-user', null, taskTitle);
    console.log(`Predicted category: ${predictedCategory || 'No prediction available'}`);
    console.log('\n');
    
    // Test 3: Enhanced Description Generation
    console.log('Test 3: Enhanced Description Generation');
    console.log('------------------------------------');
    const title = 'Implement new authentication system';
    const summary = 'Need to replace our current auth with OAuth2 and add MFA support';
    console.log(`Title: ${title}`);
    console.log(`Summary: ${summary}`);
    const description = await generateTaskDescription(title, summary, 'test-user');
    console.log(`Generated description:\n${description}`);
    console.log('\n');
    
    // Test 4: Critical Tasks Report
    console.log('Test 4: Critical Tasks Report');
    console.log('---------------------------');
    
    // Mock tasks for the report
    const mockTasks = [
      {
        id: '1',
        title: 'Fix security vulnerability',
        description: 'Critical security issue in authentication module',
        status: 'PENDING',
        priority: 'URGENT',
        dueDate: new Date(Date.now() - 86400000), // 1 day ago
        createdBy: { firstName: 'John', lastName: 'Doe' },
        assignedTo: { firstName: 'Jane', lastName: 'Smith' }
      },
      {
        id: '2',
        title: 'Complete quarterly financial report',
        description: 'Prepare Q3 financial summary for board meeting',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 86400000), // 1 day from now
        createdBy: { firstName: 'Jane', lastName: 'Smith' },
        assignedTo: { firstName: 'John', lastName: 'Doe' }
      },
      {
        id: '3',
        title: 'Deploy website update',
        description: 'Push new features to production',
        status: 'PENDING',
        priority: 'MEDIUM',
        dueDate: new Date(Date.now() - 172800000), // 2 days ago
        createdBy: { firstName: 'Mike', lastName: 'Johnson' },
        assignedTo: { firstName: 'Sarah', lastName: 'Williams' }
      }
    ];
    
    const report = await generateCriticalTasksReport(mockTasks);
    console.log(`Generated report:\n${report}`);
    
  } catch (error) {
    console.error('Error testing AI features:', error);
  }
}

// Run the tests
testAIFeatures();