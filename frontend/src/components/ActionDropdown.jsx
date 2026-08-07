import { useState, useRef, useEffect } from 'react';

export default function ActionDropdown({ children, className = '' }) {
  const [placement, setPlacement] = useState('bottom');
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  const updatePlacement = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow < 210 && spaceAbove > spaceBelow) {
      setPlacement('top');
    } else {
      setPlacement('bottom');
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleClick = (e) => {
    updatePlacement();
    if (e.target.closest('.actions-dots')) {
      e.stopPropagation();
      setIsOpen(prev => !prev);
    } else if (e.target.closest('.actions-dropdown-menu button')) {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={ref}
      className={`actions-dropdown ${placement === 'top' ? 'drop-up' : 'drop-down'} ${isOpen ? 'is-open' : ''} ${className}`}
      onMouseEnter={updatePlacement}
      onTouchStart={updatePlacement}
      onFocus={updatePlacement}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}
