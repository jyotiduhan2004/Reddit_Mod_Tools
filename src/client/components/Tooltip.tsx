import { useState } from 'react';

export function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block ml-1">
      <button
        onClick={() => setOpen(!open)}
        onBlur={() => setOpen(false)}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-[10px] font-bold w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 inline-flex items-center justify-center"
      >
        ?
      </button>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1.5 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded shadow-lg w-48 text-center leading-tight">
          {text}
        </div>
      )}
    </span>
  );
}
