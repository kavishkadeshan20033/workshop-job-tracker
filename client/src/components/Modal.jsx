import { useEffect } from 'react';
import { HiX } from 'react-icons/hi';

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md', className = '' }) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeClass = (size === 'large' || size === 'lg') 
        ? 'modal-lg' 
        : size === 'xl' 
        ? 'modal-xl' 
        : size === 'sm' 
        ? 'modal-sm' 
        : '';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className={`modal-content ${sizeClass} ${className}`.trim()} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Close modal">
                        <HiX />
                    </button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    );
}
