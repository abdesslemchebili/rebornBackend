/**
 * Swagger/OpenAPI configuration. Optional; enable via SWAGGER_ENABLED=true.
 */
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const env = require('./env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'REBORN API',
      version: '1.0.0',
      description: 'Tunisian industrial product distribution backend API',
    },
    servers: [{ url: env.apiPrefix, description: 'API base' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.routes.js', './src/routes/index.js'],
};

const spec = swaggerJsdoc(options);

function swaggerMiddleware() {
  return [swaggerUi.serve, swaggerUi.setup(spec, { explorer: true })];
}

module.exports = { swaggerMiddleware, spec };
