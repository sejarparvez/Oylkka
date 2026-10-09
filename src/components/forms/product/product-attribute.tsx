import { Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { useFormContext } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardDescription, CardTitle } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useGlobalAttributes } from '@/services/global-attributes';

import type { ProductFormValues } from './product-form-type';

type AttributeHierarchy = {
  primary: string | null;
  secondary: string[];
};

const ATTRIBUTE_TYPES = [
  { value: 'color', label: 'Color' },
  { value: 'size', label: 'Size' },
  { value: 'material', label: 'Material' },
  { value: 'style', label: 'Style' },
  { value: 'custom', label: 'Custom' },
];

const ATTRIBUTE_PRESETS: Record<string, string[]> = {
  size: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  material: [
    'Cotton',
    'Polyester',
    'Leather',
    'Denim',
    'Wool',
    'Silk',
    'Linen',
  ],
  style: ['Casual', 'Formal', 'Sport', 'Vintage', 'Modern', 'Classic'],
};

const COLOR_NAME_TO_HEX: Record<string, string> = {
  Black: '#000000',
  White: '#FFFFFF',
  Red: '#FF0000',
  Blue: '#0000FF',
  Green: '#008000',
  Yellow: '#FFFF00',
  Purple: '#800080',
  Orange: '#FFA500',
  Gray: '#808080',
  Pink: '#FFC0CB',
  Brown: '#A52A2A',
  Navy: '#000080',
  Teal: '#008080',
  Maroon: '#800000',
  Silver: '#C0C0C0',
  Gold: '#FFD700',
  Beige: '#F5F5DC',
} as const;

const COMMON_COLORS = [
  '#FF0000',
  '#0000FF',
  '#008000',
  '#000000',
  '#FFFFFF',
  '#FFFF00',
  '#FFA500',
  '#800080',
  '#808080',
];

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 64);
}

type AttributeValueEntry = {
  value: string;
  slug: string;
  displayOrder: number;
  priceModifier?: number | null;
  // FE-45: links to the canonical GlobalAttributeValue this local value maps
  // to, if one was matched when the value was added (or hydrated on edit).
  globalAttributeId?: string | null;
  globalValueId?: string | null;
};

function getEntryValues(entry: unknown): Array<AttributeValueEntry> {
  if (Array.isArray(entry)) {
    // Old format: flat string[]
    return entry.map((val, i) => ({
      value: val,
      slug: toSlug(val),
      displayOrder: i,
      priceModifier: undefined,
    }));
  }
  if (entry && typeof entry === 'object' && 'values' in entry) {
    return (
      (
        entry as {
          values: Array<AttributeValueEntry>;
        }
      ).values ?? []
    );
  }
  return [];
}

