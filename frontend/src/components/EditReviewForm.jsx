import { useState } from "react";
import api from "../api/client";
import { StarRating } from "./StarRating";
import { TagInput } from "./TagInput";
import { MEDIA_TYPES } from "../constants";
import styles from "../styles/EditReviewForm.module.css";

export function EditReviewForm({ review, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: review.title,
    content: review.content,
    media_type: review.media_type,
    rating: review.rating || null,
    tags: review.tags || [],
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data } = await api.put(`/reviews/${review.id}`, form);
      onSave(data);
    } catch (err) {
      setError(err.response?.data?.error || "Ошибка при сохранении");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <p className={styles.error}>{error}</p>}
      <label className={styles.label}>
        Название
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          required
          maxLength={200}
          className={styles.input}
        />
      </label>
      <label className={styles.label}>
        Тип
        <select
          name="media_type"
          value={form.media_type}
          onChange={handleChange}
          className={styles.select}
        >
          {MEDIA_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </label>
      <label className={styles.label}>
        Рейтинг
        <div>
          <StarRating
            value={form.rating}
            onChange={(val) => setForm({ ...form, rating: val })}
          />
        </div>
      </label>
      <label className={styles.label}>
        Теги
        <TagInput
          value={form.tags}
          onChange={(tags) => setForm({ ...form, tags })}
        />
      </label>
      <label className={styles.label}>
        Текст рецензии
        <textarea
          name="content"
          value={form.content}
          onChange={handleChange}
          required
          rows={6}
          className={styles.textarea}
        />
      </label>
      <div className={styles.actions}>
        <button type="submit" disabled={loading} className={styles.saveBtn}>
          {loading ? "Сохранение..." : "Сохранить"}
        </button>
        <button type="button" onClick={onCancel} className={styles.cancelBtn}>
          Отмена
        </button>
      </div>
    </form>
  );
}
