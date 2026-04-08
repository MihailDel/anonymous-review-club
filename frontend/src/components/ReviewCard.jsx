import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { StarRating } from "./StarRating";
import { MEDIA_LABELS } from "../constants";
import styles from "../styles/ReviewCard.module.css";

const MAX_CONTENT_LENGTH = 200;

export function ReviewCard({ review, onVoteUpdate }) {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasVoted, setHasVoted] = useState(review.has_voted);
  const [isBookmarked, setIsBookmarked] = useState(review.is_bookmarked);

  const truncatedContent = review.content.length > MAX_CONTENT_LENGTH
    ? review.content.slice(0, MAX_CONTENT_LENGTH) + "..."
    : review.content;

  async function handleVoteToggle() {
    if (!isAuthenticated || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (hasVoted) {
        const { data } = await api.delete(`/reviews/${review.id}/vote`);
        setHasVoted(false);
        onVoteUpdate(review.id, data.likes_count, data.is_author_revealed, data.author);
      } else {
        const { data } = await api.post(`/reviews/${review.id}/vote`);
        setHasVoted(true);
        onVoteUpdate(review.id, data.likes_count, data.is_author_revealed, data.author);
      }
    } catch (err) {
      const message = err.response?.data?.error || "Ошибка при голосовании";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleBookmarkToggle() {
    if (!isAuthenticated || bookmarkLoading) {
      return;
    }

    setBookmarkLoading(true);
    try {
      if (isBookmarked) {
        await api.delete(`/reviews/${review.id}/bookmark`);
        setIsBookmarked(false);
      } else {
        await api.post(`/reviews/${review.id}/bookmark`);
        setIsBookmarked(true);
      }
    } catch (err) {
      const message = err.response?.data?.error || "Ошибка при изменении закладки";
      setError(message);
    } finally {
      setBookmarkLoading(false);
    }
  }

  const date = new Date(review.created_at).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article className={styles.card}>
      <div className={styles.meta}>
        <span className={styles.mediaType}>{MEDIA_LABELS[review.media_type]}</span>
        <span className={styles.date}>{date}</span>
        {review.rating && (
          <StarRating value={review.rating} readonly />
        )}
      </div>
      <h2 className={styles.title}>
        <Link to={`/reviews/${review.id}`} className={styles.titleLink}>
          {review.title}
        </Link>
      </h2>
      {review.tags && review.tags.length > 0 && (
        <div className={styles.tags}>
          {review.tags.map((tag) => (
            <span key={tag} className={styles.tag}>#{tag}</span>
          ))}
        </div>
      )}
      <p className={styles.content}>{truncatedContent}</p>
      <div className={styles.footer}>
        <span className={styles.author}>
          {review.is_author_revealed ? (
            <>{"\uD83D\uDD13"} {review.author}</>
          ) : (
            <>{"\uD83D\uDD12"} {review.author}</>
          )}
        </span>
        <div className={styles.voteSection}>
          {review.comments_count > 0 && (
            <Link to={`/reviews/${review.id}`} className={styles.commentsCount}>
              {"\uD83D\uDCAC"} {review.comments_count}
            </Link>
          )}
          {isAuthenticated && (
            <button
              className={`${styles.bookmarkBtn} ${isBookmarked ? styles.bookmarked : ""}`}
              onClick={handleBookmarkToggle}
              disabled={bookmarkLoading}
              title={isBookmarked ? "Убрать из закладок" : "В закладки"}
            >
              {isBookmarked ? "\uD83D\uDD16" : "\uD83D\uDD17"}
            </button>
          )}
          <button
            className={`${styles.voteBtn} ${!isAuthenticated ? styles.disabled : ""} ${hasVoted ? styles.voted : ""}`}
            onClick={handleVoteToggle}
            disabled={!isAuthenticated || loading}
            title={!isAuthenticated ? "Войдите, чтобы голосовать" : hasVoted ? "Убрать голос" : "Нравится"}
          >
            {hasVoted ? "\u2764\uFE0F" : "\uD83E\uDE76"} {review.likes_count}
          </button>
          {error && <span className={styles.error}>{error}</span>}
        </div>
      </div>
    </article>
  );
}
