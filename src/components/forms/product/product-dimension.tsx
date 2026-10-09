import { useFormContext } from 'react-hook-form';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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

import type { ProductFormValues } from './product-form-type';

export function ProductDimensions() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<ProductFormValues>();
  const weightUnit = watch('weightUnit');
  const dimUnit = watch('dimensions.unit');
  // FE-33: the all-or-none refine is an object-level error — surface it at the
  // object root instead of dropping it (see product-form-type.ts).
  const dimensionError =
    errors.dimensions?.root?.message ?? errors.dimensions?.message;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipping & Dimensions</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid grid-cols-3 gap-4'>
          <div className='col-span-2'>
            <Field data-invalid={!!errors.weight}>
              <FieldLabel htmlFor='weight'>Weight</FieldLabel>
              <Input
                id='weight'
                type='number'
                placeholder='Product weight'
                step='0.01'
                // FE-32: `valueAsNumber` turned a cleared input into NaN, so
                // the optional field could not be blanked. Map '' to undefined.
                {...register('weight', {
                  setValueAs: (v) =>
                    v === '' || v === undefined || v === null
                      ? undefined
                      : Number(v),
                })}
              />
              {errors.weight && (
                <FieldError>{errors.weight.message}</FieldError>
              )}
            </Field>
          </div>
          <Field>
            <FieldLabel>Unit</FieldLabel>
            <Select
              onValueChange={(val) =>
                setValue('weightUnit', val as 'kg' | 'g' | 'lb' | 'oz')
              }
              value={weightUnit}
            >
              <SelectTrigger>
                <SelectValue placeholder='Unit' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='kg'>kg</SelectItem>
                <SelectItem value='g'>g</SelectItem>
                <SelectItem value='lb'>lb</SelectItem>
                <SelectItem value='oz'>oz</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className='space-y-2'>
          <div className='flex items-center'>
            <h3 className='text-sm font-medium'>Dimensions</h3>
            <Field className='ml-auto'>
              <Select
                onValueChange={(val) =>
                  setValue('dimensions.unit', val as 'cm' | 'in' | 'm')
                }
                value={dimUnit}
              >
                <SelectTrigger className='w-20'>
                  <SelectValue placeholder='Unit' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='cm'>cm</SelectItem>
                  <SelectItem value='in'>in</SelectItem>
                  <SelectItem value='m'>m</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className='grid grid-cols-3 gap-4'>
            <Field data-invalid={!!errors.dimensions?.length}>
              <FieldLabel>Length</FieldLabel>
              <Input
                type='number'
                placeholder='Length'
                step='0.1'
                // FE-32: same '' → undefined mapping as `weight`.
                {...register('dimensions.length', {
                  setValueAs: (v) =>
                    v === '' || v === undefined || v === null
                      ? undefined
                      : Number(v),
                })}
              />
              {errors.dimensions?.length && (
                <FieldError>{errors.dimensions.length.message}</FieldError>
              )}
            </Field>
            <Field data-invalid={!!errors.dimensions?.width}>
              <FieldLabel>Width</FieldLabel>
              <Input
                type='number'
                placeholder='Width'
                step='0.1'
                {...register('dimensions.width', {
                  setValueAs: (v) =>
                    v === '' || v === undefined || v === null
                      ? undefined
                      : Number(v),
                })}
              />
              {errors.dimensions?.width && (
                <FieldError>{errors.dimensions.width.message}</FieldError>
              )}
            </Field>
            <Field data-invalid={!!errors.dimensions?.height}>
              <FieldLabel>Height</FieldLabel>
              <Input
                type='number'
                placeholder='Height'
                step='0.1'
                {...register('dimensions.height', {
                  setValueAs: (v) =>
                    v === '' || v === undefined || v === null
                      ? undefined
                      : Number(v),
                })}
              />
              {errors.dimensions?.height && (
                <FieldError>{errors.dimensions.height.message}</FieldError>
              )}
            </Field>
          </div>

          {dimensionError && (
            <p role='alert' className='text-destructive text-sm'>
              {dimensionError}
            </p>
          )}
        </div>

        <Field>
          <div className='flex flex-row items-start space-x-3 rounded-md border p-4'>
            <Checkbox
              id='freeShipping'
              checked={watch('freeShipping')}
              onCheckedChange={(val) => setValue('freeShipping', val === true)}
            />
            <div className='space-y-1 leading-none'>
              <FieldLabel htmlFor='freeShipping'>Free Shipping</FieldLabel>
              <FieldDescription>
                Offer free shipping for this product
              </FieldDescription>
            </div>
          </div>
        </Field>
      </CardContent>
    </Card>
  );
}
