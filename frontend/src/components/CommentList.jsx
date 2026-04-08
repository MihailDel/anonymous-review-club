import { useState } from "react";
import api from "../api/client";
import styles from "../styles/CommentList.module.css";

export function CommentList({ comments, reviewId, onCommentDeleted }) {
  const [deletingId, setDeletingId] = useState(null);

  async function handleDelete(commentId) {
    if (!window.confirm("Удалить комментарий?")) {
      return;
    }

    setDeletingId(commentId);

    try {
      await api.delete(`/reviews/${reviewId}/comments/${commentId}`);
      onCommentDeleted(commentId);
    } catch (err) {
      console.error("Failed to delete comment:", err);
    } finally {
      setDeletingId(null);
    }
  }

  if (comments.length === 0) {
    return <p className={styles.empty}>Комментариев пока нет.</p>;
  }

  return (
    <div className={styles.list}>
      {comments.map((comment) => {
        const date = new Date(comment.created_at).toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div key={comment.id} className={styles.comment}>
            <div className={styles.header}>
              <span className={styles.author}>
                {comment.is_anonymous ? "\uD83D\uDD12" : "\uD83D\uDD13"} {comment.author}
              </span>
              <span className={styles.date}>{date}</span>
              {comment.is_own && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  disabled={deletingId === comment.id}
                  className={styles.deleteBtn}
                >
                  Удалить
                </button>
              )}
            </div>
            <p className={styles.content}>{comment.content}</p>
          </div>
        );
      })}
    </div>
  );
}
