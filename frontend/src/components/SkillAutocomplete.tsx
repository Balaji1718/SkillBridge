import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { getSkillSuggestions } from "@/lib/skillSuggestions";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SkillAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (skill: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxSuggestions?: number;
}

export default function SkillAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "e.g. JavaScript, Spanish, Photography...",
  disabled = false,
  className,
  maxSuggestions = 8,
}: SkillAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const highlightedRef = useRef<HTMLDivElement>(null);

  // Debounced search for suggestions
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      if (value.trim()) {
        const newSuggestions = getSkillSuggestions(value, maxSuggestions).map(
          (s) => s.name
        );
        setSuggestions(newSuggestions);
        setIsOpen(newSuggestions.length > 0);
        setHighlightedIndex(-1);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    }, 150); // 150ms debounce

    setDebounceTimer(timer);

    return () => clearTimeout(timer);
  }, [value, maxSuggestions]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedRef.current && suggestionsRef.current) {
      highlightedRef.current.scrollIntoView({
        block: "nearest",
      });
    }
  }, [highlightedIndex]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" && value.trim()) {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;

      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;

      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          selectSuggestion(suggestions[highlightedIndex]);
        }
        break;

      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;

      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  const selectSuggestion = (skill: string) => {
    onChange(skill);
    setIsOpen(false);
    onSelect?.(skill);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (value.trim() && suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="pr-8"
        />
        {isOpen && (
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        )}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-background border border-input rounded-md shadow-md z-50 max-h-60 overflow-y-auto"
          role="listbox"
        >
          {suggestions.map((skill, index) => (
            <div
              key={`${skill}-${index}`}
              ref={index === highlightedIndex ? highlightedRef : undefined}
              onClick={() => selectSuggestion(skill)}
              onMouseEnter={() => setHighlightedIndex(index)}
              role="option"
              aria-selected={index === highlightedIndex}
              className={cn(
                "px-3 py-2 cursor-pointer text-sm transition-colors",
                index === highlightedIndex
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              )}
            >
              {skill}
            </div>
          ))}
        </div>
      )}

      {/* Empty state message */}
      {isOpen && value.trim() && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-input rounded-md shadow-md z-50 px-3 py-2 text-sm text-muted-foreground">
          No suggestions found. Press Enter to add "{value.trim()}"
        </div>
      )}
    </div>
  );
}
