import { createFileRoute } from '@tanstack/react-router';
import { FileText, Loader2, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  useAdminContentBlocks,
  useSaveContentBlockMutation,
} from '@/services/admin-content';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

const emptyForm = { slug: '', title: '', content: '', published: false };

export const Route = createFileRoute('/dashboard/admin/content/')({
  component: RouteComponent,
});

function RouteComponent() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading: loading } = useAdminContentBlocks();
  const saveMutation = useSaveContentBlockMutation();

  const blocks = data?.blocks ?? [];
  const saving = saveMutation.isPending;

  const handleSave = () => {
    if (!form.slug || !form.title || !form.content) return;
    saveMutation.mutate(form, {
      onSuccess: () => {
        setOpen(false);
        setForm(emptyForm);
      },
    });
  };

  const openEdit = (b: typeof emptyForm) => {
    setForm(b);
    setOpen(true);
  };

  return (
    <motion.div
      className='space-y-6'
      initial='hidden'
      animate='show'
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    >
      <motion.div variants={fadeUp} custom={0}>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <FileText className='w-6 h-6' />
            <div>
              <h1 className='text-2xl font-bold tracking-tight'>
                Content Pages
              </h1>
              <p className='text-sm text-muted-foreground mt-1'>
                Manage static pages (About, FAQ, Terms, etc.)
              </p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                className='gap-2'
                size='sm'
                onClick={() => setForm(emptyForm)}
              >
                <Plus className='w-4 h-4' />
                Add Page
              </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-lg'>
              <DialogHeader>
                <DialogTitle>
                  {form.slug ? 'Edit Page' : 'Add Page'}
                </DialogTitle>
                <DialogDescription className='sr-only'>
                  Enter the page content details.
                </DialogDescription>
              </DialogHeader>
              <div className='space-y-3'>
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, slug: e.target.value }))
                    }
                    placeholder='about, faq, terms, privacy...'
                  />
                </div>
                <div>
                  <Label>Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Content (HTML / Markdown)</Label>
                  <Textarea
                    value={form.content}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, content: e.target.value }))
                    }
                    rows={8}
                  />
                </div>
                <div className='flex items-center gap-2'>
                  <Switch
                    checked={form.published}
                    onCheckedChange={(v) =>
                      setForm((p) => ({ ...p, published: v }))
                    }
                  />
                  <Label>Published</Label>
                </div>
                <div className='flex justify-end gap-2 pt-2'>
                  <DialogClose asChild>
                    <Button variant='outline'>Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && (
                      <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} custom={1}>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Pages</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='space-y-3'>
                {[1, 2].map((i) => (
                  <Skeleton key={i} className='h-12 w-full' />
                ))}
              </div>
            ) : blocks.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <FileText className='w-10 h-10 text-muted-foreground mb-3' />
                <p className='text-sm font-semibold'>No content pages yet</p>
                <p className='text-sm text-muted-foreground mt-1'>
                  Create pages like About, FAQ, and Terms of Service.
                </p>
              </div>
            ) : (
              <div className='space-y-2'>
                {blocks.map((b) => (
                  <button
                    key={b.slug}
                    type='button'
                    className='flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent/50 w-full text-left'
                    onClick={() => openEdit(b)}
                  >
                    <div>
                      <p className='text-sm font-medium'>{b.title}</p>
                      <p className='text-xs text-muted-foreground'>/{b.slug}</p>
                    </div>
                    <Badge
                      variant={b.published ? 'default' : 'secondary'}
                      className='text-[10px] uppercase'
                    >
                      {b.published ? 'Published' : 'Draft'}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
