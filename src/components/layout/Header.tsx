/* Encabezado con navegación y cambio de tema */

import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { motion } from 'framer-motion';

const Header: React.FC = () => {
  const { signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // useEffect: detecta scroll para cambiar estilos del header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // navItems: rutas, etiquetas e íconos para la navegación
  const navItems = [
    { path: '/', label: 'Inicio', icon: '🏠' },
    { path: '/portfolio', label: 'Portfolio', icon: '💼' },
    { path: '/analysis', label: 'Análisis', icon: '📊' },
    { path: '/simulator', label: 'Simulador', icon: '🧮' },
    { path: '/profile', label: 'Perfil', icon: '👤' },
  ];

  // handleLogout: cierra sesión y redirige al login
  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // toggleMenu: abre o cierra el menú móvil
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Encabezado animado sticky en la parte superior
  return (
    <motion.header
      className={`sticky top-0 z-50 backdrop-blur-md transition-all duration-300 transition-colors ${
        scrolled 
          ? 'bg-white/80 dark:bg-gray-900/80 shadow-lg' 
          : 'bg-transparent'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <NavLink to="/" role="heading" aria-level={1}>
              <h1 className="text-2xl font-semibold text-black dark:text-white">
                TrackeAr
              </h1>
            </NavLink>
          </div>

          {/* Navegación de escritorio: enlaces a secciones y botones de tema y logout */}
          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 transition-all duration-200 ${
                    isActive 
                      ? 'bg-black text-white font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`
                }
              >
                {item.icon} {item.label}
              </NavLink>
            ))}
            <button
              onClick={toggleTheme}
              className="ml-2 p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? '🌞' : '🌚'}
            </button>
            <button
              onClick={handleLogout}
              className="ml-2 px-4 py-2 text-gray-700 dark:text-gray-300 transition-colors duration-200 flex items-center bg-transparent hover:bg-transparent"
            >
              ⏏️ Salir
            </button>
          </nav>

          {/* Botones para mobile: alternar tema y abrir/cerrar menú */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? '🌞' : '🌚'}
            </button>
            <button
              onClick={toggleMenu}
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {isMenuOpen ? '✖️' : '☰'}
            </button>
          </div>
        </div>
      </div>

      {/* Navegación móvil desplegable: enlaces y botón de logout */}
      {isMenuOpen && (
        <motion.div
          className="md:hidden bg-white dark:bg-gray-900 shadow-lg rounded-b-lg"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 transition-all duration-200 ${
                    isActive 
                      ? 'bg-black text-white font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`
                }
              >
                {item.icon} {item.label}
              </NavLink>
            ))}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                handleLogout();
              }}
              className="w-full mt-2 px-4 py-2 text-gray-700 dark:text-gray-300 transition-colors duration-200 flex items-center justify-center bg-transparent hover:bg-transparent"
            >
              ⏏️ Salir
            </button>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
};

export default Header;
