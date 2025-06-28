import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ExternalLink, Calendar, AlertTriangle, Loader2, CheckCircle, ArrowRight, X, Lock, Eye, EyeOff } from 'lucide-react';
import Navbar from '../components/Navbar';

interface LinkData {
  original_url: string;
  clicks: number;
  created_at: string;
}

const ConfirmationPage = () => {
  const { shortId } = useParams();
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isValidatingPassword, setIsValidatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchLinkData = async (passwordHeader?: string) => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (passwordHeader) {
        headers['password'] = passwordHeader;
      }

      const response = await fetch(`${apiUrl}/short/${shortId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('O link solicitado não está disponível ou não existe.');
        } else if (response.status === 401) {
          const errorText = await response.text();
          if (errorText.includes('password protected')) {
            setIsPasswordProtected(true);
            return null;
          } else {
            throw new Error('Senha incorreta. Tente novamente.');
          }
        } else if (response.status === 429) {
          throw new Error('Você atingiu o limite de requisições. Por favor, tente novamente mais tarde.');
        } else {
          throw new Error('Erro ao carregar o link');
        }
      }

      const data = await response.json();
      return data;
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    const loadLinkData = async () => {
      try {
        setIsLoading(true);
        const data = await fetchLinkData();
        if (data) {
          setLinkData(data);
          setIsPasswordProtected(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar o link');
      } finally {
        setIsLoading(false);
      }
    };

    loadLinkData();
  }, [shortId]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setPasswordError('Por favor, insira a senha');
      return;
    }

    setIsValidatingPassword(true);
    setPasswordError(null);

    try {
      const data = await fetchLinkData(password);
      if (data) {
        setLinkData(data);
        setIsPasswordProtected(false);
        setPassword('');
      }
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Erro ao validar senha');
    } finally {
      setIsValidatingPassword(false);
    }
  };

  const handleRedirect = async () => {
    if (!linkData?.original_url || !shortId) return;
    
    setIsRedirecting(true);
    
    try {
      await fetch(`${apiUrl}/click/${shortId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.error('Erro ao atualizar contagem de cliques:', err);
    }
    
    window.location.href = linkData.original_url;
  };

  const handleCancel = () => {
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
          <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center max-w-sm w-full">
            <div className="flex justify-center mb-4">
              <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Carregando informações
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Aguarde enquanto verificamos o link...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Password protected state
  if (isPasswordProtected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
        <Navbar />
        
        {/* Header Section */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-4 sm:py-6">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-amber-600 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                  <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                Link Protegido por Senha
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                Este link requer uma senha para acesso
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="max-w-md mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Acesso Restrito
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Para continuar, insira a senha do link abaixo
                  </p>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Senha do Link
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                        placeholder="Digite a senha..."
                        disabled={isValidatingPassword}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {passwordError}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="w-full sm:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center text-sm"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </button>
                    
                    <button
                      type="submit"
                      disabled={isValidatingPassword || !password.trim()}
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100 shadow-md hover:shadow-lg disabled:shadow-sm flex items-center justify-center min-w-[120px] text-sm"
                    >
                      {isValidatingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Acessar
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
            
            {/* Security Notice */}
            <div className="mt-6 text-center px-4">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
                🔒 Este link foi protegido pelo criador para garantir acesso apenas a pessoas autorizadas.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !linkData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 dark:from-gray-900 dark:to-gray-800">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
          <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg border border-red-200 dark:border-red-800 text-center max-w-sm w-full">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Link não encontrado
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              {error || 'O link solicitado não está disponível ou pode ter expirado'}
            </p>
            <a
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Voltar ao início
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      
      {/* Header Section */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
              Confirmação de Redirecionamento
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
              Verifique o destino antes de prosseguir
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            
            {/* Content Section */}
            <div className="p-4 sm:p-6 md:p-8">
              <div className="text-center mb-6">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                  Você será redirecionado para:
                </h2>
                
                {/* URL Display */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 p-4 rounded-xl border border-gray-200 dark:border-gray-600 mb-6">
                  <div className="flex items-center justify-center mb-2">
                    <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                      Destino
                    </span>
                  </div>
                  <div className="url-container max-w-full overflow-x-auto">
                  <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                    {linkData.original_url}
                  </p>

                    <style>{`
                      .url-container::-webkit-scrollbar {
                        height: 8px;
                      }
                      .url-container::-webkit-scrollbar-track {
                        background: transparent;
                      }
                      .url-container::-webkit-scrollbar-thumb {
                        background-color: #3b82f6;
                        border-radius: 4px;
                        border: 2px solid transparent;
                        background-clip: content-box;
                      }
                      .url-container {
                        scrollbar-width: thin;
                        scrollbar-color: #3b82f6 transparent;
                      }
                    `}</style>
                  </div>
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-center mb-1">
                      <ExternalLink className="w-4 h-4 text-green-600 dark:text-green-400 mr-1" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wide">
                        Cliques
                      </span>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-green-800 dark:text-green-200">
                      {linkData.clicks.toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-center mb-1">
                      <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-1" />
                      <span className="text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                        Criado em
                      </span>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-purple-800 dark:text-purple-200">
                      {new Date(linkData.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <button
                    onClick={handleCancel}
                    className="w-full sm:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center text-sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </button>
                  
                  <button
                    onClick={handleRedirect}
                    disabled={isRedirecting}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-400 disabled:to-indigo-400 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100 shadow-md hover:shadow-lg disabled:shadow-sm flex items-center justify-center min-w-[140px] text-sm"
                  >
                    {isRedirecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Redirecionando...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Prosseguir
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Security Notice */}
          <div className="mt-6 text-center px-4">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
              🔒 Esta página de confirmação ajuda a proteger você contra links maliciosos. 
              Sempre verifique o destino antes de prosseguir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPage;