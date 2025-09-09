interface AuthInputProps {
    type: string;
    id: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    icon: string;
    required?: boolean;
}

export function AuthInput({ type, id, placeholder, value, onChange, icon, required }: AuthInputProps) {
    return (
        <div className="input-with-icon">
            <i className={`fas fa-${icon}`}></i>
            <input
                type={type}
                id={id}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required={required}
            />
        </div>
    );
}