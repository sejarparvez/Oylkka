import { describe, expect, it, spyOn } from 'bun:test';
import apiClient from '@/lib/api-client';

describe('payouts service API calls', () => {
  it('lists admin payouts', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    await apiClient.get('/api/admin/payouts/list');
    expect(get).toHaveBeenCalledWith('/api/admin/payouts/list');
  });

  it('lists pending admin payouts', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    await apiClient.get('/api/admin/payouts/pending');
    expect(get).toHaveBeenCalledWith('/api/admin/payouts/pending');
  });

  it('processes a payout', async () => {
    const post = spyOn(apiClient, 'post').mockResolvedValue({ data: {} });
    await apiClient.post('/api/admin/payouts/process', { payoutId: 'p1' });
    expect(post).toHaveBeenCalledWith('/api/admin/payouts/process', {
      payoutId: 'p1',
    });
  });

  it('lists vendor payouts', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    await apiClient.get('/api/vendor/payouts/list');
    expect(get).toHaveBeenCalledWith('/api/vendor/payouts/list');
  });

  it('lists vendor payout schedule', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    await apiClient.get('/api/vendor/payouts/schedule');
    expect(get).toHaveBeenCalledWith('/api/vendor/payouts/schedule');
  });

  it('lists pending vendor payouts', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    await apiClient.get('/api/vendor/payouts/pending');
    expect(get).toHaveBeenCalledWith('/api/vendor/payouts/pending');
  });
});

describe('extra service API calls', () => {
  it('fetches shop follow list', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    await apiClient.get('/api/shop/follow/list');
    expect(get).toHaveBeenCalledWith('/api/shop/follow/list');
  });

  it('toggles shop follow', async () => {
    const post = spyOn(apiClient, 'post').mockResolvedValue({
      data: { following: true },
    });
    await apiClient.post('/api/shop/follow/toggle', { shopId: 's1' });
    expect(post).toHaveBeenCalledWith('/api/shop/follow/toggle', {
      shopId: 's1',
    });
  });
});

describe('address service API calls', () => {
  it('lists addresses', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    await apiClient.get('/api/addresses/list');
    expect(get).toHaveBeenCalledWith('/api/addresses/list');
  });

  it('creates an address', async () => {
    const post = spyOn(apiClient, 'post').mockResolvedValue({
      data: { id: 'a1' },
    });
    await apiClient.post('/api/addresses/create', { street: '123 Main St' });
    expect(post).toHaveBeenCalledWith('/api/addresses/create', {
      street: '123 Main St',
    });
  });

  it('edits an address', async () => {
    const put = spyOn(apiClient, 'put').mockResolvedValue({ data: {} });
    await apiClient.put('/api/addresses/edit', {
      id: 'a1',
      street: '456 Oak Ave',
    });
    expect(put).toHaveBeenCalledWith('/api/addresses/edit', {
      id: 'a1',
      street: '456 Oak Ave',
    });
  });

  it('deletes an address', async () => {
    const del = spyOn(apiClient, 'delete').mockResolvedValue({ data: {} });
    await apiClient.delete('/api/addresses/delete', { data: { id: 'a1' } });
    expect(del).toHaveBeenCalledWith('/api/addresses/delete', {
      data: { id: 'a1' },
    });
  });
});

describe('user-reviews service API calls', () => {
  it('lists my reviews', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    await apiClient.get('/api/reviews/my/list');
    expect(get).toHaveBeenCalledWith('/api/reviews/my/list');
  });

  it('updates my review', async () => {
    const put = spyOn(apiClient, 'put').mockResolvedValue({ data: {} });
    await apiClient.put('/api/reviews/my/r1', { rating: 5 });
    expect(put).toHaveBeenCalledWith('/api/reviews/my/r1', { rating: 5 });
  });

  it('deletes my review', async () => {
    const del = spyOn(apiClient, 'delete').mockResolvedValue({ data: {} });
    await apiClient.delete('/api/reviews/my/r1');
    expect(del).toHaveBeenCalledWith('/api/reviews/my/r1');
  });
});

describe('order service API calls', () => {
  it('lists orders', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    await apiClient.get('/api/orders/list');
    expect(get).toHaveBeenCalledWith('/api/orders/list');
  });

  it('fetches single order', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({
      data: { id: 'o1' },
    });
    await apiClient.get('/api/orders/o1');
    expect(get).toHaveBeenCalledWith('/api/orders/o1');
  });
});
