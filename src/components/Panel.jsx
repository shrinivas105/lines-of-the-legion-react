// components/Panel.jsx — the signature visual element of the app.
// An "inscription tablet": a carved-stone panel with a bronze hairline border
// and a subtle inset shadow, as if text were cut into marble and rubbed with bronze.
import './Panel.css';

export function Panel({ children, className = '', as: Tag = 'div', ...rest }) {
  return (
    <Tag className={`panel ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export default Panel;
