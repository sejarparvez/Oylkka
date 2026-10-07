import { adminClient, twoFactorClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

const authClient = createAuthClient({
  plugins: [
    adminClient(),
    // AUTH-08: when a 2FA-protected account signs in, send it to the
    // verification step instead of the dashboard.
    twoFactorClient({
      onTwoFactorRedirect: () => {
        window.location.href = '/auth/two-factor';
      },
    }),
  ],
});

export const {
  signUp,
  signIn,
  useSession,
  signOut,
  sendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  changePassword,
  updateUser,
  twoFactor,
} = authClient;
