import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@taskmanager.com' },
    update: {},
    create: {
      email: 'admin@taskmanager.com',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Create demo user
  const demoHashedPassword = await bcrypt.hash('demo123', 12);
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@taskmanager.com' },
    update: {},
    create: {
      email: 'demo@taskmanager.com',
      username: 'demo',
      firstName: 'Demo',
      lastName: 'User',
      password: demoHashedPassword,
      role: 'USER',
    },
  });

  console.log('✅ Demo user created:', demoUser.email);

  // Create admin settings
  const adminSettings = await prisma.adminSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      siteName: 'Smart Task Manager',
      allowUserRegistration: true,
      maxTasksPerUser: 100,
    },
  });

  console.log('✅ Admin settings created');

  // Create sample tasks
  const sampleTasks = [
    {
      title: 'Setup Project Environment',
      description: 'Configure development environment and install dependencies',
      status: 'COMPLETED',
      priority: 'HIGH',
      createdById: adminUser.id,
      assignedToId: demoUser.id,
    },
    {
      title: 'Design Database Schema',
      description: 'Create comprehensive database schema for the application',
      status: 'COMPLETED',
      priority: 'HIGH',
      createdById: adminUser.id,
      assignedToId: demoUser.id,
    },
    {
      title: 'Implement User Authentication',
      description: 'Build secure user authentication system with JWT',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      createdById: adminUser.id,
      assignedToId: demoUser.id,
    },
    {
      title: 'Create Task Management API',
      description: 'Develop REST API endpoints for task CRUD operations',
      status: 'PENDING',
      priority: 'MEDIUM',
      createdById: adminUser.id,
      assignedToId: demoUser.id,
    },
    {
      title: 'Build Admin Dashboard',
      description: 'Create admin interface for user and task management',
      status: 'PENDING',
      priority: 'MEDIUM',
      createdById: adminUser.id,
    },
  ];

  for (const task of sampleTasks) {
    await prisma.task.create({
      data: task,
    });
  }

  console.log('✅ Sample tasks created');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });