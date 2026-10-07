import namer from 'color-namer';
import { Ruler } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ColorSwatch } from './color-swatch';
import { StockStatus } from './stock-status';

type AttributeOption = {
  id: string;
  name: string;
  values: string[];
  attributeValues?: Array<{
    id: string;
    value: string;
    slug: string;
    displayOrder: number;
    imageUrl: string | null;
    imagePublicId: string | null;
    metadata: Record<string, unknown> | null;
  }>;
};

type VariantAttributeValue = {
  attributeValue: {
    id: string;
    value: string;
    slug: string;
    optionId: string;
  };
};

export type Variant = {
  id: string;
  name: string;
  sku: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  status?: string;
  reservedStock?: number;
  attributes: Record<string, string>;
  imageUrl: string | null;
  attributeValues: VariantAttributeValue[];
};

type ProductVariantPickerProps = {
  attributeOptions: AttributeOption[];
  variants: Variant[];
  basePrice: number;
  baseDiscountPrice: number | null;
  onVariantChange?: (variant: Variant | null) => void;
};

function getColorName(color: string): string {
  try {
    return namer(color).ntc[0]?.name ?? color;
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: this is fine
    console.error('Failed to get color name:', error);
    return color;
  }
}

function variantAvailable(v: Variant): number {
  return Math.max(0, v.stock - (v.reservedStock ?? 0));
}

