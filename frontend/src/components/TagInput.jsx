import { useState, useEffect, useRef } from "react";
import api from "../api/client";
import { useDebounce } from "../hooks/use-debounce";
import styles from "../styles/TagInput.module.css";

const MAX_TAGS = 5;

export function TagInput({ value = [], onChange }) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef(null);

  const debouncedInput = useDebounce(input);

  useEffect(() => {
    if (!debouncedInput.trim()) {
      setSuggestions([]);
      return;
    }

    api.get("/tags", { params: { search: debouncedInput.trim() } })
      .then(({ data }) => {
        setSuggestions(data.filter((t) => !value.includes(t)));
      })
      .catch(() => setSuggestions([]));
  }, [debouncedInput, value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addTag(tag) {
    const cleaned = tag.trim().toLowerCase();
    if (!cleaned || value.includes(cleaned) || value.length >= MAX_TAGS) {
      return;
    }
    onChange([...value, cleaned]);
    setInput("");
    setSuggestions([]);
  }

  function removeTag(tag) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(input);
    }
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.tags}>
        {value.map((tag) => (
          <span key={tag} className={styles.tag}>
            #{tag}
            <button type="button" onClick={() => removeTag(tag)} className={styles.remove}>
              {"\u00D7"}
            </button>
          </span>
        ))}
      </div>
      {value.length < MAX_TAGS && (
        <div className={styles.inputWrapper}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="Добавить тег..."
            maxLength={50}
            className={styles.input}
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className={styles.suggestions}>
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => addTag(s)}
                    className={styles.suggestion}
                  >
                    #{s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
