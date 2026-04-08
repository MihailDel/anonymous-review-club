import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { StarRating } from "../components/StarRating";
import { CommentList } from "../components/CommentList";
import { CommentForm } from "../components/CommentForm";
import { MEDIA_LABELS } from "../constants";
import styles from "../styles/ReviewDetailPage.module.css";

const COMMENTS_LIMIT = 50;

export function ReviewDetailPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const [review, setReview] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsTotalPages, setCommentsTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [voteLoading, setVoteLoading] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reviewRes, commentsRes] = await Promise.all([
        api.get(`/reviews/${id}`),
        api.get(`/reviews/${id}/comments`, { params: { limit: COMMENTS_LIMIT } }),
      ]);
      setReview(reviewRes.data);
      setComments(commentsRes.data.comments);
      setCommentsTotalPages(commentsRes.data.totalPages);
    } catch (err) {
      console.error("Failed to load review:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleVoteToggle() {
    if (!review || voteLoading) {
      return;
    }

    setVoteLoading(true);
    try {
      if (review.has_voted) {
        const { data } = await api.delete(`/reviews/${id}/vote`);
        setReview({ ...review, ...data, has_voted: false });
      } else {
        const { data } = await api.post(`/reviews/${id}/vote`);
        setReview({ ...review, ...data, has_voted: true });
      }
    } catch (err) {
      console.error("Vote error:", err);
    } finally {
      setVoteLoading(false);
    }
  }

  async function handleBookmarkToggle() {
    if (!review || bookmarkLoading) {
      return;
    }

    setBookmarkLoading(true);
    try {
      if (review.is_bookmarked) {
        await api.delete(`/reviews/${id}/bookmark`);
        setReview({ ...review, is_bookmarked: false });
      } else {
        await api.post(`/reviews/${id}/bookmark`);
        setReview({ ...review, is_bookmarked: true });
      }
    } catch (err) {
      console.error("Bookmark error:", err);
    } finally {
      setBookmarkLoading(false);
    }
  }

  async function handleLoadMoreComments() {
    const nextPage = commentsPage + 1;
    try {
      const { data } = await api.get(`/reviews/${id}/comments`, {
        params: { page: nextPage, limit: COMMENTS_LIMIT },
      });
      setComments((prev) => [...prev, ...data.comments]);
      setCommentsPage(nextPage);
      setCommentsTotalPages(data.totalPages);
    } catch (err) {
      console.error("Failed to load more comments:", err);
    }
  }

  function handleCommentAdded(comment) {
    setComments((prev) => [...prev, comment]);
    setReview((prev) => prev ? { ...prev, comments_count: prev.comments_count + 1 } : prev);
  }

  function handleCommentDeleted(commentId) {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setReview((prev) => prev ? { ...prev, comments_count: prev.comments_count - 1 } : prev);
  }

  if (loading) {
    return <div className={styles.container}><p>Загрузка...</p></div>;
  }

  if (!review) {
    return <div className={styles.container}><p>Рецензия не найдена.</p></div>;
  }

  const date = new Date(review.created_at).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className={styles.container}>
      <article className={styles.review}>
        <div className={styles.meta}>
          <span className={styles.mediaType}>{MEDIA_LABELS[review.media_type]}</span>
          <span className={styles.date}>{date}</span>
        </div>
        <h1 className={styles.title}>{review.title}</h1>
        {review.rating && (
          <div className={styles.rating}>
            <StarRating value={review.rating} readonly />
          </div>
        )}
        {review.tags.length > 0 && (
          <div className={styles.tags}>
            {review.tags.map((tag) => (
              <span key={tag} className={styles.tag}>#{tag}</span>
            ))}
          </div>
        )}
        <p className={styles.content}>{review.content}</p>
        <div className={styles.footer}>
          <span className={styles.author}>
            {review.is_author_revealed ? "\uD83D\uDD13" : "\uD83D\uDD12"} {review.author}
          </span>
          <div className={styles.actions}>
            {isAuthenticated && (
              <button
                onClick={handleBookmarkToggle}
                disabled={bookmarkLoading}
                className={`${styles.actionBtn} ${review.is_bookmarked ? styles.active : ""}`}
                title={review.is_bookmarked ? "Убрать из закладок" : "В закладки"}
              >
                {review.is_bookmarked ? "\uD83D\uDD16" : "\uD83D\uDD17"}
              </button>
            )}
            <button
              onClick={handleVoteToggle}
              disabled={!isAuthenticated || voteLoading}
              className={`${styles.voteBtn} ${review.has_voted ? styles.voted : ""}`}
              title={!isAuthenticated ? "Войдите, чтобы голосовать" : review.has_voted ? "Убрать голос" : "Нравится"}
            >
              {review.has_voted ? "\u2764\uFE0F" : "\uD83E\uDE76"} {review.likes_count}
            </button>
          </div>
        </div>
      </article>

      <section className={styles.commentsSection}>
        <h2 className={styles.commentsTitle}>
          Комментарии ({review.comments_count})
        </h2>
        <CommentList
          comments={comments}
          reviewId={review.id}
          onCommentDeleted={handleCommentDeleted}
        />
        {commentsPage < commentsTotalPages && (
          <button onClick={handleLoadMoreComments} className={styles.loadMoreBtn}>
            Загрузить ещё
          </button>
        )}
        {isAuthenticated && (
          <CommentForm
            reviewId={review.id}
            onCommentAdded={handleCommentAdded}
          />
        )}
      </section>
    </div>
  );
}
