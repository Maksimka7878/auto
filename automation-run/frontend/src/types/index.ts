// User types
export interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  settings?: UserSettings;
  usage?: UserUsage;
  createdAt: string;
}

export interface UserSettings {
  notifications: {
    email: boolean;
    telegram: boolean;
  };
  timezone: string;
  language: string;
}

export interface UserUsage {
  workflowsCount: number;
  executionsThisMonth: number;
  storageUsed: number;
}

export interface UserStats {
  workflowsCount: number;
  executionsThisMonth: number;
  storageUsed: number;
  plan: string;
  limits: {
    workflowsLimit: number;
    executionsLimit: number;
    storageLimit: number;
  };
}

// Workflow types
export interface Workflow {
  _id: string;
  userId: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  connections: NodeConnection[];
  isActive: boolean;
  status: 'draft' | 'active' | 'paused' | 'error';
  webhookUrl: string;
  webhookSecret: string;
  scheduleExpression?: string;
  lastExecutedAt?: string;
  executionCount: number;
  successCount: number;
  errorCount: number;
  variables: Record<string, any>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  position: { x: number; y: number };
  config: Record<string, any>;
}

export interface NodeConnection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export type NodeType =
  // Triggers
  | 'webhook'
  | 'schedule'
  | 'email_received'
  | 'form_submission'
  // Actions
  | 'send_email'
  | 'send_telegram'
  | 'send_slack'
  | 'http_request'
  | 'google_sheets'
  | 'database'
  // Logic
  | 'if_else'
  | 'delay'
  | 'loop'
  | 'transform';

export interface NodeConfig {
  type: NodeType;
  name: string;
  description: string;
  icon: string;
  category: 'triggers' | 'actions' | 'logic';
  config: {
    name: string;
    type: string;
    label?: string;
    required?: boolean;
    default?: any;
    options?: string[];
  }[];
  outputs?: string[];
}

// Execution types
export interface Execution {
  _id: string;
  workflowId: string | { _id: string; name: string };
  userId: string;
  status: ExecutionStatus;
  startedAt?: string;
  finishedAt?: string;
  duration: number;
  triggerData: Record<string, any>;
  steps: StepLog[];
  error?: string;
  context: Record<string, any>;
  createdAt: string;
}

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'error'
  | 'cancelled';

export interface StepLog {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: ExecutionStatus;
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
}

export interface ExecutionStats {
  total: number;
  success: number;
  error: number;
  running: number;
  avgDuration: number;
}

export interface ActivityStats {
  date: string;
  success: number;
  error: number;
}

// Subscription types
export interface Subscription {
  _id: string;
  userId: string;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'past_due' | 'expired' | 'trial';
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

export interface PlanDetails {
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    workflows: number;
    executions: number;
    storage: number;
  };
}

// Payment types
export interface Payment {
  _id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  provider: 'stripe' | 'yookassa' | 'sberbank';
  description?: string;
  receiptUrl?: string;
  createdAt: string;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}
