// components/Button.jsx — shared button primitive, three visual weights.
import './Button.css';

export function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'gold' | 'silver' | 'bronze' | 'ghost' | 'danger'
  size = 'md',          // 'sm' | 'md' | 'lg'
  disabled = false,
  className = '',
  ...rest
}) {
  const variantClass = {
    primary: 'btn--primary',
    secondary: 'btn--primary',
    gold: 'btn--primary',
    silver: 'btn--silver',
    bronze: 'btn--bronze',
    ghost: 'btn--ghost',
    danger: 'btn--danger',
  }[variant] || 'btn--primary';

  return (
    <button
      className={`btn ${variantClass} btn--${size} ${className}`.trim()}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}

export default Button;
