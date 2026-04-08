import { useState } from "react";
import api from "../api/client";
import styles from "../styles/CommentForm.module.css";

export function CommentForm({ reviewId, onCommentAdded }) {
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data } = await api.post(`/reviews/${reviewId}/comments`, {
        content,
        is_anonymous: isAnonymous,
      });
      onCommentAdded(data);
      setContent("");
    } catch (err) {
      setError(err.response?.data?.error || "Ошибка при отправке комментария");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <p className={styles.error}>{error}</p>}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Написать комментарий..."
        required
        maxLength={2000}
        rows={3}
        className={styles.textarea}
      />
      <div className={styles.controls}>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
          />
          Анонимно
        </label>
        <button type="submit" disabled={loading} className={styles.submitBtn}>
          {loading ? "Отправка..." : "Отправить"}
        </button>
      </div>
    </form>
  );
}
