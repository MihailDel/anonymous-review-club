const { prisma } = require("../db");

const MAX_COMMENT_LENGTH = 2000;

async function getComments(req, res) {
  const reviewId = parseInt(req.params.reviewId, 10);

  if (isNaN(reviewId)) {
    return res.status(400).json({ error: "Невалидный ID рецензии" });
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where: { review_id: reviewId },
      include: { user: { select: { username: true } } },
      orderBy: { created_at: "asc" },
      skip: offset,
      take: limit,
    }),
    prisma.comment.count({ where: { review_id: reviewId } }),
  ]);

  const data = comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    is_anonymous: comment.is_anonymous,
    author: comment.is_anonymous ? "Аноним" : comment.user.username,
    is_own: req.userId === comment.user_id,
    created_at: comment.created_at,
  }));

  return res.json({
    comments: data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

async function createComment(req, res) {
  const reviewId = parseInt(req.params.reviewId, 10);

  if (isNaN(reviewId)) {
    return res.status(400).json({ error: "Невалидный ID рецензии" });
  }

  const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
  const isAnonymous = req.body.is_anonymous !== false;

  if (!content) {
    return res.status(400).json({ error: "Комментарий не может быть пустым" });
  }

  if (content.length > MAX_COMMENT_LENGTH) {
    return res.status(400).json({ error: `Комментарий не должен превышать ${MAX_COMMENT_LENGTH} символов` });
  }

  const review = await prisma.review.findUnique({ where: { id: reviewId } });

  if (!review) {
    return res.status(404).json({ error: "Рецензия не найдена" });
  }

  const comment = await prisma.comment.create({
    data: {
      user_id: req.userId,
      review_id: reviewId,
      content,
      is_anonymous: isAnonymous,
    },
    include: { user: { select: { username: true } } },
  });

  return res.status(201).json({
    id: comment.id,
    content: comment.content,
    is_anonymous: comment.is_anonymous,
    author: comment.is_anonymous ? "Аноним" : comment.user.username,
    is_own: true,
    created_at: comment.created_at,
  });
}

async function deleteComment(req, res) {
  const commentId = parseInt(req.params.id, 10);

  if (isNaN(commentId)) {
    return res.status(400).json({ error: "Невалидный ID комментария" });
  }

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });

  if (!comment) {
    return res.status(404).json({ error: "Комментарий не найден" });
  }

  if (comment.user_id !== req.userId) {
    return res.status(403).json({ error: "Нет прав для удаления этого комментария" });
  }

  await prisma.comment.delete({ where: { id: commentId } });

  return res.status(204).end();
}

module.exports = { getComments, createComment, deleteComment };
