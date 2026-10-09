import {
  BadgePercent,
  BarChart2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
  UserSearch,
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
  url: string;
  roles?: UserRole[];
}

interface NavItem {
  title: string;
  url: string;
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
      url: '/shop',
      isActive: userRole === 'USER',
      icon: ShoppingCart,
      roles: ['USER', 'VENDOR'],
      items: [
        { title: 'Browse Products', url: '/shop' },
        { title: 'My Cart', url: '/cart' },
        { title: 'My Orders', url: '/dashboard/orders' },
        { title: 'Returns & Refunds', url: '/dashboard/orders/returns' },
        { title: 'My Wishlist', url: '/dashboard/wishlist' },
        { title: 'Followed Shops', url: '/dashboard/followed-shops' },
        { title: 'My Reviews', url: '/dashboard/reviews' },
        { title: 'Recently Viewed', url: '/recently-viewed' },
      ],
    },
    {
      title: 'Sell',
      url: '/dashboard/sell',
      icon: Store,
      roles: ['USER'],
      isActive: userRole === 'USER',
      items: [
        // This route should check if user already has a shop
        // and show status (pending/rejected) or the apply form
        { title: 'Open a Shop', url: '/dashboard/become-vendor/apply' },
      ],
    },
  ];

  const userAccountNavItems: NavItem[] = [
    {
      title: 'Account',
      url: '/dashboard/my-account',
      icon: Settings,
      roles: ['USER'],
      items: [
        { title: 'My Profile', url: '/dashboard/my-account' },
        { title: 'Addresses', url: '/dashboard/addresses' },
        { title: 'Payment Methods', url: '/dashboard/payment-methods' },
        { title: 'Vouchers & Coupons', url: '/dashboard/vouchers' },
        { title: 'Notifications', url: '/dashboard/notifications' },
        { title: 'Messages', url: '/dashboard/messages' },
        { title: 'Help & Support', url: '/support' },
      ],
    },
  ];

  // ─────────────────────────────────────────────
  // VENDOR
  // ─────────────────────────────────────────────
  const vendorNavItems: NavItem[] = [
    {
      title: 'Dashboard',
      url: '/dashboard/vendor',
      icon: BarChart2,
      isActive: userRole === 'VENDOR',
      roles: ['VENDOR'],
      items: [
        { title: 'Overview', url: '/dashboard/vendor' },
        { title: 'Sales Analytics', url: '/dashboard/vendor/sales' },
        { title: 'Inventory', url: '/dashboard/vendor/inventory' },
        { title: 'Earnings', url: '/dashboard/vendor/earnings' },
      ],
    },
    {
      title: 'Products',
      url: '/dashboard/vendor/products',
      icon: ShoppingBag,
      roles: ['VENDOR'],
      items: [
        { title: 'All Products', url: '/dashboard/vendor/products' },
        { title: 'Add Product', url: '/dashboard/vendor/products/add' },
        { title: 'Reviews', url: '/dashboard/vendor/products/reviews' },
      ],
    },
    {
      title: 'Orders',
      url: '/dashboard/vendor/orders',
      icon: ClipboardList,
      roles: ['VENDOR'],
      items: [
        { title: 'All Orders', url: '/dashboard/vendor/orders' },
        { title: 'Pending', url: '/dashboard/vendor/orders?status=PENDING' },
        {
          title: 'Processing',
          url: '/dashboard/vendor/orders?status=PROCESSING',
        },
        { title: 'Shipped', url: '/dashboard/vendor/orders?status=SHIPPED' },
        {
          title: 'Delivered',
          url: '/dashboard/vendor/orders?status=DELIVERED',
        },
        { title: 'Returns', url: '/dashboard/vendor/orders?status=REFUNDED' },
        {
          title: 'Cancelled',
          url: '/dashboard/vendor/orders?status=CANCELLED',
        },
      ],
    },
    {
      title: 'Shipping',
      url: '/dashboard/vendor/shipping',
      icon: Truck,
      roles: ['VENDOR'],
      items: [
        { title: 'Settings', url: '/dashboard/vendor/shipping' },
        { title: 'Print Labels', url: '/dashboard/vendor/shipping/labels' },
        {
          title: 'Track Shipments',
          url: '/dashboard/vendor/shipping/tracking',
        },
      ],
    },
    {
      title: 'Promotions',
      url: '/dashboard/vendor/promotions',
      icon: BadgePercent,
      roles: ['VENDOR'],
      items: [
        { title: 'Coupons', url: '/dashboard/vendor/promotions/coupons' },
        { title: 'Discounts', url: '/dashboard/vendor/promotions/discounts' },
      ],
    },
    {
      title: 'Payouts',
      url: '/dashboard/vendor/payouts',
      icon: Wallet,
      roles: ['VENDOR'],
      items: [
        { title: 'Balance & History', url: '/dashboard/vendor/payouts' },
        { title: 'Payout Schedule', url: '/dashboard/vendor/payouts/schedule' },
      ],
    },
    {
      title: 'My Shop',
      url: '/dashboard/vendor/shop',
      icon: Store,
      roles: ['VENDOR'],
      items: [
        { title: 'Shop Profile', url: '/dashboard/vendor/shop' },
        { title: 'Branding', url: '/dashboard/vendor/shop/branding' },
        { title: 'Policies', url: '/dashboard/vendor/shop/policies' },
        { title: 'Payout Details', url: '/dashboard/vendor/shop/payout' },
        { title: 'Messages', url: '/dashboard/vendor/shop/messages' },
      ],
    },
  ];

  // ─────────────────────────────────────────────
  // ADMIN & MANAGER
  // ─────────────────────────────────────────────
  const adminNavItems: NavItem[] = [
    {
      title: 'Dashboard',
      url: '/dashboard/admin',
      icon: LayoutDashboard,
      isActive: userRole === 'ADMIN' || userRole === 'MANAGER',
      roles: ['ADMIN', 'MANAGER'],
      items: [
        { title: 'Overview', url: '/dashboard/admin' },
        { title: 'Sales', url: '/dashboard/admin/sales' },
        { title: 'Inventory', url: '/dashboard/admin/inventory' },
        {
          title: 'Financial Reports',
          url: '/dashboard/admin/financial',
          roles: ['ADMIN'],
        },
      ],
    },
    {
      title: 'Catalog',
      url: '/dashboard/admin/products',
      icon: Package,
      roles: ['ADMIN', 'MANAGER'],
      items: [
        { title: 'All Products', url: '/dashboard/admin/products' },
        { title: 'Categories', url: '/dashboard/admin/category/all' },
        { title: 'Reviews', url: '/dashboard/admin/reviews' },
        {
          title: 'Bulk Upload',
          url: '/dashboard/admin/products/bulk',
          roles: ['ADMIN'],
        },
      ],
    },
    {
      title: 'Orders',
      url: '/dashboard/admin/orders',
      icon: ShoppingCart,
      roles: ['ADMIN', 'MANAGER'],
      items: [
        { title: 'All Orders', url: '/dashboard/admin/orders' },
        { title: 'Pending', url: '/dashboard/admin/orders?status=PENDING' },
        {
          title: 'Processing',
          url: '/dashboard/admin/orders?status=PROCESSING',
        },
        { title: 'Shipped', url: '/dashboard/admin/orders?status=SHIPPED' },
        { title: 'Delivered', url: '/dashboard/admin/orders?status=DELIVERED' },
        { title: 'Returns', url: '/dashboard/admin/orders?status=REFUNDED' },
        { title: 'Cancelled', url: '/dashboard/admin/orders?status=CANCELLED' },
      ],
    },
    {
      title: 'Customers',
      url: '/dashboard/admin/customers',
      icon: Users,
      roles: ['ADMIN', 'MANAGER'],
      items: [
        { title: 'All Customers', url: '/dashboard/admin/customers' },
        { title: 'Support Tickets', url: '/dashboard/admin/tickets' },
      ],
    },
    {
      title: 'Vendors',
      url: '/dashboard/admin/vendors',
      icon: Store,
      roles: ['ADMIN', 'MANAGER'],
      items: [
        { title: 'All Vendors', url: '/dashboard/admin/vendors' },
        { title: 'Shop Approvals', url: '/dashboard/admin/vendors/approvals' },
        { title: 'Suspended Shops', url: '/dashboard/admin/vendors/suspended' },
        { title: 'Verified Badges', url: '/dashboard/admin/vendors/verified' },
        { title: 'Performance', url: '/dashboard/admin/vendors/performance' },
        {
          title: 'Payouts',
          url: '/dashboard/admin/vendors/payouts',
          roles: ['ADMIN'],
        },
        {
          title: 'Commission Rules',
          url: '/dashboard/admin/vendors/commissions',
          roles: ['ADMIN'],
        },
      ],
    },
    {
      title: 'Marketing',
      url: '/dashboard/admin/banner/list',
      icon: BadgePercent,
      roles: ['ADMIN', 'MANAGER'],
      items: [
        { title: 'Banners', url: '/dashboard/admin/banner/list' },
        {
          title: 'Coupons & Discounts',
          url: '/dashboard/admin/coupons',
          roles: ['ADMIN'],
        },
        {
          title: 'SEO',
          url: '/dashboard/admin/seo',
          roles: ['ADMIN'],
        },
      ],
    },
    {
      title: 'Moderation',
      url: '/dashboard/admin/moderation',
      icon: ClipboardCheck,
      roles: ['ADMIN', 'MANAGER'],
      items: [
        {
          title: 'Flagged Products',
          url: '/dashboard/admin/moderation/products',
        },
        {
          title: 'Flagged Reviews',
          url: '/dashboard/admin/moderation/reviews',
        },
        {
          title: 'Conversations',
          url: '/dashboard/admin/messages',
        },
      ],
    },
    {
      title: 'Staff',
      url: '/dashboard/admin/staff',
      icon: Shield,
      roles: ['ADMIN'],
      items: [
        { title: 'All Staff', url: '/dashboard/admin/staff' },
        { title: 'Roles & Permissions', url: '/dashboard/admin/staff/roles' },
        { title: 'Audit Logs', url: '/dashboard/admin/staff/audit-logs' },
      ],
    },
    {
      title: 'Platform Settings',
      url: '/dashboard/admin/settings',
      icon: Wrench,
      roles: ['ADMIN'],
      items: [
        { title: 'General', url: '/dashboard/admin/settings' },
        {
          title: 'Payment Gateways',
          url: '/dashboard/admin/settings/payments',
        },
        { title: 'Tax Configuration', url: '/dashboard/admin/settings/tax' },
        { title: 'Email Templates', url: '/dashboard/admin/settings/emails' },
      ],
    },
    {
      // Each user (including admin) can only open one shop.
      // This route should check if the admin already has a shop
      // and redirect to shop status/management instead of apply form.
      title: 'Sell',
      url: '/dashboard/sell',
      icon: ShoppingBag,
      roles: ['ADMIN', 'MANAGER'],
      items: [{ title: 'My Shop', url: '/dashboard/sell' }],
    },
  ];

  // ─────────────────────────────────────────────
  // CUSTOMER SERVICE
  // ─────────────────────────────────────────────
  const customerServiceNavItems: NavItem[] = [
    {
      title: 'Dashboard',
      url: '/dashboard/customer-service',
      icon: BarChart2,
      isActive: userRole === 'CUSTOMER_SERVICE',
      roles: ['CUSTOMER_SERVICE'],
      items: [
        { title: 'Overview', url: '/dashboard/customer-service' },
        { title: 'My Metrics', url: '/dashboard/customer-service/metrics' },
      ],
    },
    {
      title: 'Tickets',
      url: '/dashboard/customer-service/tickets',
      icon: MessageSquare,
      roles: ['CUSTOMER_SERVICE'],
      items: [
        {
          title: 'Open Tickets',
          url: '/dashboard/customer-service/tickets?status=OPEN',
        },
        {
          title: 'Pending Tickets',
          url: '/dashboard/customer-service/tickets?status=PENDING',
        },
        {
          title: 'Resolved Tickets',
          url: '/dashboard/customer-service/tickets?status=RESOLVED',
        },
        {
          title: 'Create Ticket',
          url: '/dashboard/customer-service/tickets/create',
        },
      ],
    },
    {
      title: 'Orders',
      url: '/dashboard/customer-service/orders',
      icon: ClipboardList,
      roles: ['CUSTOMER_SERVICE'],
      items: [
        { title: 'Order Lookup', url: '/dashboard/customer-service/orders' },
        {
          title: 'Process Return',
          url: '/dashboard/customer-service/orders/returns',
        },
        {
          title: 'Refund Requests',
          url: '/dashboard/customer-service/orders/refunds',
        },
        {
          title: 'Modify Order',
          url: '/dashboard/customer-service/orders/modify',
        },
      ],
    },
    {
      title: 'Customers',
      url: '/dashboard/customer-service/customers',
      icon: UserSearch,
      roles: ['CUSTOMER_SERVICE'],
      items: [
        {
          title: 'Customer Lookup',
          url: '/dashboard/customer-service/customers',
        },
      ],
    },
    {
      title: 'Knowledge Base',
      url: '/dashboard/customer-service/kb',
      icon: FileText,
      roles: ['CUSTOMER_SERVICE'],
      items: [
        {
          title: 'Product Info',
          url: '/dashboard/customer-service/kb/products',
        },
        { title: 'Policies', url: '/dashboard/customer-service/kb/policies' },
        {
          title: 'Common Issues',
          url: '/dashboard/customer-service/kb/issues',
        },
        { title: 'FAQ Templates', url: '/dashboard/customer-service/kb/faq' },
      ],
    },
  ];

  // ─────────────────────────────────────────────
  // ACCOUNT (shared — non-user roles)
  // ─────────────────────────────────────────────
  const accountNavItems: NavItem[] = [
    {
      title: 'Account',
      url: '/dashboard/my-account',
      icon: Settings,
      roles: ['ADMIN', 'MANAGER', 'VENDOR', 'CUSTOMER_SERVICE'],
      items: [
        { title: 'Profile', url: '/dashboard/my-account' },
        { title: 'Notifications', url: '/dashboard/notifications' },
        { title: 'Messages', url: '/dashboard/messages' },
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
      navItems = [
        ...filterItemsByRole(customerServiceNavItems),
        ...filterItemsByRole(accountNavItems),
      ];
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
                          <a href={subItem.url}>
                            <span>{subItem.title}</span>
                          </a>
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
