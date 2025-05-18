import React, { useState } from 'react';
import { Search, ExternalLink, Calendar, BarChart2 } from 'lucide-react';

interface LinkStats {
  originalUrl: string;
  shortUrl: string;
  clicks: number;
  createdAt: string;
}

const StatsPage = () => {
  const [slug, setSlug] = useState('');
  const [stats, setStats] = useState<LinkStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;

    setIsLoading(true);
    setHasSearched(true);

    // TODO: Simulate API call
    setTimeout(() => {
      if (slug === 'demo' || slug === 'exemplo') {
        setStats({
          originalUrl: 'https://example.com/this/is/a/very/long/url/that/needs/to/be/shortened',
          shortUrl: `encurtarlinks.com.br/${slug}`,
          clicks: 235,
          createdAt: new Date().toLocaleDateString('pt-BR'),
        });
      } else {
        setStats(null);
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Estatísticas de Links</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Visualize informações detalhadas sobre qualquer link encurtado
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-all duration-300">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <ExternalLink className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="encurtarlinks.com.br/"
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            disabled={isLoading || !slug}
          >
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <Search className="h-5 w-5 mr-2" />
                Pesquisar
              </>
            )}
          </button>
        </form>

        {hasSearched && (
          <div className="mt-8 animate-fadeIn">
            {stats ? (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 transition-all duration-300">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Informações do Link
                </h2>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-200 dark:border-gray-600 pb-4">
                    <div className="flex items-center text-gray-500 dark:text-gray-400 sm:w-1/4 mb-2 sm:mb-0">
                      <ExternalLink className="h-5 w-5 mr-2" />
                      <span>Link original</span>
                    </div>
                    <div className="sm:w-3/4 break-all text-gray-900 dark:text-white">
                      <a 
                        href={stats.originalUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {stats.originalUrl}
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-200 dark:border-gray-600 pb-4">
                    <div className="flex items-center text-gray-500 dark:text-gray-400 sm:w-1/4 mb-2 sm:mb-0">
                      <ExternalLink className="h-5 w-5 mr-2" />
                      <span>Link encurtado</span>
                    </div>
                    <div className="sm:w-3/4 text-gray-900 dark:text-white font-medium">
                      <div className="flex items-center">
                        <span>{stats.shortUrl}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(`https://${stats.shortUrl}`)}
                          className="ml-2 p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                          title="Copiar link"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-200 dark:border-gray-600 pb-4">
                    <div className="flex items-center text-gray-500 dark:text-gray-400 sm:w-1/4 mb-2 sm:mb-0">
                      <BarChart2 className="h-5 w-5 mr-2" />
                      <span>Acessos</span>
                    </div>
                    <div className="sm:w-3/4 text-gray-900 dark:text-white">
                      <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.clicks}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center">
                    <div className="flex items-center text-gray-500 dark:text-gray-400 sm:w-1/4 mb-2 sm:mb-0">
                      <Calendar className="h-5 w-5 mr-2" />
                      <span>Criado em</span>
                    </div>
                    <div className="sm:w-3/4 text-gray-900 dark:text-white">
                      {stats.createdAt}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="mt-2 text-xl font-medium text-gray-900 dark:text-white">Nenhum link encontrado</h3>
                <p className="mt-1 text-gray-500 dark:text-gray-400">
                  Tente pesquisar por outro link encurtado (dica: tente "demo" ou "exemplo").
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-medium text-blue-800 dark:text-blue-300 mb-2">
          Dica Profissional
        </h2>
        <p className="text-blue-700 dark:text-blue-400">
          Cadastre-se em nossa plataforma para acessar estatísticas avançadas, histórico completo e links personalizados ilimitados.
        </p>
      </div>
    </div>
  );
};

export default StatsPage;