export default {
  'swagger-api': {
    input: `https://drawsql.merrai.ai/api/v1/openapi.json`,
    output: {
      target: './src/api/generated/endpoints.ts',
      schemas: './src/api/generated/models',
      client: 'react-query',
      baseUrl: 'https://drawsql.merrai.ai',
    },
  },
};
