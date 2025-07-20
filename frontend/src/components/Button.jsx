import React from 'react';
import { FiLoader } from 'react-icons/fi';

const Button = ({ 
  children, 
  onClick, 
  loading = false, 
  disabled = false, 
  variant = 'primary', 
  size = 'md',
  className = '',
  type = 'button',
  icon: Icon,
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95';
  
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-sm hover:shadow-lg hover:shadow-primary-200',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 shadow-sm hover:shadow-lg',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500 shadow-sm hover:shadow-lg',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow-lg hover:shadow-red-200',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm hover:shadow-lg hover:shadow-green-200'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  };

  const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
      {...props}
    >
      {loading && (
        <FiLoader className="w-4 h-4 mr-2 animate-spin" />
      )}
      {Icon && !loading && (
        <Icon className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" />
      )}
      {children}
    </button>
  );
};

export default Button; 