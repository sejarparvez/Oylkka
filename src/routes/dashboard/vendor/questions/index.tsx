import { createFileRoute, Link } from '@tanstack/react-router';
import { MessageCircleQuestion, Package } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { QueryErrorState } from '@/components/query-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useAnswerQuestionMutation,
  useVendorQuestions,
} from '@/services/vendor-questions';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

export const Route = createFileRoute('/dashboard/vendor/questions/')({
  component: RouteComponent,
});

function AnswerBox({ questionId }: { questionId: string }) {
  const [answer, setAnswer] = useState('');
  const mutation = useAnswerQuestionMutation();

  return (
    <div className='mt-3 space-y-2'>
      <Textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder='Write your answer (minimum 10 characters)'
        rows={3}
      />
      <div className='flex justify-end'>
        <Button
          size='sm'
          disabled={answer.trim().length < 10 || mutation.isPending}
          onClick={() => {
            mutation.mutate(
              { questionId, answer: answer.trim() },
              { onSuccess: () => setAnswer('') },
            );
          }}
        >
          {mutation.isPending ? 'Posting...' : 'Post Answer'}
        </Button>
      </div>
    </div>
  );
}

function RouteComponent() {
  const { data, isLoading, isError, refetch } = useVendorQuestions();

  const questions = data?.questions ?? [];
  const unanswered = questions.filter((q) => !q.answer).length;

  return (
    <motion.div
      className='space-y-6'
      initial='hidden'
      animate='show'
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    >
      <motion.div variants={fadeUp} custom={0}>
        <div>
          <h1 className='text-2xl font-bold tracking-tight flex items-center gap-2'>
            <MessageCircleQuestion className='w-6 h-6' />
            Product Questions
          </h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Answer customer questions about your products
          </p>
        </div>
      </motion.div>

      {unanswered > 0 && !isLoading && !isError && (
        <motion.div
          variants={fadeUp}
          custom={1}
          className='rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm'
        >
          <span className='font-medium'>{unanswered}</span>{' '}
          {unanswered === 1 ? 'question needs' : 'questions need'} an answer.
        </motion.div>
      )}

      <motion.div variants={fadeUp} custom={2}>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>
              Questions {data ? `(${data.total})` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='space-y-4'>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className='h-24 w-full' />
                ))}
              </div>
            ) : isError ? (
              <QueryErrorState
                title='Failed to load questions'
                onRetry={() => refetch()}
              />
            ) : questions.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-16 text-center'>
                <Package className='w-10 h-10 text-muted-foreground mb-3' />
                <p className='text-sm font-semibold'>No questions yet</p>
                <p className='text-sm text-muted-foreground mt-1 max-w-sm'>
                  When customers ask about your products, they will show up
                  here.
                </p>
              </div>
            ) : (
              <div className='space-y-4'>
                {questions.map((q) => (
                  <div key={q.id} className='rounded-lg border p-4'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Badge
                        variant={q.answer ? 'default' : 'secondary'}
                        className='text-[10px] uppercase tracking-wider'
                      >
                        {q.answer ? 'Answered' : 'Awaiting answer'}
                      </Badge>
                      <Link
                        to='/product/$slug'
                        params={{ slug: q.product.slug }}
                        className='text-xs text-muted-foreground hover:text-primary transition-colors'
                      >
                        {q.product.productName}
                      </Link>
                      <span className='text-xs text-muted-foreground'>
                        · {q.user.name}
                      </span>
                    </div>
                    <p className='text-sm font-medium mt-2'>{q.question}</p>
                    {q.answer ? (
                      <div className='mt-2 rounded-md bg-muted/60 px-3 py-2'>
                        <p className='text-xs font-medium text-muted-foreground'>
                          Your answer
                        </p>
                        <p className='text-sm mt-0.5'>{q.answer}</p>
                      </div>
                    ) : (
                      <AnswerBox questionId={q.id} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
