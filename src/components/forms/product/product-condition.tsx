import {
  CheckCircle,
  ClipboardList,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSkuCheck } from '@/hooks/use-sku-check';
import { SkuService } from '@/services/sku-service';

import type { ProductFormValues } from './product-form-type';

interface ProductConditionProps {
  productId?: string;
}

const PRODUCT_CONDITIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'USED', label: 'Used' },
  { value: 'LIKE_NEW', label: 'Like New' },
  { value: 'EXCELLENT', label: 'Excellent' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' },
  { value: 'FOR_PARTS', label: 'For Parts or Not Working' },
];

export function ProductCondition({ productId }: ProductConditionProps) {
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<ProductFormValues>();
  const { isChecking, isAvailable, error, checkSkuAvailability } = useSkuCheck({
    productId,
  });

  const productName = useWatch({ control, name: 'productName' });
  const category = useWatch({ control, name: 'category' });
  const sku = useWatch({ control, name: 'sku' });

  useEffect(() => {
    if (productName && category && !sku) {
      const suggestedSku = SkuService.suggestSku(category, productName);
      setValue('sku', suggestedSku);
      checkSkuAvailability(suggestedSku);
    }
  }, [productName, category, sku, setValue, checkSkuAvailability]);

  useEffect(() => {
    if (sku && sku.length > 3) {
      checkSkuAvailability(sku);
    }
  }, [sku, checkSkuAvailability]);

  const handleGenerateSku = () => {
    if (productName && category) {
      const newSku = SkuService.suggestSku(category, productName);
      setValue('sku', newSku);
      checkSkuAvailability(newSku);
    }
  };

  const handleSkuBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const sanitized = SkuService.sanitizeSku(event.target.value);
    setValue('sku', sanitized);
    if (sanitized) {
      checkSkuAvailability(sanitized);
    }
  };

  const canGenerateSku = Boolean(productName && category);

  return (
    <Card>
      <CardHeader className='flex flex-row items-center gap-2'>
        <ClipboardList className='h-5 w-5' />
        <span className='text-lg font-semibold'>Product Details</span>
      </CardHeader>
      <CardContent className='space-y-4'>
        <Field data-invalid={!!errors.sku}>
          <FieldLabel>SKU (Stock Keeping Unit)</FieldLabel>
          <div className='flex space-x-2'>
            <div className='relative flex-1'>
              <Input
                placeholder='e.g. SKU-0001'
                value={sku || ''}
                onChange={(event) => setValue('sku', event.target.value)}
                onBlur={handleSkuBlur}
              />
              {sku && (
                <div className='absolute top-1/2 right-3 -translate-y-1/2'>
                  {isChecking && (
                    <Loader2 className='text-muted-foreground h-4 w-4 animate-spin' />
                  )}
                  {!isChecking && isAvailable === true && (
                    <CheckCircle className='h-4 w-4 text-green-500' />
                  )}
                  {!isChecking && isAvailable === false && (
                    <XCircle className='h-4 w-4 text-red-500' />
                  )}
                </div>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    onClick={handleGenerateSku}
                    disabled={!canGenerateSku}
                  >
                    <RefreshCw className='h-4 w-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Generate unique SKU</p>
                  {!canGenerateSku && (
                    <p className='text-xs text-amber-500'>
                      Requires product name and category
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <FieldDescription>
            {error ? (
              <span className='text-sm text-red-500'>{error}</span>
            ) : (
              <span>A unique identifier for inventory tracking</span>
            )}
          </FieldDescription>
          {errors.sku && <FieldError>{errors.sku.message}</FieldError>}
        </Field>

        <Field>
          <FieldLabel>Product Condition *</FieldLabel>
          <Select
            onValueChange={(val) =>
              setValue('condition', val as ProductFormValues['condition'])
            }
            defaultValue='NEW'
          >
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Select condition' />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_CONDITIONS.map((condition) => (
                <SelectItem key={condition.value} value={condition.value}>
                  {condition.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel>Condition Description</FieldLabel>
          <Textarea
            placeholder='Describe the condition in detail (scratches, wear, etc.)'
            onChange={(e) => setValue('conditionDescription', e.target.value)}
          />
        </Field>
      </CardContent>
    </Card>
  );
}
