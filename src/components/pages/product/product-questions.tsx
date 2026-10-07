import {
  ChevronDown,
  HelpCircle,
  Loader2,
  MessageCircle,
  Send,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { QueryErrorState } from '@/components/query-state';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  useAskQuestionMutation,
  useProductQuestions,
} from '@/services/product';

type ProductQuestionsProps = {
  productId: string;
};

export function ProductQuestions({ productId }: ProductQuestionsProps) {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const { data, isLoading, isError, refetch } = useProductQuestions(
    productId,
    page,
  );
  const askMutation = useAskQuestionMutation();

  useEffect(() => {
    if (data) setTotalPages(data.totalPages);
  }, [data]);

  const loadedPages = Array.from({ length: page }, (_, i) => i + 1);
  const hasQuestions = page > 1 || (data?.questions.length ?? 0) > 0;
  const hasMore = page < totalPages || (page > 1 && isError);

  const handleLoadMore = () => {
    if (isError) {
      refetch();
    } else {
      setPage((p) => p + 1);
    }
  };

  const handleSubmit = async () => {
    if (question.length < 10) return;
    await askMutation.mutateAsync(
      { productId, question },
      {
        onSuccess: () => {
          setQuestion('');
          setFormOpen(false);
        },
      },
    );
  };

  return (
    <div className='space-y-4'>
      <Button
        variant='outline'
        size='sm'
        className='w-full gap-2 rounded-xl'
        onClick={() => setFormOpen((p) => !p)}
      >
        <HelpCircle className='w-4 h-4' />
        Ask a Question
      </Button>

      {formOpen && (
        <form
          className='space-y-3 p-4 rounded-xl border border-border bg-muted/30'
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <Textarea
            placeholder='What would you like to know about this product?'
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={500}
            className='min-h-[80px] text-sm'
          />
          <div className='flex items-center justify-between'>
            <span className='text-xs text-muted-foreground'>
              {question.length}/500
            </span>
            <Button
              type='submit'
              size='sm'
              className='gap-1.5 rounded-lg'
              disabled={question.length < 10 || askMutation.isPending}
            >
              {askMutation.isPending ? (
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
              ) : (
                <Send className='w-3.5 h-3.5' />
              )}
              Submit
            </Button>
          </div>
        </form>
      )}

      {isLoading && page === 1 && (
        <div className='space-y-3'>
          {[0, 1].map((i) => (
            <div
              key={i}
              className='h-20 rounded-xl bg-muted/50 animate-pulse'
            />
          ))}
        </div>
      )}

      {isError && (
        <QueryErrorState
          title='Failed to load questions'
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && !hasQuestions && !formOpen && (
        <div className='flex flex-col items-center text-center py-6 gap-2'>
          <MessageCircle className='w-5 h-5 text-muted-foreground' />
          <p className='text-xs text-muted-foreground'>No questions yet</p>
        </div>
      )}

      {hasQuestions && (
        <div className='space-y-3'>
          {loadedPages.map((p) => (
            <QuestionListPage key={p} productId={productId} page={p} />
          ))}

          {isLoading && page > 1 && (
            <div className='h-20 rounded-xl bg-muted/50 animate-pulse' />
          )}

          {hasMore && (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='w-full gap-2 text-muted-foreground'
              disabled={isLoading}
              onClick={handleLoadMore}
            >
              <ChevronDown className='w-4 h-4' />
              Load More Questions
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function QuestionListPage({
  productId,
  page,
}: {
  productId: string;
  page: number;
}) {
  const { data } = useProductQuestions(productId, page);

  return (
    <>
      {data?.questions.map((q) => (
        <div
          key={q.id}
          className='rounded-xl border border-border p-4 space-y-3'
        >
          <div className='space-y-1'>
            <div className='flex items-center gap-2'>
              <span className='text-xs font-medium'>{q.user.name}</span>
              <span className='text-[10px] text-muted-foreground'>
                {new Date(q.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className='text-sm'>{q.question}</p>
          </div>

          {q.answer && (
            <>
              <Separator />
              <div className='space-y-1'>
                <div className='flex items-center gap-2'>
                  <span className='text-xs font-medium text-primary'>
                    Seller
                  </span>
                  {q.answeredAt && (
                    <span className='text-[10px] text-muted-foreground'>
                      {new Date(q.answeredAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className='text-sm text-muted-foreground'>{q.answer}</p>
              </div>
            </>
          )}

          {!q.answer && (
            <p className='text-[11px] text-muted-foreground italic'>
              Awaiting answer
            </p>
          )}
        </div>
      ))}
    </>
  );
}
