'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  CreditCard, 
  Receipt, 
  ChevronDown,
  ChevronRight,
  Building2,
  ShoppingCart,
  FileText,
  BarChart3,
  UserCog,
  Package,
  Truck
} from 'lucide-react';

interface MenuItem {
  title: string;
  href?: string;
  icon: React.ReactNode;
  badge?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    title: 'Customer Management',
    icon: <Users className="w-5 h-5" />,
    children: [
      {
        title: 'Customer Payments',
        href: '/',
        icon: <CreditCard className="w-4 h-4" />
      },
      {
        title: 'Customer Admin',
        href: '/admin',
        icon: <UserCog className="w-4 h-4" />
      }
    ]
  },
  {
    title: 'Consignment Management',
    icon: <Package className="w-5 h-5" />,
    children: [
      {
        title: 'All Consignments',
        href: '/consignments',
        icon: <Truck className="w-4 h-4" />
      },
      {
        title: 'New Consignment',
        href: '/consignments/new',
        icon: <Building2 className="w-4 h-4" />
      }
    ]
  },
  {
    title: 'Expense Management',
    icon: <Receipt className="w-5 h-5" />,
    children: [
      {
        title: 'Record Expenses',
        href: '/expenses',
        icon: <ShoppingCart className="w-4 h-4" />
      }
    ]
  }
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Customer Management', 'Consignment Management', 'Expense Management']);

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.title);
    const active = item.href ? isActive(item.href) : false;

    if (hasChildren) {
      return (
        <div key={item.title}>
          <button
            onClick={() => toggleExpanded(item.title)}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              level === 0 
                ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
            } ${collapsed ? 'justify-center' : ''}`}
          >
            <div className="flex items-center space-x-3">
              {item.icon}
              {!collapsed && <span>{item.title}</span>}
            </div>
            {!collapsed && (
              isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {!collapsed && isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children?.map(child => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.title}
        href={item.href!}
        className={`flex items-center space-x-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
          active
            ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
            : level === 0
            ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
        } ${collapsed ? 'justify-center' : ''}`}
      >
        {item.icon}
        {!collapsed && (
          <>
            <span className="flex-1">{item.title}</span>
            {item.badge && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    } flex flex-col h-full`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AG</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Business Ledger</h1>
              <p className="text-xs text-gray-500">Customer & Expense Mgmt</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">AG</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {menuItems.map(item => renderMenuItem(item))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        {!collapsed && (
          <div className="flex items-center space-x-3 px-3 py-2">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-medium text-sm">BK</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Balakrishna</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}