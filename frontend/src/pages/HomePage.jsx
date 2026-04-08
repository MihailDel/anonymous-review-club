import { useEffect, useState, useCallback } from "react";
import api from "../api/client";
import { ReviewCard } from "../components/ReviewCard";
import { Pagination } from "../components/Pagination";
import { FilterBar } from "../components/FilterBar";
import styles from "../styles/HomePage.module.css";

export function HomePage() {
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    media_type: "",
    sort: "date_desc",
    tag: "",
  });

  const fetchReviews = useCallback(async (p, f) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 10 };

      if (f.search) {
        params.search = f.search;
      }
      if (f.media_type) {
        params.media_type = f.media_type;
      }
      if (f.sort && f.sort !== "date_desc") {
        params.sort = f.sort;
      }
      if (f.tag) {
        params.tag = f.tag;
      }

      const { data } = await api.get("/reviews", { params });
      setReviews(data.reviews);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews(page, filters);
  }, [page, filters, fetchReviews]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  function handleVoteUpdate(reviewId, newLikesCount, newIsRevealed, newAuthor) {
    setReviews((prev) =>
      prev.map((r) => {
        if (r.id !== reviewId) {
          return r;
        }

        return {
          ...r,
          likes_count: newLikesCount,
          is_author_revealed: newIsRevealed,
          author: newAuthor,
        };
      })
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Лента рецензий</h1>
      <FilterBar onFilterChange={handleFilterChange} />
      {loading ? (
        <p className={styles.loading}>Загрузка...</p>
      ) : reviews.length === 0 ? (
        <p className={styles.empty}>Рецензий пока нет. Будьте первым!</p>
      ) : (
        <>
          <div className={styles.list}>
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onVoteUpdate={handleVoteUpdate}
              />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
