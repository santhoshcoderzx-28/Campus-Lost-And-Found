import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// One password field with a show/hide control, used by Login, Register and Profile
export default function PasswordInput({
  id, label, value, onChange, autoComplete, hint, placeholder,
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-wrap">
        <input
          id={id}
          className="input"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          title={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}
