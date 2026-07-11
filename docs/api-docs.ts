// backend/src/docs/api-docs.ts
export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'CorePress CMS API',
    version: '1.0.0',
    description: 'API documentation for CorePress CMS',
    contact: {
      name: 'CorePress Team',
      email: 'support@corepress.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Development Server'
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
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { 
            type: 'string',
            enum: ['super_admin', 'admin', 'editor', 'author', 'viewer']
          },
          avatar: { type: 'string' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Post: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          slug: { type: 'string' },
          content: { type: 'object' },
          excerpt: { type: 'string' },
          status: { 
            type: 'string',
            enum: ['draft', 'published', 'archived']
          },
          featuredImage: { type: 'string' },
          author: { type: 'string' },
          categories: { 
            type: 'array',
            items: { type: 'string' }
          },
          tags: {
            type: 'array',
            items: { type: 'string' }
          },
          seoTitle: { type: 'string' },
          seoDescription: { type: 'string' },
          views: { type: 'number' },
          likes: { type: 'number' },
          publishedAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Page: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          slug: { type: 'string' },
          content: { type: 'object' },
          status: {
            type: 'string',
            enum: ['draft', 'published']
          },
          seoTitle: { type: 'string' },
          seoDescription: { type: 'string' },
          template: {
            type: 'string',
            enum: ['default', 'full-width', 'landing', 'contact']
          },
          isHomepage: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          color: { type: 'string' },
          parentCategory: { type: 'string' },
          order: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Media: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          fileName: { type: 'string' },
          fileUrl: { type: 'string' },
          fileType: { type: 'string' },
          fileSize: { type: 'number' },
          altText: { type: 'string' },
          width: { type: 'number' },
          height: { type: 'number' },
          uploadedBy: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Settings: {
        type: 'object',
        properties: {
          siteName: { type: 'string' },
          siteDescription: { type: 'string' },
          siteLogo: { type: 'string' },
          primaryColor: { type: 'string' },
          secondaryColor: { type: 'string' },
          footerText: { type: 'string' },
          navigationMenu: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                url: { type: 'string' },
                order: { type: 'number' }
              }
            }
          }
        }
      },
      ActivityLog: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          action: { type: 'string' },
          details: { type: 'string' },
          ipAddress: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          severity: {
            type: 'string',
            enum: ['info', 'warning', 'error', 'critical']
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          errors: { 
            type: 'array',
            items: { type: 'object' }
          }
        }
      },
      Success: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'object' }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  paths: {
    // Auth endpoints
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Success' }
              }
            }
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Success' }
              }
            }
          },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'User data retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Success' }
              }
            }
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    }
    // ... Add more path definitions for other endpoints
  }
};