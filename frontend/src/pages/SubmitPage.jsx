import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { StarRating } from "../components/StarRating";
import { TagInput } from "../components/TagInput";
import { MEDIA_TYPES } from "../constants";
import styles from "../styles/SubmitPage.module.css";

export function SubmitPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    content: "",
    media_type: "book",
    rating: null,
    tags: [],
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
      await api.post("/reviews", form);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Ошибка при публикации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h1 className={styles.title}>Новая рецензия</h1>
        {error && <p className={styles.error}>{error}</p>}
        <label className={styles.label}>
          Название произведения
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
          Оценка
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
            rows={8}
            className={styles.textarea}
          />
        </label>
        <button type="submit" disabled={loading} className={styles.submitBtn}>
          {loading ? "Публикация..." : "Опубликовать анонимно"}
        </button>
      </form>
    </div>
  );
}
