const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const pool = require('./config/database');
const fs = require('fs');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const eventRoutes = require('./routes/events');
const blogRoutes = require('./routes/blogs');
const timelineRoutes = require('./routes/timeline');
const pollRoutes = require('./routes/polls');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Swagger UI Documentation (must be before API routes)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Potluck API Documentation'
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Routes
app.use('/api', authRoutes);
app.use('/api', profileRoutes);
app.use('/api', eventRoutes);
app.use('/api', blogRoutes);
app.use('/api', timelineRoutes);
app.use('/api', pollRoutes);
app.use('/api', adminRoutes);

// Initialize database on startup
async function initializeDatabase() {
  try {
    // Check connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established');

    // Read and execute SQL initialization script
    const sqlFile = path.join(__dirname, '../src/config/database-init.sql');
    
    if (fs.existsSync(sqlFile)) {
      const sql = fs.readFileSync(sqlFile, 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await pool.query(statement);
          } catch (err) {
            // Ignore "already exists" errors
            if (!err.message.includes('already exists') && 
                !err.message.includes('duplicate key')) {
              console.warn('SQL execution warning:', err.message);
            }
          }
        }
      }
      
      console.log('✅ Database schema initialized');
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await initializeDatabase();
  console.log(`✅ API is ready at http://localhost:${PORT}/api`);
  console.log(`📚 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

module.exports = app;
