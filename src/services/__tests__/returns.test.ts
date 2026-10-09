import { describe, expect, it, spyOn } from 'bun:test';
import apiClient from '@/lib/api-client';

describe('returns service API calls', () => {
  it('fetches my returns', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({
      data: { returns: [] },
    });

    const response = await apiClient.get('/api/returns/list');
    expect(get).toHaveBeenCalledWith('/api/returns/list');
    expect(Array.isArray(response.data.returns)).toBe(true);
  });

  it('creates a return request', async () => {
    const post = spyOn(apiClient, 'post').mockResolvedValue({
      data: { message: 'Return request created!' },
    });

    const payload = {
      orderId: 'o1',
      itemIds: ['item-1'],
      reason: 'DEFECTIVE' as const,
      details: 'Broken item',
    };

    const response = await apiClient.post('/api/returns/create', payload);
    expect(post).toHaveBeenCalledWith('/api/returns/create', payload);
    expect(response.data.message).toBe('Return request created!');
  });

  it('fetches vendor returns', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({
      data: { returns: [] },
    });

    const response = await apiClient.get('/api/vendor/returns/list');
    expect(get).toHaveBeenCalledWith('/api/vendor/returns/list');
    expect(Array.isArray(response.data.returns)).toBe(true);
  });

  it('fetches admin returns with status filter', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({
      data: { returns: [] },
    });

    await apiClient.get('/api/admin/returns/list?status=PENDING');
    expect(get).toHaveBeenCalledWith('/api/admin/returns/list?status=PENDING');
  });

  it('processes a return as admin', async () => {
    const post = spyOn(apiClient, 'post').mockResolvedValue({
      data: { return: { id: 'r1' } },
    });

    await apiClient.post('/api/admin/returns/review', {
      returnId: 'r1',
      status: 'APPROVED',
      refundAmount: 100,
    });
    expect(post).toHaveBeenCalledWith('/api/admin/returns/review', {
      returnId: 'r1',
      status: 'APPROVED',
      refundAmount: 100,
    });
  });
});
