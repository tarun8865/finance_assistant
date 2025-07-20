import React from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi';

const Message = ({ 
  type = 'info', 
  title, 
  message, 
  onClose, 
  className = '',
  show = true 
}) => {
  if (!show) return null;

  const messageStyles = {
    success: {
      container: 'bg-green-50 border-green-200 text-green-800 hover:shadow-lg',
      icon: 'text-green-600',
      iconComponent: FiCheckCircle
    },
    error: {
      container: 'bg-red-50 border-red-200 text-red-800 hover:shadow-lg',
      icon: 'text-red-600',
      iconComponent: FiAlertCircle
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-800 hover:shadow-lg',
      icon: 'text-yellow-600',
      iconComponent: FiAlertCircle
    },
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-800 hover:shadow-lg',
      icon: 'text-blue-600',
      iconComponent: FiInfo
    }
  };

  const style = messageStyles[type];
  const IconComponent = style.iconComponent;

  return (
    <div className={`border rounded-lg p-4 ${style.container} ${className} transition-all duration-300 hover:scale-105`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <IconComponent className={`w-5 h-5 ${style.icon} animate-pulse-slow`} />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium mb-1 animate-slide-right">
              {title}
            </h3>
          )}
          {message && (
            <p className="text-sm animate-slide-right" style={{ animationDelay: '0.1s' }}>
              {message}
            </p>
          )}
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              onClick={onClose}
              className="inline-flex text-gray-400 hover:text-gray-600 hover:scale-110 transition-all duration-200 p-1 rounded-full hover:bg-gray-100"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Message; 