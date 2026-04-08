const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { prisma } = require("../db");

const SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function register(req, res) {
  const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = req.body.password || "";

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Все поля обязательны" });
  }

  if (username.length < 3 || username.length > 50) {
    return res.status(400).json({ error: "Имя пользователя должно быть от 3 до 50 символов" });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Некорректный формат email" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Пароль должен быть не менее 6 символов" });
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (existing) {
    return res.status(409).json({ error: "Пользователь с таким email или username уже существует" });
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  let user;
  try {
    user = await prisma.user.create({
      data: { username, email, password_hash },
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Пользователь с таким email или username уже существует" });
    }
    throw err;
  }

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return res.status(201).json({
    user: { id: user.id, username: user.username },
    token,
  });
}

async function login(req, res) {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = req.body.password || "";

  if (!email || !password) {
    return res.status(400).json({ error: "Email и пароль обязательны" });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(401).json({ error: "Неверный email или пароль" });
  }

  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    return res.status(401).json({ error: "Неверный email или пароль" });
  }

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return res.json({
    user: { id: user.id, username: user.username },
    token,
  });
}

module.exports = { register, login };
