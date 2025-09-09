interface InputProps {
    type: string;
    id: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
}

export function Input({ type, id, placeholder, value, onChange, required }: InputProps) {
    return (
        <input
            type={type}
            id={id}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
            className="input-with-icon-input"
        />
    );
}