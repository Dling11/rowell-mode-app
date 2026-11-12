"use client";
import { useEffect, useRef, type KeyboardEvent } from "react";
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
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // Desktop users can type as soon as they select PIN, without opening a
    // software keyboard over the keypad on a touch-only phone.
    if (!disabled && window.matchMedia("(pointer: fine)").matches)
      input.current?.focus({ preventScroll: true });
  }, [disabled]);
  function change(next: string) {
    onChange(next);
    if (window.matchMedia("(pointer: fine)").matches)
      input.current?.focus({ preventScroll: true });
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (
      disabled ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      event.nativeEvent.isComposing
    )
      return;
    const numpad = /^Numpad(\d)$/.exec(event.code);
    if (numpad) {
      event.preventDefault();
      const field = input.current;
      const start =
        event.target === field
          ? (field?.selectionStart ?? value.length)
          : value.length;
      const end =
        event.target === field ? (field?.selectionEnd ?? start) : start;
      const next = value.slice(0, start) + numpad[1] + value.slice(end);
      if (next.length <= 64) change(next);
      return;
    }
    // Native input editing handles typing, selection and Backspace. This
    // fallback also lets a focused on-screen keypad key accept physical keys.
    if (event.target === input.current) return;
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      if (value.length < 64) change(value + event.key);
    } else if (event.key === "Backspace") {
      event.preventDefault();
      change(value.slice(0, -1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (value) input.current?.form?.requestSubmit();
    }
  }
  return (
    <div className={styles.pad} onKeyDown={keyboard}>
      <label className="field">
        {label}
        <input
          ref={input}
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
            onClick={() => change(value + digit)}
            aria-label={`Digit ${digit}`}
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          className={styles.utility}
          disabled={disabled || !value}
          onClick={() => change("")}
          aria-label="Clear PIN"
        >
          Clear
        </button>
        <button
          type="button"
          disabled={disabled || value.length >= 64}
          onClick={() => change(value + "0")}
          aria-label="Digit 0"
        >
          0
        </button>
        <button
          type="button"
          className={styles.utility}
          disabled={disabled || !value}
          onClick={() => change(value.slice(0, -1))}
          aria-label="Delete last digit"
        >
          <Delete size={20} />
        </button>
      </div>
    </div>
  );
}
