import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
      <footer className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <div className="container mx-auto">
          © {new Date().getFullYear()} Encurtador de Links. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default Layout;