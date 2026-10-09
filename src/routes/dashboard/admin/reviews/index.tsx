import { createFileRoute, redirect } from '@tanstack/react-router';
import { MessageSquare, Search, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useAdminReviews,
  useDeleteReviewMutation,
  useModerateReviewMutation,
} from '@/services/admin-reviews';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

export const Route = createFileRoute('/dashboard/admin/reviews/')({
  beforeLoad: ({ context }) => {
    if (
      !context.user?.role ||
      (context.user.role !== 'ADMIN' && context.user.role !== 'MANAGER')
    ) {
      throw redirect({ to: '/dashboard' });
    }
    return { user: context.user };
  },
  component: RouteComponent,
});

function StarRating({ rating }: { rating: number }) {
  return (
    <div className='flex items-center gap-0.5'>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3.5 h-3.5 ${
            star <= rating
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );
}

function RouteComponent() {
  const [search, setSearch] = useState('');
  const [reportedFilter, setReportedFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [minRating, setMinRating] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filters = {
    ...(search && { search }),
    ...(reportedFilter === 'true' && { reported: true }),
    ...(reportedFilter === 'false' && { reported: false }),
    ...(verifiedFilter === 'true' && { verified: true }),
    ...(verifiedFilter === 'false' && { verified: false }),
    ...(minRating && { minRating: Number(minRating) }),
    page,
    limit: 20,
  };

  const { data, isLoading } = useAdminReviews(filters);
  const moderateMutation = useModerateReviewMutation();
  const deleteMutation = useDeleteReviewMutation();

  const handleModerate = async (id: string, verified: boolean) => {
    await moderateMutation.mutateAsync({ id, verified, reviewedByAdmin: true });
  };

  const handleClearReport = async (id: string) => {
    await moderateMutation.mutateAsync({
      id,
      reported: false,
      reviewedByAdmin: true,
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      // error handled in service
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
          <MessageSquare className='w-6 h-6' />
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Reviews</h1>
            <p className='text-sm text-muted-foreground mt-1'>
              Moderate customer reviews across all products
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} custom={1}>
        <Card>
          <CardHeader>
            <div className='flex items-center gap-4 flex-wrap'>
              <div className='relative flex-1 min-w-[200px]'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                <Input
                  placeholder='Search by product...'
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className='pl-9'
                />
              </div>
              <Select
                value={reportedFilter}
                onValueChange={(v) => {
                  setReportedFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className='w-[150px]'>
                  <SelectValue placeholder='All Reports' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=''>All Reports</SelectItem>
                  <SelectItem value='true'>Reported</SelectItem>
                  <SelectItem value='false'>Not Reported</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={verifiedFilter}
                onValueChange={(v) => {
                  setVerifiedFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className='w-[150px]'>
                  <SelectValue placeholder='All Verified' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=''>All</SelectItem>
                  <SelectItem value='true'>Verified</SelectItem>
                  <SelectItem value='false'>Unverified</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={minRating}
                onValueChange={(v) => {
                  setMinRating(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className='w-[140px]'>
                  <SelectValue placeholder='Min Rating' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=''>All Ratings</SelectItem>
                  <SelectItem value='5'>5 Stars</SelectItem>
                  <SelectItem value='4'>4+ Stars</SelectItem>
                  <SelectItem value='3'>3+ Stars</SelectItem>
                  <SelectItem value='2'>2+ Stars</SelectItem>
                  <SelectItem value='1'>1+ Star</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='space-y-3'>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className='h-16 w-full' />
                ))}
              </div>
            ) : !data?.reviews || data.reviews.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <MessageSquare className='w-10 h-10 text-muted-foreground mb-3' />
                <p className='text-sm font-semibold'>No reviews found</p>
                <p className='text-sm text-muted-foreground mt-1'>
                  {search || reportedFilter || verifiedFilter || minRating
                    ? 'Try adjusting your filters'
                    : 'No reviews have been submitted yet'}
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Review</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.reviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell className='max-w-[200px]'>
                          <div className='flex items-center gap-2'>
                            {review.product.images[0] && (
                              <img
                                src={review.product.images[0].imageUrl}
                                alt=''
                                width={32}
                                height={32}
                                loading='lazy'
                                decoding='async'
                                className='w-8 h-8 rounded object-cover'
                              />
                            )}
                            <span className='truncate text-sm'>
                              {review.product.productName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className='text-sm'>
                          {review.user.name}
                        </TableCell>
                        <TableCell>
                          <StarRating rating={review.rating} />
                        </TableCell>
                        <TableCell className='max-w-[250px]'>
                          <p className='text-sm truncate'>{review.content}</p>
                        </TableCell>
                        <TableCell>
                          <div className='flex flex-wrap gap-1'>
                            {review.reported && (
                              <Badge
                                variant='destructive'
                                className='text-[10px] uppercase'
                              >
                                Flagged
                              </Badge>
                            )}
                            {review.verified && (
                              <Badge
                                variant='default'
                                className='text-[10px] uppercase'
                              >
                                Verified
                              </Badge>
                            )}
                            {!review.verified && (
                              <Badge
                                variant='secondary'
                                className='text-[10px] uppercase'
                              >
                                Unverified
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className='text-xs text-muted-foreground'>
                          {new Date(review.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className='text-right'>
                          <div className='flex items-center justify-end gap-1'>
                            {!review.verified && (
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => handleModerate(review.id, true)}
                                disabled={moderateMutation.isPending}
                              >
                                Verify
                              </Button>
                            )}
                            {review.reported && (
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => handleClearReport(review.id)}
                                disabled={moderateMutation.isPending}
                              >
                                Clear Flag
                              </Button>
                            )}
                            <AlertDialog
                              open={deleteId === review.id}
                              onOpenChange={(open) =>
                                setDeleteId(open ? review.id : null)
                              }
                            >
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  className='text-destructive'
                                >
                                  Delete
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {data.totalPages > 1 && (
                  <div className='flex items-center justify-between mt-4 pt-4 border-t'>
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
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
