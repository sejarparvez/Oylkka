import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useAdminGlobalAttribute,
  useGlobalAttributeProducts,
  useMapProductAttributeMutation,
  useProductGlobalAttributeMappings,
  useUnmapProductAttributeMutation,
  useUpdateGlobalAttributeMutation,
} from '@/services/admin-global-attributes';
import { useAllProducts } from '@/services/product';

export const Route = createFileRoute('/dashboard/admin/global-attributes/$id')({
  component: RouteComponent,
});

type ValueEntry = {
  id?: string;
  value: string;
  slug: string;
};

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useAdminGlobalAttribute(id);
  const { mutate: updateAttribute, isPending } =
    useUpdateGlobalAttributeMutation();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [values, setValues] = useState<ValueEntry[]>([]);
  const [removedValueIds, setRemovedValueIds] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize form from data once loaded
  if (data?.attribute && !initialized) {
    setName(data.attribute.name);
    setSlug(data.attribute.slug);
    setDisplayOrder(data.attribute.displayOrder);
    setValues(
      data.attribute.values.map((v) => ({
        id: v.id,
        value: v.value,
        slug: v.slug,
      })),
    );
    setInitialized(true);
  }

  const autoSlug = (val: string) =>
    val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === autoSlug(name)) {
      setSlug(autoSlug(val));
    }
  };

  const updateValue = (index: number, field: keyof ValueEntry, val: string) => {
    const next = [...values];
    next[index] = {
      ...next[index],
      [field]: val,
      ...(field === 'value' && !next[index].slug
        ? { slug: autoSlug(val) }
        : {}),
    };
    setValues(next);
  };

  const addValue = () => {
    setValues([...values, { value: '', slug: '' }]);
  };

  const removeValue = (index: number) => {
    const removed = values[index];
    if (removed.id) {
      setRemovedValueIds([...removedValueIds, removed.id]);
    }
    setValues(values.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    const validValues = values.filter((v) => v.value.trim() && v.slug.trim());
    updateAttribute(
      {
        id,
        name: name.trim(),
        slug: slug.trim(),
        displayOrder,
        values: validValues.map((v) => ({
          id: v.id,
          value: v.value.trim(),
          slug: v.slug.trim(),
        })),
        removedValueIds,
      },
      {
        onSuccess: () => {
          setRemovedValueIds([]);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className='space-y-6 max-w-2xl mx-auto'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-64 rounded-2xl' />
        <Skeleton className='h-64 rounded-2xl' />
      </div>
    );
  }

  if (!data?.attribute) {
    return (
      <div className='flex flex-col items-center justify-center py-20 gap-4'>
        <p className='text-sm text-muted-foreground'>Attribute not found</p>
        <Button
          variant='outline'
          onClick={() => navigate({ to: '/dashboard/admin/global-attributes' })}
        >
          Back to list
        </Button>
      </div>
    );
  }

  const linkedCount = data.attribute._count?.productLinks ?? 0;

  return (
    <div className='max-w-2xl mx-auto space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>
            {data.attribute.name}
          </h1>
          <p className='text-sm text-muted-foreground mt-1'>
            /{data.attribute.slug} &middot; {linkedCount} product
            {linkedCount !== 1 ? 's' : ''} linked
          </p>
        </div>
      </div>

      <Tabs defaultValue='edit'>
        <TabsList>
          <TabsTrigger value='edit'>Edit</TabsTrigger>
          <TabsTrigger value='mappings'>
            Product Mappings ({linkedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value='edit' className='space-y-6 mt-6'>
          <form onSubmit={handleSubmit} className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle className='text-base'>Attribute Details</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='name'>Name</Label>
                  <Input
                    id='name'
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='slug'>Slug</Label>
                  <Input
                    id='slug'
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className='font-mono text-sm'
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='displayOrder'>Display Order</Label>
                  <Input
                    id='displayOrder'
                    type='number'
                    min={0}
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    className='w-24'
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between'>
                <CardTitle className='text-base'>Values</CardTitle>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={addValue}
                >
                  <Plus className='w-3.5 h-3.5' />
                  Add Value
                </Button>
              </CardHeader>
              <CardContent className='space-y-3'>
                {values.map((v, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable indices
                  <div key={i} className='flex items-start gap-2'>
                    <div className='flex-1 space-y-1'>
                      <Input
                        placeholder='Value'
                        value={v.value}
                        onChange={(e) =>
                          updateValue(i, 'value', e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className='flex-1 space-y-1'>
                      <Input
                        placeholder='Slug'
                        value={v.slug}
                        onChange={(e) => updateValue(i, 'slug', e.target.value)}
                        className='font-mono text-sm'
                        required
                      />
                    </div>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='w-10 h-10 mt-0 shrink-0 hover:text-destructive'
                      onClick={() => removeValue(i)}
                      disabled={values.length <= 1}
                    >
                      <Trash2 className='w-3.5 h-3.5' />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className='flex items-center gap-3'>
              <Button type='submit' disabled={isPending}>
                {isPending && <Loader2 className='w-3.5 h-3.5 animate-spin' />}
                Save Changes
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() =>
                  navigate({ to: '/dashboard/admin/global-attributes' })
                }
              >
                Back to List
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value='mappings' className='mt-6'>
          <MappingsView
            attributeId={id}
            attributeName={data.attribute.name}
            values={data.attribute.values}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MappingsView({
  attributeId,
  attributeName,
  values,
}: {
  attributeId: string;
  attributeName: string;
  values: Array<{ id: string; value: string; slug: string }>;
}) {
  const { data, isLoading, isError, refetch } =
    useGlobalAttributeProducts(attributeId);
  const unmap = useUnmapProductAttributeMutation();

  const [productSearch, setProductSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    productName: string;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(productSearch), 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const { data: searchData, isFetching: isSearching } = useAllProducts(
    { search: debouncedSearch || undefined, page: 1, limit: 8 },
    { enabled: debouncedSearch.length > 2 && !selectedProduct },
  );

  const { data: productMappings, isLoading: isLoadingProductMappings } =
    useProductGlobalAttributeMappings(selectedProduct?.id ?? '');
  const mapMutation = useMapProductAttributeMutation();

  const mappings = data?.mappings ?? [];

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>
            Products using {attributeName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='space-y-3'>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className='h-12 w-full' />
              ))}
            </div>
          ) : isError ? (
            <div className='flex flex-col items-center gap-3 py-8 text-center'>
              <p className='text-sm text-muted-foreground'>
                Failed to load product mappings.
              </p>
              <Button variant='outline' size='sm' onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : mappings.length === 0 ? (
            <p className='text-sm text-muted-foreground py-4'>
              No products are mapped to this attribute yet.
            </p>
          ) : (
            <div className='divide-y divide-border'>
              {mappings.map((mapping) => (
                <div
                  key={mapping.id}
                  className='flex items-center justify-between gap-3 py-3'
                >
                  <div className='min-w-0'>
                    <p className='text-sm font-medium truncate'>
                      {mapping.product.productName}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {mapping.localValue
                        ? `${mapping.localValue.option.name}: ${mapping.localValue.value}`
                        : 'Local value'}{' '}
                      &rarr; {mapping.globalValue.value}
                    </p>
                  </div>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='shrink-0 text-destructive'
                    disabled={unmap.isPending}
                    onClick={() =>
                      unmap.mutate({
                        productId: mapping.productId,
                        globalAttributeId: attributeId,
                        localValueId: mapping.localValueId,
                      })
                    }
                  >
                    <Trash2 className='w-3.5 h-3.5' />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Map a product value</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {!selectedProduct ? (
            <div className='space-y-2'>
              <Input
                placeholder='Search products by name...'
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              {isSearching && (
                <p className='text-xs text-muted-foreground'>Searching...</p>
              )}
              {searchData && searchData.products.length > 0 && (
                <div className='divide-y divide-border rounded-lg border'>
                  {searchData.products.map((product) => (
                    <button
                      key={product.id}
                      type='button'
                      className='w-full px-3 py-2 text-left text-sm hover:bg-accent'
                      onClick={() =>
                        setSelectedProduct({
                          id: product.id,
                          productName: product.productName,
                        })
                      }
                    >
                      {product.productName}
                    </button>
                  ))}
                </div>
              )}
              {debouncedSearch.length > 2 &&
                searchData &&
                searchData.products.length === 0 && (
                  <p className='text-xs text-muted-foreground'>
                    No products found.
                  </p>
                )}
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <p className='text-sm font-medium'>
                  {selectedProduct.productName}
                </p>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => setSelectedProduct(null)}
                >
                  Change product
                </Button>
              </div>

              {isLoadingProductMappings ? (
                <Skeleton className='h-24 w-full' />
              ) : !productMappings?.product ||
                productMappings.product.attributeOptions.length === 0 ? (
                <p className='text-sm text-muted-foreground'>
                  This product has no local attribute values to map.
                </p>
              ) : (
                <div className='space-y-5'>
                  {productMappings.product.attributeOptions.map((option) => (
                    <div key={option.id} className='space-y-2'>
                      <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                        {option.name}
                      </p>
                      {option.attributeValues.map((localValue) => {
                        const existing = productMappings.mappings.find(
                          (m) =>
                            m.localValueId === localValue.id &&
                            m.globalAttributeId === attributeId,
                        );
                        return (
                          <div
                            key={localValue.id}
                            className='flex items-center gap-2'
                          >
                            <span className='flex-1 truncate text-sm'>
                              {localValue.value}
                            </span>
                            <Select
                              value={existing?.globalValueId ?? ''}
                              onValueChange={(globalValueId) =>
                                mapMutation.mutate({
                                  productId: selectedProduct.id,
                                  globalAttributeId: attributeId,
                                  localValueId: localValue.id,
                                  globalValueId,
                                })
                              }
                            >
                              <SelectTrigger className='h-8 w-44'>
                                <SelectValue placeholder='— Unmapped —' />
                              </SelectTrigger>
                              <SelectContent>
                                {values.map((value) => (
                                  <SelectItem key={value.id} value={value.id}>
                                    {value.value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {existing && (
                              <Button
                                size='icon'
                                variant='ghost'
                                className='h-8 w-8 shrink-0 text-destructive'
                                disabled={unmap.isPending}
                                onClick={() =>
                                  unmap.mutate({
                                    productId: selectedProduct.id,
                                    globalAttributeId: attributeId,
                                    localValueId: localValue.id,
                                  })
                                }
                              >
                                <Trash2 className='h-3.5 w-3.5' />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
