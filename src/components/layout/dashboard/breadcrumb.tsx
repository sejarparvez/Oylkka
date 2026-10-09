import { Link, useLocation } from '@tanstack/react-router';
import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function BreadCrumb() {
  // 1. Get the current location from the router
  const { pathname } = useLocation();

  // Split the pathname into an array of parts
  const pathArray = pathname.split('/').filter((path) => path);

  return (
    <header className='flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
      <div className='flex items-center gap-2 px-4'>
        <SidebarTrigger className='-ml-1' />
        <Separator orientation='vertical' className='mr-2 h-4' />
        <Breadcrumb>
          <BreadcrumbList>
            {/* Home breadcrumb item */}
            <BreadcrumbItem>
              {/* 2. Use TanStack Link for the '/' route */}
              <BreadcrumbLink asChild>
                <Link to='/'>Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            {pathArray.map((path, index) => {
              const href = `/${pathArray.slice(0, index + 1).join('/')}`;
              const isLast = index === pathArray.length - 1;
              const label = decodeURIComponent(path).replace(/-/g, ' ');

              return (
                <React.Fragment key={href}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {!isLast ? (
                      // 3. Use asChild to preserve shadcn styling while gaining router benefits
                      <BreadcrumbLink asChild>
                        <Link to={href}>{label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <span className='font-normal text-foreground'>
                        {label}
                      </span>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
