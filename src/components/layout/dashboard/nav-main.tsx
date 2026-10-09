import { Link, type LinkProps } from '@tanstack/react-router';
import {
  BadgePercent,
  BarChart2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  Package,
  Settings,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import type { UserRole } from '@/generated/prisma/client';
import type { User } from './types';

interface SubItem {
  title: string;
  to: LinkProps['to'];
  search?: LinkProps['search'];
  roles?: UserRole[];
}

interface NavItem {
  title: string;
  icon: React.ComponentType;
  isActive?: boolean;
  roles?: UserRole[];
  items: SubItem[];
}

export function NavMain({ user }: { user: User }) {
  const userRole = user.role as UserRole;

  // ─────────────────────────────────────────────
  // USER (Customer)
  // ─────────────────────────────────────────────
  const userNavItems: NavItem[] = [
    {
      title: 'Shopping',
      isActive: userRole === 'USER',
      icon: ShoppingCart,
      roles: ['USER', 'VENDOR'],
      items: [
        { title: 'Browse Products', to: '/shops' },
        { title: 'My Cart', to: '/cart' },
        { title: 'My Orders', to: '/dashboard/orders' },
        { title: 'Returns & Refunds', to: '/dashboard/orders/returns' },
        { title: 'My Wishlist', to: '/dashboard/wishlist' },
        { title: 'Followed Shops', to: '/dashboard/followed-shops' },
        { title: 'My Reviews', to: '/dashboard/reviews' },
        { title: 'Recently Viewed', to: '/recently-viewed' },
        { title: 'Wallet', to: '/dashboard/wallet' },
        { title: 'My Vouchers', to: '/dashboard/vouchers' },
      ],
    },
    {
      title: 'Sell',
      icon: Store,
      roles: ['USER'],
      isActive: userRole === 'USER',
      items: [
        // This route checks whether the user already has a shop and shows
        // status (pending/rejected) or the apply form.
        { title: 'Open a Shop', to: '/dashboard/become-vendor/apply' },
      ],
    },
  ];

  const userAccountNavItems: NavItem[] = [
    {
      title: 'Account',
      icon: Settings,
      roles: ['USER'],
      items: [
        { title: 'My Profile', to: '/dashboard/my-account' },
        { title: 'Addresses', to: '/dashboard/addresses' },
        { title: 'Messages', to: '/dashboard/messages' },
        { title: 'Help & Support', to: '/help' },
      ],
    },
  ];

  // ─────────────────────────────────────────────
  // VENDOR
  // ─────────────────────────────────────────────
  const vendorNavItems: NavItem[] = [
    {
      title: 'Dashboard',
      icon: BarChart2,
      isActive: userRole === 'VENDOR',
      roles: ['VENDOR'],
      items: [
        { title: 'Overview', to: '/dashboard/vendor' },
        { title: 'Sales Analytics', to: '/dashboard/vendor/sales' },
      ],
    },
    {
      title: 'Products',
      icon: ShoppingBag,
      roles: ['VENDOR'],
      items: [
        { title: 'All Products', to: '/dashboard/vendor/products' },
        { title: 'Add Product', to: '/dashboard/vendor/products/add' },
        { title: 'Questions', to: '/dashboard/vendor/questions' },
      ],
    },
    {
      title: 'Orders',
      icon: ClipboardList,
      roles: ['VENDOR'],
      items: [
        { title: 'All Orders', to: '/dashboard/vendor/orders' },
        {
          title: 'Pending',
          to: '/dashboard/vendor/orders',
          search: { status: 'PENDING' },
        },
        {
          title: 'Processing',
          to: '/dashboard/vendor/orders',
          search: { status: 'PROCESSING' },
        },
        {
          title: 'Shipped',
          to: '/dashboard/vendor/orders',
          search: { status: 'SHIPPED' },
        },
        {
          title: 'Delivered',
          to: '/dashboard/vendor/orders',
          search: { status: 'DELIVERED' },
        },
        {
          title: 'Returns',
          to: '/dashboard/vendor/returns',
        },
        {
          title: 'Cancelled',
          to: '/dashboard/vendor/orders',
          search: { status: 'CANCELLED' },
        },
      ],
    },
    {
      title: 'Shipping',
      icon: Truck,
      roles: ['VENDOR'],
      items: [
        { title: 'Settings', to: '/dashboard/vendor/shipping' },
        { title: 'Print Labels', to: '/dashboard/vendor/shipping/labels' },
        { title: 'Track Shipments', to: '/dashboard/vendor/shipping/tracking' },
      ],
    },
    {
      title: 'Payouts',
      icon: Wallet,
      roles: ['VENDOR'],
      items: [
        { title: 'Balance & History', to: '/dashboard/vendor/payouts' },
        { title: 'Payout Schedule', to: '/dashboard/vendor/payouts/schedule' },
      ],
    },
    {
      title: 'My Shop',
      icon: Store,
      roles: ['VENDOR'],
      items: [
        { title: 'Shop Profile', to: '/dashboard/vendor/shop' },
        { title: 'Branding', to: '/dashboard/vendor/shop/branding' },
        { title: 'Policies', to: '/dashboard/vendor/shop/policies' },
        { title: 'Payout Details', to: '/dashboard/vendor/shop/payout' },
        { title: 'Messages', to: '/dashboard/vendor/shop/messages' },
      ],
    },
  ];

  // ─────────────────────────────────────────────
  // ADMIN & MANAGER
  // ─────────────────────────────────────────────
  const adminNavItems: NavItem[] = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      isActive: userRole === 'ADMIN' || userRole === 'MANAGER',
      roles: ['ADMIN', 'MANAGER'],
      items: [{ title: 'Overview', to: '/dashboard/admin' }],
    },
    {
      title: 'Catalog',
      icon: Package,
      roles: ['ADMIN', 'MANAGER'],
      items: [
        { title: 'Categories', to: '/dashboard/admin/category/all' },
        { title: 'Reviews', to: '/dashboard/admin/reviews' },
        {
          title: 'Global Attributes',
          to: '/dashboard/admin/global-attributes',
        },
        {
          title: 'Content',
          to: '/dashboard/admin/content',
          roles: ['ADMIN'],
        },
      ],
    },
    {
      title: 'Orders',
      icon: ShoppingCart,
      roles: ['ADMIN', 'MANAGER'],
      items: [
        { title: 'All Orders', to: '/dashboard/admin/orders' },
        {
          title: 'Pending',
          to: '/dashboard/admin/orders',
          search: { status: 'PENDING' },
        },
        {
          title: 'Processing',
          to: '/dashboard/admin/orders',
          search: { status: 'PROCESSING' },
        },
        {
          title: 'Shipped',
          to: '/dashboard/admin/orders',
          search: { status: 'SHIPPED' },
        },
        {
          title: 'Delivered',
          to: '/dashboard/admin/orders',
          search: { status: 'DELIVERED' },
        },
        {
          title: 'Returns',
          to: '/dashboard/admin/returns',
        },
        {
          title: 'Cancelled',
          to: '/dashboard/admin/orders',
          search: { status: 'CANCELLED' },
        },
      ],
    },
    {
      title: 'Customers',
      icon: Users,
      roles: ['ADMIN', 'MANAGER'],
      items: [{ title: 'All Customers', to: '/dashboard/admin/customers' }],
    },
    {
      title: 'Vendors',
      icon: Store,
      roles: ['ADMIN', 'MANAGER'],
      items: [
        { title: 'All Vendors', to: '/dashboard/admin/vendors' },
        {
          title: 'Payouts',
          to: '/dashboard/admin/vendors/payouts',
          roles: ['ADMIN'],
        },
      ],
    },
    {
      title: 'Marketing',
      icon: BadgePercent,
      roles: ['ADMIN', 'MANAGER'],
      items: [
        { title: 'Banners', to: '/dashboard/admin/banner/list' },
        {
          title: 'Coupons & Discounts',
          to: '/dashboard/admin/coupons',
          roles: ['ADMIN'],
        },
      ],
    },
    {
      title: 'Moderation',
      icon: ClipboardCheck,
      roles: ['ADMIN', 'MANAGER'],
      items: [{ title: 'Conversations', to: '/dashboard/admin/messages' }],
    },
    {
      title: 'Staff',
      icon: Shield,
      roles: ['ADMIN'],
      items: [
        { title: 'All Staff', to: '/dashboard/admin/staff' },
        { title: 'Audit Logs', to: '/dashboard/admin/staff/audit-logs' },
      ],
    },
    {
      title: 'Platform Settings',
      icon: Wrench,
      roles: ['ADMIN'],
      items: [{ title: 'General', to: '/dashboard/admin/settings' }],
    },
  ];

  // ─────────────────────────────────────────────
  // ACCOUNT (shared — non-user roles)
  // ─────────────────────────────────────────────
  const accountNavItems: NavItem[] = [
    {
      title: 'Account',
      icon: Settings,
      roles: ['ADMIN', 'MANAGER', 'VENDOR', 'CUSTOMER_SERVICE'],
      items: [
        { title: 'Profile', to: '/dashboard/my-account' },
        { title: 'Messages', to: '/dashboard/messages' },
        { title: 'Help & Support', to: '/help' },
      ],
    },
  ];

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  const filterItemsByRole = (items: NavItem[]): NavItem[] => {
    return items
      .filter((item) => !item.roles || item.roles.includes(userRole))
      .map((item) => ({
        ...item,
        items: item.items.filter(
          (subItem) => !subItem.roles || subItem.roles.includes(userRole),
        ),
      }));
  };

  const getSidebarLabel = () => {
    switch (userRole) {
      case 'ADMIN':
        return 'Admin Console';
      case 'MANAGER':
        return 'Management';
      case 'VENDOR':
        return 'Vendor Portal';
      case 'CUSTOMER_SERVICE':
        return 'Customer Service';
      default:
        return 'My Account';
    }
  };

  // ─────────────────────────────────────────────
  // Build nav per role
  // ─────────────────────────────────────────────
  let navItems: NavItem[] = [];

  switch (userRole) {
    case 'ADMIN':
    case 'MANAGER':
      navItems = [
        ...filterItemsByRole(adminNavItems),
        ...filterItemsByRole(accountNavItems),
      ];
      break;
    case 'VENDOR':
      navItems = [
        ...filterItemsByRole(vendorNavItems),
        ...filterItemsByRole(userNavItems),
        ...filterItemsByRole(accountNavItems),
      ];
      break;
    case 'CUSTOMER_SERVICE':
      // All customer-service destinations were dead links and have been
      // removed; the role now only has its account section.
      navItems = [...filterItemsByRole(accountNavItems)];
      break;
    default:
      navItems = [
        ...filterItemsByRole(userNavItems),
        ...filterItemsByRole(userAccountNavItems),
      ];
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{getSidebarLabel()}</SidebarGroupLabel>
      <SidebarMenu>
        {navItems.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className='group/collapsible'
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              {item.items.length > 0 && (
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild>
                          <Link to={subItem.to} search={subItem.search}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              )}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
