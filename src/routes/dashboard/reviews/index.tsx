import { createFileRoute, Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Star, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useDeleteReviewMutation,
  useMyReviews,
  useUpdateReviewMutation,
} from '@/services/user-reviews';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

export const Route = createFileRoute('/dashboard/reviews/')({
  component: RouteComponent,
});

function StarRatingInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className='flex items-center gap-1'>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type='button'
          disabled={disabled}
          onClick={() => onChange(star)}
          className='transition-colors'
        >
          <Star
            className={`w-6 h-6 ${
              star <= value
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground/30 hover:text-amber-400/50'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function RouteComponent() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMyReviews(page);
  const updateMutation = useUpdateReviewMutation();
  const deleteMutation = useDeleteReviewMutation();

  const [editId, setEditId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editContent, setEditContent] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openEditDialog = (review: {
    id: string;
    rating: number;
    content: string;
  }) => {
    setEditId(review.id);
    setEditRating(review.rating);
    setEditContent(review.content);
  };

  const handleEditSave = async () => {
    if (!editId) return;
    await updateMutation.mutateAsync({
      id: editId,
      rating: editRating,
      content: editContent,
    });
    setEditId(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      setDeleteId(null);
      toast.error('Failed to delete review');
    }
  };

  return (
    <motion.div
      className='space-y-6'
      initial='hidden'
      animate='show'
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    >
      <motion.div variants={fadeUp} custom={0}>
        <div className='flex items-center gap-2'>
          <Star className='w-6 h-6' />
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>My Reviews</h1>
            <p className='text-sm text-muted-foreground mt-1'>
              Reviews you've written for products
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} custom={1}>
        {isLoading ? (
          <div className='space-y-4'>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className='py-6'>
                  <div className='flex gap-4'>
                    <Skeleton className='w-16 h-16 rounded' />
                    <div className='flex-1 space-y-2'>
                      <Skeleton className='h-4 w-40' />
                      <Skeleton className='h-3 w-24' />
                      <Skeleton className='h-12 w-full' />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !data?.reviews || data.reviews.length === 0 ? (
          <Card>
            <CardContent className='flex flex-col items-center justify-center py-16 text-center'>
              <Star className='w-10 h-10 text-muted-foreground mb-3' />
              <p className='text-sm font-semibold'>No reviews yet</p>
              <p className='text-sm text-muted-foreground mt-1 mb-4'>
                You haven't reviewed any products yet
              </p>
              <Button size='sm' asChild>
                <Link to='/shops'>Browse Products</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className='space-y-4'>
            {data.reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className='py-4'>
                  <div className='flex gap-4'>
                    <Link
                      to='/product/$slug'
                      params={{ slug: review.product.slug }}
                      className='shrink-0'
                    >
                      {review.product.images[0] ? (
                        <img
                          src={review.product.images[0].imageUrl}
                          alt=''
                          width={64}
                          height={64}
                          loading='lazy'
                          decoding='async'
                          className='w-16 h-16 rounded object-cover'
                        />
                      ) : (
                        <div className='w-16 h-16 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground'>
                          No img
                        </div>
                      )}
                    </Link>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-start justify-between gap-3'>
                        <div>
                          <Link
                            to='/product/$slug'
                            params={{ slug: review.product.slug }}
                            className='text-sm font-medium hover:underline'
                          >
                            {review.product.productName}
                          </Link>
                          <div className='flex items-center gap-2 mt-1'>
                            <div className='flex items-center gap-0.5'>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3.5 h-3.5 ${
                                    star <= review.rating
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-muted-foreground/30'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className='text-xs text-muted-foreground'>
                              {format(
                                new Date(review.createdAt),
                                'MMM d, yyyy',
                              )}
                            </span>
                            {review.verified && (
                              <Badge
                                variant='default'
                                className='text-[10px] uppercase'
                              >
                                Verified
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className='flex items-center gap-1 shrink-0'>
                          <Dialog
                            open={editId === review.id}
                            onOpenChange={(open) => {
                              if (!open) setEditId(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => openEditDialog(review)}
                              >
                                Edit
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Review</DialogTitle>
                                <DialogDescription>
                                  Update your review for{' '}
                                  {review.product.productName}
                                </DialogDescription>
                              </DialogHeader>
                              <div className='space-y-4 py-2'>
                                <div className='space-y-2'>
                                  <Label>Rating</Label>
                                  <StarRatingInput
                                    value={editRating}
                                    onChange={setEditRating}
                                  />
                                </div>
                                <div className='space-y-2'>
                                  <Label htmlFor='editContent'>Review</Label>
                                  <Textarea
                                    id='editContent'
                                    value={editContent}
                                    onChange={(e) =>
                                      setEditContent(e.target.value)
                                    }
                                    rows={4}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant='outline'
                                  onClick={() => setEditId(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleEditSave}
                                  disabled={updateMutation.isPending}
                                >
                                  {updateMutation.isPending && (
                                    <span className='w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent' />
                                  )}
                                  Save
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <AlertDialog
                            open={deleteId === review.id}
                            onOpenChange={(open) =>
                              setDeleteId(open ? review.id : null)
                            }
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='text-destructive'
                              >
                                <Trash2 className='w-4 h-4' />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Review
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this review?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel
                                  onClick={() => setDeleteId(null)}
                                >
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleDelete}
                                  className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      <p className='text-sm mt-2 text-muted-foreground'>
                        {review.content}
                      </p>
                      {review.vendorReply && (
                        <div className='mt-3 p-3 rounded-lg bg-muted/50 text-sm'>
                          <p className='text-xs font-medium text-muted-foreground mb-1'>
                            Vendor Reply
                          </p>
                          <p>{review.vendorReply}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {data.totalPages > 1 && (
              <div className='flex items-center justify-between pt-2'>
                <p className='text-sm text-muted-foreground'>
                  Page {data.page} of {data.totalPages} ({data.total} total)
                </p>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
