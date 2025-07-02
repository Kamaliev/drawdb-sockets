export default {
  'swagger-api': {
    input: `http://localhost:8000/api/v1/openapi.json`,
    output: {
      target: './src/api/generated/endpoints.ts',
      schemas: './src/api/generated/models',
      client: 'react-query',
      baseUrl: 'http://localhost:8000',
    },
  },
};
