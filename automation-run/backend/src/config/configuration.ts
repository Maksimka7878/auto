// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0 && process.env.NODE_ENV === 'production') {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}. ` +
    'These must be set for production deployment.'
  );
}

export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/automation-run',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },

  jwt: {
    // In development, use a default secret with warning
    secret: process.env.JWT_SECRET || (() => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️  WARNING: Using default JWT secret. Set JWT_SECRET in production!');
        return 'dev-only-secret-do-not-use-in-production';
      }
      throw new Error('JWT_SECRET environment variable is required in production');
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    username: process.env.ELASTICSEARCH_USERNAME || '',
    password: process.env.ELASTICSEARCH_PASSWORD || '',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'noreply@automation.run',
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  },

  slack: {
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    signingSecret: process.env.SLACK_SIGNING_SECRET || '',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    priceIds: {
      free: '',
      pro: process.env.STRIPE_PRICE_PRO || '',
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE || '',
    },
  },

  plans: {
    free: {
      name: 'Free',
      workflowsLimit: 3,
      executionsPerMonth: 100,
      storageLimit: 100, // MB
      features: ['basic_triggers', 'basic_actions'],
    },
    pro: {
      name: 'Pro',
      workflowsLimit: 50,
      executionsPerMonth: 10000,
      storageLimit: 10240, // 10GB
      features: ['all_triggers', 'all_actions', 'advanced_logic', 'priority_support'],
    },
    enterprise: {
      name: 'Enterprise',
      workflowsLimit: -1, // unlimited
      executionsPerMonth: -1, // unlimited
      storageLimit: -1, // unlimited
      features: ['all_triggers', 'all_actions', 'advanced_logic', 'priority_support', 'custom_integrations', 'sla', 'dedicated_support'],
    },
  },
});
