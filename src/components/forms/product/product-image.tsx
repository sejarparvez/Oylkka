import { ImageIcon, Upload, X } from 'lucide-react';
import { useContext, useEffect, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FieldDescription } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProductImage } from '@/hooks/use-product-image';
import { PRODUCT_IMAGE_ACCEPT, PRODUCT_IMAGE_MAX_BYTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

import { ProductFormContext } from './product-form-context';

export function ProductImagesCard() {
  const { productImages, setProductImages } = useContext(ProductFormContext);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedImage, setDraggedImage] = useState<ProductImage | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const formMethods = useFormContext();
  const formErrors = formMethods.formState.errors;
  const imageError = (formErrors.images?.message ??
    formErrors.images?.root?.message) as string | undefined;

  const createdObjectUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      createdObjectUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      });
      createdObjectUrlsRef.current.clear();
    };
  }, []);

  const revokeIfCreated = (url: string) => {
    if (createdObjectUrlsRef.current.has(url)) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
      createdObjectUrlsRef.current.delete(url);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const files = input.files;
    if (!files) {
      input.value = '';
      return;
    }

    try {
      if (productImages.length + files.length > 4) {
        setErrorMessage('You can only upload up to 4 images');
        return;
      }

      const oversizedFiles = Array.from(files).filter(
        (file) => file.size > PRODUCT_IMAGE_MAX_BYTES,
      );
      if (oversizedFiles.length > 0) {
        setErrorMessage(
          `Some images exceed the maximum size of 500KB: ${oversizedFiles
            .map((f) => f.name)
            .join(', ')}`,
        );
        return;
      }

      setErrorMessage(null);
      const newImages: ProductImage[] = [];

      Array.from(files).forEach((file) => {
        const id = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const preview = URL.createObjectURL(file);
        createdObjectUrlsRef.current.add(preview);
        newImages.push({ id, file, preview });
      });

      setProductImages([...productImages, ...newImages]);
    } finally {
      input.value = '';
    }
  };

  const removeImage = (id: string) => {
    setProductImages(
      productImages.filter((img) => {
        if (img.id === id && img.preview) {
          revokeIfCreated(img.preview);
        }
        return img.id !== id;
      }),
    );
  };

  const handleDragStart = (image: ProductImage) => {
    setIsDragging(true);
    setDraggedImage(image);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (targetImage: ProductImage) => {
    if (!draggedImage) return;

    const draggedIndex = productImages.findIndex(
      (img) => img.id === draggedImage.id,
    );
    const targetIndex = productImages.findIndex(
      (img) => img.id === targetImage.id,
    );

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newImages = [...productImages];
    newImages.splice(draggedIndex, 1);
    newImages.splice(targetIndex, 0, draggedImage);

    setProductImages(newImages);
    setIsDragging(false);
    setDraggedImage(null);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedImage(null);
  };

  return (
    <Card>
      <CardHeader className='flex flex-row items-center gap-2 pb-4'>
        <ImageIcon className='text-muted-foreground h-5 w-5' />
        <span className='text-lg font-semibold'>Product Images</span>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='image-upload'>Upload Images</Label>
          <FieldDescription>
            You can upload up to 4 images (max 500KB each). Drag images to
            reorder.
          </FieldDescription>

          <div
            className={cn(
              'border-muted-foreground/25 hover:border-muted-foreground/50 relative rounded-lg border-2 border-dashed p-6 transition-colors',
              productImages.length >= 4 && 'pointer-events-none opacity-60',
            )}
          >
            <Input
              type='file'
              id='image-upload'
              accept={PRODUCT_IMAGE_ACCEPT}
              multiple
              onChange={handleImageUpload}
              disabled={productImages.length >= 4}
              className='absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0'
            />
            <div className='flex flex-col items-center justify-center gap-2 text-center'>
              <Upload className='text-muted-foreground h-8 w-8' />
              <p className='text-muted-foreground text-sm font-medium'>
                Drop images here or click to upload
              </p>
              <p className='text-muted-foreground/75 text-xs'>
                {productImages.length} of 4 images uploaded
              </p>
            </div>
          </div>

          {(errorMessage || imageError) && (
            <p className='text-destructive text-sm font-medium'>
              {errorMessage || imageError}
            </p>
          )}
        </div>

        {productImages.length > 0 && (
          <div className='space-y-2'>
            <Label>Product Images ({productImages.length}/4)</Label>
            <div className='grid grid-cols-2 gap-4'>
              {productImages.map((image) => (
                // biome-ignore lint/a11y/noStaticElementInteractions: this is fine
                <div
                  key={image.id}
                  className={cn(
                    'group border-border relative rounded-lg border-2 transition-all',
                    isDragging && draggedImage?.id === image.id && 'opacity-50',
                  )}
                  draggable
                  onDragStart={() => handleDragStart(image)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(image)}
                  onDragEnd={handleDragEnd}
                >
                  <div className='relative aspect-square overflow-hidden rounded-md'>
                    <img
                      src={image.preview}
                      alt='Product preview'
                      className='h-full w-full object-cover transition-transform group-hover:scale-105'
                    />
                    <Button
                      type='button'
                      variant='destructive'
                      size='icon'
                      className='absolute top-2 right-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100'
                      onClick={() => removeImage(image.id)}
                    >
                      <X className='h-4 w-4' />
                    </Button>
                  </div>
                  <div className='p-2 text-center'>
                    <p className='text-muted-foreground text-xs'>
                      {image.file
                        ? `${(image.file.size / 1024).toFixed(1)} KB`
                        : 'Existing image'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
