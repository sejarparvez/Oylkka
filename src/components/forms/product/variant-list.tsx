import colorNamer from 'color-namer';
import { ImagePlus, TrashIcon, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const VARIANT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'PRE_ORDER', label: 'Pre-order' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
  { value: 'DISCONTINUED', label: 'Discontinued' },
] as const;

const WEIGHT_UNIT_OPTIONS = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'lb', label: 'lb' },
  { value: 'oz', label: 'oz' },
] as const;

interface VariantListProps {
  variants: Array<{
    id?: string;
    name: string;
    sku: string;
    price: number;
    discountPrice?: number | null;
    stock: number;
    attributes: Record<string, string>;
    image?: File | string | null;
    // Existing persisted rows (ProductVariantImage[]), shown in the single
    // slot until the vendor picks a File (FE-43).
    variantImages?: Array<{
      id?: string;
      imageUrl: string;
      imagePublicId?: string;
      order?: number;
    }> | null;
    status?: string;
    barcode?: string | null;
    weight?: number | null;
    weightUnit?: string;
  }>;
  onUpdate: (index: number, value: Record<string, unknown>) => void;
  onRemove: (index: number) => void;
  hasAttributes: boolean;
  basePrice?: number;
  priceModifierMap?: Record<string, Record<string, number | null>>;
}

