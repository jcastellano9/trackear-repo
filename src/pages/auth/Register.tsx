// Formulario de registro de usuario

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { UserPlus, Eye } from 'lucide-react';

const Register: React.FC = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  // Estados del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const _value = e.target.value;
    setPassword(_value);
  };

  // Maneja envío de registro
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError('Por favor complete todos los campos');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    // Removed password strength check as strength display is removed

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await signUp(email, password);
      setSuccess('¡Registro exitoso! Por favor, confirmá tu correo electrónico desde el mail que te enviamos para poder iniciar sesión.');
      setLoading(false);
      setTimeout(() => {
        navigate('/login?verify=1');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  // Render del formulario de registro
  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-4">
      <motion.div
        className="w-full max-w-md transition-colors duration-300 border border-gray-300 rounded-xl bg-white p-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-black dark:text-white">
              TrackeAr
            </h1>
            <p className="text-gray-800 dark:text-gray-300 mt-2">Crear cuenta nueva</p>
          </div>

          {success && (
            <p className="mb-4 text-sm text-black dark:text-white">{success}</p>
          )}
          {error && (
            <p className="mb-4 text-sm text-black dark:text-white">{error}</p>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-black dark:text-white mb-1 rounded-none">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-black bg-white dark:bg-black dark:text-white dark:border-white rounded-none placeholder:text-gray-400"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-black dark:text-white mb-1 rounded-none">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2 border border-black bg-white dark:bg-black dark:text-white rounded-none pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black dark:text-white"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-black dark:text-white mb-1 rounded-none">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-2 border border-black bg-white dark:bg-black dark:text-white rounded-none pr-12 ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-black bg-white dark:border-white dark:bg-black'
                        : ''
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black dark:text-white"
                  >
                    <Eye size={18} />
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-xs text-black dark:text-white">Las contraseñas no coinciden</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-black text-white text-sm font-medium rounded-none hover:bg-gray-900 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="animate-spin rounded-none h-5 w-5 border-t-2 border-white"></span>
                ) : (
                  <>
                    <UserPlus size={18} className="mr-2" />
                    Crear cuenta
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-black dark:text-white text-sm leading-relaxed">
              ¿Ya tienes una cuenta?{' '}
              <Link
                to="/login"
                className="text-black hover:text-gray-700 font-medium rounded-none"
              >
                Iniciar sesión
              </Link>
            </p>
          </div>
      </motion.div>
    </div>
  );
};

export default Register;
