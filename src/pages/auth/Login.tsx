// Formulario de inicio de sesión

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {LogIn, EyeOff, Eye} from 'lucide-react';

const Login: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  // Estados principales del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Maneja el envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Por favor complete todos los campos');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        setError('Correo o contraseña incorrectos.');
        return;
      }

      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  // Render del formulario
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md transition-colors duration-300">
        <div className="bg-white rounded-2xl p-8 ring-1 ring-gray-200">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-black">
              TrackeAr
            </h1>
            <p className="text-gray-700 text-sm leading-relaxed mt-2">Plataforma de gestión de inversiones</p>
          </div>

          {error && (
            <p className="text-red-600 text-sm text-center mb-4">{error}</p>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-black mb-1">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 transition-colors dark:bg-black dark:border-gray-700 dark:text-white dark:placeholder-gray-400 transition-all duration-200 ease-in-out"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div className="relative">
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-black">
                    Contraseña
                  </label>
                  <Link
                    to="/reset-password"
                    className="text-black hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 transition-colors pr-12 dark:bg-black dark:border-gray-700 dark:text-white dark:placeholder-gray-400 transition-all duration-200 ease-in-out"
                  placeholder="••••••••"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 rounded-none bg-black text-white hover:bg-gray-800 font-medium transition-colors duration-200"
              >
                {loading ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></span>
                ) : (
                  <>
                    <LogIn size={18} className="mr-2" />
                    Iniciar sesión
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-700 text-sm leading-relaxed">
              ¿No tienes una cuenta?{' '}
              <Link
                to="/register"
                className="text-black hover:underline font-medium"
              >
                Regístrate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