export default function VariantList({
  variants,
  onUpdate,
  onRemove,
  hasAttributes,
  basePrice = 0,
  priceModifierMap = {},
}: VariantListProps) {
  // FE-36 (residual): the single-slot preview asks for `URL.createObjectURL`
  // on every render, and render-time URLs were never revoked — a leak per
  // keystroke that touches the field. Memoize one URL per File for the life
  // of the component and release them all on unmount.
  const objectUrlCacheRef = useRef<Map<File, string>>(new Map());

  useEffect(() => {
    const cache = objectUrlCacheRef.current;
    return () => {
      for (const url of cache.values()) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
      cache.clear();
    };
  }, []);

  const previewFor = (file: File) => {
    const cached = objectUrlCacheRef.current.get(file);
    if (cached) return cached;
    const url = URL.createObjectURL(file);
    objectUrlCacheRef.current.set(file, url);
    return url;
  };
  const handleVariantImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    onUpdate(index, { ...variants[index], image: file });
  };

  const removeVariantImage = (index: number) => {
    onUpdate(index, {
      ...variants[index],
      image: null,
      variantImages: [],
    });
  };

  const updateVariantField = (index: number, field: string, value: unknown) => {
    onUpdate(index, { ...variants[index], [field]: value });
  };

  const getReadableColorName = (colorValue: string): string => {
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorValue)) {
      try {
        const names = colorNamer(colorValue);
        if (names.basic?.length > 0)
          return capitalizeColorName(names.basic[0].name);
        if (names.ntc?.length > 0)
          return capitalizeColorName(names.ntc[0].name);
        if (names.roygbiv?.length > 0)
          return capitalizeColorName(names.roygbiv[0].name);
        if (names.pantone?.length > 0)
          return capitalizeColorName(names.pantone[0].name);
      } catch (error) {
        // biome-ignore lint/suspicious/noConsole: this is fine
        console.error('Failed to parse color name:', error);
      }
    }
    return colorValue;
  };

  const capitalizeColorName = (name: string): string =>
    name
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  const formatAttributeName = (name: string): string =>
    name.charAt(0).toUpperCase() + name.slice(1);

  const formatAttributeValue = (key: string, value: string): string => {
    if (
      key.toLowerCase() === 'color' &&
      /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)
    ) {
      return getReadableColorName(value);
    }
    return value;
  };

  const groupVariantsByPrimaryAttribute = () => {
    if (variants.length === 0) return {};

    const firstVariant = variants[0];
    if (
      !firstVariant.attributes ||
      Object.keys(firstVariant.attributes).length === 0
    ) {
      return { groups: { ungrouped: variants } };
    }

    const attributeCounts: Record<string, number> = {};
    variants.forEach((variant) => {
      if (!variant.attributes) return;
      Object.keys(variant.attributes).forEach((attr) => {
        attributeCounts[attr] = (attributeCounts[attr] || 0) + 1;
      });
    });

    const primaryAttribute = Object.entries(attributeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([attr]) => attr)[0];

    if (!primaryAttribute) return { groups: { ungrouped: variants } };

    const groups: Record<string, typeof variants> = {};
    variants.forEach((variant) => {
      if (!variant.attributes?.[primaryAttribute]) {
        groups.ungrouped = groups.ungrouped || [];
        groups.ungrouped.push(variant);
        return;
      }

      const value = variant.attributes[primaryAttribute];
      const groupKey =
        primaryAttribute.toLowerCase() === 'color' &&
        /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)
          ? getReadableColorName(value)
          : value;

      groups[groupKey] = groups[groupKey] || [];
      groups[groupKey].push(variant);
    });

    return { primaryAttribute, groups };
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: this is fine
  const groupingResult = useMemo(
    () => groupVariantsByPrimaryAttribute(),
    [variants],
  );
  const { primaryAttribute, groups: groupedVariants } = groupingResult as {
    primaryAttribute?: string;
    groups: Record<string, typeof variants>;
  };

  if (variants.length === 0) {
    return (
      <div className='rounded-md border border-dashed py-8 text-center'>
        <p className='text-gray-500'>No variants added yet.</p>
        {hasAttributes ? (
          <p className='mt-2 text-sm text-gray-400'>
            Make sure you&apos;ve defined a product SKU, then click
            &quot;Generate Variants&quot; to create product variants.
          </p>
        ) : (
          <p className='mt-2 text-sm text-gray-400'>
            Define product attributes and SKU first to generate variants.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className='mt-4 space-y-6'>
      <Separator className='my-4' />

      {primaryAttribute && (
        <div className='mb-4'>
          <p className='text-muted-foreground text-sm'>
            Variants grouped by {formatAttributeName(primaryAttribute)}
          </p>
        </div>
      )}

      {Object.entries(groupedVariants).map(([group, groupVariants]) => (
        <div key={group} className='space-y-4'>
          {group !== 'ungrouped' && (
            <div className='flex items-center gap-2'>
              <h3 className='text-lg font-semibold'>
                {primaryAttribute &&
                  primaryAttribute.toLowerCase() === 'color' &&
                  groupVariants[0]?.attributes?.[primaryAttribute] &&
                  /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(
                    groupVariants[0].attributes[primaryAttribute],
                  ) && (
                    <span
                      className='mr-2 inline-block h-4 w-4 rounded-full border'
                      style={{
                        backgroundColor:
                          groupVariants[0].attributes[primaryAttribute],
                      }}
                    />
                  )}
                {group}
              </h3>
              <Badge variant='outline' className='text-xs'>
                {groupVariants.length} variant
                {groupVariants.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          )}

          <div className='space-y-4'>
            {groupVariants.map((variant) => {
              const index = variants.findIndex((v) => v.id === variant.id);
              if (index === -1) return null;

              // Single slot, three sources: a freshly picked File (marked for
              // upload on submit), a stored URL in `image`, or the first of
              // the variant's persisted VariantImage rows (FE-43).
              const imageSrc =
                variant.image instanceof File
                  ? previewFor(variant.image)
                  : typeof variant.image === 'string' && variant.image !== ''
                    ? variant.image
                    : (variant.variantImages?.[0]?.imageUrl ?? null);

              return (
                <div
                  key={variant.id || index}
                  className='rounded-md border p-4'
                >
                  <div className='mb-4 flex items-center justify-between'>
                    <h3 className='text-lg font-medium'>{variant.name}</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='text-red-500 hover:bg-red-50 hover:text-red-700'
                            onClick={() => onRemove(index)}
                          >
                            <TrashIcon className='mr-1 h-4 w-4' /> Remove
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete this variant</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className='mb-4 grid grid-cols-2 gap-4 md:grid-cols-4'>
                    <div>
                      <span className='text-muted-foreground text-sm'>
                        SKU:
                      </span>
                      <Input
                        value={variant.sku}
                        className='mt-1'
                        onChange={(e) =>
                          updateVariantField(index, 'sku', e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <span className='text-muted-foreground text-sm'>
                        Price:
                      </span>
                      <Input
                        type='number'
                        value={variant.price || ''}
                        onChange={(e) =>
                          updateVariantField(
                            index,
                            'price',
                            Number.parseFloat(e.target.value) || 0,
                          )
                        }
                        className='mt-1'
                      />
                      {variant.attributes &&
                        Object.keys(priceModifierMap).length > 0 &&
                        (() => {
                          let totalModifier = 0;
                          const parts: string[] = [];
                          Object.entries(variant.attributes).forEach(
                            ([attrKey, attrValue]) => {
                              const mod =
                                priceModifierMap[attrKey]?.[
                                  attrValue.toLowerCase()
                                ];
                              if (mod != null && mod !== 0) {
                                totalModifier += mod;
                                parts.push(
                                  `${mod > 0 ? '+' : ''}$${mod.toFixed(2)} (${attrValue})`,
                                );
                              }
                            },
                          );
                          if (totalModifier !== 0) {
                            return (
                              <p className='text-muted-foreground mt-1 text-xs'>
                                Base ${Number(basePrice).toFixed(2)}
                                {parts.join(' ')} = $
                                {(
                                  Math.round(
                                    (basePrice + totalModifier) * 100,
                                  ) / 100
                                ).toFixed(2)}
                              </p>
                            );
                          }
                          return null;
                        })()}
                    </div>
                    <div>
                      <span className='text-sm text-gray-500'>Discount:</span>
                      <Input
                        type='number'
                        value={variant.discountPrice || ''}
                        onChange={(e) =>
                          updateVariantField(
                            index,
                            'discountPrice',
                            e.target.value === ''
                              ? null
                              : Number.parseFloat(e.target.value),
                          )
                        }
                        className='mt-1'
                      />
                    </div>
                    <div>
                      <span className='text-sm text-gray-500'>Stock:</span>
                      <Input
                        type='number'
                        value={variant.stock || ''}
                        onChange={(e) =>
                          updateVariantField(
                            index,
                            'stock',
                            Number.parseInt(e.target.value, 10) || 0,
                          )
                        }
                        className='mt-1'
                      />
                    </div>
                  </div>

                  {/* Phase 1 — Variant Enrichment fields */}
                  <div className='mb-4 grid grid-cols-2 gap-4 md:grid-cols-4'>
                    <div>
                      <span className='text-muted-foreground text-sm'>
                        Status:
                      </span>
                      <Select
                        value={variant.status ?? 'ACTIVE'}
                        onValueChange={(val) =>
                          updateVariantField(index, 'status', val)
                        }
                      >
                        <SelectTrigger className='mt-1'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VARIANT_STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <span className='text-muted-foreground text-sm'>
                        Barcode:
                      </span>
                      <Input
                        value={variant.barcode ?? ''}
                        onChange={(e) =>
                          updateVariantField(
                            index,
                            'barcode',
                            e.target.value || null,
                          )
                        }
                        placeholder='EAN / UPC / ISBN'
                        className='mt-1'
                      />
                    </div>
                    <div>
                      <span className='text-muted-foreground text-sm'>
                        Weight:
                      </span>
                      <Input
                        type='number'
                        min={0}
                        step={0.01}
                        value={variant.weight ?? ''}
                        onChange={(e) =>
                          updateVariantField(
                            index,
                            'weight',
                            e.target.value
                              ? Number.parseFloat(e.target.value)
                              : null,
                          )
                        }
                        className='mt-1'
                      />
                    </div>
                    <div>
                      <span className='text-muted-foreground text-sm'>
                        Weight Unit:
                      </span>
                      <Select
                        value={variant.weightUnit ?? 'kg'}
                        onValueChange={(val) =>
                          updateVariantField(index, 'weightUnit', val)
                        }
                      >
                        <SelectTrigger className='mt-1'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEIGHT_UNIT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {variant.attributes &&
                    Object.keys(variant.attributes).length > 0 && (
                      <div className='mb-4'>
                        <span className='text-muted-foreground mb-2 block text-sm'>
                          Attributes:
                        </span>
                        <div className='flex flex-wrap gap-2'>
                          {Object.entries(variant.attributes).map(
                            ([key, value]) => (
                              <Badge
                                key={key}
                                variant='secondary'
                                className='items-center'
                              >
                                {key.toLowerCase() === 'color' &&
                                  /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(
                                    value,
                                  ) && (
                                    <span
                                      className='mr-1 inline-block h-3 w-3 rounded-full'
                                      style={{ backgroundColor: value }}
                                    />
                                  )}
                                {formatAttributeName(key)}:{' '}
                                {formatAttributeValue(key, value)}
                              </Badge>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  <div>
                    <span className='text-muted-foreground mb-2 block text-sm'>
                      Image:
                    </span>
                    <div className='flex items-center gap-4'>
                      {imageSrc ? (
                        <div className='group relative'>
                          <img
                            src={imageSrc}
                            alt={`Variant ${variant.name}`}
                            className='h-16 w-16 rounded-md object-cover'
                          />
                          <button
                            type='button'
                            className='absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100'
                            onClick={() => removeVariantImage(index)}
                          >
                            <X className='h-3 w-3' />
                          </button>
                        </div>
                      ) : (
                        <div className='text-sm text-gray-500'>No image</div>
                      )}
                      <div>
                        <input
                          type='file'
                          id={`variant-${index}-image`}
                          className='hidden'
                          accept='image/*'
                          onChange={(e) => handleVariantImageUpload(e, index)}
                        />
                        <label
                          htmlFor={`variant-${index}-image`}
                          className='flex h-16 w-16 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-gray-300'
                        >
                          <ImagePlus className='h-6 w-6 text-gray-400' />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
