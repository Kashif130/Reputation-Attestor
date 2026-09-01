"use client";

import { isValidAddress } from "@/lib/format";

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}

export default function AddressInput({ value, onChange, placeholder, onSubmit }: AddressInputProps) {
  const valid = value.length === 0 || isValidAddress(value);

  return (
    <div>
      <input
        className={`input font-mono ${!valid ? "border-red-800 focus:border-red-600" : ""}`}
        placeholder={placeholder ?? "0x…"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onSubmit) onSubmit();
        }}
        spellCheck={false}
      />
      {!valid && <p className="mt-1 text-xs text-red-400">Enter a valid 0x… address (42 characters).</p>}
    </div>
  );
}
