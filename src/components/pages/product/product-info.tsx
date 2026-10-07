import { BadgeCheck, Ruler, Tag, Truck, Weight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/utils';
import type { PublicProduct } from '@/services/product';
import { RatingDisplay } from './rating-display';
import { ShareProduct } from './share-product';
import { StockStatus } from './stock-status';

type ProductInfoProps = {
  product: PublicProduct;
  currentPrice?: number;
  currentOriginalPrice?: number | null;
  currentDiscountPercent?: number | null;
};

function isHexColor(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value);
}

function isColorAttr(name: string) {
  return name.toLowerCase() === 'color' || name.toLowerCase() === 'colour';
}

export function ProductInfo({
  product,
  currentPrice,
  currentOriginalPrice,
  currentDiscountPercent,
}: ProductInfoProps) {
  const avgRating =
    product._count.reviews > 0
      ? Object.entries(product.ratingBreakdown).reduce(
          (sum, [star, count]) => sum + Number(star) * count,
          0,
        ) / product._count.reviews
      : 0;

  const hasDimensions =
    (product.dimensionLength ?? 0) > 0 &&
    (product.dimensionWidth ?? 0) > 0 &&
    (product.dimensionHeight ?? 0) > 0;

  const hasVariantOptions =
    product.hasVariants && product.attributeOptions.length > 0;

  const significantAttrs = [
    hasVariantOptions,
    !!product.brand,
    !!product.weight,
    hasDimensions,
    product.tags.length > 0,
  ].filter(Boolean).length;

  const showAttrs = significantAttrs > 0;

  const displayPrice =
    currentPrice ||
    (product.discountPrice && product.discountPrice > 0
      ? product.discountPrice
      : product.price);
  const displayOriginalPrice =
    currentOriginalPrice !== undefined
      ? currentOriginalPrice
      : product.discountPrice && product.discountPrice > 0
        ? product.price
        : null;
  const displayDiscountPercent =
    currentDiscountPercent !== undefined
      ? currentDiscountPercent
      : product.discountPercent;

  return (
    <div className='space-y-5'>
      {/* ── Badges row ── */}
      <div className='flex items-start justify-between gap-2'>
        <div className='flex items-center gap-2 flex-wrap'>
          {product.brand && (
            <Badge variant='outline' className='text-xs font-medium'>
              {product.brand}
            </Badge>
          )}
          {product.freeShipping && (
            <span className='inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full'>
              <Truck className='w-2.5 h-2.5' />
              Free Shipping
            </span>
          )}
          {product.shop?.status === 'ACTIVE' && (
            <span className='inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full'>
              <BadgeCheck className='w-2.5 h-2.5' />
              Verified
            </span>
          )}
        </div>
        <div className='flex items-center gap-1 shrink-0'>
          <ShareProduct slug={product.slug} />
        </div>
      </div>

      {/* ── Product name ── */}
      <div>
        <h1 className='text-2xl md:text-3xl font-bold tracking-tight leading-tight'>
          {product.productName}
          <span className='text-primary'>.</span>
        </h1>
      </div>

      {/* ── Rating ── */}
      <div className='flex items-center gap-3 flex-wrap'>
        <RatingDisplay rating={avgRating} size='md' />
        <span className='text-sm text-muted-foreground'>
          {avgRating > 0
            ? `${avgRating.toFixed(1)} (${product._count.reviews.toLocaleString()} reviews)`
            : 'No reviews yet'}
        </span>
      </div>

      {/* ── Price ── */}
      <div className='flex items-baseline gap-3'>
        <span className='text-2xl font-bold tabular-nums'>
          ৳{displayPrice.toLocaleString()}
        </span>
        {displayOriginalPrice !== null && (
          <span className='text-lg text-muted-foreground line-through tabular-nums'>
            ৳{displayOriginalPrice.toLocaleString()}
          </span>
        )}
        {displayDiscountPercent && (
          <span className='text-xs font-bold bg-destructive/10 text-destructive px-2 py-0.5 rounded-md'>
            -{displayDiscountPercent}%
          </span>
        )}
      </div>

      {/* ── Stock status ── */}
      <StockStatus stock={product.stock} lowStockThreshold={5} />

      {/* ── Details section ── */}
      {showAttrs && (
        <div className='rounded-2xl border border-border bg-card p-5 space-y-4'>
          <div className='flex items-center gap-3'>
            <div className='h-px w-4 bg-primary' />
            <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
              Details
            </span>
          </div>

          {/* Variant attribute options — read-only summary */}
          {product.hasVariants &&
            product.attributeOptions.map((attr) => (
              <div key={attr.id} className='flex items-start gap-3'>
                <span className='text-xs text-muted-foreground font-medium min-w-18 pt-0.5'>
                  {attr.name}
                </span>
                <div className='flex flex-wrap gap-1.5'>
                  {(attr.attributeValues?.length
                    ? attr.attributeValues
                    : attr.values.map((v) => ({
                        value: v,
                        slug: v.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                        imageUrl: null,
                      }))
                  ).map((val) => {
                    const displayValue =
                      typeof val === 'string' ? val : val.value;
                    const imgUrl =
                      typeof val === 'object' ? val.imageUrl : null;
                    if (isColorAttr(attr.name) && isHexColor(displayValue)) {
                      return (
                        <span
                          key={
                            typeof val === 'string'
                              ? val
                              : val.slug || val.value
                          }
                          className='inline-flex items-center gap-1.5 text-xs bg-background border border-border rounded-full px-2 py-0.5'
                        >
                          <span
                            className='w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-border bg-cover bg-center'
                            style={
                              imgUrl
                                ? { backgroundImage: `url(${imgUrl})` }
                                : { backgroundColor: displayValue }
                            }
                          />
                          {displayValue}
                        </span>
                      );
                    }
                    return (
                      <span
                        key={
                          typeof val === 'string' ? val : val.slug || val.value
                        }
                        className='inline-flex items-center text-xs bg-background border border-border rounded-full px-2.5 py-0.5'
                      >
                        {displayValue}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}

          {/* Tags — key attributes for non-variant products */}
          {product.tags.length > 0 && (
            <div className='flex items-start gap-3'>
              <Tag className='w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0' />
              <div className='flex flex-wrap gap-1.5'>
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className='inline-flex items-center text-xs bg-background text-foreground border border-border rounded-full px-2.5 py-0.5 capitalize'
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Brand */}
          {product.brand && <AttrRow label='Brand' value={product.brand} />}

          {/* SKU */}
          <AttrRow label='SKU' value={product.sku} />

          {/* Condition — only shown when not the default "NEW" */}
          {product.condition !== 'NEW' && (
            <AttrRow
              label='Condition'
              value={product.condition.replace(/_/g, ' ')}
            />
          )}

          {/* Weight */}
          {product.weight && (
            <div className='flex items-center gap-3'>
              <Weight className='w-3.5 h-3.5 text-muted-foreground shrink-0' />
              <span className='text-xs text-muted-foreground min-w-18'>
                Weight
              </span>
              <span className='text-xs font-medium text-foreground'>
                {product.weight} {product.weightUnit}
              </span>
            </div>
          )}

          {/* Dimensions */}
          {hasDimensions && (
            <div className='flex items-center gap-3'>
              <Ruler className='w-3.5 h-3.5 text-muted-foreground shrink-0' />
              <span className='text-xs text-muted-foreground min-w-18'>
                Dimensions
              </span>
              <span className='text-xs font-medium text-foreground'>
                {product.dimensionLength} × {product.dimensionWidth} ×{' '}
                {product.dimensionHeight} {product.dimensionUnit}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Condition description ── */}
      {product.conditionDescription && (
        <p className='text-sm text-muted-foreground leading-relaxed border-t border-border pt-4'>
          {product.conditionDescription}
        </p>
      )}

      {/* ── Sold by ── */}
      {product.shop && (
        <div className='flex items-center gap-2 border-t border-border pt-4'>
          <span className='text-sm text-muted-foreground'>Sold by:</span>
          <div className='flex items-center gap-2'>
            <Avatar className='w-6 h-6'>
              <AvatarImage
                src={product.shop.logoUrl ?? undefined}
                alt={product.shop.name}
              />
              <AvatarFallback className='text-[10px]'>
                {getInitials(product.shop.name)}
              </AvatarFallback>
            </Avatar>
            <span className='text-sm font-medium'>{product.shop.name}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function AttrRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-center gap-3'>
      <span className='text-xs text-muted-foreground font-medium min-w-18'>
        {label}
      </span>
      <span className='text-xs font-medium text-foreground'>{value}</span>
    </div>
  );
}
