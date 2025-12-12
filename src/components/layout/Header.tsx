import { FC } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface HeaderProps {
  patternName?: string;
}

export const Header: FC<HeaderProps> = ({ patternName = 'Untitled' }) => {
  const pathname = usePathname();

  return (
    <header className="flex items-center gap-6 bg-gray-900 px-6 py-3 text-white">
      <h1 className="text-xl font-semibold">
        Bead<span className="text-primary-400">Forge</span>
      </h1>

      {/* Navigation */}
      <nav className="flex gap-4">
        <Link
          href="/"
          className={`text-sm transition-colors ${
            pathname === '/'
              ? 'text-primary-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Rope
        </Link>
      </nav>

      <span className="ml-auto text-sm text-gray-400">{patternName}</span>
    </header>
  );
};
