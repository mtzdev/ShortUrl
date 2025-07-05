import React, { useState, useEffect } from 'react';
import { User, X, Edit3, Trash2, Eye, EyeOff, Lock, Clock } from 'lucide-react';
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
  has_password: boolean;
  expires_at: string | null;
}

const ProfilePage = () => {
  const {} = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalType, setModalType] = useState<'username' | 'email' | 'password' | 'delete' | 'edit' | 'create' | 'password-info' | 'expiration-info' | null>(null);
  
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
  
  // Create link states
  const [createUrl, setCreateUrl] = useState('');
  const [createUseCustomSlug, setCreateUseCustomSlug] = useState(false);
  const [createCustomSlug, setCreateCustomSlug] = useState('');
  const [createUsePassword, setCreateUsePassword] = useState(false);
  const [createPassword, setCreatePassword] = useState('');
  const [createUseExpiration, setCreateUseExpiration] = useState(false);
  const [createExpirationDate, setCreateExpirationDate] = useState('');
  
  // Validation error states
  const [urlError, setUrlError] = useState('');
  const [customSlugError, setCustomSlugError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Popup states
  const [popupTitle, setPopupTitle] = useState('');
  const [popupDescription, setPopupDescription] = useState<string | undefined>();
  const [showPopup, setShowPopup] = useState(false);
  
  // Password update states
  const [newLinkPassword, setNewLinkPassword] = useState('');
  const [showLinkPassword, setShowLinkPassword] = useState(false);
  const [linkPasswordError, setLinkPasswordError] = useState('');
  
  // Expiration update states
  const [newLinkExpiration, setNewLinkExpiration] = useState('');
  const [linkExpirationError, setLinkExpirationError] = useState('');
  
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const baseUrl = import.meta.env.VITE_BASE_URL;


  const formatLocalDate = (dateString: string) => {
    const date = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'));
    return {
      date: date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      }),
      time: date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const formatDateTimeLocal = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'));
    
    // Converter para o fuso local do usuário
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatExpirationDate = (dateString: string) => {
    const date = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'));
    return {
      date: date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5); // Mínimo 5 minutos no futuro
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getMaxDateTime = () => {
    return '2999-12-31T23:59';
  };

  const convertLocalDateTimeToUTC = (localDateTime: string): string => {
    const localDate = new Date(localDateTime);
    return localDate.toISOString();
  };

  const handleDateTimeChange = (dateValue: string, setter: (value: string) => void) => {
    if (dateValue) {
      try {
        const selectedDate = new Date(dateValue);
        
        if (selectedDate.getFullYear() > 2999) {
          return;
        }
        
        setter(dateValue);
      } catch (error) {
        setter(dateValue);
      }
    } else {
      setter(dateValue);
    }
  };

  const validateCustomSlug = (slug: string): boolean => {
    const regex = /^[a-zA-Z0-9-]{3,16}$/;
    return regex.test(slug);
  };

  const validateUrl = (url: string): string => {
    if (!url.trim()) {
      return 'URL é obrigatória';
    }
    try {
      new URL(url);
      return '';
    } catch {
      return 'URL inválida';
    }
  };

  const validateCreateCustomSlug = (slug: string): string => {
    if (!slug.trim()) {
      return 'Link personalizado é obrigatório quando habilitado';
    }
    if (!validateCustomSlug(slug)) {
      return 'Use de 3 a 16 caracteres, apenas letras, números e hífens';
    }
    return '';
  };

  const validateCreatePassword = (password: string): string => {
    if (!password.trim()) {
      return 'Senha é obrigatória quando habilitada';
    }
    if (password.length < 3) {
      return 'Senha deve ter pelo menos 3 caracteres';
    }
    return '';
  };

  const validateCreateExpiration = (expirationDate: string): string => {
    if (!expirationDate.trim()) {
      return 'É necessário selecionar uma data de expiração';
    }
    
    const selectedDate = new Date(expirationDate);
    const now = new Date();
    
    // Verificar se a data é válida
    if (isNaN(selectedDate.getTime())) {
      return 'Data de expiração inválida';
    }
    
    // Verificar se o ano é menor que o atual
    if (selectedDate.getFullYear() < now.getFullYear()) {
      return 'Ano da data de expiração não pode ser menor que o ano atual';
    }
    
    // Verificar se o ano é maior que 2999
    if (selectedDate.getFullYear() > 2999) {
      return 'Ano da data de expiração não pode ser maior que 2999';
    }
    
    const minValidDate = new Date(now.getTime() + 5 * 60 * 1000);
    if (selectedDate <= minValidDate) {
      return 'Data de expiração deve ser pelo menos 5 minutos no futuro';
    }
    return '';
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${apiUrl}/auth/me`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
    try {
      const response = await fetch(`${apiUrl}/user/links`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        // Sort links by creation date (newest first)
        const sortedLinks = data.links.sort((a: Link, b: Link) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setLinks(sortedLinks);
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
  }, []);

  const handleDeleteLink = async () => {
    if (!selectedLink) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/short/${selectedLink.short_url}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
    if (!selectedLink || !newSlug) return;

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
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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

  const openPasswordInfoModal = (link: Link) => {
    setSelectedLink(link);
    setNewLinkPassword('');
    setLinkPasswordError('');
    setShowLinkPassword(false);
    setModalType('password-info');
  };

  const openExpirationInfoModal = (link: Link) => {
    setSelectedLink(link);
    setNewLinkExpiration(formatDateTimeLocal(link.expires_at));
    setLinkExpirationError('');
    setModalType('expiration-info');
  };

  const handleUpdateLinkPassword = async () => {
    if (!selectedLink) return;

    if (!newLinkPassword.trim()) {
      setLinkPasswordError('A nova senha é obrigatória');
      return;
    }

    if (newLinkPassword.length < 3) {
      setLinkPasswordError('A senha deve ter pelo menos 3 caracteres');
      return;
    }

    setIsSubmitting(true);
    setLinkPasswordError('');

    try {
      const response = await fetch(`${apiUrl}/short/${selectedLink.short_url}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          password: newLinkPassword,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        await fetchUserLinks(); // Refresh the links list
        closeModal();
        setPopupTitle('Senha atualizada com sucesso!');
        setPopupDescription('A senha do link foi alterada com sucesso.');
        setShowPopup(true);
      } else if (data.detail === 'Password must be at least 3 characters long') {
        setLinkPasswordError('A senha deve ter pelo menos 3 caracteres');
      } else {
        setLinkPasswordError('Não foi possível atualizar a senha. Tente novamente.');
      }
    } catch (error) {
      setLinkPasswordError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateLinkExpiration = async () => {
    if (!selectedLink) return;

    // Validar se a data foi alterada
    const currentExpiration = formatDateTimeLocal(selectedLink.expires_at);
    if (newLinkExpiration.trim() === currentExpiration.trim()) {
      setLinkExpirationError('A data de expiração não foi alterada');
      return;
    }

    // Validar se a data é válida (quando não está sendo removida)
    if (newLinkExpiration) {
      const validationError = validateCreateExpiration(newLinkExpiration);
      if (validationError) {
        setLinkExpirationError(validationError);
        return;
      }
    }

    setIsSubmitting(true);
    setLinkExpirationError('');

    try {
      const response = await fetch(`${apiUrl}/short/${selectedLink.short_url}/expiration`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          expires_at: newLinkExpiration ? convertLocalDateTimeToUTC(newLinkExpiration) : null,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        await fetchUserLinks(); // Refresh the links list
        closeModal();
        setPopupTitle('Data de expiração atualizada!');
        setPopupDescription(
          newLinkExpiration 
            ? 'A data de expiração do link foi alterada com sucesso.'
            : 'A data de expiração foi removida do link.'
        );
        setShowPopup(true);
      } else if (data.detail === 'Expiration date must be at least 5 minutes in the future') {
        setLinkExpirationError('A data de expiração deve ser pelo menos 5 minutos no futuro');
      } else if (data.detail === 'Invalid expiration date') {
        setLinkExpirationError('A data de expiração não é válida');
      } else {
        setLinkExpirationError('Não foi possível atualizar a data de expiração. Tente novamente.');
      }
    } catch (error) {
      setLinkExpirationError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveLinkExpiration = async () => {
    if (!selectedLink) return;

    setIsSubmitting(true);
    setLinkExpirationError('');

    try {
      const response = await fetch(`${apiUrl}/short/${selectedLink.short_url}/expiration`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          expires_at: null,
        }),
      });

      if (response.ok) {
        await fetchUserLinks(); // Refresh the links list
        closeModal();
        setPopupTitle('Data de expiração removida!');
        setPopupDescription('A data de expiração foi removida do link com sucesso.');
        setShowPopup(true);
      } else {
        setLinkExpirationError('Não foi possível remover a data de expiração. Tente novamente.');
      }
    } catch (error) {
      setLinkExpirationError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset previous errors
    setUrlError('');
    setCustomSlugError('');
    setPasswordError('');
    
    // Validate fields
    const urlValidationError = validateUrl(createUrl);
    if (urlValidationError) {
      setUrlError(urlValidationError);
      return;
    }
    
    if (createUseCustomSlug) {
      const slugValidationError = validateCreateCustomSlug(createCustomSlug);
      if (slugValidationError) {
        setCustomSlugError(slugValidationError);
        return;
      }
    }
    
    if (createUsePassword) {
      const passwordValidationError = validateCreatePassword(createPassword);
      if (passwordValidationError) {
        setPasswordError(passwordValidationError);
        return;
      }
    }

    let expirationValidationError = '';
    if (createUseExpiration) {
      expirationValidationError = validateCreateExpiration(createExpirationDate);
      if (expirationValidationError) {
        setPopupTitle('Data de expiração inválida');
        setPopupDescription(expirationValidationError);
        setShowPopup(true);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/short`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          original_url: createUrl,
          short_url: createUseCustomSlug ? createCustomSlug : undefined,
          password: createUsePassword ? createPassword : undefined,
          expires_at: createUseExpiration ? convertLocalDateTimeToUTC(createExpirationDate) : undefined,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        await fetchUserLinks(); // Refresh the links list
        closeModal();
        setPopupTitle('Link criado com sucesso!');
        setPopupDescription(`Seu link: ${baseUrl.replace('https://', '')}/${data.short_url}`);
        setShowPopup(true);
      } else {
        if (data.detail === 'Invalid short URL') {
          setCustomSlugError('Use de 3 a 16 caracteres, apenas letras, números e hífens');
        } else if (data.detail === 'Short URL already exists') {
          setCustomSlugError('Este link já está em uso. Escolha outro');
        } else if (data.detail === 'Expiration date must be at least 5 minutes in the future') {
          setPopupTitle('Data de expiração inválida');
          setPopupDescription('A data de expiração deve ser no mínimo 5 minutos no futuro.');
          setShowPopup(true);
        } else if (data.detail === 'Invalid expiration date') {
          setPopupTitle('Data de expiração inválida');
          setPopupDescription('A data de expiração não é válida.');
          setShowPopup(true);
        } else {
          setPopupTitle('Erro ao criar link');
          setPopupDescription(data.detail || 'Não foi possível criar o link. Tente novamente.');
          setShowPopup(true);
        }
      }
    } catch (error) {
      setPopupTitle('Erro ao criar link');
      setPopupDescription('Ocorreu um erro inesperado. Tente novamente.');
      setShowPopup(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setModalType('create');
    resetCreateFormStates();
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
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
    setNewLinkPassword('');
    setLinkPasswordError('');
    setShowLinkPassword(false);
    setNewLinkExpiration('');
    setLinkExpirationError('');
    resetFormStates();
    resetCreateFormStates();
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

  const resetCreateFormStates = () => {
    setCreateUrl('');
    setCreateUseCustomSlug(false);
    setCreateCustomSlug('');
    setCreateUsePassword(false);
    setCreatePassword('');
    setCreateUseExpiration(false);
    setCreateExpirationDate('');
    setUrlError('');
    setCustomSlugError('');
    setPasswordError('');
    setShowPassword(false);
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
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                  Editar nome de usuário
                </button>
                <button
                  onClick={() => openModal('email')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                  Editar e-mail
                </button>
                <button
                  onClick={() => openModal('password')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105 active:scale-95"
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
              <button
                onClick={openCreateModal}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                CRIAR LINK
              </button>
            </div>
            
            {/* Mobile View */}
            <div className="block sm:hidden">
              {links.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Você ainda não criou nenhum link encurtado.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {links.map((link, index) => (
                    <div key={link.id} className={`p-5 space-y-4 ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-25 dark:bg-gray-825'}`}>
                      {/* Header with URL and Password Badge */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">URL Original:</p>
                            <div className="text-sm text-gray-900 dark:text-white font-medium leading-relaxed">
                              {link.original_url.length > 45 ? `${link.original_url.substring(0, 45)}...` : link.original_url}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            {link.has_password && (
                              <button
                                onClick={() => openPasswordInfoModal(link)}
                                className="flex-shrink-0 p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10 rounded-lg transition-all duration-200 hover:scale-110"
                                title="Link protegido por senha - Clique para gerenciar"
                              >
                                <Lock className="w-4 h-4" />
                              </button>
                            )}
                            {link.expires_at && (
                              <button
                                onClick={() => openExpirationInfoModal(link)}
                                className="flex-shrink-0 p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10 rounded-lg transition-all duration-200 hover:scale-110"
                                title={`Link expira em ${formatExpirationDate(link.expires_at).date} às ${formatExpirationDate(link.expires_at).time} - Clique para gerenciar`}
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Short URL */}
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Link Encurtado:</p>
                        <a
                          href={`${baseUrl}/${link.short_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                        >
                          {baseUrl.replace('https://', '')}/{link.short_url}
                        </a>
                      </div>

                      {/* Stats Row */}
                      <div className="flex justify-between items-center">
                        <div className="flex space-x-6">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Cliques:</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                              {link.clicks.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Criado:</p>
                            <p className="text-sm text-gray-900 dark:text-white font-medium">
                              {formatLocalDate(link.created_at).date}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {formatLocalDate(link.created_at).time}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-1">
                          <button
                            onClick={() => navigator.clipboard.writeText(`${baseUrl}/${link.short_url}`)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-md transition-all duration-200 hover:scale-110"
                            title="Copiar link"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openEditModal(link)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-md transition-all duration-200 hover:scale-110"
                            title="Editar link"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(link)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-all duration-200 hover:scale-110"
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
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed min-w-[800px]">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                    <tr>
                      <th scope="col" className="px-4 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-2/5">
                        URL Original
                      </th>
                      <th scope="col" className="px-4 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-1/5">
                        Link Encurtado
                      </th>
                      <th scope="col" className="px-4 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-1/6">
                        Cliques
                      </th>
                      <th scope="col" className="px-4 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-1/6">
                        Criado
                      </th>
                      <th scope="col" className="px-4 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-1/6">
                        Ações
                      </th>
                    </tr>
                  </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                  {links.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Você ainda não criou nenhum link encurtado.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    links.map((link, index) => (
                                            <tr key={link.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-25 dark:bg-gray-825'}`}>
                        <td className="px-4 py-4">
                          <div className="group relative">
                            <div className="flex items-center space-x-2">
                              {link.has_password && (
                                <button
                                  onClick={() => openPasswordInfoModal(link)}
                                  className="flex-shrink-0 p-1 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10 rounded transition-all duration-200 hover:scale-110"
                                  title="Link protegido por senha - Clique para gerenciar"
                                >
                                  <Lock className="w-4 h-4" />
                                </button>
                              )}
                              {link.expires_at && (
                                <button
                                  onClick={() => openExpirationInfoModal(link)}
                                  className="flex-shrink-0 p-1 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10 rounded transition-all duration-200 hover:scale-110"
                                  title={`Link expira em ${formatExpirationDate(link.expires_at).date} às ${formatExpirationDate(link.expires_at).time} - Clique para gerenciar`}
                                >
                                  <Clock className="w-4 h-4" />
                                </button>
                              )}
                              <div
                                className="truncate cursor-help text-sm text-gray-900 dark:text-white font-medium flex-1"
                                title="Clique para ver URL completa"
                              >
                                {link.original_url}
                              </div>
                            </div>
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-20 bg-gray-900 dark:bg-gray-700 text-white p-3 rounded-lg shadow-xl text-xs max-w-sm break-all border border-gray-700 opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <div className="font-medium mb-1">URL Original:</div>
                              <div className="text-gray-200">{link.original_url}</div>
                              <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <a
                            href={`${baseUrl}/${link.short_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm truncate"
                            title={`${baseUrl.replace('https://', '')}/${link.short_url}`}
                          >
                            {link.short_url}
                          </a>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            {link.clicks.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                            {formatLocalDate(link.created_at).date}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {formatLocalDate(link.created_at).time}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-center space-x-1">
                            <button
                              onClick={() => navigator.clipboard.writeText(`${baseUrl}/${link.short_url}`)}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-md transition-all duration-200 hover:scale-110"
                              title="Copiar link"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                            </button>
                            <button
                              onClick={() => openEditModal(link)}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-md transition-all duration-200 hover:scale-110"
                              title="Editar link"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(link)}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-all duration-200 hover:scale-110"
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
                        {modalType === 'create' && 'Criar Novo Link'}
                        {modalType === 'password-info' && 'Link Protegido por Senha'}
                        {modalType === 'expiration-info' && 'Gerenciar Data de Expiração'}
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

                    {modalType === 'create' && (
                      <form onSubmit={handleCreateLink} className="space-y-6">
                        <div>
                          <label htmlFor="create-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Link original <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="url"
                            id="create-url"
                            value={createUrl}
                            onChange={(e) => {
                              setCreateUrl(e.target.value);
                              if (urlError) setUrlError('');
                            }}
                            className={`block w-full px-3 py-3 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm ${
                              urlError 
                                ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500' 
                                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
                            } dark:bg-gray-700 dark:text-white`}
                            placeholder="https://exemplo.com/meu-link-muito-longo"
                            required
                          />
                          {urlError && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{urlError}</p>
                          )}
                        </div>

                        <div className="flex items-center">
                          <input
                            id="use-custom-slug"
                            name="use-custom-slug"
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                            checked={createUseCustomSlug}
                            onChange={() => {
                              setCreateUseCustomSlug(!createUseCustomSlug);
                              if (!createUseCustomSlug) {
                                setCreateCustomSlug('');
                                setCustomSlugError('');
                              }
                            }}
                          />
                          <label htmlFor="use-custom-slug" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                            Personalizar link encurtado
                          </label>
                        </div>

                        {createUseCustomSlug && (
                          <div className="animate-fadeIn">
                            <label htmlFor="create-custom-slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Link personalizado <span className="text-red-500">*</span>
                            </label>
                            <div className="flex rounded-md shadow-sm">
                              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                                {baseUrl.replace('https://', '')}/
                              </span>
                              <input
                                type="text"
                                id="create-custom-slug"
                                maxLength={16}
                                value={createCustomSlug}
                                onChange={(e) => {
                                  setCreateCustomSlug(e.target.value);
                                  if (customSlugError) setCustomSlugError('');
                                }}
                                className={`flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border sm:text-sm transition-colors ${
                                  customSlugError 
                                    ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500' 
                                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
                                } dark:bg-gray-700 dark:text-white`}
                                placeholder="meu-link"
                              />
                            </div>
                            {customSlugError && (
                              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{customSlugError}</p>
                            )}
                            {!customSlugError && (
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Máximo de 16 caracteres. Apenas letras, números e hífens.
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex items-center">
                          <input
                            id="use-password"
                            name="use-password"
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                            checked={createUsePassword}
                            onChange={() => {
                              setCreateUsePassword(!createUsePassword);
                              if (!createUsePassword) {
                                setCreatePassword('');
                                setPasswordError('');
                              }
                            }}
                          />
                          <label htmlFor="use-password" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                            Proteger com senha
                          </label>
                        </div>

                        <div className="flex items-center">
                          <input
                            id="use-expiration"
                            name="use-expiration"
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                            checked={createUseExpiration}
                            onChange={() => {
                              setCreateUseExpiration(!createUseExpiration);
                              if (!createUseExpiration) {
                                setCreateExpirationDate('');
                              }
                            }}
                          />
                          <label htmlFor="use-expiration" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                            Adicionar data de expiração
                          </label>
                        </div>

                                                 {createUsePassword && (
                           <div className="animate-fadeIn">
                             <label htmlFor="create-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                               Senha <span className="text-red-500">*</span>
                             </label>
                             <div className="relative">
                               <input
                                 type={showPassword ? "text" : "password"}
                                 id="create-password"
                                 value={createPassword}
                                 onChange={(e) => {
                                   setCreatePassword(e.target.value);
                                   if (passwordError) setPasswordError('');
                                 }}
                                 className={`block w-full px-3 py-3 pr-10 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm ${
                                   passwordError 
                                     ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500' 
                                     : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
                                 } dark:bg-gray-700 dark:text-white`}
                                 placeholder="Digite uma senha segura"
                               />
                               <button
                                 type="button"
                                 onClick={() => setShowPassword(!showPassword)}
                                 className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                               >
                                 {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                               </button>
                             </div>
                             {passwordError && (
                               <p className="mt-1 text-xs text-red-600 dark:text-red-400">{passwordError}</p>
                             )}
                             {!passwordError && (
                               <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                 Mínimo de 3 caracteres. Será necessária para acessar o link.
                               </p>
                             )}
                           </div>
                         )}

                         {createUseExpiration && (
                           <div className="animate-fadeIn">
                             <label htmlFor="create-expiration-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                               Data e hora de expiração <span className="text-red-500">*</span>
                             </label>
                                                            <input
                                 type="datetime-local"
                                 id="create-expiration-date"
                                 value={createExpirationDate}
                                 min={getMinDateTime()}
                                 max={getMaxDateTime()}
                                                                onChange={(e) => {
                                 handleDateTimeChange(e.target.value, setCreateExpirationDate);
                               }}
                                 className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-500 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-75 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:hover:bg-blue-50 [&::-webkit-calendar-picker-indicator]:dark:hover:bg-blue-900/20 [&::-webkit-calendar-picker-indicator]:p-1.5 [&::-webkit-calendar-picker-indicator]:rounded [&::-webkit-calendar-picker-indicator]:transition-all [&::-webkit-calendar-picker-indicator]:duration-200 [&::-webkit-calendar-picker-indicator]:transform [&::-webkit-calendar-picker-indicator]:hover:scale-110"
                                 style={{
                                   colorScheme: document.documentElement.classList.contains('dark') ? 'dark' : 'light'
                                 }}
                               />
                             <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                               O link será automaticamente removido após esta data e hora.
                             </p>
                           </div>
                         )}

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
                            disabled={isSubmitting || !createUrl.trim() || (createUseCustomSlug && !createCustomSlug.trim()) || (createUsePassword && !createPassword.trim()) || (createUseExpiration && !createExpirationDate.trim())}
                            className="w-full sm:w-auto px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isSubmitting ? (
                              <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Criando...
                              </span>
                            ) : 'Criar Link'}
                          </button>
                        </div>
                      </form>
                    )}

                    {modalType === 'password-info' && selectedLink && (
                      <div className="space-y-6">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                            Gerenciar Proteção do Link
                          </h3>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                          <p className="text-sm font-medium text-gray-900 dark:text-white break-all mb-2">
                            {baseUrl.replace('https://', '')}/{selectedLink.short_url}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
                            → {selectedLink.original_url}
                          </p>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2 flex items-center">
                            <Lock className="w-4 h-4 mr-2" />
                            Status da Proteção
                          </h4>
                          <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                            <li>• Este link está protegido por senha</li>
                            <li>• A senha atual não pode ser visualizada por segurança</li>
                            <li>• Você pode definir uma nova senha abaixo</li>
                          </ul>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            Alterar Senha do Link
                          </h4>
                          
                          <div>
                            <label htmlFor="new-link-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Nova senha <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type={showLinkPassword ? "text" : "password"}
                                id="new-link-password"
                                value={newLinkPassword}
                                onChange={(e) => {
                                  setNewLinkPassword(e.target.value);
                                  if (linkPasswordError) setLinkPasswordError('');
                                }}
                                className={`block w-full px-3 py-3 pr-10 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm ${
                                  linkPasswordError 
                                    ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500' 
                                    : 'border-gray-300 dark:border-gray-600 focus:ring-amber-500 focus:border-amber-500'
                                } dark:bg-gray-700 dark:text-white`}
                                placeholder="Digite a nova senha..."
                                disabled={isSubmitting}
                              />
                              <button
                                type="button"
                                onClick={() => setShowLinkPassword(!showLinkPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                              >
                                {showLinkPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                            {linkPasswordError && (
                              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{linkPasswordError}</p>
                            )}
                            {!linkPasswordError && (
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Mínimo de 3 caracteres. A nova senha substituirá a atual.
                              </p>
                            )}
                          </div>
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
                            type="button"
                            onClick={handleUpdateLinkPassword}
                            disabled={isSubmitting || !newLinkPassword.trim()}
                            className="w-full sm:w-auto px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isSubmitting ? (
                              <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Atualizando...
                              </span>
                            ) : 'Alterar Senha'}
                          </button>
                        </div>
                      </div>
                    )}

                    {modalType === 'expiration-info' && selectedLink && (
                      <div className="space-y-6">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                            Gerenciar Data de Expiração
                          </h3>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                          <p className="text-sm font-medium text-gray-900 dark:text-white break-all mb-2">
                            {baseUrl.replace('https://', '')}/{selectedLink.short_url}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
                            → {selectedLink.original_url}
                          </p>
                        </div>

                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2 flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            Status da Expiração
                          </h4>
                          <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                            <li>• Este link possui data de expiração</li>
                            <li>• Data atual: {formatExpirationDate(selectedLink.expires_at || '').date} às {formatExpirationDate(selectedLink.expires_at || '').time}</li>
                            <li>• Você pode alterar a data ou remover a expiração</li>
                          </ul>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            Alterar Data de Expiração
                          </h4>
                          
                          <div>
                            <label htmlFor="new-link-expiration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Nova data e hora de expiração
                            </label>
                                                                                      <input
                               type="datetime-local"
                               id="new-link-expiration"
                               value={newLinkExpiration}
                               min={getMinDateTime()}
                               max={getMaxDateTime()}
                               onChange={(e) => {
                                 handleDateTimeChange(e.target.value, setNewLinkExpiration);
                                 if (linkExpirationError) setLinkExpirationError('');
                               }}
                               className={`block w-full px-3 py-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 sm:text-sm transition-all duration-200 ${
                                 linkExpirationError 
                                   ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500' 
                                   : 'border-gray-300 dark:border-gray-600 focus:ring-orange-500 focus:border-orange-500 hover:border-orange-400 dark:hover:border-orange-500'
                               } dark:bg-gray-700 dark:text-white [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-75 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:hover:bg-orange-50 [&::-webkit-calendar-picker-indicator]:dark:hover:bg-orange-900/20 [&::-webkit-calendar-picker-indicator]:p-1.5 [&::-webkit-calendar-picker-indicator]:rounded [&::-webkit-calendar-picker-indicator]:transition-all [&::-webkit-calendar-picker-indicator]:duration-200 [&::-webkit-calendar-picker-indicator]:transform [&::-webkit-calendar-picker-indicator]:hover:scale-110`}
                               style={{
                                 colorScheme: document.documentElement.classList.contains('dark') ? 'dark' : 'light'
                               }}
                               disabled={isSubmitting}
                             />
                            {linkExpirationError && (
                              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{linkExpirationError}</p>
                            )}
                                                         {!linkExpirationError && (
                               <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                 Deixe vazio para remover a expiração ou defina uma nova data no futuro.
                               </p>
                             )}
                          </div>
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
                            type="button"
                            onClick={handleRemoveLinkExpiration}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[150px]"
                          >
                            {isSubmitting ? (
                              <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Removendo...
                              </span>
                            ) : 'Remover Expiração'}
                          </button>
                          <button
                            type="button"
                            onClick={handleUpdateLinkExpiration}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[150px]"
                          >
                            {isSubmitting ? (
                              <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Atualizando...
                              </span>
                            ) : 'Salvar Alterações'}
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