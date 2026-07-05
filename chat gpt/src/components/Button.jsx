// components/Button.jsx — shared button primitive, three visual weights.
import './Button.css';

export function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'silver' | 'ghost' | 'danger'
  size = 'md',          // 'sm' | 'md' | 'lg'
  disabled = false,
  className = '',
  ...rest
}) {
  return (
    <button
      className={`btn btn--${variant} btn--${size} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}

export default Button;
