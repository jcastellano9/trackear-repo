// Formulario de recuperación de contraseña

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';

const ResetPassword: React.FC = () => {
  const { resetPassword } = useAuth();
  // Estados del formulario
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Maneja envío de recuperación
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor ingrese su dirección de correo electrónico');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { error: resetError } = await resetPassword(email);
      if (resetError) {
        setError(resetError.message || 'Error al enviar el correo de recuperación');
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el correo de recuperación');
    } finally {
      setLoading(false);
    }
  };

  // Render del formulario
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center px-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-black dark:text-white">
              TrackeAr
            </h1>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mt-2">Recuperar contraseña</p>
          </div>

          {error && (
            <div className="mb-4 p-3 border border-red-400 text-red-700 bg-red-100 text-sm">
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center">
              <div className="mb-4 text-green-700 text-base font-semibold">
                Se ha enviado un enlace de recuperación a su correo electrónico.
              </div>
              <p className="text-gray-700 text-sm mb-6">
                Revise su bandeja de entrada y siga las instrucciones para restablecer su contraseña.
              </p>
              <Link
                to="/login"
                className="inline-block w-full text-center py-2.5 px-6 bg-black hover:bg-neutral-800 text-white rounded-none font-medium transition-all duration-200"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Correo electrónico
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-400 transition-all duration-200 ease-in-out"
                      placeholder="correo@ejemplo.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full flex justify-center items-center py-2.5 px-4 border border-black text-white ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-black hover:bg-neutral-800'
                    } font-medium transition-all duration-200`}
                  >
                    Enviar enlace de recuperación
                  </button>
                </div>
              </form>
              <Link
                to="/login"
                className="block mt-6 text-center text-black font-medium hover:underline"
              >
                Volver al inicio
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
