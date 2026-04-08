const { prisma } = require("../db");

async function getUserBookmarks(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const [bookmarks, total] = await Promise.all([
    prisma.bookmark.findMany({
      where: { user_id: req.userId },
      include: {
        review: {
          include: {
            author: { select: { username: true } },
            tags: { include: { tag: true } },
            _count: { select: { comments: true } },
          },
        },
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.bookmark.count({ where: { user_id: req.userId } }),
  ]);

  const reviewIds = bookmarks.map((b) => b.review.id);

  const votes = await prisma.vote.findMany({
    where: { user_id: req.userId, review_id: { in: reviewIds } },
    select: { review_id: true },
  });

  const votedSet = new Set(votes.map((v) => v.review_id));

  const data = bookmarks.map((b) => ({
    id: b.review.id,
    title: b.review.title,
    content: b.review.content,
    media_type: b.review.media_type,
    rating: b.review.rating,
    likes_count: b.review.likes_count,
    is_author_revealed: b.review.is_author_revealed,
    author: b.review.is_author_revealed ? b.review.author.username : "Аноним",
    created_at: b.review.created_at,
    tags: b.review.tags.map((rt) => rt.tag.name),
    comments_count: b.review._count.comments,
    has_voted: votedSet.has(b.review.id),
    is_bookmarked: true,
  }));

  return res.json({
    reviews: data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

async function addBookmark(req, res) {
  const reviewId = parseInt(req.params.id, 10);

  if (isNaN(reviewId)) {
    return res.status(400).json({ error: "Невалидный ID рецензии" });
  }

  const review = await prisma.review.findUnique({ where: { id: reviewId } });

  if (!review) {
    return res.status(404).json({ error: "Рецензия не найдена" });
  }

  const existing = await prisma.bookmark.findUnique({
    where: { user_id_review_id: { user_id: req.userId, review_id: reviewId } },
  });

  if (existing) {
    return res.status(409).json({ error: "Рецензия уже в закладках" });
  }

  await prisma.bookmark.create({
    data: { user_id: req.userId, review_id: reviewId },
  });

  return res.status(201).json({ is_bookmarked: true });
}

async function removeBookmark(req, res) {
  const reviewId = parseInt(req.params.id, 10);

  if (isNaN(reviewId)) {
    return res.status(400).json({ error: "Невалидный ID рецензии" });
  }

  const existing = await prisma.bookmark.findUnique({
    where: { user_id_review_id: { user_id: req.userId, review_id: reviewId } },
  });

  if (!existing) {
    return res.status(404).json({ error: "Закладка не найдена" });
  }

  await prisma.bookmark.delete({ where: { id: existing.id } });

  return res.json({ is_bookmarked: false });
}

module.exports = { getUserBookmarks, addBookmark, removeBookmark };
