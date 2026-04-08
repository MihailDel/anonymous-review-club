import { useState } from "react";
import styles from "../styles/StarRating.module.css";

const STARS_COUNT = 5;

export function StarRating({ value = 0, onChange, readonly = false }) {
  const [hovered, setHovered] = useState(0);

  const stars = Array.from({ length: STARS_COUNT }, (_, i) => i + 1);

  if (readonly) {
    return (
      <span className={styles.container}>
        {stars.map((star) => (
          <span key={star} className={star <= value ? styles.filled : styles.empty}>
            {"\u2605"}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className={styles.container}>
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          className={`${styles.star} ${star <= (hovered || value) ? styles.filled : styles.empty}`}
          onClick={() => onChange(star === value ? null : star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
        >
          {"\u2605"}
        </button>
      ))}
    </span>
  );
}
