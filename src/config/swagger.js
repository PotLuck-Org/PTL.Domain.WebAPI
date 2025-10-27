const swaggerJsdoc = require('swagger-jsdoc');

// Determine server URL based on environment
const getServerUrl = () => {
  // Use relative URL for Railway deployment to avoid CORS issues
  if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') {
    return '/api';
  }
  
  // For local development
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}/api`;
};

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Potluck API',
      version: '1.0.0',
      description: 'A community platform API for organizing events, seminars, and get-togethers for professionals',
      contact: {
        name: 'Potluck Support',
        email: 'support@potluck.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: getServerUrl(),
        description: process.env.RAILWAY_ENVIRONMENT ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
            role: { 
              type: 'string', 
              enum: ['Admin', 'Member', 'President', 'Secretary']
            },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        UserProfile: {
          type: 'object',
          properties: {
            firstname: { type: 'string' },
            lastname: { type: 'string' },
            middlename: { type: 'string' },
            about: { type: 'string' },
            occupation: { type: 'string' },
            phone_number: { type: 'string' }
          }
        },
        UserSocials: {
          type: 'object',
          properties: {
            facebook_url: { type: 'string', format: 'uri' },
            github_url: { type: 'string', format: 'uri' },
            linkedin_url: { type: 'string', format: 'uri' },
            twitter_url: { type: 'string', format: 'uri' }
          }
        },
        UserAddress: {
          type: 'object',
          properties: {
            street_number: { type: 'string' },
            street_address: { type: 'string' },
            post_code: { type: 'string' },
            county: { type: 'string' }
          }
        },
        Event: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            event_name: { type: 'string' },
            event_address: { type: 'string' },
            event_time: { type: 'string', format: 'time' },
            event_date: { type: 'string', format: 'date' },
            event_description: { type: 'string' },
            event_host: { type: 'string', format: 'uuid' },
            host_username: { type: 'string' },
            host_email: { type: 'string', format: 'email' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Blog: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            blog_content: { type: 'string' },
            is_available: { type: 'boolean' },
            author_id: { type: 'string', format: 'uuid' },
            author: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Timeline: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            content: { type: 'string' },
            image_url: { type: 'string', format: 'uri' },
            attachment_url: { type: 'string', format: 'uri' },
            attachment_name: { type: 'string' },
            author_id: { type: 'string' },
            author_username: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Poll: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            question: { type: 'string' },
            description: { type: 'string' },
            created_by: { type: 'string' },
            creator_username: { type: 'string' },
            expires_at: { type: 'string', format: 'date-time' },
            is_active: { type: 'boolean' },
            total_votes: { type: 'number' },
            options: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  option_text: { type: 'string' },
                  vote_count: { type: 'number' },
                  vote_percentage: { type: 'string' }
                }
              }
            },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js'] // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