export function ProductVariantPicker({
  attributeOptions,
  variants,
  basePrice,
  baseDiscountPrice,
  onVariantChange,
}: ProductVariantPickerProps) {
  const [selected, setSelected] = useState<Record<string, string>>({});

  const variantMatchesSelection = useCallback(
    (v: Variant, selection: Record<string, string>) =>
      attributeOptions.every((opt) =>
        v.attributeValues.some(
          (av) =>
            av.attributeValue.optionId === opt.id &&
            av.attributeValue.value === selection[opt.name],
        ),
      ),
    [attributeOptions],
  );

  const currentVariant = useMemo(() => {
    const keys = Object.keys(selected);
    if (keys.length === 0 || keys.some((k) => !selected[k])) return null;
    return variants.find((v) => variantMatchesSelection(v, selected)) ?? null;
  }, [selected, variants, variantMatchesSelection]);

  const displayPrice = currentVariant
    ? currentVariant.discountPrice && currentVariant.discountPrice > 0
      ? currentVariant.discountPrice
      : currentVariant.price
    : baseDiscountPrice && baseDiscountPrice > 0
      ? baseDiscountPrice
      : basePrice;

  const displayOriginalPrice = currentVariant
    ? currentVariant.discountPrice && currentVariant.discountPrice > 0
      ? currentVariant.price
      : null
    : baseDiscountPrice && baseDiscountPrice > 0
      ? basePrice
      : null;

  const displayStock = currentVariant ? variantAvailable(currentVariant) : null;
  const missingAttributes = attributeOptions.filter(
    (opt) => !selected[opt.name],
  );
  const isColorType = (name: string) =>
    name.toLowerCase() === 'color' || name.toLowerCase() === 'colour';
  const isSizeType = (name: string) => name.toLowerCase() === 'size';

  const handleSelect = (attrName: string, value: string) => {
    const next = { ...selected, [attrName]: value };
    setSelected(next);

    // Side effects belong outside the state updater — updaters must be pure
    // (they can run twice under StrictMode) (FE-12).
    const allSelected = attributeOptions.every((opt) => next[opt.name]);
    if (allSelected) {
      const match =
        variants.find((v) => variantMatchesSelection(v, next)) ?? null;
      onVariantChange?.(match);
    }
  };

  const findAttrValue = (
    attr: AttributeOption,
    value: string,
  ): NonNullable<AttributeOption['attributeValues']>[number] | undefined => {
    return attr.attributeValues?.find((av) => av.value === value);
  };

  return (
    <div className='space-y-4'>
      {attributeOptions.map((attr) => (
        <div key={attr.id}>
          <p className='text-sm font-medium mb-2'>
            {attr.name}
            {selected[attr.name] && (
              <span className='text-muted-foreground font-normal'>
                : <span className='text-foreground'>{selected[attr.name]}</span>
              </span>
            )}
          </p>

          {isColorType(attr.name) && (
            <div className='flex flex-wrap gap-3'>
              {attr.values.map((value) => {
                const disabled = !variants.some(
                  (v) =>
                    v.attributeValues.some(
                      (av) =>
                        av.attributeValue.optionId === attr.id &&
                        av.attributeValue.value === value,
                    ) && v.stock > 0,
                );
                const av = findAttrValue(attr, value);
                return (
                  <ColorSwatch
                    key={value}
                    color={value}
                    imageUrl={av?.imageUrl}
                    isSelected={selected[attr.name] === value}
                    onClick={() => handleSelect(attr.name, value)}
                    label={getColorName(value)}
                    disabled={disabled}
                  />
                );
              })}
            </div>
          )}

          {isSizeType(attr.name) && (
            <div>
              <div className='flex items-center justify-between mb-2'>
                <div />
                <SizeGuideDialog />
              </div>
              <div className='flex flex-wrap gap-2'>
                {attr.values.map((value) => {
                  const isActive = selected[attr.name] === value;
                  const disabled = !variants.some(
                    (v) =>
                      v.attributeValues.some(
                        (av) =>
                          av.attributeValue.optionId === attr.id &&
                          av.attributeValue.value === value,
                      ) && v.stock > 0,
                  );
                  return (
                    <button
                      key={value}
                      type='button'
                      onClick={() => handleSelect(attr.name, value)}
                      disabled={disabled}
                      className={cn(
                        'px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200',
                        isActive
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-border hover:border-primary/50 hover:text-primary',
                        disabled && 'opacity-40 cursor-not-allowed',
                      )}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!isColorType(attr.name) && !isSizeType(attr.name) && (
            <div className='flex flex-wrap gap-2'>
              {attr.values.map((value) => {
                const isActive = selected[attr.name] === value;
                const disabled = !variants.some(
                  (v) =>
                    v.attributeValues.some(
                      (av) =>
                        av.attributeValue.optionId === attr.id &&
                        av.attributeValue.value === value,
                    ) && v.stock > 0,
                );
                return (
                  <button
                    key={value}
                    type='button'
                    onClick={() => handleSelect(attr.name, value)}
                    disabled={disabled}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border hover:border-primary/50 hover:text-primary',
                      disabled && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}

      <div className='flex items-center gap-6 pt-2'>
        <div>
          <p className='text-xs text-muted-foreground mb-1'>Price</p>
          <div className='flex items-baseline gap-2'>
            <span className='text-lg font-bold tabular-nums'>
              ৳{displayPrice.toLocaleString()}
            </span>
            {displayOriginalPrice !== null && (
              <span className='text-sm text-muted-foreground line-through tabular-nums'>
                ৳{displayOriginalPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {displayStock !== null && (
          <div>
            <p className='text-xs text-muted-foreground mb-1'>Stock</p>
            <StockStatus stock={displayStock} lowStockThreshold={5} />
          </div>
        )}
      </div>

      {missingAttributes.length > 0 && (
        <p className='text-xs text-muted-foreground'>
          Please select {missingAttributes.map((a) => a.name).join(' and ')}
        </p>
      )}
    </div>
  );
}

function SizeGuideDialog() {
  const sizes = [
    { label: 'S', chest: '36"', length: '28"', sleeve: '18"' },
    { label: 'M', chest: '38"', length: '29"', sleeve: '19"' },
    { label: 'L', chest: '40"', length: '30"', sleeve: '20"' },
    { label: 'XL', chest: '43"', length: '31"', sleeve: '21"' },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='link' className='h-auto p-0 text-xs gap-1'>
          <Ruler className='w-3 h-3' />
          Size Guide
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Size Guide</DialogTitle>
        </DialogHeader>
        <div className='grid grid-cols-4 gap-3 py-4'>
          <div className='text-xs font-semibold text-muted-foreground'>
            Size
          </div>
          <div className='text-xs font-semibold text-muted-foreground'>
            Chest
          </div>
          <div className='text-xs font-semibold text-muted-foreground'>
            Length
          </div>
          <div className='text-xs font-semibold text-muted-foreground'>
            Sleeve
          </div>
          {sizes.map((s) => (
            <div key={s.label} className='contents'>
              <div className='text-sm font-medium'>{s.label}</div>
              <div className='text-sm text-muted-foreground'>{s.chest}</div>
              <div className='text-sm text-muted-foreground'>{s.length}</div>
              <div className='text-sm text-muted-foreground'>{s.sleeve}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