export function ProductAttributes() {
  const { setValue, watch } = useFormContext<ProductFormValues>();
  const [newValues, setNewValues] = useState<Record<string, string>>({});
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>(
    {},
  );
  const [attributeTypes, setAttributeTypes] = useState<string[]>([]);
  const [attributeHierarchy, setAttributeHierarchy] =
    useState<AttributeHierarchy>({
      primary: null,
      secondary: [],
    });

  const rawAttributes = watch('attributes');
  const attributesRecord = useMemo(() => rawAttributes ?? {}, [rawAttributes]);

  // FE-45: the GlobalAttribute taxonomy this form links local values to. Empty
  // while loading or unavailable — matching is best-effort and additive, never
  // required for a value to be saved.
  const { data: globalAttributes = [] } = useGlobalAttributes();

  const findGlobalMapping = (
    attrType: string,
    value: string,
  ): { globalAttributeId: string; globalValueId: string } | undefined => {
    const attrKey = attrType.toLowerCase();
    const attrKeyPlural = `${attrKey}s`;
    const target = value.toLowerCase();

    for (const ga of globalAttributes) {
      const name = ga.name.toLowerCase();
      const slug = ga.slug.toLowerCase();
      if (
        name !== attrKey &&
        name !== attrKeyPlural &&
        slug !== attrKey &&
        slug !== attrKeyPlural
      ) {
        continue;
      }
      const direct = ga.values.find(
        (v) =>
          v.value.toLowerCase() === target || v.slug.toLowerCase() === target,
      );
      if (direct) return { globalAttributeId: ga.id, globalValueId: direct.id };
      // Color values are stored as hex in this form ('#ff0000'), so also match
      // the global value's metadata.hex when one is set.
      if (attrKey === 'color') {
        const byHex = ga.values.find((v) => {
          const hex = (v.metadata as Record<string, unknown> | null)?.hex;
          return typeof hex === 'string' && hex.toLowerCase() === target;
        });
        if (byHex) return { globalAttributeId: ga.id, globalValueId: byHex.id };
      }
    }
    return undefined;
  };

  function mergeEntry(
    entry: unknown,
    values: Array<AttributeValueEntry>,
  ): {
    values: typeof values;
    isVariantDefining: boolean;
    displayOrder: number;
  } {
    if (
      entry &&
      typeof entry === 'object' &&
      !Array.isArray(entry) &&
      'values' in entry
    ) {
      const ext = entry as {
        isVariantDefining?: boolean;
        displayOrder?: number;
      };
      return {
        isVariantDefining: ext.isVariantDefining ?? true,
        displayOrder: ext.displayOrder ?? 0,
        values,
      };
    }
    return { values, isVariantDefining: true, displayOrder: 0 };
  }

  const addAttribute = (type: string) => {
    if (attributeTypes.includes(type)) return;
    setAttributeTypes((prev) => [...prev, type]);
    setValue(
      'attributes',
      {
        ...attributesRecord,
        [type]: {
          values: [],
          isVariantDefining: true,
          displayOrder: attributeTypes.length,
        },
      },
      { shouldValidate: true },
    );
  };

  const removeAttribute = (type: string) => {
    setAttributeTypes((prev) => prev.filter((t) => t !== type));
    const newAttributes = { ...attributesRecord };
    delete newAttributes[type];
    setValue(
      'attributes',
      Object.keys(newAttributes).length > 0 ? newAttributes : undefined,
      { shouldValidate: true },
    );
    setNewValues((prev) => {
      const copy = { ...prev };
      delete copy[type];
      return copy;
    });
    setSelectedColors((prev) => {
      const copy = { ...prev };
      delete copy[type];
      return copy;
    });
  };

  const addAttributeValue = (attrType: string, value?: string) => {
    const newValue = (value || newValues[attrType] || '').trim();
    if (!newValue) return;

    let finalValue = newValue;
    if (attrType.toLowerCase() === 'color') {
      finalValue =
        COLOR_NAME_TO_HEX[newValue as keyof typeof COLOR_NAME_TO_HEX] ||
        (newValue.startsWith('#') ? newValue : `#${newValue}`);
    }

    const currentEntry = attributesRecord[attrType] ?? {
      values: [],
      isVariantDefining: true,
      displayOrder: attributeTypes.indexOf(attrType),
    };
    const currentValues = getEntryValues(currentEntry);
    if (currentValues.some((v) => v.value === finalValue)) return;

    const mapping = findGlobalMapping(attrType, finalValue);

    setValue(
      'attributes',
      {
        ...attributesRecord,
        [attrType]: mergeEntry(currentEntry, [
          ...currentValues,
          {
            value: finalValue,
            slug: toSlug(finalValue),
            displayOrder: currentValues.length,
            priceModifier: undefined,
            ...(mapping ?? {}),
          },
        ]),
      },
      { shouldValidate: true },
    );
    setNewValues((prev) => ({ ...prev, [attrType]: '' }));
  };

  const addMultipleAttributeValues = (attrType: string, values: string[]) => {
    const currentEntry = attributesRecord[attrType] ?? {
      values: [],
      isVariantDefining: true,
      displayOrder: attributeTypes.indexOf(attrType),
    };
    const currentValues = getEntryValues(currentEntry);

    const existingValuesSet = new Set(currentValues.map((v) => v.value));
    const newVals = values.filter((v) => !existingValuesSet.has(v));
    if (newVals.length === 0) return;

    const startOrder = currentValues.length;
    const newValueObjects = newVals.map((val, i) => {
      let finalValue = val;
      if (attrType.toLowerCase() === 'color') {
        finalValue =
          COLOR_NAME_TO_HEX[val as keyof typeof COLOR_NAME_TO_HEX] ||
          (val.startsWith('#') ? val : `#${val}`);
      }
      const mapping = findGlobalMapping(attrType, finalValue);
      return {
        value: finalValue,
        slug: toSlug(finalValue),
        displayOrder: startOrder + i,
        priceModifier: undefined,
        ...(mapping ?? {}),
      };
    });

    setValue(
      'attributes',
      {
        ...attributesRecord,
        [attrType]: mergeEntry(currentEntry, [
          ...currentValues,
          ...newValueObjects,
        ]),
      },
      { shouldValidate: true },
    );
  };

  const updateAttributeValuePriceModifier = (
    attrType: string,
    index: number,
    priceModifier: number | null,
  ) => {
    const currentEntry = attributesRecord[attrType];
    if (!currentEntry) return;
    const currentValues = getEntryValues(currentEntry);
    const newValues = currentValues.map((v, i) =>
      i === index ? { ...v, priceModifier } : v,
    );
    setValue(
      'attributes',
      {
        ...attributesRecord,
        [attrType]: mergeEntry(currentEntry, newValues),
      },
      { shouldValidate: true },
    );
  };

  const removeAttributeValue = (attrType: string, index: number) => {
    const currentEntry = attributesRecord[attrType];
    if (!currentEntry) return;
    const currentValues = getEntryValues(currentEntry);
    const newValues = [...currentValues];
    newValues.splice(index, 1);
    setValue(
      'attributes',
      {
        ...attributesRecord,
        [attrType]: mergeEntry(
          currentEntry,
          newValues.length > 0 ? newValues : [],
        ),
      },
      { shouldValidate: true },
    );
  };

  const getColorName = (hex: string) => {
    const found = Object.entries(COLOR_NAME_TO_HEX).find(
      ([, h]) => h.toLowerCase() === hex.toLowerCase(),
    );
    return found ? found[0] : null;
  };

  const setPrimaryAttribute = (attrType: string) => {
    if (attributeHierarchy.primary === attrType) {
      setAttributeHierarchy({ ...attributeHierarchy, primary: null });
    } else {
      setAttributeHierarchy({
        primary: attrType,
        secondary: attributeHierarchy.secondary.filter((a) => a !== attrType),
      });
    }
  };

  const setSecondaryAttribute = (attrType: string) => {
    if (attributeHierarchy.secondary.includes(attrType)) {
      setAttributeHierarchy({
        ...attributeHierarchy,
        secondary: attributeHierarchy.secondary.filter((a) => a !== attrType),
      });
    } else if (attributeHierarchy.primary !== attrType) {
      setAttributeHierarchy({
        ...attributeHierarchy,
        secondary: [...attributeHierarchy.secondary, attrType],
      });
    }
  };

  const renderAttributeValue = (
    attrType: string,
    item: AttributeValueEntry,
    index: number,
  ) => {
    const isColor =
      attrType.toLowerCase() === 'color' && /^#[0-9A-F]{6}$/i.test(item.value);
    return (
      <div
        key={index}
        className={cn(
          'bg-card flex items-center gap-2 rounded-lg border px-3 py-1.5',
          'hover:bg-accent transition-colors',
        )}
      >
        {isColor && (
          <div
            className='h-4 w-4 rounded-sm ring-1 ring-gray-200 ring-inset'
            style={{ backgroundColor: item.value }}
          />
        )}
        <span className='text-sm font-medium'>
          {isColor
            ? `${getColorName(item.value) || item.value} (${item.value})`
            : item.value}
        </span>

        {/* FE-45: this local value is mapped to a canonical global value and
            persists as a ProductGlobalAttributeValue on save. */}
        {item.globalAttributeId && item.globalValueId && (
          <Badge
            variant='outline'
            className='px-1.5 py-0 text-[10px] font-normal text-muted-foreground'
            title='Mapped to a global attribute value'
          >
            Global
          </Badge>
        )}

        {/* Price modifier input (Phase 6 — Matrix Pricing) */}
        <div className='flex items-center gap-1'>
          <span className='text-muted-foreground text-xs'>+$</span>
          <Input
            type='number'
            step='0.01'
            placeholder='0'
            value={item.priceModifier ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              updateAttributeValuePriceModifier(
                attrType,
                index,
                val === '' ? null : Number.parseFloat(val),
              );
            }}
            className='h-6 w-16 text-xs'
          />
        </div>

        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='ml-1 h-6 w-6 p-0 opacity-50 hover:opacity-100'
          onClick={() => removeAttributeValue(attrType, index)}
        >
          <X className='h-3 w-3' />
        </Button>
      </div>
    );
  };

  const renderQuickAddButtons = (attrType: string) => {
    const type = attrType.toLowerCase();

    if (type === 'color') {
      return (
        <div className='mt-2 mb-3'>
          <p className='text-muted-foreground mb-2 text-xs'>
            Quick add common colors:
          </p>
          <div className='flex flex-wrap gap-2'>
            {COMMON_COLORS.map((color, idx) => {
              const colorName = getColorName(color);
              return (
                <Button
                  // biome-ignore lint/suspicious/noArrayIndexKey: this is fine
                  key={idx}
                  type='button'
                  size='sm'
                  variant='outline'
                  className='h-8 rounded-md px-2'
                  onClick={() => addAttributeValue(type, color)}
                >
                  <div
                    className='mr-1.5 h-4 w-4 rounded-sm ring-1 ring-gray-200 ring-inset'
                    style={{ backgroundColor: color }}
                  />
                  <span className='text-xs'>{colorName || color}</span>
                </Button>
              );
            })}
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 px-2'
              onClick={() =>
                addMultipleAttributeValues(
                  type,
                  Object.values(COLOR_NAME_TO_HEX),
                )
              }
            >
              <span className='text-xs'>Add All Colors</span>
            </Button>
          </div>
        </div>
      );
    }

    if (ATTRIBUTE_PRESETS[type]) {
      const presets = ATTRIBUTE_PRESETS[type];
      return (
        <div className='mt-2 mb-3'>
          <p className='text-muted-foreground mb-2 text-xs'>
            Quick add {type} presets:
          </p>
          <div className='flex flex-wrap gap-2'>
            {presets.map((value, idx) => (
              <Button
                // biome-ignore lint/suspicious/noArrayIndexKey: this is fine
                key={idx}
                type='button'
                size='sm'
                variant='outline'
                className='h-8 px-2'
                onClick={() => addAttributeValue(type, value)}
              >
                <span className='text-xs'>{value}</span>
              </Button>
            ))}
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 px-2'
              onClick={() => addMultipleAttributeValues(type, presets)}
            >
              <span className='text-xs'>
                Add All{' '}
                {ATTRIBUTE_TYPES.find((t) => t.value === type)?.label || type}
              </span>
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderAttributeInput = (attrType: string) => {
    const isColor = attrType.toLowerCase() === 'color';

    return (
      <div className='mt-4 flex items-center gap-2'>
        <Input
          type='text'
          placeholder={`Add ${attrType} value`}
          value={newValues[attrType] || ''}
          onChange={(e) =>
            setNewValues((prev) => ({ ...prev, [attrType]: e.target.value }))
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter') addAttributeValue(attrType);
          }}
        />
        {isColor && (
          <Popover>
            <PopoverTrigger asChild>
              <Button type='button' variant='outline' size='sm'>
                Pick Color
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-56 p-0' align='end'>
              <HexColorPicker
                color={selectedColors[attrType] || '#000'}
                onChange={(color) => {
                  setSelectedColors((prev) => ({ ...prev, [attrType]: color }));
                  setNewValues((prev) => ({ ...prev, [attrType]: color }));
                }}
              />
            </PopoverContent>
          </Popover>
        )}
        <Button type='button' onClick={() => addAttributeValue(attrType)}>
          Add
        </Button>
      </div>
    );
  };

  useEffect(() => {
    if (
      Object.keys(attributesRecord).length > 0 &&
      attributeTypes.length === 0
    ) {
      setAttributeTypes(Object.keys(attributesRecord));
    }
  }, [attributesRecord, attributeTypes.length]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('attributeHierarchyChange', {
        detail: attributeHierarchy,
      });
      window.dispatchEvent(event);
    }
  }, [attributeHierarchy]);

  return (
    <>
      <div className='flex items-center justify-between'>
        <div>
          <CardTitle>Product Attributes</CardTitle>
          <CardDescription>
            Add attributes of your product (color, size, etc.)
          </CardDescription>
        </div>
        <div>
          <Popover>
            <PopoverTrigger asChild>
              <Button type='button' variant='outline' className='gap-2'>
                <Plus className='h-4 w-4' />
                Add Attribute
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-56 p-0' align='end'>
              <Command>
                <CommandInput placeholder='Search attribute type...' />
                <CommandList>
                  <CommandEmpty>No attribute type found.</CommandEmpty>
                  <CommandGroup>
                    {ATTRIBUTE_TYPES.filter(
                      (type) => !attributeTypes.includes(type.value),
                    ).map((type) => (
                      <CommandItem
                        key={type.value}
                        onSelect={() => addAttribute(type.value)}
                      >
                        {type.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className='space-y-6'>
        <div className='space-y-4'>
          {attributeTypes.map((attrType) => (
            <div
              key={attrType}
              className='rounded-lg border p-5 transition-all hover:shadow-sm'
            >
              <div className='flex items-start justify-between gap-4'>
                <Field className='flex-1'>
                  <FieldLabel>Attribute Type</FieldLabel>
                  <div className='border-input bg-background flex h-10 w-full items-center rounded-md border px-3 py-2'>
                    <span>
                      {ATTRIBUTE_TYPES.find((t) => t.value === attrType)
                        ?.label || attrType}
                    </span>
                  </div>
                </Field>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='mt-6 opacity-50 hover:opacity-100'
                  onClick={() => removeAttribute(attrType)}
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>

              <div className='mt-2 flex items-center gap-2'>
                <Button
                  type='button'
                  size='sm'
                  variant={
                    attributeHierarchy.primary === attrType
                      ? 'default'
                      : 'outline'
                  }
                  className='h-7 px-2'
                  onClick={() => setPrimaryAttribute(attrType)}
                >
                  Primary
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant={
                    attributeHierarchy.secondary.includes(attrType)
                      ? 'default'
                      : 'outline'
                  }
                  className='h-7 px-2'
                  onClick={() => setSecondaryAttribute(attrType)}
                  disabled={attributeHierarchy.primary === attrType}
                >
                  Secondary
                </Button>
                <span className='text-muted-foreground text-xs'>
                  {attributeHierarchy.primary === attrType
                    ? 'Main attribute for variant grouping'
                    : attributeHierarchy.secondary.includes(attrType)
                      ? 'Sub-attribute within primary groups'
                      : ''}
                </span>
              </div>

              <div className='mt-6'>
                <FieldLabel>Values</FieldLabel>
                {getEntryValues(attributesRecord[attrType]).length > 0 ? (
                  <div className='mt-2 flex flex-wrap gap-2'>
                    {getEntryValues(attributesRecord[attrType]).map(
                      (val, idx) => renderAttributeValue(attrType, val, idx),
                    )}
                  </div>
                ) : (
                  <p className='text-muted-foreground mt-2 text-sm'>
                    No values added yet
                  </p>
                )}
                {renderQuickAddButtons(attrType)}
                {renderAttributeInput(attrType)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
