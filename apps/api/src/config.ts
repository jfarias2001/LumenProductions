export const config = {
  port: Number(process.env['PORT'] ?? 3001),
  host: process.env['HOST'] ?? '0.0.0.0',
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  jwtAccessSecret: process.env['JWT_ACCESS_SECRET'] ?? 'access-secret-dev',
  jwtRefreshSecret: process.env['JWT_REFRESH_SECRET'] ?? 'refresh-secret-dev',
  jwtAccessExpiry: '15m',
  jwtRefreshExpiry: '7d',
  redisUrl: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  openaiApiKey: process.env['OPENAI_API_KEY'] ?? '',
  aiDefaultModel: process.env['AI_DEFAULT_MODEL'] ?? 'gpt-4o-mini',
  corsOrigin: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173',
  timezone: 'America/Sao_Paulo',
};
