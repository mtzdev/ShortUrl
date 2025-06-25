import React, { useState } from 'react';
import { Link as LinkIcon, CheckCircle, Copy, ExternalLink, RotateCcw, Share2 } from 'lucide-react';
import Popup from '../components/Popup';

const HomePage = () => {
  const [url, setUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [useCustomSlug, setUseCustomSlug] = useState(false);
  const [shortUrl, setShortUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupDescription, setPopupDescription] = useState<string | undefined>();  
  const [showPopup, setShowPopup] = useState(false);
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShortUrl(''); // Clear previous result
    setIsCopied(false); // Reset copy state

    try {
      const response = await fetch(`${apiUrl}/short`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          original_url: url,
          short_url: useCustomSlug ? customSlug : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.detail === 'Invalid short URL') {
          setPopupTitle('O link curto inserido é inválido!');
          setPopupDescription('Use de 3 a 16 caracteres, apenas letras, números e hífens.');
          setShowPopup(true);
        } else if (data.detail === 'Short URL already exists') {
          setPopupTitle('Link encurtado já existe!');
          setPopupDescription('O link curto inserido já está em uso. Por favor, escolha outro.');
          setShowPopup(true);
        } else {
          setPopupTitle('Ocorreu um erro ao encurtar o link!');
          setPopupDescription(data.detail || 'Erro inesperado. Tente novamente mais tarde.');
          setShowPopup(true);
        }
        return;
      }

      setShortUrl(`${baseUrl.replace('https://', '')}/${data.short_url}`);
    } catch (err) {
      setPopupTitle(err instanceof Error ? err.message : 'Erro ao encurtar link');
      setShowPopup(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${shortUrl}`);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Link Encurtado',
          url: `https://${shortUrl}`,
        });
      } catch (err) {
        console.error('Erro ao compartilhar:', err);
        handleCopy(); // Fallback to copy
      }
    } else {
      handleCopy(); // Fallback to copy if share is not supported
    }
  };

  const resetForm = () => {
    setUrl('');
    setCustomSlug('');
    setUseCustomSlug(false);
    setShortUrl('');
    setIsCopied(false);
  };

  const truncateUrl = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 animate-fadeIn">
      <div className="max-w-3xl w-full space-y-8 sm:space-y-12">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
            Nunca foi tão simples encurtar links
          </h1>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-300">
            Transforme URLs longos em links curtos e fáceis de compartilhar em segundos.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-4 sm:p-6 md:p-8 transition-all duration-300">
          {!shortUrl ? (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label htmlFor="url" className="sr-only">
                  URL
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="url"
                    id="url"
                    required
                    className="block w-full pl-10 pr-3 py-3 sm:py-4 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Cole o seu link longo aqui"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="useCustomSlug"
                  name="useCustomSlug"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                  checked={useCustomSlug}
                  onChange={() => setUseCustomSlug(!useCustomSlug)}
                />
                <label htmlFor="useCustomSlug" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Personalizar meu link curto
                </label>
              </div>

              {useCustomSlug && (
                <div className="animate-fadeIn">
                  <label htmlFor="customSlug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Link personalizado
                  </label>
                  <div className="flex rounded-xl shadow-sm">
                    <span className="inline-flex items-center px-2 sm:px-3 rounded-l-xl border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                      {baseUrl.replace('https://', '')}/
                    </span>
                    <input
                      type="text"
                      id="customSlug"
                      maxLength={16}
                      className="flex-1 min-w-0 block w-full px-2 sm:px-3 py-2 text-sm sm:text-base rounded-none rounded-r-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="meu-link"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value)}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Máximo de 16 caracteres. Apenas letras, números e hífens.
                  </p>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading || !url}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm sm:text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isLoading ? (
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Encurtar Link'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="animate-fadeIn">
              {/* Success Header - Compact */}
              <div className="flex items-center justify-center space-x-2 text-green-600 dark:text-green-400 -mt-4 mb-3">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-medium text-sm sm:text-base">Link encurtado com sucesso!</span>
              </div>

              {/* Shortened URL Display - Clean and Fixed Layout */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 sm:p-4 space-y-2.5">
                {/* URL Display Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600">
                    <span className="flex-1 font-mono text-blue-600 dark:text-blue-400 text-sm sm:text-base break-all mr-3">
                      https://{shortUrl}
                    </span>
                    <button
                      onClick={handleCopy}
                      className={`flex items-center px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap transform hover:scale-105 active:scale-95 ${
                        isCopied
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          Copiar
                        </>
                      )}
                    </button>
                  </div>

                  {/* Original URL - Compact with Truncation */}
                  <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
                    <span className="font-medium">Original:</span>{' '}
                    <span 
                      className="break-all cursor-help" 
                      title={url}
                    >
                      {truncateUrl(url)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons - 3 buttons organized for mobile and desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => window.open(`https://${shortUrl}`, '_blank')}
                    className="flex items-center justify-center py-2.5 px-3 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 active:scale-95"
                  >
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Abrir Link
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center py-2.5 px-3 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 active:scale-95"
                  >
                    <Share2 className="w-4 h-4 mr-1.5" />
                    Compartilhar
                  </button>
                  <button
                    onClick={resetForm}
                    className="flex items-center justify-center py-2.5 px-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm"
                  >
                    <RotateCcw className="w-4 h-4 mr-1.5" />
                    Novo Link
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105">
            <div className="text-blue-600 dark:text-blue-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Rápido e Simples</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Encurte URLs com apenas alguns cliques e compartilhe facilmente nas redes sociais.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105">
            <div className="text-blue-600 dark:text-blue-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Estatísticas Detalhadas</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Acompanhe quantas vezes seu link foi acessado e quando foi criado.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105">
            <div className="text-blue-600 dark:text-blue-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Links Personalizados</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Crie URLs curtos memoráveis e personalizados para sua marca ou campanha.
            </p>
          </div>
        </div>
      </div>
      {showPopup && <Popup title={popupTitle} description={popupDescription} onClose={() => setShowPopup(false)} />}
    </div>
  );
};

export default HomePage;