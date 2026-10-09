import { createFileRoute } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Clock, Search } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminAuditLogs } from '@/services/admin-audit-logs';

const actionBadge = (action: string) => {
  if (action.startsWith('ORDER')) {
    return { variant: 'default' as const, label: action.replace('_', ' ') };
  }
  if (action.startsWith('SHOP')) {
    return { variant: 'secondary' as const, label: action.replace('_', ' ') };
  }
  return { variant: 'outline' as const, label: action.replace(/_/g, ' ') };
};

export const Route = createFileRoute('/dashboard/admin/staff/audit-logs')({
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useAdminAuditLogs();

  const logs = data?.logs ?? [];

  const filtered = search
    ? logs.filter(
        (log) =>
          log.action.toLowerCase().includes(search.toLowerCase()) ||
          log.entity.toLowerCase().includes(search.toLowerCase()) ||
          log.entityId.toLowerCase().includes(search.toLowerCase()) ||
          log.actorId.toLowerCase().includes(search.toLowerCase()),
      )
    : logs;

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Audit Logs</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Track all admin and staff actions
          </p>
        </div>
      </div>

      <div className='relative w-full sm:w-80'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
        <Input
          placeholder='Search by action, entity, or ID...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='pl-9'
        />
      </div>

      {isLoading && (
        <div className='space-y-2'>
          {Array.from({ length: 8 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: loading skeleton
            <Skeleton key={i} className='h-16 rounded-xl' />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className='flex flex-col items-center justify-center py-20 text-center'>
          <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
            <Clock className='w-7 h-7 text-muted-foreground' />
          </div>
          <p className='text-sm font-semibold mt-4'>
            {search ? 'No matching audit logs' : 'No audit logs yet'}
          </p>
          <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
            {search
              ? 'Try a different search term'
              : 'Audit logs will appear here as admin actions are performed'}
          </p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className='space-y-1.5'>
          {filtered.map((log) => {
            const { variant, label } = actionBadge(log.action);
            return (
              <div
                key={log.id}
                className='rounded-xl border border-border bg-card p-4 flex items-start gap-4 hover:border-primary/20 transition-colors'
              >
                <div className='flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-start'>
                  <div className='min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <Badge
                        variant={variant}
                        className='text-[10px] uppercase tracking-wider'
                      >
                        {label}
                      </Badge>
                      <span className='text-xs text-muted-foreground'>
                        on {log.entity}
                      </span>
                      <span className='text-xs font-mono text-muted-foreground truncate'>
                        #{log.entityId.slice(0, 8)}
                      </span>
                    </div>
                    {!!log.details && (
                      <p className='text-xs text-muted-foreground mt-1.5 line-clamp-1'>
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>
                  <div className='text-right shrink-0'>
                    <p className='text-xs text-muted-foreground'>
                      {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                    </p>
                    <p className='text-[10px] text-muted-foreground font-mono'>
                      {log.actorId.slice(0, 8)} ({log.actorRole})
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
