import React from 'react';

interface PopupProps {
  title: string;
  description?: string;
  onClose: () => void;
}

const Popup: React.FC<PopupProps> = ({ title, description, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full mx-4 text-center transform transition-all duration-300 animate-slideUp">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h2>
        {description && (
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 break-words">
            {description}
          </p>
        )}
        <button
          onClick={onClose}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded transition-all duration-200 hover:scale-105 active:scale-95"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};

export default Popup;
