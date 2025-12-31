declare namespace Express {
  export interface Request {
    user?: {
      userId: string;
      email: string;
      plan: 'free' | 'pro' | 'enterprise';
    };
  }
}
