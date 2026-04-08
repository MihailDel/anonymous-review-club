import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "../styles/Header.module.css";

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>
        Клуб анонимных рецензий
      </Link>
      <nav className={styles.nav}>
        <Link to="/" className={styles.link}>Лента</Link>
        {isAuthenticated ? (
          <>
            <Link to="/submit" className={styles.link}>Написать</Link>
            <Link to="/bookmarks" className={styles.link}>Закладки</Link>
            <Link to="/profile" className={styles.link}>{user.username}</Link>
            <button onClick={logout} className={styles.logoutBtn}>Выйти</button>
          </>
        ) : (
          <>
            <Link to="/login" className={styles.link}>Войти</Link>
            <Link to="/register" className={styles.link}>Регистрация</Link>
          </>
        )}
      </nav>
    </header>
  );
}
