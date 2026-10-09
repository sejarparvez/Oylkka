import { describe, expect, it, spyOn } from 'bun:test';
import apiClient from '@/lib/api-client';

describe('vendor-policies service API calls', () => {
  it('fetches policies', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: {} });
    await apiClient.get('/api/vendor/shop/policies');
    expect(get).toHaveBeenCalledWith('/api/vendor/shop/policies');
  });

  it('updates policies', async () => {
    const put = spyOn(apiClient, 'put').mockResolvedValue({ data: {} });
    await apiClient.put('/api/vendor/shop/policies', {
      returnPolicy: '30 days',
    });
    expect(put).toHaveBeenCalledWith('/api/vendor/shop/policies', {
      returnPolicy: '30 days',
    });
  });
});

describe('vendor-orders service API calls', () => {
  it('lists vendor orders', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    await apiClient.get('/api/vendor/orders/list');
    expect(get).toHaveBeenCalledWith('/api/vendor/orders/list');
  });

  it('fetches single vendor order', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({
      data: { id: 'o1' },
    });
    await apiClient.get('/api/vendor/orders/o1');
    expect(get).toHaveBeenCalledWith('/api/vendor/orders/o1');
  });

  it('updates vendor order', async () => {
    const put = spyOn(apiClient, 'put').mockResolvedValue({ data: {} });
    await apiClient.put('/api/vendor/orders/o1', { status: 'SHIPPED' });
    expect(put).toHaveBeenCalledWith('/api/vendor/orders/o1', {
      status: 'SHIPPED',
    });
  });

  it('cancels an unpaid vendor order', async () => {
    const post = spyOn(apiClient, 'post').mockResolvedValue({
      data: { success: true },
    });

    const response = await apiClient.post('/api/vendor/orders/cancel', {
      orderId: 'o1',
      reason: 'Out of stock',
    });
    expect(post).toHaveBeenCalledWith('/api/vendor/orders/cancel', {
      orderId: 'o1',
      reason: 'Out of stock',
    });
    expect(response.data.success).toBe(true);
  });
});

describe('vendor-shipping service API calls', () => {
  it('lists shipping zones', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    await apiClient.get('/api/vendor/shipping/list');
    expect(get).toHaveBeenCalledWith('/api/vendor/shipping/list');
  });

  it('creates shipping zone', async () => {
    const post = spyOn(apiClient, 'post').mockResolvedValue({
      data: { id: 'z1' },
    });
    const res = await apiClient.post('/api/vendor/shipping/create', {
      name: 'Zone 1',
      baseCost: 100,
    });
    expect(post).toHaveBeenCalledWith('/api/vendor/shipping/create', {
      name: 'Zone 1',
      baseCost: 100,
    });
    expect(res.data.id).toBe('z1');
  });

  it('edits shipping zone', async () => {
    const put = spyOn(apiClient, 'put').mockResolvedValue({ data: {} });
    await apiClient.put('/api/vendor/shipping/edit', {
      id: 'z1',
      baseCost: 150,
    });
    expect(put).toHaveBeenCalledWith('/api/vendor/shipping/edit', {
      id: 'z1',
      baseCost: 150,
    });
  });

  it('deletes shipping zone', async () => {
    const del = spyOn(apiClient, 'delete').mockResolvedValue({ data: {} });
    await apiClient.delete('/api/vendor/shipping/delete', {
      data: { id: 'z1' },
    });
    expect(del).toHaveBeenCalledWith('/api/vendor/shipping/delete', {
      data: { id: 'z1' },
    });
  });
});

describe('vendor-analytics service API calls', () => {
  it('fetches analytics overview', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: {} });
    await apiClient.get('/api/vendor/analytics/overview');
    expect(get).toHaveBeenCalledWith('/api/vendor/analytics/overview');
  });
});

describe('vendor-questions service API calls', () => {
  it('lists questions for vendor products', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({
      data: { questions: [], total: 0, page: 1, limit: 50, totalPages: 0 },
    });
    await apiClient.get('/api/vendor/questions', {
      params: { page: 1, limit: 50 },
    });
    expect(get).toHaveBeenCalledWith('/api/vendor/questions', {
      params: { page: 1, limit: 50 },
    });
  });

  it('answers a product question', async () => {
    const post = spyOn(apiClient, 'post').mockResolvedValue({
      data: { id: 'q1', answer: 'Yes', answeredAt: null },
    });
    await apiClient.post('/api/product/answer-question', {
      questionId: 'q1',
      answer: 'Yes',
    });
    expect(post).toHaveBeenCalledWith('/api/product/answer-question', {
      questionId: 'q1',
      answer: 'Yes',
    });
  });
});
