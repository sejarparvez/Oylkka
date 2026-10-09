import { createFileRoute, useRouter } from '@tanstack/react-router';
import { Camera, KeyRound, Loader2, Save, User } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { TwoFactorCard } from '@/components/account/two-factor-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { changePassword, updateUser } from '@/lib/auth-client';
import { useUploadAvatarMutation } from '@/services/user';

export const Route = createFileRoute('/dashboard/my-account')({
  component: MyAccountPage,
});

function MyAccountPage() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const [name, setName] = useState(user.name ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAvatar = useUploadAvatarMutation();

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await updateUser({ name: trimmed });
      if (error) {
        toast.error(error.message || 'Failed to update profile');
        return;
      }
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (!currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (newPassword.length < 10) {
      toast.error('Password must be at least 10 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        toast.error(error.message || 'Failed to change password');
        return;
      }
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>My Account</h1>
        <p className='text-sm text-muted-foreground mt-1'>
          Manage your profile and account settings
        </p>
      </div>

      <Card className='rounded-2xl border-border shadow-none'>
        <CardHeader>
          <CardTitle className='text-lg flex items-center gap-2'>
            <User className='h-5 w-5' />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='flex items-center gap-4'>
            <div className='relative group'>
              <div className='h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden'>
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name}
                    width={64}
                    height={64}
                    loading='lazy'
                    decoding='async'
                    className='h-full w-full object-cover'
                  />
                ) : (
                  <User className='h-7 w-7 text-muted-foreground' />
                )}
              </div>
              <button
                type='button'
                className='absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-50'
                disabled={isUploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploadingAvatar ? (
                  <Loader2 className='h-5 w-5 text-white animate-spin' />
                ) : (
                  <Camera className='h-5 w-5 text-white' />
                )}
              </button>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/jpeg,image/png,image/webp'
                className='hidden'
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  if (file.size > 2 * 1024 * 1024) {
                    toast.error('Image must be under 2MB');
                    return;
                  }

                  setIsUploadingAvatar(true);
                  try {
                    const { imageUrl } = await uploadAvatar.mutateAsync(file);
                    const { error } = await updateUser({ image: imageUrl });
                    if (error) throw new Error(error.message);
                    toast.success('Avatar updated');
                    router.invalidate();
                  } catch (err) {
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : 'Failed to upload avatar',
                    );
                  } finally {
                    setIsUploadingAvatar(false);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }
                }}
              />
            </div>
            <div>
              <p className='text-sm font-medium'>{user.name}</p>
              <p className='text-xs text-muted-foreground'>{user.email}</p>
            </div>
          </div>

          <Separator />

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor='name'>Full Name</FieldLabel>
              <Input
                id='name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Your full name'
              />
              {!name.trim() && <FieldError>Name is required</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor='email'>Email</FieldLabel>
              <Input
                id='email'
                value={user.email ?? ''}
                disabled
                placeholder='your@email.com'
              />
              <p className='text-xs text-muted-foreground mt-1'>
                Email cannot be changed
              </p>
            </Field>
          </FieldGroup>

          <div className='flex justify-end'>
            <Button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className='gap-2'
            >
              {isSaving ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Save className='h-4 w-4' />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className='rounded-2xl border-border shadow-none'>
        <CardHeader>
          <CardTitle className='text-lg flex items-center gap-2'>
            <KeyRound className='h-5 w-5' />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className='space-y-6'>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor='current-password'>
                  Current Password
                </FieldLabel>
                <Input
                  id='current-password'
                  type='password'
                  autoComplete='current-password'
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isChangingPassword}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor='new-password'>New Password</FieldLabel>
                <Input
                  id='new-password'
                  type='password'
                  autoComplete='new-password'
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isChangingPassword}
                />
                {newPassword && newPassword.length < 10 && (
                  <FieldError>
                    Password must be at least 10 characters
                  </FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor='confirm-new-password'>
                  Confirm New Password
                </FieldLabel>
                <Input
                  id='confirm-new-password'
                  type='password'
                  autoComplete='new-password'
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isChangingPassword}
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <FieldError>Passwords do not match</FieldError>
                )}
              </Field>
            </FieldGroup>

            <div className='flex justify-end'>
              <Button
                type='submit'
                disabled={
                  isChangingPassword ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
                className='gap-2'
              >
                {isChangingPassword ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <KeyRound className='h-4 w-4' />
                )}
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className='rounded-2xl border-border shadow-none'>
        <CardHeader>
          <CardTitle className='text-lg flex items-center gap-2'>
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div>
              <Label className='text-xs text-muted-foreground'>User ID</Label>
              <p className='text-sm font-mono'>{user.id}</p>
            </div>
            <div>
              <Label className='text-xs text-muted-foreground'>Role</Label>
              <p className='text-sm font-medium capitalize'>
                {user.role?.toLowerCase().replace('_', ' ')}
              </p>
            </div>
            <div>
              <Label className='text-xs text-muted-foreground'>
                Email Verified
              </Label>
              <p className='text-sm'>
                {user.emailVerified ? (
                  <span className='text-emerald-600 font-medium'>Yes</span>
                ) : (
                  <span className='text-amber-600 font-medium'>No</span>
                )}
              </p>
            </div>
            <div>
              <Label className='text-xs text-muted-foreground'>Joined</Label>
              <p className='text-sm'>
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <TwoFactorCard enabled={Boolean(user.twoFactorEnabled)} />
    </div>
  );
}
