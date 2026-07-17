import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface Option {
  id: string | number;
  name: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number | undefined;
  onChange: (value: string | number | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  className = '',
  disabled = false,
  error = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Find the selected option to display its name
  const selectedOption = options.find((opt) => String(opt.id) === String(value));

  // Sync search input with selected value when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setSearch(selectedOption ? selectedOption.name : '');
    }
  }, [isOpen, selectedOption]);

  // Handle clicking outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on search query
  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [search]);

  const handleSelect = (option: Option) => {
    onChange(option.id);
    setSearch(option.name);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
    if (isOpen) {
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (filteredOptions.length > 0) {
          handleSelect(filteredOptions[0]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className={`input w-full pr-16 ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''} ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-text'}`}
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              setSearch(''); // clear input on focus so user can type to search
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className="p-1 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
            disabled={disabled}
          >
            <ChevronDown className={`h-4 w-4 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No matching options found
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = String(opt.id) === String(value);
              const isHighlighted = idx === highlightedIndex;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-4 py-2 text-sm border-b last:border-b-0 border-gray-100 transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : isHighlighted
                      ? 'bg-gray-100 text-gray-900'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {opt.name}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
