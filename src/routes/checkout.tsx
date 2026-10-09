import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Gift, Loader2, ShoppingCart, Tag, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  type PaymentMethodOption,
  PaymentSelector,
} from '#/components/checkout/payment-selector';
import Footer from '#/components/layout/footer';
import Header from '#/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import apiClient from '@/lib/api-client';
import { BD_DISTRICTS } from '@/lib/bd-districts';
import { QUERY_KEYS } from '@/lib/constants';
import { useAddresses } from '@/services/address';
import { useCart } from '@/services/cart';
import { useAutoApplyVouchers, useMyVouchers } from '@/services/voucher';
import { useWallet } from '@/services/wallet';

const checkoutSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(
      /^(?:\+8801[3-9]\d{8}|01[3-9]\d{8})$/,
      'Invalid BD phone number (e.g. 01XXXXXXXXX)',
    ),
  address: z.string().min(1, 'Address is required'),
  upzila: z.string().min(1, 'Upzila / Thana is required'),
  district: z.string().min(1, 'District is required'),
  postalCode: z
    .string()
    .regex(/^\d{4}$/, 'Postal code must be 4 digits')
    .optional()
    .or(z.literal('')),
  comment: z.string().optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export const Route = createFileRoute('/checkout')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/auth/signin' });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: cart, isLoading, isError } = useCart();
  const { data: vouchersData } = useMyVouchers();
  const { data: autoApplyData } = useAutoApplyVouchers();
  const { data: walletData } = useWallet();
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodOption>('BKASH');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    description?: string;
  } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [selectedVoucherIds, setSelectedVoucherIds] = useState<Set<string>>(
    new Set(),
  );

  const myVouchers = (vouchersData ?? []).map((v) => ({
    id: v.id,
    coupon: {
      id: v.coupon.id,
      code: v.coupon.code,
      description: v.coupon.description,
      type: v.coupon.discountType,
      value: v.coupon.discountValue,
      freeShipping: v.coupon.freeShipping,
      shippingDiscount: v.coupon.shippingDiscount,
    },
  }));

  const walletBalance = walletData?.balance;
  const { data: savedAddresses } = useAddresses();

  useEffect(() => {
    if (!autoApplyData) return;
    const vouchers = Array.isArray(autoApplyData)
      ? autoApplyData
      : ((
          autoApplyData as { vouchers?: { id: string; isCollected: boolean }[] }
        ).vouchers ?? []);
    for (const v of vouchers) {
      if (v.isCollected) {
        setSelectedVoucherIds((prev) => new Set(prev).add(v.id));
      }
    }
  }, [autoApplyData]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      upzila: '',
      district: '',
      postalCode: '',
      comment: '',
    },
  });

  const formValues = watch();

  const subtotal =
    cart?.items.reduce((sum, item) => {
      const price = item.savedPrice ?? item.product.price;
      return sum + (price ?? 0) * item.quantity;
    }, 0) ?? 0;

  const shippingDistrict = formValues.district || null;

  const { data: discountPreview } = useQuery({
    queryKey: [
      'discount-preview',
      [...selectedVoucherIds].sort().join(','),
      paymentMethod,
      subtotal,
      shippingDistrict,
    ],
    queryFn: async () => {
      if (!cart) throw new Error('Cart not loaded');
      const res = await apiClient.post<
        | {
            baseShipping: number;
            totalDiscount: number;
            totalShippingDiscount: number;
            freeShipping: boolean;
            estDays: string | null;
            taxRate: number;
          }
        | { error: string }
      >('/api/checkout/discount-preview', {
        voucherIds: [...selectedVoucherIds],
        paymentMethod,
        shippingDistrict,
        cart: {
          id: cart.id,
          items: cart.items.map((item) => ({
            product: {
              id: item.product.id,
              price: item.product.price,
              discountPrice: item.product.discountPrice,
              freeShipping: item.product.freeShipping,
              categoryId: item.product.categoryId,
              shop: item.product.shop
                ? { id: item.product.shop.id }
                : undefined,
            },
            variant: item.variant
              ? {
                  price: item.variant.price,
                  discountPrice: item.variant.discountPrice,
                }
              : undefined,
            quantity: item.quantity,
            savedPrice: item.savedPrice,
          })),
        },
        subtotal,
      });
      if (!res.data || 'error' in res.data) {
        throw new Error(
          (res.data as { error: string }).error ?? 'Preview failed',
        );
      }
      return res.data;
    },
    enabled: !!cart,
  });

  const isEmptyCart =
    !isLoading && !isError && !!cart && cart.items.length === 0;
  useEffect(() => {
    if (isEmptyCart) navigate({ to: '/cart', replace: true });
  }, [isEmptyCart, navigate]);

  if (isLoading) return <CheckoutSkeleton />;
  if (isError || !cart) return <CheckoutError />;
  if (cart.items.length === 0) return <CheckoutSkeleton />;

  const groupedByShop = cart.items.reduce<
    Record<
      string,
      {
        shop: NonNullable<(typeof cart.items)[0]['product']['shop']>;
        items: typeof cart.items;
      }
    >
  >((groups, item) => {
    const shop = item.product.shop;
    if (!shop) return groups;
    if (!groups[shop.id]) {
      groups[shop.id] = { shop, items: [] };
    }
    groups[shop.id].items.push(item);
    return groups;
  }, {});

  const totalDiscount =
    (discountPreview?.totalDiscount ?? 0) +
    (appliedCoupon?.discountAmount ?? 0);
  const freeShipping = discountPreview?.freeShipping ?? false;
  const shippingDiscount = discountPreview?.totalShippingDiscount ?? 0;
  const baseShipping = discountPreview?.baseShipping ?? 0;
  const finalShipping = freeShipping
    ? 0
    : Math.max(0, baseShipping - shippingDiscount);

  const taxBase = Math.max(0, subtotal - totalDiscount);
  const taxRate = discountPreview?.taxRate ?? 0;
  const tax = Math.round(taxBase * taxRate * 100) / 100;

  const total = subtotal + finalShipping + tax - totalDiscount;

  // Wallet can only be used when it covers the order total (CUST-06).
  const walletShortfall =
    paymentMethod === 'WALLET' &&
    walletBalance !== undefined &&
    total > walletBalance;

  function toggleVoucher(voucherId: string) {
    setSelectedVoucherIds((prev) => {
      const next = new Set(prev);
      if (next.has(voucherId)) {
        next.delete(voucherId);
      } else {
        next.add(voucherId);
      }
      return next;
    });
  }

  async function handleApplyCoupon() {
    const code = couponCode.trim();
    if (!code) {
      toast.error('Please enter a coupon code');
      return;
    }

    setIsValidatingCoupon(true);
    try {
      const response = await fetch('/api/checkout/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal }),
      });

      const data = await response.json();

      if (!data.valid) {
        toast.error(data.error || 'Invalid coupon');
        setIsValidatingCoupon(false);
        return;
      }

      setAppliedCoupon({
        code: data.code,
        discountAmount: data.discountAmount,
        description: data.description,
      });
      toast.success(
        `Coupon applied! You saved ৳${data.discountAmount.toLocaleString()}`,
      );
    } catch {
      toast.error('Failed to validate coupon');
    } finally {
      setIsValidatingCoupon(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponCode('');
  }

  async function onPlaceOrder(values: CheckoutFormValues) {
    if (isPlacingOrder) return;
    setIsPlacingOrder(true);

    try {
      const createResponse = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingName: values.name,
          shippingEmail: values.email,
          shippingPhone: values.phone,
          shippingAddress: values.address,
          shippingUpzila: values.upzila,
          shippingDistrict: values.district,
          shippingPostalCode: values.postalCode || undefined,
          shippingComment: values.comment || undefined,
          paymentMethod,
          voucherIds: [...selectedVoucherIds],
          couponCode: appliedCoupon?.code,
        }),
      });

      const orderData = await createResponse.json();

      if (!createResponse.ok) {
        toast.error(orderData.error || 'Failed to create order');
        setIsPlacingOrder(false);
        return;
      }

      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CART] });

      if (
        orderData.paymentMethod === 'CASH_ON_DELIVERY' ||
        orderData.paymentMethod === 'WALLET'
      ) {
        toast.success('Order placed successfully!');
        navigate({
          to: '/checkout/confirmation',
          search: { orderId: orderData.orderId },
        });
        return;
      }

      const payResponse = await fetch('/api/checkout/bkash-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderData.orderId }),
      });

      const payData = await payResponse.json();

      if (!payResponse.ok) {
        toast.error(payData.error || 'Failed to initiate payment');
        setIsPlacingOrder(false);
        return;
      }

      window.location.href = payData.checkoutURL;
    } catch {
      toast.error('Something went wrong. Please try again.');
      setIsPlacingOrder(false);
    }
  }

  return (
    <>
      <Header />
      <div className='container py-8 md:py-12'>
        <div className='mx-auto max-w-5xl'>
          <button
            type='button'
            onClick={() => navigate({ to: '/cart' })}
            className='mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors'
          >
            <ArrowLeft className='h-4 w-4' />
            Back to Cart
          </button>

          <form onSubmit={handleSubmit(onPlaceOrder)}>
            <div className='grid gap-8 lg:grid-cols-5'>
              <div className='lg:col-span-3 space-y-6'>
                <ShippingAddressForm
                  register={register}
                  errors={errors}
                  setValue={setValue}
                  formValues={formValues}
                  savedAddresses={savedAddresses}
                />
              </div>

              <div className='lg:col-span-2 space-y-6'>
                <Card className='rounded-2xl border-border shadow-none p-6'>
                  <h2 className='text-lg font-semibold mb-4'>Order Summary</h2>

                  {Object.values(groupedByShop).map(({ shop, items }) => (
                    <div key={shop.id} className='mb-4'>
                      <p className='text-sm font-medium text-muted-foreground mb-2'>
                        {shop.name}
                      </p>
                      <div className='space-y-3'>
                        {items.map((item) => {
                          const price = item.savedPrice ?? item.product.price;
                          const imageUrl =
                            item.variant?.imageUrl ??
                            item.product.images[0]?.imageUrl;

                          return (
                            <div key={item.id} className='flex gap-3'>
                              <div className='h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted'>
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={item.product.productName}
                                    className='h-full w-full object-cover'
                                  />
                                ) : (
                                  <div className='flex h-full w-full items-center justify-center'>
                                    <ShoppingCart className='h-5 w-5 text-muted-foreground' />
                                  </div>
                                )}
                              </div>
                              <div className='flex-1 min-w-0'>
                                <p className='text-sm font-medium truncate'>
                                  {item.product.productName}
                                </p>
                                {item.variant && (
                                  <p className='text-xs text-muted-foreground'>
                                    {item.variant.name}
                                  </p>
                                )}
                                <p className='text-xs text-muted-foreground'>
                                  Qty: {item.quantity}
                                </p>
                              </div>
                              <p className='text-sm font-semibold shrink-0'>
                                ৳
                                {(
                                  (price ?? 0) * item.quantity
                                ).toLocaleString()}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <Separator className='my-4' />

                  <div className='space-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Subtotal</span>
                      <span className='font-medium'>
                        ৳{(subtotal || 0).toLocaleString()}
                      </span>
                    </div>

                    {totalDiscount > 0 && (
                      <div className='flex justify-between text-green-600'>
                        <span>Discount</span>
                        <span className='font-medium'>
                          -৳{totalDiscount.toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Shipping</span>
                      <span className='font-medium'>
                        {finalShipping > 0 ? (
                          <span>৳{finalShipping.toLocaleString()}</span>
                        ) : (
                          <span className='text-green-600'>Free</span>
                        )}
                      </span>
                    </div>

                    {discountPreview?.estDays && (
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>
                          Est. delivery
                        </span>
                        <span className='font-medium'>
                          {discountPreview.estDays}
                        </span>
                      </div>
                    )}

                    {freeShipping && baseShipping > 0 && (
                      <div className='flex justify-between text-green-600'>
                        <span>Shipping Discount (Free)</span>
                        <span className='font-medium'>
                          -৳{baseShipping.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {shippingDiscount > 0 && !freeShipping && (
                      <div className='flex justify-between text-green-600'>
                        <span>Shipping Discount</span>
                        <span className='font-medium'>
                          -৳{shippingDiscount.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {tax > 0 && (
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>Tax</span>
                        <span className='font-medium'>
                          ৳{tax.toLocaleString()}
                        </span>
                      </div>
                    )}

                    <Separator className='my-2' />

                    <div className='flex justify-between text-base font-semibold'>
                      <span>Total</span>
                      <span>৳{Math.max(0, total || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </Card>

                {myVouchers.length > 0 && (
                  <Card className='rounded-2xl border-border shadow-none p-6'>
                    <div className='flex items-center gap-2 text-sm font-medium mb-3'>
                      <Gift className='h-4 w-4' />
                      Your Vouchers
                    </div>
                    <div className='space-y-2'>
                      {myVouchers.map((v) => (
                        <label
                          key={v.id}
                          htmlFor={`voucher-${v.id}`}
                          className='flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors'
                        >
                          <Checkbox
                            id={`voucher-${v.id}`}
                            checked={selectedVoucherIds.has(v.id)}
                            onCheckedChange={() => toggleVoucher(v.id)}
                            className='mt-0.5'
                          />
                          <div className='flex-1 min-w-0'>
                            <p className='text-sm font-medium'>
                              {v.coupon.code}
                            </p>
                            {v.coupon.description && (
                              <p className='text-xs text-muted-foreground'>
                                {v.coupon.description}
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </Card>
                )}

                <Card className='rounded-2xl border-border shadow-none p-6'>
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2 text-sm font-medium'>
                        <Tag className='h-4 w-4' />
                        Coupon Code
                      </div>
                      {appliedCoupon ? (
                        <button
                          type='button'
                          onClick={handleRemoveCoupon}
                          className='flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors'
                        >
                          <X className='h-3 w-3' />
                          Remove
                        </button>
                      ) : null}
                    </div>
                    {appliedCoupon ? (
                      <div className='rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400'>
                        <p className='font-medium'>{appliedCoupon.code}</p>
                        {appliedCoupon.description && (
                          <p className='text-xs opacity-80'>
                            {appliedCoupon.description}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className='flex gap-2'>
                        <Input
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder='Enter code'
                          className='flex-1'
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleApplyCoupon();
                          }}
                        />
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={handleApplyCoupon}
                          disabled={isValidatingCoupon || !couponCode.trim()}
                          className='shrink-0'
                        >
                          {isValidatingCoupon ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                          ) : (
                            'Apply'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>

                <Card className='rounded-2xl border-border shadow-none p-6'>
                  <h2 className='text-lg font-semibold mb-4'>Payment Method</h2>
                  <PaymentSelector
                    selected={paymentMethod}
                    onSelect={setPaymentMethod}
                    walletBalance={walletBalance}
                    orderTotal={Math.max(0, total)}
                  />
                </Card>

                <Button
                  type='submit'
                  size='lg'
                  className='w-full h-12 text-base rounded-xl'
                  disabled={isPlacingOrder || walletShortfall}
                >
                  {isPlacingOrder ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Placing Order...
                    </>
                  ) : (
                    `Place Order${paymentMethod === 'CASH_ON_DELIVERY' ? ' (COD)' : ''}${paymentMethod === 'WALLET' ? ' (Wallet)' : ''}`
                  )}
                </Button>
                {walletShortfall && (
                  <p className='text-xs text-destructive text-center'>
                    Insufficient wallet balance. Top up your wallet or choose
                    another payment method.
                  </p>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
}

function ShippingAddressForm({
  register,
  errors,
  setValue,
  formValues,
  savedAddresses,
}: {
  register: ReturnType<typeof useForm<CheckoutFormValues>>['register'];
  errors: ReturnType<typeof useForm<CheckoutFormValues>>['formState']['errors'];
  setValue: ReturnType<typeof useForm<CheckoutFormValues>>['setValue'];
  formValues: CheckoutFormValues;
  savedAddresses?: {
    id: string;
    name: string;
    phone: string;
    address: string;
    upzila: string;
    district: string;
    postalCode: string | null;
    label: string;
  }[];
}) {
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );

  function handleSelectAddress(id: string) {
    setSelectedAddressId(id);
    const addr = savedAddresses?.find((a) => a.id === id);
    if (!addr) return;
    setValue('name', addr.name);
    setValue('phone', addr.phone);
    setValue('address', addr.address);
    setValue('upzila', addr.upzila);
    setValue('district', addr.district);
    if (addr.postalCode) setValue('postalCode', addr.postalCode);
  }

  return (
    <Card className='rounded-2xl border-border shadow-none p-6'>
      <h2 className='text-lg font-semibold mb-4'>Shipping Address</h2>

      {savedAddresses && savedAddresses.length > 0 && (
        <div className='mb-4'>
          <span className='text-sm font-medium text-muted-foreground mb-2 block'>
            Saved Addresses
          </span>
          <div className='space-y-2'>
            {savedAddresses.map((addr) => (
              <label
                key={addr.id}
                htmlFor={`addr-${addr.id}`}
                className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedAddressId === addr.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
              >
                <input
                  type='radio'
                  id={`addr-${addr.id}`}
                  name='saved-address'
                  checked={selectedAddressId === addr.id}
                  onChange={() => handleSelectAddress(addr.id)}
                  className='mt-1 h-4 w-4 accent-primary'
                />
                <div className='flex-1 min-w-0 text-sm'>
                  <p className='font-medium'>{addr.label}</p>
                  <p className='text-muted-foreground'>
                    {addr.name} — {addr.phone}
                  </p>
                  <p className='text-muted-foreground'>
                    {addr.address}, {addr.upzila}, {addr.district}
                    {addr.postalCode ? ` - ${addr.postalCode}` : ''}
                  </p>
                </div>
              </label>
            ))}
          </div>
          <Separator className='my-4' />
        </div>
      )}

      <FieldGroup>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor='name'>Full Name</FieldLabel>
            <Input
              id='name'
              type='text'
              placeholder='John Doe'
              autoComplete='name'
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor='email'>Email</FieldLabel>
            <Input
              id='email'
              type='email'
              placeholder='you@example.com'
              autoComplete='email'
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && <FieldError>{errors.email.message}</FieldError>}
          </Field>
        </div>

        <Field data-invalid={!!errors.phone}>
          <FieldLabel htmlFor='phone'>Phone Number</FieldLabel>
          <Input
            id='phone'
            type='tel'
            placeholder='01XXXXXXXXX'
            autoComplete='tel'
            aria-invalid={!!errors.phone}
            {...register('phone')}
          />
          {errors.phone && <FieldError>{errors.phone.message}</FieldError>}
        </Field>

        <Field data-invalid={!!errors.address}>
          <FieldLabel htmlFor='address'>Address</FieldLabel>
          <textarea
            id='address'
            rows={3}
            className='flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary aria-invalid:border-destructive aria-invalid:ring-destructive/20'
            placeholder='House, Road, Area, Village...'
            aria-invalid={!!errors.address}
            {...register('address')}
          />
          {errors.address && <FieldError>{errors.address.message}</FieldError>}
        </Field>

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <Field data-invalid={!!errors.upzila}>
            <FieldLabel htmlFor='upzila'>Upzila / Thana</FieldLabel>
            <Input
              id='upzila'
              placeholder='Mirpur, Sadar, etc.'
              aria-invalid={!!errors.upzila}
              {...register('upzila')}
            />
            {errors.upzila && <FieldError>{errors.upzila.message}</FieldError>}
          </Field>
          <Field data-invalid={!!errors.postalCode}>
            <FieldLabel htmlFor='postalCode'>Postal Code (optional)</FieldLabel>
            <Input
              id='postalCode'
              placeholder='1205'
              autoComplete='postal-code'
              aria-invalid={!!errors.postalCode}
              {...register('postalCode')}
            />
            {errors.postalCode && (
              <FieldError>{errors.postalCode.message}</FieldError>
            )}
          </Field>
        </div>

        <Field data-invalid={!!errors.district}>
          <FieldLabel htmlFor='district'>District</FieldLabel>
          <SearchableSelect
            options={BD_DISTRICTS}
            value={formValues.district}
            onChange={(value) =>
              setValue('district', value, { shouldValidate: true })
            }
            placeholder='Select district...'
            searchPlaceholder='Search district...'
            emptyMessage='No district found'
          />
          {errors.district && (
            <FieldError>{errors.district.message}</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor='comment'>Delivery Note (optional)</FieldLabel>
          <textarea
            id='comment'
            rows={2}
            className='flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
            placeholder='Any special instructions for delivery?'
            {...register('comment')}
          />
        </Field>
      </FieldGroup>
    </Card>
  );
}

function CheckoutSkeleton() {
  return (
    <>
      <Header />
      <div className='container py-8 md:py-12'>
        <div className='mx-auto max-w-5xl space-y-6'>
          <Skeleton className='h-6 w-32' />
          <div className='grid gap-8 lg:grid-cols-5'>
            <div className='lg:col-span-3 space-y-6'>
              <Card className='rounded-2xl border-border shadow-none p-6 space-y-4'>
                <Skeleton className='h-6 w-40' />
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
                <div className='grid grid-cols-2 gap-4'>
                  <Skeleton className='h-10' />
                  <Skeleton className='h-10' />
                </div>
              </Card>
            </div>
            <div className='lg:col-span-2 space-y-6'>
              <Card className='rounded-2xl border-border shadow-none p-6 space-y-4'>
                <Skeleton className='h-6 w-32' />
                {[1, 2].map((i) => (
                  <div key={i} className='flex gap-3'>
                    <Skeleton className='h-14 w-14 rounded-xl' />
                    <div className='flex-1 space-y-1'>
                      <Skeleton className='h-4 w-32' />
                      <Skeleton className='h-3 w-20' />
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

function CheckoutError() {
  const queryClient = useQueryClient();
  return (
    <>
      <Header />
      <div className='container py-8 md:py-12'>
        <div className='mx-auto max-w-md text-center'>
          <h2 className='text-sm font-semibold'>Something went wrong</h2>
          <p className='text-sm text-muted-foreground mt-1'>
            Could not load your cart. Please try again.
          </p>
          <Button
            variant='outline'
            className='mt-4'
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CART] })
            }
          >
            Try Again
          </Button>
        </div>
      </div>
      <Footer />
    </>
  );
}
