interface ButtonProps {
    type: 'button' | 'submit' | 'reset';
    className?: string;
    disabled?: boolean;
    children: React.ReactNode;
    onClick?: () => void;
}

export function Button({ type, className, disabled, children, onClick }: ButtonProps) {
    return (
        <button
            type={type}
            className={`login-button ${className || ''}`}
            disabled={disabled}
            onClick={onClick}
        >
            {children}
        </button>
    );
}