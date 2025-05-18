import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExternalLink, Calendar } from 'lucide-react';

interface LinkData {
  originalUrl: string;
  shortUrl: string;
  createdAt: string;
}

const ConfirmationPage = () => {
  const { shortId } = useParams();
  const navigate = useNavigate();
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLinkData = async () => {
      try {
        const response = await fetch(`/api/short/${shortId}`);
        if (!response.ok) throw new Error('Link não encontrado');
        const data = await response.json();
        setLinkData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar o link');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLinkData();
  }, [shortId]);

  const handleRedirect = () => {
    if (linkData?.originalUrl) {
      window.location.href = linkData.originalUrl;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (error || !linkData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Link não encontrado
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {error || 'O link solicitado não está disponível'}
          </p>
          <a
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Voltar para página inicial
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-2xl w-full">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Você deseja ser redirecionado para o link:
          </h2>
          <p className="text-gray-600 dark:text-gray-300 break-all">
            {linkData.originalUrl}
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            <ExternalLink className="w-4 h-4 mr-2" />
            <span>Link encurtado: {linkData.shortUrl}</span>
          </div>
          <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4 mr-2" />
            <span>Criado em: {linkData.createdAt}</span>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleRedirect}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Prosseguir
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationPage