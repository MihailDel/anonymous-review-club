import { useState, useEffect } from "react";
import { useDebounce } from "../hooks/use-debounce";
import { MEDIA_TYPES } from "../constants";
import styles from "../styles/FilterBar.module.css";

const FILTER_MEDIA_TYPES = [{ value: "", label: "Все" }, ...MEDIA_TYPES];

const SORT_OPTIONS = [
  { value: "date_desc", label: "Сначала новые" },
  { value: "date_asc", label: "Сначала старые" },
  { value: "popular", label: "По популярности" },
  { value: "rating", label: "По рейтингу" },
];

export function FilterBar({ onFilterChange }) {
  const [search, setSearch] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [sort, setSort] = useState("date_desc");
  const [tag, setTag] = useState("");

  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    onFilterChange({
      search: debouncedSearch,
      media_type: mediaType,
      sort,
      tag,
    });
  }, [debouncedSearch, mediaType, sort, tag, onFilterChange]);

  return (
    <div className={styles.bar}>
      <input
        type="text"
        placeholder="Поиск по названию..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={styles.search}
      />
      <select
        value={mediaType}
        onChange={(e) => setMediaType(e.target.value)}
        className={styles.select}
      >
        {FILTER_MEDIA_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <select
        value={sort}
        onChange={(e) => setSort(e.target.value)}
        className={styles.select}
      >
        {SORT_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      {tag && (
        <span className={styles.activeTag}>
          #{tag}
          <button
            type="button"
            onClick={() => setTag("")}
            className={styles.removeTag}
          >
            {"\u00D7"}
          </button>
        </span>
      )}
    </div>
  );
}
