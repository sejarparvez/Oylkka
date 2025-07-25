import {
  BadgePercent,
  BarChart2,
  ChevronRight,
  ClipboardList,
  FileText,
  HelpCircle,
  Image,
  MessageSquare,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  Truck,
  Users,
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
import { auth } from '@/features/auth/auth';

type UserRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'VENDOR'
  | 'CUSTOMER_SERVICE'
  | 'USER'
  | 'CUSTOMER';

interface SubItem {
  title: string;
  url: string;
  roles?: UserRole[]; // Roles that can see this item
}

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType;
  isActive?: boolean;
  roles?: UserRole[]; // Roles that can see this item
  items: SubItem[];
}

export async function NavMain() {
  const session = await auth();
  const userRole = (session?.user?.role as UserRole) || 'CUSTOMER';

  // Shopping navigation items (mainly for customers)
  const shoppingNavItems: NavItem[] = [
    {
      title: 'Shop',
      url: '/shop',
      icon: ShoppingCart,

      roles: ['ADMIN', 'MANAGER', 'VENDOR', 'CUSTOMER_SERVICE'],
      items: [
        {
          title: 'My Shop',
          url: '/dashboard/vendor/my-shop',
          roles: ['VENDOR'],
        },
        {
          title: 'All Products',
          url: '/shop/all',
        },
        {
          title: 'New Arrivals',
          url: '/shop/new',
        },
        {
          title: 'Featured',
          url: '/shop/featured',
        },
        {
          title: 'Best Sellers',
          url: '/shop/best-sellers',
        },
      ],
    },
    {
      title: 'Categories Management',
      url: '/categories',
      icon: Tag,
      roles: ['ADMIN', 'MANAGER', 'CUSTOMER_SERVICE'],
      items: [
        {
          title: 'Category list',
          url: '/dashboard/admin/category/all',
          roles: ['ADMIN', 'MANAGER', 'CUSTOMER_SERVICE'],
        },
        {
          title: 'Add Category',
          url: '/dashboard/admin/category/add',
          roles: ['ADMIN', 'MANAGER', 'CUSTOMER_SERVICE'],
        },
      ],
    },
    {
      title: 'My Orders',
      url: '/orders',
      icon: Package,
      isActive: userRole === 'CUSTOMER' || userRole === 'USER',
      roles: ['USER', 'CUSTOMER'],
      items: [
        {
          title: 'Pending Orders',
          url: '/dashboard/customer/orders?status=PENDING',
        },
        {
          title: 'Processing Orders',
          url: '/dashboard/customer/orders?status=PROCESSING',
        },
        {
          title: 'Shipped Orders',
          url: '/dashboard/customer/orders?status=SHIPPED',
        },
        {
          title: 'Order History',
          url: '/dashboard/customer/orders',
        },
      ],
    },
    {
      title: 'Promotions',
      url: '/promotions',
      icon: BadgePercent,
      roles: ['ADMIN', 'MANAGER', 'VENDOR', 'CUSTOMER_SERVICE'],
      items: [
        {
          title: 'Current Deals',
          url: '/promotions/deals',
        },
        {
          title: 'Clearance',
          url: '/promotions/clearance',
        },
        {
          title: 'Seasonal',
          url: '/promotions/seasonal',
        },
        {
          title: 'Loyalty Rewards',
          url: '/promotions/loyalty',
        },
      ],
    },
    {
      title: 'Support',
      url: '/support',
      icon: HelpCircle,
      roles: ['USER', 'CUSTOMER'],
      items: [
        {
          title: 'Help Center',
          url: '/support/help',
        },
        {
          title: 'Contact Us',
          url: '/support/contact',
        },
        {
          title: 'Submit Ticket',
          url: '/support/ticket',
        },
        {
          title: 'FAQs',
          url: '/support/faq',
        },
      ],
    },
  ];

  // Admin-specific navigation items
  const adminNavItems: NavItem[] = [
    {
      title: 'Dashboard',
      url: '/admin/dashboard',
      icon: BarChart2,
      isActive: userRole === 'ADMIN',
      roles: ['ADMIN', 'MANAGER'],
      items: [
        {
          title: 'Sales Overview',
          url: '/admin/dashboard/sales',
        },
        {
          title: 'Inventory',
          url: '/admin/dashboard/inventory',
        },
        {
          title: 'Analytics',
          url: '/admin/dashboard/analytics',
        },
        {
          title: 'Financial Reports',
          url: '/admin/dashboard/financial',
          roles: ['ADMIN', 'MANAGER'],
        },
      ],
    },
    {
      title: 'Product Management',
      url: '/admin/products',
      icon: Package,
      roles: ['ADMIN', 'MANAGER', 'VENDOR'],
      items: [
        {
          title: 'Product List',
          url: '/dashboard/admin/products/list',
        },
        {
          title: 'Edit Products',
          url: '/admin/products/edit',
        },
        {
          title: 'Categories',
          url: '/admin/products/categories',
          roles: ['ADMIN', 'MANAGER'],
        },
        {
          title: 'Inventory',
          url: '/admin/products/inventory',
        },
        {
          title: 'Bulk Upload',
          url: '/admin/products/bulk-upload',
          roles: ['ADMIN', 'MANAGER', 'VENDOR'],
        },
      ],
    },
    {
      title: 'Customer Management',
      url: '/admin/customers',
      icon: Users,
      roles: ['ADMIN', 'MANAGER', 'CUSTOMER_SERVICE'],
      items: [
        {
          title: 'Customer List',
          url: '/dashboard/admin/customers/list',
        },
        {
          title: 'Customer Reports',
          url: '/admin/customers/reports',
          roles: ['ADMIN', 'MANAGER'],
        },
        {
          title: 'Support Tickets',
          url: '/admin/customers/tickets',
          roles: ['ADMIN', 'MANAGER', 'CUSTOMER_SERVICE'],
        },
        {
          title: 'Customer Insights',
          url: '/admin/customers/insights',
          roles: ['ADMIN', 'MANAGER'],
        },
      ],
    },
    {
      title: 'Order Management',
      url: '/dashboard/admin/orders',
      icon: ShoppingCart,
      roles: ['ADMIN', 'MANAGER', 'CUSTOMER_SERVICE'],
      items: [
        {
          title: 'All Orders',
          url: '/dashboard/admin/orders',
        },
        {
          title: 'Pending Orders',
          url: '/admin/orders/pending',
        },
        {
          title: 'Processing Orders',
          url: '/admin/orders/processing',
        },
        {
          title: 'Shipped Orders',
          url: '/admin/orders/shipped',
        },
        {
          title: 'Returns & Refunds',
          url: '/admin/orders/returns',
        },
      ],
    },
    {
      title: 'Vendor Management',
      url: '/admin/vendors',
      icon: Store,
      roles: ['ADMIN', 'MANAGER'],
      items: [
        {
          title: 'Vendor List',
          url: '/dashboard/admin/vendors/list',
        },
        {
          title: 'Vendor Applications',
          url: '/admin/vendors/applications',
        },
        {
          title: 'Performance Metrics',
          url: '/admin/vendors/performance',
        },
        {
          title: 'Payouts',
          url: '/admin/vendors/payouts',
          roles: ['ADMIN'],
        },
      ],
    },
    {
      title: 'Banner Management',
      url: '/dashboard/admin/banner',
      icon: Image,
      roles: ['ADMIN', 'MANAGER'],
      items: [
        {
          title: 'Add Banner',
          url: '/dashboard/admin/banner/add',
        },
        {
          title: 'Banner List',
          url: '/dashboard/admin/banner/list',
        },
      ],
    },
  ];

  // Vendor-specific navigation items
  const vendorNavItems: NavItem[] = [
    {
      title: 'Vendor Dashboard',
      url: '/vendor/dashboard',
      icon: BarChart2,
      isActive: userRole === 'VENDOR',
      roles: ['VENDOR'],
      items: [
        {
          title: 'Performance Overview',
          url: '/vendor/dashboard/overview',
        },
        {
          title: 'Sales Analytics',
          url: '/vendor/dashboard/sales',
        },
        {
          title: 'Inventory',
          url: '/vendor/dashboard/inventory',
        },
        {
          title: 'Earnings',
          url: '/vendor/dashboard/earnings',
        },
      ],
    },
    {
      title: 'My Products',
      url: '/vendor/products',
      icon: ShoppingBag,
      roles: ['VENDOR'],
      items: [
        {
          title: 'All Products',
          url: '/vendor/products/all',
        },
        {
          title: 'Add Product',
          url: '/dashboard/vendor/products/add',
        },
        {
          title: 'Bulk Upload',
          url: '/vendor/products/bulk-upload',
        },
        {
          title: 'Product Reviews',
          url: '/vendor/products/reviews',
        },
      ],
    },
    {
      title: 'Orders',
      url: 'dashboard/vendor/orders/all',
      icon: ClipboardList,
      roles: ['VENDOR'],
      items: [
        {
          title: 'All Orders',
          url: '/dashboard/vendor/orders',
        },
        {
          title: 'Processing',
          url: '/vendor/orders/processing',
        },
        {
          title: 'Shipped',
          url: '/vendor/orders/shipped',
        },
        {
          title: 'Returns',
          url: '/vendor/orders/returns',
        },
      ],
    },
    {
      title: 'Shipping',
      url: '/vendor/shipping',
      icon: Truck,
      roles: ['VENDOR'],
      items: [
        {
          title: 'Shipping Settings',
          url: '/vendor/shipping/settings',
        },
        {
          title: 'Print Labels',
          url: '/vendor/shipping/labels',
        },
        {
          title: 'Track Shipments',
          url: '/vendor/shipping/track',
        },
      ],
    },
  ];

  // Customer Service specific navigation items
  const customerServiceNavItems: NavItem[] = [
    {
      title: 'Service Dashboard',
      url: '/service/dashboard',
      icon: BarChart2,
      isActive: userRole === 'CUSTOMER_SERVICE',
      roles: ['CUSTOMER_SERVICE'],
      items: [
        {
          title: 'Overview',
          url: '/service/dashboard/overview',
        },
        {
          title: 'Active Tickets',
          url: '/service/dashboard/tickets',
        },
        {
          title: 'Performance Metrics',
          url: '/service/dashboard/metrics',
        },
      ],
    },
    {
      title: 'Customer Support',
      url: '/service/support',
      icon: MessageSquare,
      roles: ['CUSTOMER_SERVICE'],
      items: [
        {
          title: 'Open Tickets',
          url: '/service/support/open',
        },
        {
          title: 'Pending Tickets',
          url: '/service/support/pending',
        },
        {
          title: 'Resolved Tickets',
          url: '/service/support/resolved',
        },
        {
          title: 'Create Ticket',
          url: '/service/support/create',
        },
      ],
    },
    {
      title: 'Order Assistance',
      url: '/service/orders',
      icon: ClipboardList,
      roles: ['CUSTOMER_SERVICE'],
      items: [
        {
          title: 'Track Orders',
          url: '/service/orders/track',
        },
        {
          title: 'Process Returns',
          url: '/service/orders/returns',
        },
        {
          title: 'Modify Orders',
          url: '/service/orders/modify',
        },
      ],
    },
    {
      title: 'Knowledge Base',
      url: '/service/knowledgebase',
      icon: FileText,
      roles: ['CUSTOMER_SERVICE'],
      items: [
        {
          title: 'Product Info',
          url: '/service/knowledgebase/products',
        },
        {
          title: 'Policies',
          url: '/service/knowledgebase/policies',
        },
        {
          title: 'Common Issues',
          url: '/service/knowledgebase/issues',
        },
        {
          title: 'FAQ Templates',
          url: '/service/knowledgebase/faq',
        },
      ],
    },
  ];

  // Account settings for all users with role-specific options
  const accountSettingsItem: NavItem = {
    title: 'Account',
    url: '/dashboard/profile',
    icon: Settings,
    roles: [
      'ADMIN',
      'MANAGER',
      'VENDOR',
      'CUSTOMER_SERVICE',
      'USER',
      'CUSTOMER',
    ],
    items: [
      {
        title: 'Profile',
        url: '/dashboard/profile',
      },
      {
        title: 'Addresses',
        url: '/dashboard/profile/addresses',
        roles: ['USER', 'CUSTOMER', 'VENDOR'],
      },

      {
        title: 'Wishlist',
        url: '/dashboard/customer/wishlist',
        roles: ['USER', 'CUSTOMER'],
      },
      {
        title: 'Notifications',
        url: '/account/notifications',
      },
      {
        title: 'Message',
        url: '/message',
      },
      {
        title: 'Vouchers',
        url: '/account/vouchers',
      },
      {
        title: 'My Review',
        url: '/dashboard/customer/reviews',
      },
    ],
  };

  // Filter all nav items based on the user's role
  const filterItemsByRole = (items: NavItem[]): NavItem[] => {
    return items
      .filter((item) => !item.roles || item.roles.includes(userRole))
      .map((item) => ({
        ...item,
        items: item.items.filter(
          (subItem) => !subItem.roles || subItem.roles.includes(userRole)
        ),
      }));
  };

  // Determine which sidebar label to show based on user role
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
        return 'Shopping';
    }
  };

  // Combine the navigation items based on user role
  let navItems: NavItem[] = [];

  // Add appropriate sections based on user role
  switch (userRole) {
    case 'ADMIN':
      navItems = [
        ...filterItemsByRole(adminNavItems),
        ...filterItemsByRole(shoppingNavItems),
        accountSettingsItem,
      ];
      break;
    case 'MANAGER':
      navItems = [
        ...filterItemsByRole(adminNavItems),
        ...filterItemsByRole(shoppingNavItems),
        accountSettingsItem,
      ];
      break;
    case 'VENDOR':
      navItems = [
        ...filterItemsByRole(vendorNavItems),
        ...filterItemsByRole(shoppingNavItems),
        accountSettingsItem,
      ];
      break;
    case 'CUSTOMER_SERVICE':
      navItems = [
        ...filterItemsByRole(customerServiceNavItems),
        ...filterItemsByRole(
          adminNavItems.filter(
            (item) =>
              item.title === 'Customer Management' ||
              item.title === 'Order Management'
          )
        ),
        ...filterItemsByRole(shoppingNavItems),
        accountSettingsItem,
      ];
      break;
    default:
      navItems = [...filterItemsByRole(shoppingNavItems), accountSettingsItem];
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
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
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
