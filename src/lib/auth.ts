import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { DeleteImage } from '@/cloudinary';
import { existingAccountHtml, welcomeHtml } from '@/lib/email-templates';
import { sendEmail } from '@/lib/send-email';
import { getTrustedOrigins } from '@/lib/trusted-origins';
import { prisma } from './db';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  user: {
    // Remap better-auth's internal `image` field to your `imageUrl` column
    fields: {
      image: 'imageUrl',
    },
    additionalFields: {
      imagePublicId: {
        type: 'string',
        required: false,
        defaultValue: null,
        input: false,
      },
    },
  },

  socialProviders: {
    google: {
      prompt: 'select_account',
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  trustedOrigins: getTrustedOrigins(),

  databaseHooks: {
    user: {
      update: {
        before: async (data, ctx) => {
          // Cloudinary upload sends "imageUrl|imagePublicId" as a pipe-separated string
          // We split it here into the two separate fields
          if (
            typeof data.imageUrl === 'string' &&
            data.imageUrl.includes('|')
          ) {
            const [imageUrl, imagePublicId] = data.imageUrl.split('|');
            data.imageUrl = imageUrl;
            data.imagePublicId = imagePublicId;
          }

          // If the user is swapping their image, delete the old Cloudinary asset first
          if (data.imageUrl || data.imagePublicId) {
            if (ctx?.context?.session) {
              const session = ctx.context.session;
              if (session?.user?.userId) {
                const user = await prisma.user.findUnique({
                  where: { id: session.user.userId },
                  select: { imagePublicId: true },
                });

                // Only delete if previous image was a Cloudinary asset (has a publicId)
                if (user?.imagePublicId) {
                  DeleteImage(user.imagePublicId).catch((err) => {
                    // biome-ignore lint/suspicious/noConsole: this is fine
                    console.error('Failed to delete old profile image', err);
                  });
                }
              }
            }
          }

          // If the user is being email-verified, send a welcome email
          if (data.emailVerified === true && typeof data.id === 'string') {
            const currentUser = await prisma.user.findUnique({
              where: { id: data.id },
              select: { emailVerified: true, name: true, email: true },
            });
            if (currentUser && !currentUser.emailVerified) {
              sendEmail({
                to: currentUser.email,
                subject: 'Welcome to Oylkka!',
                meta: {
                  description: '',
                  link: '',
                  callToActionText: '',
                },
                html: welcomeHtml(currentUser.name),
              }).catch((err) => {
                // biome-ignore lint/suspicious/noConsole: this is fine
                console.error('Failed to send welcome email', err);
              });
            }
          }

          return { data };
        },
      },

      create: {
        after: async (user) => {
          await prisma.subscriber.upsert({
            where: { email: user.email },
            update: {
              name: user.name ?? undefined,
              status: 'ACTIVE',
            },
            create: {
              email: user.email,
              name: user.name ?? undefined,
              source: 'google_signup',
              status: 'ACTIVE',
            },
          });
        },
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    minPasswordLength: 6,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const resetUrl = new URL(url);
      resetUrl.searchParams.set('email', user.email);
      await sendEmail({
        to: user.email,
        subject: 'Reset your password',
        meta: {
          description:
            'You requested a password reset. Click below to continue.',
          link: String(resetUrl),
          callToActionText: 'Reset Password',
        },
      });
    },
    onExistingUserSignUp: async ({ user }) => {
      try {
        const googleAccount = await prisma.account.findFirst({
          where: { userId: user.id, providerId: 'google' },
          select: { id: true },
        });

        const provider = googleAccount ? 'Google' : 'email/password';

        await sendEmail({
          to: user.email,
          subject: 'You already have an Oylkka account',
          meta: {
            description: `We noticed someone tried to create a new account with this email. You're already signed up via ${provider}.`,
            link: `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/auth/signin`,
            callToActionText: 'Sign In',
          },
          html: existingAccountHtml(user.name || undefined, provider),
        });
      } catch (err) {
        // biome-ignore lint/suspicious/noConsole: this is fine
        console.error('Failed to send existing account notification', err);
      }
    },
  },

  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    sendOnSignIn: true,
    expiresIn: 3600,
    sendVerificationEmail: async ({ user, url }) => {
      const link = new URL(url);
      link.searchParams.set('callbackURL', '/auth/verify');
      await sendEmail({
        to: user.email,
        subject: 'Verify your email address',
        meta: {
          description: 'Please verify your email to activate your account.',
          link: String(link),
          callToActionText: 'Verify Email Address',
        },
      });
    },
  },

  session: {
    expiresIn: 30 * 24 * 60 * 60, // 30 days
  },

  plugins: [
    admin({
      defaultRole: 'USER',
      adminRoles: ['ADMIN'],
      defaultAdminEmail: process.env.ADMIN_EMAIL,
    }),
    tanstackStartCookies(),
  ],
});
