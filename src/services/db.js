const { PrismaClient } = require('@prisma/client');

class DatabaseService {
  constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async connect() {
    try {
      await this.prisma.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.prisma.$disconnect();
      console.log('✅ Database disconnected successfully');
    } catch (error) {
      console.error('❌ Database disconnection failed:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(), 
        error: error.message 
      };
    }
  }

  // Helper method for transactions
  async transaction(operations) {
    return await this.prisma.$transaction(operations);
  }

  // Getter for prisma client
  get client() {
    return this.prisma;
  }
}

const dbService = new DatabaseService();

// Export both the service and prisma client for compatibility
module.exports = {
  dbService,
  prisma: dbService.prisma
};