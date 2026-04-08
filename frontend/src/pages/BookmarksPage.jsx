import { useEffect, useState, useCallback } from "react";
import api from "../api/client";
import { ReviewCard } from "../components/ReviewCard";
import { Pagination } from "../components/Pagination";
import styles from "../styles/BookmarksPage.module.css";

export function BookmarksPage() {
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchBookmarks = useCallback(async (p) => {
    setLoading(true);
    try {
      const { data } = await api.get("/bookmarks", { params: { page: p, limit: 10 } });
      setReviews(data.reviews);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error("Failed to load bookmarks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks(page);
  }, [page, fetchBookmarks]);

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
      <h1 className={styles.title}>Закладки</h1>
      {loading ? (
        <p>Загрузка...</p>
      ) : reviews.length === 0 ? (
        <p className={styles.empty}>У вас пока нет закладок.</p>
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
