import React, { useState, useEffect } from 'react';
import { User, X, Edit3, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Popup from '../components/Popup';
import { validateUsername, validateEmail, validatePassword, validateConfirmPassword } from './AuthPage';

interface UserProfile {
  username: string;
  email: string;
}

interface Link {
  id: number;
  original_url: string;
  short_url: string;
  clicks: number;
  created_at: string;
}

const ProfilePage = () => {
  const { user, token } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalType, setModalType] = useState<'username' | 'email' | 'password' | 'delete' | 'edit' | null>(null);
  
  // Form states
  const [newUsername, setNewUsername] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Link management states
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [newSlug, setNewSlug] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Popup states
  const [popupTitle, setPopupTitle] = useState('');
  const [popupDescription, setPopupDescription] = useState<string | undefined>();
  const [showPopup, setShowPopup] = useState(false);
  
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const validateCustomSlug = (slug: string): boolean => {
    const regex = /^[a-zA-Z0-9-]{3,16}$/;
    return regex.test(slug);
  };

  const fetchProfile = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const fetchUserLinks = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${apiUrl}/user/links`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setLinks(data.links);
      }
    } catch (error) {
      console.error('Failed to fetch user links:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await Promise.all([fetchProfile(), fetchUserLinks()]);
      setIsLoading(false);
    };

    fetchData();
  }, [token]);

  const handleDeleteLink = async () => {
    if (!selectedLink || !token) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/short/${selectedLink.short_url}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await fetchUserLinks(); // Refresh the links list
        closeModal();
        setPopupTitle('Link deletado com sucesso!');
        setPopupDescription('O link foi removido permanentemente.');
        setShowPopup(true);
      } else {
        const data = await response.json();
        setPopupTitle('Erro ao deletar link');
        setPopupDescription(data.detail || 'Não foi possível deletar o link. Tente novamente.');
        setShowPopup(true);
      }
    } catch (error) {
      setPopupTitle('Erro ao deletar link');
      setPopupDescription('Ocorreu um erro inesperado. Tente novamente.');
      setShowPopup(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditLink = async () => {
    if (!selectedLink || !token || !newSlug) return;

    if (!validateCustomSlug(newSlug)) {
      setPopupTitle('Link curto inválido!');
      setPopupDescription('Use de 3 a 16 caracteres, apenas letras, números e hífens.');
      setShowPopup(true);
      return;
    }

    // Check if the new slug is the same as the current one
    if (newSlug === selectedLink.short_url) {
      setPopupTitle('Nenhuma alteração detectada');
      setPopupDescription('O link encurtado digitado é igual ao atual.');
      setShowPopup(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/short/${selectedLink.short_url}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          short_url: newSlug,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        await fetchUserLinks(); // Refresh the links list
        closeModal();
        setPopupTitle('Link editado com sucesso!');
        setPopupDescription(`Seu link agora é: ${baseUrl.replace('https://', '')}/${data.short_url}`);
        setShowPopup(true);
      } else {
        if (data.detail === 'Invalid short URL') {
          setPopupTitle('Link curto inválido!');
          setPopupDescription('Use de 3 a 16 caracteres, apenas letras, números e hífens.');
          setShowPopup(true);
        } else if (data.detail === 'Short URL already exists') {
          setPopupTitle('Link encurtado já existe!');
          setPopupDescription('O link curto inserido já está em uso. Por favor, escolha outro.');
          setShowPopup(true);
        } else {
          setPopupTitle('Erro ao editar link');
          setPopupDescription(data.detail || 'Não foi possível editar o link. Tente novamente.');
          setShowPopup(true);
        }
      }
    } catch (error) {
      setPopupTitle('Erro ao editar link');
      setPopupDescription('Ocorreu um erro inesperado. Tente novamente.');
      setShowPopup(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (link: Link) => {
    setSelectedLink(link);
    setModalType('delete');
  };

  const openEditModal = (link: Link) => {
    setSelectedLink(link);
    setNewSlug(link.short_url);
    setModalType('edit');
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUsername.trim()) {
      setPopupTitle('Erro de validação');
      setPopupDescription('O nome de usuário é obrigatório.');
      setShowPopup(true);
      return;
    }

    const usernameError = validateUsername(newUsername);
    if (usernameError) {
      setPopupTitle('Nome de usuário inválido');
      setPopupDescription(usernameError);
      setShowPopup(true);
      return;
    }

    if (newUsername === profile?.username) {
      setPopupTitle('Nenhuma alteração detectada');
      setPopupDescription('O nome de usuário digitado é igual ao atual.');
      setShowPopup(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/auth/me/username`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: newUsername,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        await fetchProfile(); // Refresh profile data
        closeModal();
        setPopupTitle('Nome de usuário atualizado!');
        setPopupDescription('Seu nome de usuário foi alterado com sucesso.');
        setShowPopup(true);
      } else {
        if (data.detail === 'Username already registered. Please try another username.') {
          setPopupTitle('Nome de usuário já existe!');
          setPopupDescription('O nome de usuário inserido já está em uso. Por favor, escolha outro.');
          setShowPopup(true);
        } else {
          setPopupTitle('Erro ao atualizar nome de usuário');
          setPopupDescription(data.detail || 'Não foi possível atualizar o nome de usuário. Tente novamente.');
          setShowPopup(true);
        }
      }
    } catch (error) {
      setPopupTitle('Erro ao atualizar nome de usuário');
      setPopupDescription('Ocorreu um erro inesperado. Tente novamente.');
      setShowPopup(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentEmail.trim() || !newEmail.trim() || !confirmEmail.trim()) {
      setPopupTitle('Erro de validação');
      setPopupDescription('Todos os campos são obrigatórios.');
      setShowPopup(true);
      return;
    }

    if (currentEmail !== profile?.email) {
      setPopupTitle('E-mail atual incorreto');
      setPopupDescription('O e-mail atual informado não confere com o e-mail da sua conta.');
      setShowPopup(true);
      return;
    }

    const emailError = validateEmail(newEmail);
    if (emailError) {
      setPopupTitle('E-mail inválido');
      setPopupDescription(emailError);
      setShowPopup(true);
      return;
    }

    if (newEmail !== confirmEmail) {
      setPopupTitle('E-mails não coincidem');
      setPopupDescription('O novo e-mail e a confirmação devem ser iguais.');
      setShowPopup(true);
      return;
    }

    if (newEmail === profile?.email) {
      setPopupTitle('Nenhuma alteração detectada');
      setPopupDescription('O e-mail digitado é igual ao atual.');
      setShowPopup(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/auth/me/email`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newEmail,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        await fetchProfile(); // Refresh profile data
        closeModal();
        setPopupTitle('E-mail atualizado!');
        setPopupDescription('Seu e-mail foi alterado com sucesso.');
        setShowPopup(true);
      } else {
        if (data.detail === 'E-mail already registered. Please try another e-mail') {
          setPopupTitle('E-mail já existe!');
          setPopupDescription('O e-mail inserido já está em uso. Por favor, escolha outro.');
          setShowPopup(true);
        } else {
          setPopupTitle('Erro ao atualizar e-mail');
          setPopupDescription(data.detail || 'Não foi possível atualizar o e-mail. Tente novamente.');
          setShowPopup(true);
        }
      }
    } catch (error) {
      setPopupTitle('Erro ao atualizar e-mail');
      setPopupDescription('Ocorreu um erro inesperado. Tente novamente.');
      setShowPopup(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setPopupTitle('Erro de validação');
      setPopupDescription('Todos os campos são obrigatórios.');
      setShowPopup(true);
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setPopupTitle('Senha inválida');
      setPopupDescription(passwordError);
      setShowPopup(true);
      return;
    }

    const confirmError = validateConfirmPassword(confirmPassword, newPassword);
    if (confirmError) {
      setPopupTitle('Senhas não coincidem');
      setPopupDescription(confirmError);
      setShowPopup(true);
      return;
    }

    if (currentPassword === newPassword) {
      setPopupTitle('Senha igual à atual');
      setPopupDescription('A nova senha deve ser diferente da senha atual.');
      setShowPopup(true);
      return;
    }

    setIsSubmitting(true);
    try {
      // First verify current password by trying to login
      const loginResponse = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: profile?.email,
          password: currentPassword,
        }),
      });

      if (!loginResponse.ok) {
        setPopupTitle('Senha atual incorreta');
        setPopupDescription('A senha atual informada está incorreta.');
        setShowPopup(true);
        setIsSubmitting(false);
        return;
      }

      // Now update the password
      const response = await fetch(`${apiUrl}/auth/me/password`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: newPassword,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        closeModal();
        setPopupTitle('Senha atualizada!');
        setPopupDescription('Sua senha foi alterada com sucesso.');
        setShowPopup(true);
      } else {
        if (data.detail === 'The new password cannot be the same as the old password') {
          setPopupTitle('Senha igual à atual');
          setPopupDescription('A nova senha deve ser diferente da senha atual.');
          setShowPopup(true);
        } else {
          setPopupTitle('Erro ao atualizar senha');
          setPopupDescription(data.detail || 'Não foi possível atualizar a senha. Tente novamente.');
          setShowPopup(true);
        }
      }
    } catch (error) {
      setPopupTitle('Erro ao atualizar senha');
      setPopupDescription('Ocorreu um erro inesperado. Tente novamente.');
      setShowPopup(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModal = (type: 'username' | 'email' | 'password') => {
    setModalType(type);
    resetFormStates();
    
    // Initialize form fields with current values
    if (type === 'username' && profile?.username) {
      setNewUsername(profile.username);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedLink(null);
    setNewSlug('');
    resetFormStates();
  };

  const resetFormStates = () => {
    setNewUsername('');
    setCurrentEmail('');
    setNewEmail('');
    setConfirmEmail('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Meu Perfil</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info Section */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                <User size={48} />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  Nome de usuário
                </label>
                <div className="mt-1 flex justify-between items-center">
                  <span className="text-gray-900 dark:text-white font-medium">
                    {profile?.username || '---'}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  E-mail
                </label>
                <div className="mt-1 flex justify-between items-center">
                  <span className="text-gray-900 dark:text-white font-medium">
                    {profile?.email || '---'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 pt-4">
                <button
                  onClick={() => openModal('username')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Editar nome de usuário
                </button>
                <button
                  onClick={() => openModal('email')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Editar e-mail
                </button>
                <button
                  onClick={() => openModal('password')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Editar senha
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Links Table Section */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 gap-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Meus Links</h3>
              <a
                href="/"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                CRIAR LINK
              </a>
            </div>
            
            {/* Mobile View */}
            <div className="block sm:hidden">
              {links.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  Você ainda não criou nenhum link encurtado.
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {links.map((link) => (
                    <div key={link.id} className="p-4 space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">URL Original:</p>
                        <div className="text-sm text-gray-900 dark:text-white text-left">
                          {link.original_url.length > 50 ? `${link.original_url.substring(0, 50)}...` : link.original_url}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Link Encurtado:</p>
                          <a
                            href={`${baseUrl}/${link.short_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          >
                            {baseUrl.replace('https://', '')}/{link.short_url}
                          </a>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Cliques:</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{link.clicks}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Criado em:</p>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {new Date(link.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => navigator.clipboard.writeText(`${baseUrl}/${link.short_url}`)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 hover:scale-110 active:scale-95 btn-press"
                            title="Copiar link"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openEditModal(link)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 hover:scale-110 active:scale-95 btn-press"
                            title="Editar link"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(link)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 hover:scale-110 active:scale-95 btn-press"
                            title="Excluir link"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop View */}
            <div className="hidden sm:block">
              <div className="overflow-hidden">
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{width: '35%'}}>
                        URL Original
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{width: '25%'}}>
                        URL Encurtado
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{width: '10%'}}>
                        Cliques
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{width: '15%'}}>
                        Data
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{width: '15%'}}>
                        Ações
                      </th>
                    </tr>
                  </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {links.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        Você ainda não criou nenhum link encurtado.
                      </td>
                    </tr>
                  ) : (
                    links.map((link) => (
                      <tr key={link.id}>
                        <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                          <div className="group relative">
                            <div
                              className="truncate max-w-xs cursor-help"
                              title="Passe o mouse para ver URL completa"
                            >
                              {link.original_url}
                            </div>
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-20 bg-gray-900 dark:bg-gray-700 text-white p-3 rounded-md shadow-xl text-xs max-w-sm break-all border border-gray-700 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-1">
                              <div className="font-medium mb-1">URL Original:</div>
                              {link.original_url}
                              {/* Arrow pointing down */}
                              <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <a
                            href={`${baseUrl}/${link.short_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 truncate block"
                            title={`${baseUrl.replace('https://', '')}/${link.short_url}`}
                          >
                            {link.short_url}
                          </a>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                          {link.clicks}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(link.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-4 text-sm font-medium">
                          <div className="flex justify-end space-x-1">
                            <button
                              onClick={() => navigator.clipboard.writeText(`${baseUrl}/${link.short_url}`)}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 hover:scale-110 active:scale-95 btn-press"
                              title="Copiar link"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                            </button>
                            <button
                              onClick={() => openEditModal(link)}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 hover:scale-110 active:scale-95 btn-press"
                              title="Editar link"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(link)}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 hover:scale-110 active:scale-95 btn-press"
                              title="Excluir link"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modalType && (
        <div className="fixed inset-0 z-50 overflow-y-auto animate-fadeIn">
          <div className="flex items-center justify-center min-h-screen px-4 py-8 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>

            <div className="inline-block w-full max-w-md sm:max-w-lg bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all animate-modalEntry my-8 align-middle">
              <div className="px-6 pt-6 pb-4 sm:p-8 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                        {modalType === 'username' && 'Editar nome de usuário'}
                        {modalType === 'email' && 'Editar e-mail'}
                        {modalType === 'password' && 'Alterar senha'}
                        {modalType === 'delete' && 'Excluir Link'}
                        {modalType === 'edit' && 'Editar Link'}
                      </h3>
                      <button
                        onClick={closeModal}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>

                    {modalType === 'username' && (
                      <form onSubmit={handleUsernameSubmit} className="space-y-6">
                        <div>
                          <label htmlFor="new-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Novo nome de usuário
                          </label>
                          <input
                            type="text"
                            id="new-username"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                            placeholder="Digite o novo nome de usuário"
                            maxLength={16}
                            required
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            De 3 a 16 caracteres. Apenas letras, números, underlines (_) ou hífens (-).
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-600">
                          <button
                            type="button"
                            onClick={closeModal}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting || !newUsername.trim()}
                            className="w-full sm:w-auto px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isSubmitting ? (
                              <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Salvando...
                              </span>
                            ) : 'Salvar Alterações'}
                          </button>
                        </div>
                      </form>
                    )}

                    {modalType === 'email' && (
                      <form onSubmit={handleEmailSubmit} className="space-y-6">
                        <div>
                          <label htmlFor="current-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            E-mail atual
                          </label>
                          <input
                            type="email"
                            id="current-email"
                            value={currentEmail}
                            onChange={(e) => setCurrentEmail(e.target.value)}
                            className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                            placeholder="Digite seu e-mail atual"
                            required
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Digite o e-mail atualmente vinculado à sua conta.
                          </p>
                        </div>
                        <div>
                          <label htmlFor="new-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Novo e-mail
                          </label>
                          <input
                            type="email"
                            id="new-email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                            placeholder="Digite o novo e-mail"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="confirm-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Confirmar novo e-mail
                          </label>
                          <input
                            type="email"
                            id="confirm-email"
                            value={confirmEmail}
                            onChange={(e) => setConfirmEmail(e.target.value)}
                            className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                            placeholder="Digite o novo e-mail novamente"
                            required
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-600">
                          <button
                            type="button"
                            onClick={closeModal}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting || newEmail !== confirmEmail || !newEmail.trim() || !confirmEmail.trim() || !currentEmail.trim()}
                            className="w-full sm:w-auto px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isSubmitting ? (
                              <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Salvando...
                              </span>
                            ) : 'Salvar Alterações'}
                          </button>
                        </div>
                      </form>
                    )}

                    {modalType === 'password' && (
                      <form onSubmit={handlePasswordSubmit} className="space-y-6">
                        <div>
                          <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Senha atual
                          </label>
                          <input
                            type="password"
                            id="current-password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                            placeholder="Digite sua senha atual"
                            required
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Digite a senha que você usa atualmente para entrar na conta.
                          </p>
                        </div>
                        <div>
                          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nova senha
                          </label>
                          <input
                            type="password"
                            id="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                            placeholder="Digite a nova senha"
                            required
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Mínimo de 8 caracteres, incluindo pelo menos uma letra e um número.
                          </p>
                        </div>
                        <div>
                          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Confirmar nova senha
                          </label>
                          <input
                            type="password"
                            id="confirm-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                            placeholder="Digite a nova senha novamente"
                            required
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-600">
                          <button
                            type="button"
                            onClick={closeModal}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting || newPassword !== confirmPassword || !newPassword.trim() || !confirmPassword.trim() || !currentPassword.trim()}
                            className="w-full sm:w-auto px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isSubmitting ? (
                              <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Salvando...
                              </span>
                            ) : 'Salvar Alterações'}
                          </button>
                        </div>
                      </form>
                    )}

                    {modalType === 'delete' && selectedLink && (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Você deseja deletar o link:
                        </p>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                          <p className="text-sm font-medium text-gray-900 dark:text-white break-all">
                            {baseUrl.replace('https://', '')}/{selectedLink.short_url}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-all">
                            → {selectedLink.original_url}
                          </p>
                        </div>
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={closeModal}
                            disabled={isSubmitting}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-all duration-200 hover:scale-105 active:scale-95 btn-press"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteLink}
                            disabled={isSubmitting}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95 btn-press"
                          >
                            {isSubmitting ? 'Excluindo...' : 'Confirmar'}
                          </button>
                        </div>
                      </div>
                    )}

                    {modalType === 'edit' && selectedLink && (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Você está modificando o link encurtado para:
                        </p>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                          <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
                            {selectedLink.original_url}
                          </p>
                        </div>
                        <div>
                          <label htmlFor="new-slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Novo link encurtado
                          </label>
                          <div className="mt-1 flex rounded-md shadow-sm">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                              {baseUrl.replace('https://', '')}/
                            </span>
                            <input
                              type="text"
                              id="new-slug"
                              value={newSlug}
                              onChange={(e) => setNewSlug(e.target.value)}
                              maxLength={16}
                              className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="meu-link"
                              required
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Máximo de 16 caracteres. Apenas letras, números e hífens.
                          </p>
                        </div>
                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={closeModal}
                            disabled={isSubmitting}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-all duration-200 hover:scale-105 active:scale-95 btn-press"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleEditLink}
                            disabled={isSubmitting || !newSlug.trim()}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95 btn-press"
                          >
                            {isSubmitting ? 'Salvando...' : 'Confirmar'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPopup && (
        <Popup
          title={popupTitle}
          description={popupDescription}
          onClose={() => setShowPopup(false)}
        />
      )}
    </div>
  );
};

export default ProfilePage;