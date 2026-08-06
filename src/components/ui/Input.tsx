import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className={`input-group ${className}`}>
      <label htmlFor={inputId} className="input-label">
        {label}
      </label>
      <input
        id={inputId}
        className="input-field"
        {...props}
      />
    </div>
  );
}
