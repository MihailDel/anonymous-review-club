import styles from "../styles/Pagination.module.css";

const SIBLINGS = 2;

function getPageNumbers(current, total) {
  const pages = [];
  const rangeStart = Math.max(2, current - SIBLINGS);
  const rangeEnd = Math.min(total - 1, current + SIBLINGS);

  pages.push(1);

  if (rangeStart > 2) {
    pages.push("...");
  }

  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  if (rangeEnd < total - 1) {
    pages.push("...");
  }

  if (total > 1) {
    pages.push(total);
  }

  return pages;
}

export function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = getPageNumbers(page, totalPages);

  return (
    <div className={styles.pagination}>
      <button
        className={styles.btn}
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        &larr; Назад
      </button>
      <div className={styles.pages}>
        {pages.map((p, idx) =>
          p === "..." ? (
            <span key={`dots-${idx}`} className={styles.dots}>&hellip;</span>
          ) : (
            <button
              key={p}
              className={`${styles.pageBtn} ${p === page ? styles.active : ""}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}
      </div>
      <button
        className={styles.btn}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Вперёд &rarr;
      </button>
    </div>
  );
}
