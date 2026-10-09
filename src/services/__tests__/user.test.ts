import { describe, expect, it, spyOn } from 'bun:test';
import apiClient from '@/lib/api-client';

describe('user service avatar upload', () => {
  it('posts multipart form data to /api/upload/avatar', async () => {
    const post = spyOn(apiClient, 'post').mockResolvedValue({
      data: {
        imageUrl: 'https://res.cloudinary.com/oylkka/avatars/abc.jpg',
        imagePublicId: 'avatars/abc',
      },
    });

    const file = new File(['avatar-bytes'], 'me.png', { type: 'image/png' });
    const formData = new FormData();
    formData.append('image', file);

    const response = await apiClient.post('/api/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    expect(post).toHaveBeenCalledWith('/api/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    expect(response.data.imageUrl).toContain('cloudinary');
    expect(typeof response.data.imagePublicId).toBe('string');
  });
});
