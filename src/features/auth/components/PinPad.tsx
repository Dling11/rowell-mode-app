"use client";
import { Delete } from "lucide-react";
import styles from "./PinPad.module.css";
export function PinPad({
  value,
  onChange,
  disabled = false,
  label = "Owner PIN",
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <div className={styles.pad}>
      <label className="field">
        {label}
        <input
          type="password"
          name="pin"
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={64}
          required
          value={value}
          disabled={disabled}
          onChange={(event) =>
            onChange(event.target.value.replace(/\D/g, "").slice(0, 64))
          }
          className={styles.input}
        />
      </label>
      <div className={styles.keys} role="group" aria-label="PIN keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={disabled || value.length >= 64}
            onClick={() => onChange(value + digit)}
            aria-label={`Digit ${digit}`}
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          className={styles.utility}
          disabled={disabled || !value}
          onClick={() => onChange("")}
          aria-label="Clear PIN"
        >
          Clear
        </button>
        <button
          type="button"
          disabled={disabled || value.length >= 64}
          onClick={() => onChange(value + "0")}
          aria-label="Digit 0"
        >
          0
        </button>
        <button
          type="button"
          className={styles.utility}
          disabled={disabled || !value}
          onClick={() => onChange(value.slice(0, -1))}
          aria-label="Delete last digit"
        >
          <Delete size={20} />
        </button>
      </div>
    </div>
  );
}
