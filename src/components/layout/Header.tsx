import { FC } from 'react';

interface HeaderProps {
  patternName?: string;
}

export const Header: FC<HeaderProps> = ({ patternName = 'Untitled' }) => {
  return (
    <header className="flex items-center gap-6 bg-gray-900 px-6 py-3 text-white">
      <h1 className="text-xl font-semibold">
        Bead<span className="text-primary-400">Forge</span>
      </h1>
      <span className="text-sm text-gray-400">Bead Crochet Pattern Editor</span>
      <span className="ml-auto text-sm text-gray-400">{patternName}</span>
    </header>
  );
};
