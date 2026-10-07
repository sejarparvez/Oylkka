import colorNamer from 'color-namer';
import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

import { ProductAttributes } from './product-attribute';
import type { ProductFormValues } from './product-form-type';
import VariantGenerateAlert from './variant-generate-alert';
import VariantList from './variant-list';

type AttributeHierarchy = {
  primary: string | null;
  secondary: string[];
};

export default function ProductVariant() {
  const { control, watch } = useFormContext<ProductFormValues>();

  const {
    fields: variants,
    append,
    remove,
    update,
  } = useFieldArray({
    control,
    name: 'variants',
  });

  const attributes = useWatch({ name: 'attributes' });
  const productSku = watch('sku') || '';
  const productPrice = watch('price') || 0;

  const [attributeHierarchy, setAttributeHierarchy] =
    useState<AttributeHierarchy>({
      primary: null,
      secondary: [],
    });

  useEffect(() => {
    const handleHierarchyChange = (event: CustomEvent<AttributeHierarchy>) => {
      setAttributeHierarchy(event.detail);
    };
    window.addEventListener(
      'attributeHierarchyChange',
      handleHierarchyChange as EventListener,
    );
    return () => {
      window.removeEventListener(
        'attributeHierarchyChange',
        handleHierarchyChange as EventListener,
      );
    };
  }, []);

  const attributeOptions = useMemo(() => {
    const options: Record<string, string[]> = {};
    if (attributes && typeof attributes === 'object') {
      Object.entries(attributes).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          // Old format: flat string[]
          options[key] = value;
        } else if (value && typeof value === 'object' && 'values' in value) {
          // New extended format: { values: [{ value, slug, ... }], ... }
          options[key] =
            (value as { values: Array<{ value: string }> }).values.map(
              (v) => v.value,
            ) || [];
        }
      });
    }
    return options;
  }, [attributes]);

  const getReadableColorName = (colorValue: string): string => {
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorValue)) {
      const names = colorNamer(colorValue);
      if (names.basic?.length > 0)
        return capitalizeColorName(names.basic[0].name);
      if (names.ntc?.length > 0) return capitalizeColorName(names.ntc[0].name);
      if (names.roygbiv?.length > 0)
        return capitalizeColorName(names.roygbiv[0].name);
      if (names.pantone?.length > 0)
        return capitalizeColorName(names.pantone[0].name);
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

  const createVariantName = (
    attrs: Record<string, string>,
    primary: string | null,
  ): string => {
    if (!attrs) return 'Variant';

    if (primary && attrs[primary]) {
      const primaryValue = attrs[primary];
      const formattedName = formatAttributeName(primary);
      if (primary.toLowerCase() === 'color') {
        return `${formattedName}: ${getReadableColorName(primaryValue)}`;
      }
      return `${formattedName}: ${primaryValue}`;
    }

    const attributePairs = Object.entries(attrs).map(([key, value]) => {
      const formattedKey = formatAttributeName(key);
      if (key.toLowerCase() === 'color') {
        return `${formattedKey}: ${getReadableColorName(value)}`;
      }
      return `${formattedKey}: ${value}`;
    });
    return attributePairs.join(', ');
  };

  const createAttributeCode = (
    attributeName: string,
    attributeValue: string,
  ): string => {
    if (
      attributeName.toLowerCase() === 'color' &&
      /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(attributeValue)
    ) {
      const colorName = getReadableColorName(attributeValue);
      const code = colorName
        .split(' ')
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase();
      return code.length >= 2 ? code : code.padEnd(2, 'X');
    }
    return `${attributeName.substring(0, 2)}${attributeValue.substring(0, 2)}`.toUpperCase();
  };

  // FE-41: abbreviated attribute codes collide ("Color: Red" and
  // "Color: Reddish" both abbreviate to CO-RE), so the free SKU is decided by
  // trying the base, then `-1`, `-2`, ... until the taken-set says it is free.
  // Every SKU handed out is added to the set immediately, which keeps later
  // combinations in the same run from claiming it again.
  const resolveUniqueSku = (
    baseSku: string,
    takenSkus: Set<string>,
  ): string => {
    if (!takenSkus.has(baseSku)) {
      takenSkus.add(baseSku);
      return baseSku;
    }
    let suffix = 1;
    while (takenSkus.has(`${baseSku}-${suffix}`)) {
      suffix++;
    }
    const uniqueSku = `${baseSku}-${suffix}`;
    takenSkus.add(uniqueSku);
    return uniqueSku;
  };

  const generateAllVariants = () => {
    if (Object.keys(attributeOptions).length === 0) return;

    if (
      attributeHierarchy.primary &&
      attributeOptions[attributeHierarchy.primary]
    ) {
      generateHierarchicalVariants();
    } else {
      generateFlatVariants();
    }
  };

  const generateHierarchicalVariants = () => {
    const { primary, secondary } = attributeHierarchy;
    if (!primary || !attributeOptions[primary]) return;

    const primaryValues = attributeOptions[primary];
    // Seeded from live form state — including SKUs the vendor typed by hand —
    // and grown below as each variant SKU is generated (FE-41).
    const existingSkus = new Set(variants.map((v) => v.sku));

    primaryValues.forEach((primaryValue) => {
      if (secondary.length > 0) {
        const secondaryOptions: Record<string, string[]> = {};
        secondary.forEach((secAttr) => {
          if (attributeOptions[secAttr])
            secondaryOptions[secAttr] = attributeOptions[secAttr];
        });

        const secondaryCombinations =
          generateCombinationsForAttributes(secondaryOptions);

        secondaryCombinations.forEach((secondaryCombo) => {
          const allAttributes = { [primary]: primaryValue, ...secondaryCombo };
          const attributeCodes = Object.entries(allAttributes)
            .map(([key, value]) => createAttributeCode(key, value))
            .join('-');
          const baseSku = productSku
            ? `${productSku}-${attributeCodes}`
            : attributeCodes;
          const finalSku = resolveUniqueSku(baseSku, existingSkus);

          const exists = variants.some((v) => {
            if (!v.attributes) return false;
            return Object.entries(allAttributes).every(
              ([key, value]) => v.attributes[key] === value,
            );
          });

          if (!exists) {
            const variantId = `variant-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            append({
              id: variantId,
              name: createVariantName(allAttributes, primary),
              sku: finalSku,
              price: productPrice,
              discountPrice: null,
              stock: 10,
              attributes: allAttributes,
              image: null,
              status: 'ACTIVE',
              weightUnit: 'kg',
              dimensionUnit: 'cm',
              freeShipping: false,
              reservedStock: 0,
            });
          }
        });
      } else {
        const allAttributes = { [primary]: primaryValue };
        const attributeCodes = createAttributeCode(primary, primaryValue);
        const baseSku = productSku
          ? `${productSku}-${attributeCodes}`
          : attributeCodes;
        const finalSku = resolveUniqueSku(baseSku, existingSkus);

        const exists = variants.some(
          (v) => v.attributes?.[primary] === primaryValue,
        );

        if (!exists) {
          const variantId = `variant-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          append({
            id: variantId,
            name: createVariantName(allAttributes, primary),
            sku: finalSku,
            price: productPrice,
            discountPrice: null,
            stock: 10,
            attributes: allAttributes,
            image: null,
            status: 'ACTIVE',
            weightUnit: 'kg',
            dimensionUnit: 'cm',
            freeShipping: false,
            reservedStock: 0,
          });
        }
      }
    });
  };

  const generateCombinationsForAttributes = (
    attrOptions: Record<string, string[]>,
  ): Record<string, string>[] => {
    const keys = Object.keys(attrOptions);
    const result: Record<string, string>[] = [];

    const generateHelper = (
      remainingKeys: string[],
      currentIndex: number,
      currentCombination: Record<string, string>,
    ) => {
      if (currentIndex === remainingKeys.length) {
        result.push({ ...currentCombination });
        return;
      }
      const currentKey = remainingKeys[currentIndex];
      for (const value of attrOptions[currentKey]) {
        currentCombination[currentKey] = value;
        generateHelper(remainingKeys, currentIndex + 1, currentCombination);
      }
    };

    generateHelper(keys, 0, {});
    return result;
  };

  const generateFlatVariants = () => {
    const attrKeys = Object.keys(attributeOptions);
    const combinations: Record<string, string>[] = [];

    const generateCombinations = (
      keys: string[],
      currentIndex: number,
      currentCombination: Record<string, string>,
    ) => {
      if (currentIndex === keys.length) {
        combinations.push({ ...currentCombination });
        return;
      }
      const currentKey = keys[currentIndex];
      for (const value of attributeOptions[currentKey]) {
        currentCombination[currentKey] = value;
        generateCombinations(keys, currentIndex + 1, currentCombination);
      }
    };

    generateCombinations(attrKeys, 0, {});

    const existingCombos = variants.map((v) => v.attributes);
    // Seeded from live form state — including SKUs the vendor typed by hand —
    // and grown below as each variant SKU is generated (FE-41).
    const existingSkus = new Set(variants.map((v) => v.sku));

    const newCombinations = combinations.filter(
      (combo) =>
        !existingCombos.some((existingCombo) => {
          if (!existingCombo) return false;
          return Object.keys(combo).every(
            (key) => existingCombo[key] === combo[key],
          );
        }),
    );

    newCombinations.forEach((combo, index) => {
      const variantName = createVariantName(combo, null);
      const attributeCodes = Object.entries(combo)
        .map(([key, value]) => createAttributeCode(key, value))
        .join('-');
      const baseSku = productSku
        ? `${productSku}-${attributeCodes}-${index + variants.length}`
        : `${attributeCodes}-${index + variants.length}`;
      const finalSku = resolveUniqueSku(baseSku, existingSkus);

      const variantId = `variant-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      append({
        id: variantId,
        name: variantName,
        sku: finalSku,
        price: productPrice,
        discountPrice: null,
        stock: 10,
        attributes: combo,
        image: null,
        status: 'ACTIVE',
        weightUnit: 'kg',
        dimensionUnit: 'cm',
        freeShipping: false,
        reservedStock: 0,
      });
    });
  };

  // Build a price modifier lookup: { attributeName: { displayValue_lowercase: modifier } }
  const priceModifierMap = useMemo(() => {
    const map: Record<string, Record<string, number | null>> = {};
    if (attributes && typeof attributes === 'object') {
      Object.entries(attributes).forEach(([key, value]) => {
        if (value && typeof value === 'object' && 'values' in value) {
          const attrValues = (
            value as {
              values: Array<{
                value: string;
                priceModifier?: number | null;
              }>;
            }
          ).values;
          map[key] = {};
          for (const v of attrValues) {
            if (v.priceModifier != null) {
              map[key][v.value.toLowerCase()] = v.priceModifier;
            }
          }
        }
      });
    }
    return map;
  }, [attributes]);

  // Check if any attribute value has a price modifier set
  const hasPriceModifiers = useMemo(
    () =>
      Object.values(priceModifierMap).some((values) =>
        Object.values(values).some((mod) => mod != null && mod !== 0),
      ),
    [priceModifierMap],
  );

  const applyPriceModifiers = () => {
    if (!productPrice || variants.length === 0) return;

    const basePrice =
      typeof productPrice === 'number'
        ? productPrice
        : Number.parseFloat(productPrice || '0');

    variants.forEach((variant, index) => {
      if (!variant.attributes) return;

      let totalModifier = 0;
      Object.entries(variant.attributes).forEach(([attrKey, attrValue]) => {
        const modifier = priceModifierMap[attrKey]?.[attrValue.toLowerCase()];
        if (modifier != null) {
          totalModifier += modifier;
        }
      });

      const newPrice = Math.round((basePrice + totalModifier) * 100) / 100;
      update(index, { ...variants[index], price: newPrice });
    });
  };

  const hasAttributes = Object.keys(attributeOptions).length > 0;
  const hasProductSku = productSku.trim() !== '';
  const canGenerateVariants = hasAttributes && hasProductSku;

  return (
    <Card className='mb-6'>
      <CardHeader>
        <ProductAttributes />
      </CardHeader>
      <CardContent>
        <VariantGenerateAlert />

        <div className='mb-6 flex items-center justify-between'>
          <h3 className='text-lg font-medium'>Product Variants</h3>
          <div className='flex items-center gap-2'>
            {hasPriceModifiers && variants.length > 0 && (
              <Button
                type='button'
                variant='outline'
                onClick={applyPriceModifiers}
                title={`Recalculate all variant prices: base $${typeof productPrice === 'number' ? productPrice.toFixed(2) : '0.00'} + sum of attribute value modifiers`}
              >
                Apply Price Modifiers
              </Button>
            )}
            <Button
              type='button'
              onClick={generateAllVariants}
              disabled={!canGenerateVariants}
              title={
                !hasProductSku
                  ? 'Product SKU must be defined first'
                  : !hasAttributes
                    ? 'Product attributes must be defined first'
                    : attributeHierarchy.primary
                      ? `Generate variants using ${formatAttributeName(attributeHierarchy.primary)} as primary attribute`
                      : 'Generate all possible variants'
              }
            >
              {attributeHierarchy.primary
                ? `Generate Variants by ${formatAttributeName(attributeHierarchy.primary)}`
                : 'Generate All Variants'}
            </Button>
          </div>
        </div>

        <VariantList
          variants={variants}
          onUpdate={(index, value) =>
            update(index, value as Parameters<typeof update>[1])
          }
          onRemove={remove}
          hasAttributes={hasAttributes}
          basePrice={typeof productPrice === 'number' ? productPrice : 0}
          priceModifierMap={priceModifierMap}
        />
      </CardContent>
    </Card>
  );
}
