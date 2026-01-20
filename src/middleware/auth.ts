import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../config/index.js';
import { UnauthorizedError } from '../shared/errors/index.js';
import { User } from '../modules/users/user.model.js';

// JWKS client for Zitadel public keys
const client = jwksClient({
  jwksUri: `${config.zitadel.issuer}/oauth/v2/keys`,
  cache: true,
  rateLimit: true,
});

function getSigningKey(header: jwt.JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    client.getSigningKey(header.kid, (err, key) => {
      if (err) return reject(err);
      const signingKey = key?.getPublicKey();
      if (!signingKey) return reject(new Error('No signing key found'));
      resolve(signingKey);
    });
  });
}

interface ZitadelTokenPayload {
  sub: string;
  email?: string;
  name?: string;
  'urn:zitadel:iam:user:metadata'?: {
    role?: string;
  };
}

// Main auth middleware
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing authorization header');
    }

    const token = authHeader.substring(7);

    // Decode header to get kid
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      throw new UnauthorizedError('Invalid token format');
    }

    // Get signing key and verify
    const signingKey = await getSigningKey(decoded.header);
    const payload = jwt.verify(token, signingKey, {
      issuer: config.zitadel.issuer,
      audience: config.zitadel.clientId,
    }) as ZitadelTokenPayload;

    // Get or create local user
    let dbUser = await User.findOne({ zitadelId: payload.sub });

    if (!dbUser) {
      // Auto-create user on first login
      dbUser = await User.create({
        zitadelId: payload.sub,
        email: payload.email || '',
        name: payload.name || '',
        role: payload['urn:zitadel:iam:user:metadata']?.role || 'student',
      });
    }

    // Attach user to request
    req.user = {
      sub: payload.sub,
      email: payload.email || dbUser.email,
      name: payload.name || dbUser.name,
      role: dbUser.role,
      dbUser,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new UnauthorizedError('Invalid token'));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError('Token expired'));
    }
    next(error);
  }
}

// Optional auth - doesn't fail if no token, but parses if present
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(); // No token, continue without user
  }
  return authenticate(req, res, next);
}