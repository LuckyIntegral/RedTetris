import swaggerJSDoc from 'swagger-jsdoc';

const PORT = process.env.PORT ?? 3001;
const SERVER_URL = `http://localhost:${PORT}`;

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Red Tetris API',
    version: '1.0.0',
    description: 'API documentation for Red Tetris game backend',
    contact: { name: 'Red Tetris Team' },
  },
  servers: [{ url: SERVER_URL, description: 'Development server' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token in the format: Bearer <token>',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'User ID', example: 1 },
          username: { type: 'string', description: 'Unique username', example: 'testuser' },
          email: { type: 'string', format: 'email', description: 'User email address', example: 'test@example.com' },
          created_at: { type: 'string', format: 'date-time', description: 'Account creation timestamp' },
          updated_at: { type: 'string', format: 'date-time', description: 'Last update timestamp' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              token: {
                type: 'string',
                description: 'JWT authentication token',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
            },
          },
        },
      },
      UserResponse: {
        type: 'object',
        properties: { success: { type: 'boolean', example: true }, data: { $ref: '#/components/schemas/User' } },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', description: 'Error code', example: 'INVALID_CREDENTIALS' },
              message: { type: 'string', description: 'Error message', example: 'Invalid username or password' },
            },
          },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: {
            type: 'string',
            minLength: 3,
            maxLength: 50,
            pattern: '^[a-zA-Z0-9_-]+$',
            description: 'Username (3-50 characters, alphanumeric with hyphens and underscores)',
            example: 'testuser',
          },
          email: { type: 'string', format: 'email', description: 'Valid email address', example: 'test@example.com' },
          password: {
            type: 'string',
            minLength: 6,
            description: 'Password (minimum 6 characters)',
            example: 'password123',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', description: 'Username', example: 'testuser' },
          password: { type: 'string', description: 'Password', example: 'password123' },
        },
      },
    },
  },
};

const options: swaggerJSDoc.Options = { swaggerDefinition, apis: ['./routes/*.ts', './controllers/*.ts', './app.ts'] };

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
