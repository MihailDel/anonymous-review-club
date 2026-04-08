import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { StarRating } from "../components/StarRating";
import { EditReviewForm } from "../components/EditReviewForm";
import { MEDIA_LABELS } from "../constants";
import styles from "../styles/ProfilePage.module.css";

export function ProfilePage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    api.get("/reviews/my")
      .then(({ data }) => setReviews(data))
      .catch((err) => console.error("Failed to load profile reviews:", err))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(reviewId) {
    if (!window.confirm("Удалить рецензию? Это действие нельзя отменить.")) {
      return;
    }

    try {
      await api.delete(`/reviews/${reviewId}`);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (err) {
      console.error("Failed to delete review:", err);
    }
  }

  function handleSave(updatedReview) {
    setReviews((prev) =>
      prev.map((r) => (r.id === updatedReview.id ? { ...r, ...updatedReview } : r))
    );
    setEditingId(null);
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Мои рецензии</h1>
      <p className={styles.subtitle}>Автор: {user.username}</p>
      {loading ? (
        <p>Загрузка...</p>
      ) : reviews.length === 0 ? (
        <p className={styles.empty}>Вы пока не написали ни одной рецензии.</p>
      ) : (
        <div className={styles.list}>
          {reviews.map((review) => (
            <article key={review.id} className={styles.card}>
              <div className={styles.meta}>
                <span className={styles.mediaType}>{MEDIA_LABELS[review.media_type]}</span>
                <span className={styles.likes}>{"\u2764\uFE0F"} {review.likes_count}</span>
                <span className={styles.status}>
                  {review.is_author_revealed ? "\uD83D\uDD13 Раскрыто" : "\uD83D\uDD12 Анонимно"}
                </span>
                {review.rating && (
                  <StarRating value={review.rating} readonly />
                )}
              </div>
              <h2 className={styles.cardTitle}>{review.title}</h2>
              {review.tags && review.tags.length > 0 && (
                <div className={styles.tags}>
                  {review.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>#{tag}</span>
                  ))}
                </div>
              )}
              {editingId === review.id ? (
                <EditReviewForm
                  review={review}
                  onSave={handleSave}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <p className={styles.content}>{review.content}</p>
                  <div className={styles.actions}>
                    <button
                      onClick={() => setEditingId(review.id)}
                      className={styles.editBtn}
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDelete(review.id)}
                      className={styles.deleteBtn}
                    >
                      Удалить
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
