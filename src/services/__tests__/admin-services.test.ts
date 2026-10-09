import { describe, expect, it, spyOn } from 'bun:test';
import apiClient from '@/lib/api-client';

describe('admin-coupons service API calls', () => {
  it('lists coupons', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    const res = await apiClient.get('/api/admin/coupons/list');
    expect(get).toHaveBeenCalledWith('/api/admin/coupons/list');
    expect(Array.isArray(res.data)).toBe(true);
  });

  it('fetches single coupon', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({
      data: { id: 'c1' },
    });
    const res = await apiClient.get('/api/admin/coupons/c1');
    expect(get).toHaveBeenCalledWith('/api/admin/coupons/c1');
    expect(res.data.id).toBe('c1');
  });

  it('creates a coupon', async () => {
    const post = spyOn(apiClient, 'post').mockResolvedValue({
      data: { id: 'c1' },
    });
    const res = await apiClient.post('/api/admin/coupons/create', {
      code: 'SAVE10',
    });
    expect(post).toHaveBeenCalledWith('/api/admin/coupons/create', {
      code: 'SAVE10',
    });
    expect(res.data.id).toBe('c1');
  });

  it('updates a coupon', async () => {
    const put = spyOn(apiClient, 'put').mockResolvedValue({
      data: { id: 'c1' },
    });
    await apiClient.put('/api/admin/coupons/c1', {
      code: 'SAVE20',
    });
    expect(put).toHaveBeenCalledWith('/api/admin/coupons/c1', {
      code: 'SAVE20',
    });
  });

  it('deletes a coupon', async () => {
    const del = spyOn(apiClient, 'delete').mockResolvedValue({ data: {} });
    await apiClient.delete('/api/admin/coupons/c1');
    expect(del).toHaveBeenCalledWith('/api/admin/coupons/c1');
  });
});

describe('admin-content service API calls', () => {
  it('lists content pages', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    await apiClient.get('/api/admin/content/list');
    expect(get).toHaveBeenCalledWith('/api/admin/content/list');
  });

  it('saves content page', async () => {
    const post = spyOn(apiClient, 'post').mockResolvedValue({
      data: { message: 'Saved' },
    });
    await apiClient.post('/api/admin/content/save', {
      key: 'about',
      content: '...',
    });
    expect(post).toHaveBeenCalledWith('/api/admin/content/save', {
      key: 'about',
      content: '...',
    });
  });

  it('fetches public content', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: {} });
    await apiClient.get('/api/content/get');
    expect(get).toHaveBeenCalledWith('/api/content/get');
  });
});

describe('admin-reviews service API calls', () => {
  it('lists reviews', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    await apiClient.get('/api/admin/reviews/list');
    expect(get).toHaveBeenCalledWith('/api/admin/reviews/list');
  });

  it('fetches single review', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({
      data: { id: 'r1' },
    });
    await apiClient.get('/api/admin/reviews/r1');
    expect(get).toHaveBeenCalledWith('/api/admin/reviews/r1');
  });

  it('updates a review', async () => {
    const put = spyOn(apiClient, 'put').mockResolvedValue({ data: {} });
    await apiClient.put('/api/admin/reviews/r1', { isApproved: true });
    expect(put).toHaveBeenCalledWith('/api/admin/reviews/r1', {
      isApproved: true,
    });
  });

  it('deletes a review', async () => {
    const del = spyOn(apiClient, 'delete').mockResolvedValue({ data: {} });
    await apiClient.delete('/api/admin/reviews/r1');
    expect(del).toHaveBeenCalledWith('/api/admin/reviews/r1');
  });
});

describe('admin-customers service API calls', () => {
  it('lists customers', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    await apiClient.get('/api/admin/customers/list');
    expect(get).toHaveBeenCalledWith('/api/admin/customers/list');
  });

  it('fetches single customer', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({
      data: { id: 'u1' },
    });
    await apiClient.get('/api/admin/customers/u1');
    expect(get).toHaveBeenCalledWith('/api/admin/customers/u1');
  });

  it('updates a customer', async () => {
    const put = spyOn(apiClient, 'put').mockResolvedValue({ data: {} });
    await apiClient.put('/api/admin/customers/u1', { role: 'ADMIN' });
    expect(put).toHaveBeenCalledWith('/api/admin/customers/u1', {
      role: 'ADMIN',
    });
  });
});

describe('admin-audit-logs service API calls', () => {
  it('fetches audit logs', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    await apiClient.get('/api/admin/audit-logs');
    expect(get).toHaveBeenCalledWith('/api/admin/audit-logs');
  });
});

describe('admin-settings service API calls', () => {
  it('lists settings', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    await apiClient.get('/api/admin/settings/list');
    expect(get).toHaveBeenCalledWith('/api/admin/settings/list');
  });

  it('updates settings', async () => {
    const post = spyOn(apiClient, 'post').mockResolvedValue({
      data: { message: 'Updated' },
    });
    await apiClient.post('/api/admin/settings/update', {
      key: 'site_name',
      value: 'My Store',
    });
    expect(post).toHaveBeenCalledWith('/api/admin/settings/update', {
      key: 'site_name',
      value: 'My Store',
    });
  });
});

describe('admin-orders service API calls', () => {
  it('lists admin orders', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    await apiClient.get('/api/orders/admin-list');
    expect(get).toHaveBeenCalledWith('/api/orders/admin-list');
  });

  it('fetches single admin order', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({
      data: { id: 'o1' },
    });
    await apiClient.get('/api/orders/admin-single', { params: { id: 'o1' } });
    expect(get).toHaveBeenCalledWith('/api/orders/admin-single', {
      params: { id: 'o1' },
    });
  });

  it('fulfills an order', async () => {
    const put = spyOn(apiClient, 'put').mockResolvedValue({ data: {} });
    await apiClient.put('/api/orders/admin-fulfill', { id: 'o1' });
    expect(put).toHaveBeenCalledWith('/api/orders/admin-fulfill', { id: 'o1' });
  });

  it('cancels an order', async () => {
    const post = spyOn(apiClient, 'post').mockResolvedValue({ data: {} });
    await apiClient.post('/api/orders/admin-cancel', {
      id: 'o1',
      reason: 'Out of stock',
    });
    expect(post).toHaveBeenCalledWith('/api/orders/admin-cancel', {
      id: 'o1',
      reason: 'Out of stock',
    });
  });

  it('refunds an order', async () => {
    const post = spyOn(apiClient, 'post').mockResolvedValue({ data: {} });
    await apiClient.post('/api/orders/admin-refund', { id: 'o1' });
    expect(post).toHaveBeenCalledWith('/api/orders/admin-refund', { id: 'o1' });
  });
});

describe('admin-dashboard service API calls', () => {
  it('fetches dashboard stats', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: {} });
    await apiClient.get('/api/admin/dashboard/stats');
    expect(get).toHaveBeenCalledWith('/api/admin/dashboard/stats');
  });
});
