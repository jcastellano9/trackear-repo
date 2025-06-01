
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import { motion } from 'framer-motion';

const Layout: React.FC = () => {
  return (
    <motion.div
      className="min-h-screen bg-white dark:bg-black text-black dark:text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Header />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </motion.div>
  );
};

export default Layout;
