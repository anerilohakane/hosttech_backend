import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }
  return secret;
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export type UserRole = 'vendor' | 'admin' | 'staff' | 'resident';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
  organizationId?: string; // Critical for tenant isolation
  organizationStatus?: string;
  permissions?: string[];
  residentId?: string;
  propertyId?: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN as any });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function extractAuthUser(req: NextRequest): TokenPayload | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const verified = verifyToken(authHeader.substring(7));
    if (verified) return verified;
  }
  // Also check query param ?token= for inline file/document links in new tabs
  const url = new URL(req.url);
  const queryToken = url.searchParams.get('token');
  if (queryToken) {
    return verifyToken(queryToken);
  }
  return null;
}

export function requireAuth(
  req: NextRequest,
  roles?: UserRole[]
): { user: TokenPayload } | { error: string; status: number } {
  const user = extractAuthUser(req);
  if (!user) {
    return { error: 'Authentication required. Please login.', status: 401 };
  }
  if (roles && !roles.includes(user.role)) {
    return { error: 'Access denied: insufficient permissions.', status: 403 };
  }
  return { user };
}
