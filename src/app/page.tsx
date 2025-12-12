'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-primary-600">BeadForge</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Редактор схем для бісероплетіння
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Створюйте та редагуйте схеми для в&apos;язаних джгутів з бісеру.
            Вбудована озвучка кольорів допоможе при плетінні.
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="flex justify-center mb-12">
          {/* Rope Editor Card */}
          <Link
            href="/rope"
            className="block bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6 border-2 border-transparent hover:border-primary-300 max-w-md"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Джгут</h3>
                <p className="text-sm text-gray-500">В&apos;язаний джгут з бісеру</p>
              </div>
            </div>
            <p className="text-gray-600">
              Створюйте схеми для в&apos;язаних джгутів з підтримкою різної ширини.
              Переглядайте чернетку, виправлену схему та симуляцію готового виробу.
            </p>
            <div className="mt-4 text-primary-600 font-medium flex items-center gap-2">
              Відкрити редактор
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Features Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Можливості
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Озвучка (TTS)</h4>
              <p className="text-sm text-gray-600">
                Озвучування кольорів для зручного плетіння без постійного погляду на схему
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Імпорт/Експорт</h4>
              <p className="text-sm text-gray-600">
                Підтримка формату JBB для обміну схемами з іншими програмами
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Збереження прогресу</h4>
              <p className="text-sm text-gray-600">
                Автоматичне збереження позиції озвучки для продовження роботи
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          BeadForge — редактор схем для бісероплетіння
        </div>
      </footer>
    </div>
  );
}
