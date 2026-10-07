import { describe, expect, it } from 'bun:test';
import {
  requireAdmin,
  requireAdminOrManager,
  requireRole,
  requireStaff,
} from '@/lib/auth-middleware';
import { USER_ROLES } from '@/lib/roles';

function makeSession(role: string) {
  return {
    user: {
      id: 'u1',
      email: 'test@test.com',
      name: 'Test',
      role,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      imageUrl: '',
      imagePublicId: null,
      banned: false,
      banReason: null,
      banExpires: null,
      twoFactorEnabled: false,
    },
    session: {
      id: 's1',
      userId: 'u1',
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      updatedAt: new Date(),
      token: 'tok',
      ipAddress: null,
      userAgent: null,
    },
  };
}

describe('requireRole', () => {
  it('returns null when role matches', () => {
    expect(requireRole(makeSession('ADMIN'), USER_ROLES.ADMIN)).toBeNull();
  });

  it('returns 403 when role does not match', () => {
    const response = requireRole(makeSession('USER'), USER_ROLES.ADMIN);
    expect(response).not.toBeNull();
    expect(response?.status).toBe(403);
  });

  it('returns null when any of multiple roles match', () => {
    expect(
      requireRole(makeSession('MANAGER'), USER_ROLES.ADMIN, USER_ROLES.MANAGER),
    ).toBeNull();
  });
});

describe('requireAdmin', () => {
  it('returns null for admin', () => {
    expect(requireAdmin(makeSession('ADMIN'))).toBeNull();
  });

  it('returns 403 for non-admin', () => {
    expect(requireAdmin(makeSession('USER'))?.status).toBe(403);
  });

  it('returns 403 for manager', () => {
    expect(requireAdmin(makeSession('MANAGER'))?.status).toBe(403);
  });
});

describe('requireStaff', () => {
  it('returns null for admin', () => {
    expect(requireStaff(makeSession('ADMIN'))).toBeNull();
  });

  it('returns null for manager', () => {
    expect(requireStaff(makeSession('MANAGER'))).toBeNull();
  });

  it('returns null for customer service', () => {
    expect(requireStaff(makeSession('CUSTOMER_SERVICE'))).toBeNull();
  });

  it('returns 403 for vendor', () => {
    expect(requireStaff(makeSession('VENDOR'))?.status).toBe(403);
  });
});

describe('requireAdminOrManager', () => {
  it('returns null for admin', () => {
    expect(requireAdminOrManager(makeSession('ADMIN'))).toBeNull();
  });

  it('returns null for manager', () => {
    expect(requireAdminOrManager(makeSession('MANAGER'))).toBeNull();
  });

  it('returns 403 for vendor', () => {
    expect(requireAdminOrManager(makeSession('VENDOR'))?.status).toBe(403);
  });
});
