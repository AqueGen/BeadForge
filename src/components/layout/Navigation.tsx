'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Route } from 'next';

interface NavigationProps {
  className?: string;
}

interface NavItem {
  href: Route;
  label: string;
  icon: React.ReactNode;
}

export function Navigation({ className = '' }: NavigationProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      href: '/' as Route,
      label: 'Главная',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: '/rope' as Route,
      label: 'Жгут',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
    },
    {
      href: '/ball' as Route,
      label: 'Шар',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" strokeWidth={2} />
        </svg>
      ),
    },
  ];

  return (
    <nav className={`w-14 bg-gray-900 flex flex-col items-center py-4 ${className}`}>
      {/* Logo */}
      <Link
        href="/"
        className="mb-6 w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center text-white font-bold text-lg hover:bg-primary-600 transition-colors"
        title="BeadForge"
      >
        B
      </Link>

      {/* Navigation Items */}
      <div className="flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                isActive
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              title={item.label}
            >
              {item.icon}
            </Link>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Help / Info */}
      <button
        className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        title="Справка"
        onClick={() => {
          alert(
            'BeadForge — редактор схем для бисероплетения\n\n' +
            '• Жгут — создание схем для вязаных жгутов\n' +
            '• Шар — создание схем для оплетённых бусин\n\n' +
            'Клавиши:\n' +
            'Space — Воспроизвести/Пауза\n' +
            '← / → — Назад/Вперёд\n' +
            'Esc — Стоп'
          );
        }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </nav>
  );
}
