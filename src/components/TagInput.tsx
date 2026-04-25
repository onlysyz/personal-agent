import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}

export default function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Enter tags...",
  className = "",
}: TagInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get last word being typed
  const getCurrentWord = () => {
    const parts = value.split(",");
    return parts[parts.length - 1].trim();
  };

  // Filter suggestions based on current input
  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(getCurrentWord().toLowerCase()) &&
      !value.split(",").map((t) => t.trim()).includes(s)
  );

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      selectSuggestion(filteredSuggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    } else if (e.key === "," || e.key === "Tab") {
      // If typing comma or tab, try to autocomplete
      if (getCurrentWord() && filteredSuggestions.length > 0) {
        e.preventDefault();
        selectSuggestion(filteredSuggestions[0]);
      }
    }
  };

  const selectSuggestion = (suggestion: string) => {
    const parts = value.split(",");
    parts[parts.length - 1] = suggestion;
    onChange(parts.join(", ") + ", ");
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const removeLastTag = () => {
    const parts = value.split(",").filter((t) => t.trim());
    if (parts.length > 0) {
      parts.pop();
      onChange(parts.join(", "));
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex flex-wrap gap-1 p-2 bg-surface-container border border-outline-variant/30 rounded-lg min-h-[42px]">
        {value.split(",").map((tag, i) => {
          const trimmed = tag.trim();
          if (!trimmed) return null;
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-container-high rounded text-sm text-on-surface-variant"
            >
              {trimmed}
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={getCurrentWord()}
          onChange={(e) => {
            onChange(
              value.split(",").slice(0, -1).join(", ") +
                (value.includes(",") ? ", " : "") +
                e.target.value
            );
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={value ? "" : placeholder}
          className="flex-1 min-w-[80px] bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-variant/50"
        />
      </div>

      {/* Backspace to remove last tag */}
      {value && (
        <button
          type="button"
          onClick={removeLastTag}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-on-surface"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {filteredSuggestions.map((suggestion, i) => (
            <li key={suggestion}>
              <button
                type="button"
                onClick={() => selectSuggestion(suggestion)}
                className={`w-full px-3 py-2 text-sm text-left hover:bg-surface-container-high transition-colors ${
                  i === highlightedIndex ? "bg-surface-container-high" : ""
                }`}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
