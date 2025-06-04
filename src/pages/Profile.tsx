// Sección para editar datos del perfil de usuario

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
// Eliminado motion y lucide-react: sin íconos ni animaciones

// Profile: Componente para gestionar datos de usuario y seguridad
const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const changePasswordButtonRef = useRef<HTMLButtonElement>(null);

  // validatePasswordChange: Verifica campos y coincidencia de nuevas contraseñas
  const validatePasswordChange = () => {
    if (!currentPassword || !newPassword || !confirmPassword) return 'Por favor complete todos los campos';
    if (newPassword !== confirmPassword) return 'Las contraseñas nuevas no coinciden';
    if (newPassword.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    return null;
  };

  // useState: estados para control de cambio de contraseña, campos y mensajes
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingChange, setLoadingChange] = useState(false);
  // Password visibility and validation states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  // Password validation and strength logic
  // validatePassword: Actualiza validación de criterios de seguridad de la nueva contraseña
  const validatePassword = (value: string) => {
    setPasswordValidation({
      length: value.length >= 6,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /[0-9]/.test(value),
      special: /[^A-Za-z0-9]/.test(value)
    });
  };

  // passwordStrength: Calcula nivel de fortaleza de la contraseña según criterios
  const passwordStrength = Object.values(passwordValidation).filter(Boolean).length;


  // useEffect: Enfoca el campo o botón según si se está cambiando contraseña
  useEffect(() => {
    if (isChangingPassword) {
      currentPasswordRef.current?.focus();
    } else {
      changePasswordButtonRef.current?.focus();
    }
  }, [isChangingPassword]);

  // handlePasswordChange: Envía formulario para cambiar contraseña usando Supabase
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    const errorMessage = validatePasswordChange();
    if (errorMessage) {
      setError(errorMessage);
      return;
    }
    setLoadingChange(true);

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user?.email!,
        password: currentPassword,
      });

      if (authError) {
        setError('La contraseña actual es incorrecta');
        setLoadingChange(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

      if (updateError) {
        throw new Error(updateError.message || 'Error desconocido al actualizar la contraseña');
      }

      setSuccess('Contraseña actualizada exitosamente');
      setTimeout(() => {
        window.location.href = '/profile';
      }, 3000);
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al cambiar la contraseña. Por favor intente nuevamente.');
    } finally {
      setLoadingChange(false);
    }
  };

  // handleLogout: Cierra sesión del usuario
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Render: Interfaz de perfil con sección de información, acciones y modal de cambio de contraseña
  return (
    <div className="space-y-6">
      {/* Encabezado: Título e introducción del perfil de usuario */}
      <div>
        <h1 className="text-2xl font-bold text-black">Mi Perfil</h1>
        <p className="text-gray-700">Gestiona tu información personal y seguridad</p>
      </div>

      {/* Contenedor principal: Información de cuenta, foto y acciones rápidas */}
      <div className="space-y-6 lg:space-y-0 lg:flex lg:space-x-6">
        {/* Sección: Información de la Cuenta (correo y fecha de registro) */}
        <div className="lg:w-1/3">
          <div className="bg-white rounded-none border border-gray-100 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-black">Información de la Cuenta</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">
                  Correo electrónico
                </label>
                <p className="mt-1 text-black">{user?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">
                  Fecha de registro
                </label>
                <p className="mt-1 text-black">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Sección: Foto de perfil generada a partir del email */}
        <div className="lg:w-1/3">
          <div className="bg-white rounded-none border border-gray-100 p-6 text-center">
            <div className="flex flex-col items-center">
              <img
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.email || 'User'}`}
                alt="Foto de perfil"
                className="w-24 h-24 rounded-full border border-gray-200 mb-3"
              />
              <h2 className="text-lg font-semibold text-black">{user?.email}</h2>
              <p className="text-sm text-gray-500">Usuario registrado</p>
            </div>
          </div>
        </div>
        {/* Sección: Acciones Rápidas (botones para cambiar contraseña y cerrar sesión) */}
        <div className="lg:w-1/3">
          <div className="bg-white rounded-none border border-gray-100 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-black">Acciones Rápidas</h2>
            </div>
            <div className="space-y-3">
              <button
                ref={changePasswordButtonRef}
                onClick={() => setIsChangingPassword(true)}
                className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 text-black rounded-none transition focus:outline-none focus:ring-0"
              >
                Cambiar contraseña
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-black rounded-none transition focus:outline-none focus:ring-0"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Formulario para cambiar contraseña */}
      {isChangingPassword && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-password-title"
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
        >
          <div className="bg-white rounded-none p-6 max-w-md w-full border border-gray-100">
            {/* Título del modal: "Cambiar Contraseña" */}
            <h3 id="change-password-title" className="text-xl font-semibold text-black mb-4">Cambiar Contraseña</h3>

            {/* Mensajes de validación: Muestra errores o confirmación de éxito */}
            {error && (
              <div className="mb-4 p-3 bg-gray-100 rounded-none text-gray-700">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-gray-100 rounded-none text-gray-700">
                {success}
              </div>
            )}

            {/* Formulario: Campos para contraseña actual, nueva y confirmación */}
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {/* Campo: Contraseña actual */}
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña actual
                </label>
                <input
                  ref={currentPasswordRef}
                  type={showCurrentPassword ? "text" : "password"}
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); if (error) setError(null); }}
                  className="w-full px-3 py-2 border border-gray-300 text-black focus:outline-none focus:ring-0 focus:border-black"
                />
                <div className="flex items-center mt-1">
                  <input
                    type="checkbox"
                    id="showCurrentPassword"
                    checked={showCurrentPassword}
                    onChange={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="mr-2"
                  />
                  <label htmlFor="showCurrentPassword" className="text-xs text-gray-600">Mostrar contraseña</label>
                </div>
              </div>

              {/* Campo: Nueva contraseña con indicador de fortaleza y validación */}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva contraseña
                </label>
                <input
                  type={showNewPassword ? "text" : "password"}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    validatePassword(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 text-black focus:outline-none focus:ring-0 focus:border-black"
                />
                <div className="flex items-center mt-1">
                  <input
                    type="checkbox"
                    id="showNewPassword"
                    checked={showNewPassword}
                    onChange={() => setShowNewPassword(!showNewPassword)}
                    className="mr-2"
                  />
                  <label htmlFor="showNewPassword" className="text-xs text-gray-600">Mostrar contraseña</label>
                </div>
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((_, i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${passwordStrength > i ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                      ))}
                    </div>
                    <div className="text-xs space-y-1 mt-2">
                      <div className="flex items-center">
                        <span className={`mr-1 ${passwordValidation.length ? 'text-gray-700' : 'text-gray-400'}`}>
                          {passwordValidation.length ? '✓' : '•'}
                        </span>
                        <span className={passwordValidation.length ? 'text-gray-700' : 'text-gray-400'}>Mínimo 6 caracteres</span>
                      </div>
                      <div className="flex items-center">
                        <span className={`mr-1 ${passwordValidation.uppercase ? 'text-gray-700' : 'text-gray-400'}`}>
                          {passwordValidation.uppercase ? '✓' : '•'}
                        </span>
                        <span className={passwordValidation.uppercase ? 'text-gray-700' : 'text-gray-400'}>Al menos una mayúscula</span>
                      </div>
                      <div className="flex items-center">
                        <span className={`mr-1 ${passwordValidation.number ? 'text-gray-700' : 'text-gray-400'}`}>
                          {passwordValidation.number ? '✓' : '•'}
                        </span>
                        <span className={passwordValidation.number ? 'text-gray-700' : 'text-gray-400'}>Al menos un número</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Campo: Confirmación de la nueva contraseña */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar nueva contraseña
                </label>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError(null); }}
                  className="w-full px-3 py-2 border border-gray-300 text-black focus:outline-none focus:ring-0 focus:border-black"
                />
                <div className="flex items-center mt-1">
                  <input
                    type="checkbox"
                    id="showConfirmPassword"
                    checked={showConfirmPassword}
                    onChange={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="mr-2"
                  />
                  <label htmlFor="showConfirmPassword" className="text-xs text-gray-600">Mostrar contraseña</label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(false)}
                  className="px-4 py-2 bg-gray-100 text-black hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingChange || !passwordStrength || newPassword !== confirmPassword}
                  className={
                    loadingChange || !passwordStrength || newPassword !== confirmPassword
                      ? "px-4 py-2 bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "px-4 py-2 bg-black text-white hover:bg-gray-900"
                  }
                >
                  {loadingChange ? (
                    <span className="inline-block h-5 w-5 border-t-2 border-gray-300 rounded-full animate-spin" />
                  ) : (
                    'Actualizar contraseña'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
