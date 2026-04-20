"use client";

import { useEffect, useRef, useState } from "react";

interface Suggestion {
  id: string;
  label: string;
}

interface AddressAutocompleteInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  locale?: string;
  required?: boolean;
}

export function AddressAutocompleteInput({
  label,
  value,
  onChange,
  locale = "en",
  required = false,
}: AddressAutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 3) {
      setItems([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/places/autocomplete?q=${encodeURIComponent(q)}&locale=${encodeURIComponent(locale)}`,
        );
        const data = (await response.json().catch(() => null)) as
          | { success?: boolean; suggestions?: Suggestion[] }
          | null;
        if (!response.ok || !data || data.success !== true || !Array.isArray(data.suggestions)) {
          setItems([]);
          return;
        }
        setItems(data.suggestions);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [value, locale]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={boxRef}>
      <label className="block">
        <span className="block text-sm text-gray-700 mb-1">{label}</span>
        <input
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          type="text"
          required={required}
          autoComplete="off"
        />
      </label>

      {open && (items.length > 0 || loading) ? (
        <div className="absolute z-20 w-full mt-1 rounded-md border border-gray-200 bg-white shadow-sm">
          {loading ? <p className="px-3 py-2 text-xs text-gray-500">Loading suggestions...</p> : null}
          {!loading ? (
            <ul className="max-h-56 overflow-auto py-1">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
                    onClick={() => {
                      onChange(item.label);
                      setOpen(false);
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
