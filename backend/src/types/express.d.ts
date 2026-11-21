import { AuthenticatedUser } from '../middleware/auth.middleware';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser | any;
      params: Record<string, string>;
    }
  }
}


