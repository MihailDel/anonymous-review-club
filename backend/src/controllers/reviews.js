const { prisma } = require("../db");

const ANTISPAM_HOURS = 24;
const MAX_CONTENT_LENGTH = 10000;
const MAX_TITLE_LENGTH = 200;
const VALID_MEDIA_TYPES = ["book", "film", "music", "series", "games", "podcasts"];
const MIN_RATING = 1;
const MAX_RATING = 5;

function getRevealThreshold() {
  return parseInt(process.env.REVEAL_THRESHOLD, 10) || 10;
}

async function getReviews(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const where = {};

  if (req.query.media_type && VALID_MEDIA_TYPES.includes(req.query.media_type)) {
    where.media_type = req.query.media_type;
  }

  if (req.query.search && typeof req.query.search === "string" && req.query.search.trim()) {
    where.title = { contains: req.query.search.trim(), mode: "insensitive" };
  }

  if (req.query.tag && typeof req.query.tag === "string" && req.query.tag.trim()) {
    where.tags = { some: { tag: { name: req.query.tag.trim() } } };
  }

  const orderByMap = {
    date_asc: { created_at: "asc" },
    popular: { likes_count: "desc" },
    rating: { rating: "desc" },
  };
  const orderBy = orderByMap[req.query.sort] || { created_at: "desc" };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        author: { select: { username: true } },
        tags: { include: { tag: true } },
        _count: { select: { comments: true } },
      },
      orderBy,
      skip: offset,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  let userVoteSet = new Set();
  let userBookmarkSet = new Set();

  if (req.userId) {
    const reviewIds = reviews.map((r) => r.id);

    const [votes, bookmarks] = await Promise.all([
      prisma.vote.findMany({
        where: { user_id: req.userId, review_id: { in: reviewIds } },
        select: { review_id: true },
      }),
      prisma.bookmark.findMany({
        where: { user_id: req.userId, review_id: { in: reviewIds } },
        select: { review_id: true },
      }),
    ]);

    userVoteSet = new Set(votes.map((v) => v.review_id));
    userBookmarkSet = new Set(bookmarks.map((b) => b.review_id));
  }

  const data = reviews.map((review) => ({
    id: review.id,
    title: review.title,
    content: review.content,
    media_type: review.media_type,
    rating: review.rating,
    likes_count: review.likes_count,
    is_author_revealed: review.is_author_revealed,
    author: review.is_author_revealed ? review.author.username : "Аноним",
    created_at: review.created_at,
    tags: review.tags.map((rt) => rt.tag.name),
    comments_count: review._count.comments,
    has_voted: userVoteSet.has(review.id),
    is_bookmarked: userBookmarkSet.has(review.id),
  }));

  return res.json({
    reviews: data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

async function createReview(req, res) {
  const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
  const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
  const { media_type, rating, tags } = req.body;

  if (!title || !content || !media_type) {
    return res.status(400).json({ error: "Все поля обязательны" });
  }

  if (title.length > MAX_TITLE_LENGTH) {
    return res.status(400).json({ error: `Название не должно превышать ${MAX_TITLE_LENGTH} символов` });
  }

  if (!VALID_MEDIA_TYPES.includes(media_type)) {
    return res.status(400).json({ error: `media_type должен быть одним из: ${VALID_MEDIA_TYPES.join(", ")}` });
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return res.status(400).json({ error: `Текст рецензии не должен превышать ${MAX_CONTENT_LENGTH} символов` });
  }

  if (rating !== undefined && rating !== null) {
    const parsed = parseInt(rating, 10);
    if (isNaN(parsed) || parsed < MIN_RATING || parsed > MAX_RATING) {
      return res.status(400).json({ error: `Рейтинг должен быть от ${MIN_RATING} до ${MAX_RATING}` });
    }
  }

  const parsedTags = validateTags(tags);
  if (parsedTags.error) {
    return res.status(400).json({ error: parsedTags.error });
  }

  const cutoff = new Date(Date.now() - ANTISPAM_HOURS * 60 * 60 * 1000);

  const duplicate = await prisma.review.findFirst({
    where: {
      user_id: req.userId,
      title: { equals: title, mode: "insensitive" },
      created_at: { gte: cutoff },
    },
  });

  if (duplicate) {
    return res.status(429).json({
      error: "Вы уже публиковали рецензию на это произведение сегодня",
    });
  }

  const reviewData = {
    user_id: req.userId,
    title,
    content,
    media_type,
    rating: rating !== undefined && rating !== null ? parseInt(rating, 10) : null,
  };

  if (parsedTags.value.length > 0) {
    reviewData.tags = {
      create: await buildTagConnections(parsedTags.value),
    };
  }

  const review = await prisma.review.create({
    data: reviewData,
    include: { tags: { include: { tag: true } } },
  });

  return res.status(201).json({
    id: review.id,
    title: review.title,
    content: review.content,
    media_type: review.media_type,
    rating: review.rating,
    likes_count: review.likes_count,
    is_author_revealed: review.is_author_revealed,
    author: "Аноним",
    created_at: review.created_at,
    tags: review.tags.map((rt) => rt.tag.name),
    comments_count: 0,
    has_voted: false,
    is_bookmarked: false,
  });
}

async function voteOnReview(req, res) {
  const reviewId = parseInt(req.params.id, 10);

  if (isNaN(reviewId)) {
    return res.status(400).json({ error: "Невалидный ID рецензии" });
  }

  const result = await prisma.$transaction(async (tx) => {
    const review = await tx.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return { notFound: true };
    }

    if (review.user_id === req.userId) {
      return { selfVote: true };
    }

    const existingVote = await tx.vote.findUnique({
      where: {
        user_id_review_id: { user_id: req.userId, review_id: reviewId },
      },
    });

    if (existingVote) {
      return { alreadyVoted: true };
    }

    await tx.vote.create({
      data: { user_id: req.userId, review_id: reviewId },
    });

    const updated = await tx.review.update({
      where: { id: reviewId },
      data: { likes_count: { increment: 1 } },
      include: { author: { select: { username: true } } },
    });

    if (!updated.is_author_revealed && updated.likes_count >= getRevealThreshold()) {
      const revealed = await tx.review.update({
        where: { id: reviewId },
        data: { is_author_revealed: true },
        include: { author: { select: { username: true } } },
      });

      return {
        likes_count: revealed.likes_count,
        is_author_revealed: true,
        author: revealed.author.username,
      };
    }

    return {
      likes_count: updated.likes_count,
      is_author_revealed: updated.is_author_revealed,
      author: updated.is_author_revealed ? updated.author.username : "Аноним",
    };
  });

  if (result.notFound) {
    return res.status(404).json({ error: "Рецензия не найдена" });
  }

  if (result.selfVote) {
    return res.status(403).json({ error: "Нельзя голосовать за свою рецензию" });
  }

  if (result.alreadyVoted) {
    return res.status(409).json({ error: "Вы уже голосовали за эту рецензию" });
  }

  return res.json({
    likes_count: result.likes_count,
    is_author_revealed: result.is_author_revealed,
    author: result.author,
  });
}

async function removeVote(req, res) {
  const reviewId = parseInt(req.params.id, 10);

  if (isNaN(reviewId)) {
    return res.status(400).json({ error: "Невалидный ID рецензии" });
  }

  const result = await prisma.$transaction(async (tx) => {
    const existingVote = await tx.vote.findUnique({
      where: {
        user_id_review_id: { user_id: req.userId, review_id: reviewId },
      },
    });

    if (!existingVote) {
      return { notFound: true };
    }

    await tx.vote.delete({
      where: { id: existingVote.id },
    });

    const updated = await tx.review.update({
      where: { id: reviewId },
      data: { likes_count: { decrement: 1 } },
      include: { author: { select: { username: true } } },
    });

    return {
      likes_count: updated.likes_count,
      is_author_revealed: updated.is_author_revealed,
      author: updated.is_author_revealed ? updated.author.username : "Аноним",
    };
  });

  if (result.notFound) {
    return res.status(404).json({ error: "Голос не найден" });
  }

  return res.json({
    likes_count: result.likes_count,
    is_author_revealed: result.is_author_revealed,
    author: result.author,
  });
}

async function updateReview(req, res) {
  const reviewId = parseInt(req.params.id, 10);

  if (isNaN(reviewId)) {
    return res.status(400).json({ error: "Невалидный ID рецензии" });
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    return res.status(404).json({ error: "Рецензия не найдена" });
  }

  if (review.user_id !== req.userId) {
    return res.status(403).json({ error: "Нет прав для редактирования этой рецензии" });
  }

  const updateData = {};

  if (req.body.title !== undefined) {
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    if (!title) {
      return res.status(400).json({ error: "Название не может быть пустым" });
    }
    if (title.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({ error: `Название не должно превышать ${MAX_TITLE_LENGTH} символов` });
    }
    updateData.title = title;
  }

  if (req.body.content !== undefined) {
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!content) {
      return res.status(400).json({ error: "Текст рецензии не может быть пустым" });
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return res.status(400).json({ error: `Текст рецензии не должен превышать ${MAX_CONTENT_LENGTH} символов` });
    }
    updateData.content = content;
  }

  if (req.body.media_type !== undefined) {
    if (!VALID_MEDIA_TYPES.includes(req.body.media_type)) {
      return res.status(400).json({ error: `media_type должен быть одним из: ${VALID_MEDIA_TYPES.join(", ")}` });
    }
    updateData.media_type = req.body.media_type;
  }

  if (req.body.rating !== undefined) {
    if (req.body.rating === null) {
      updateData.rating = null;
    } else {
      const parsed = parseInt(req.body.rating, 10);
      if (isNaN(parsed) || parsed < MIN_RATING || parsed > MAX_RATING) {
        return res.status(400).json({ error: `Рейтинг должен быть от ${MIN_RATING} до ${MAX_RATING}` });
      }
      updateData.rating = parsed;
    }
  }

  if (Object.keys(updateData).length === 0 && req.body.tags === undefined) {
    return res.status(400).json({ error: "Нет данных для обновления" });
  }

  if (req.body.tags !== undefined) {
    const parsedTags = validateTags(req.body.tags);
    if (parsedTags.error) {
      return res.status(400).json({ error: parsedTags.error });
    }

    const tagConnections = parsedTags.value.length > 0
      ? await buildTagConnections(parsedTags.value)
      : [];

    await prisma.$transaction(async (tx) => {
      await tx.reviewTag.deleteMany({ where: { review_id: reviewId } });

      if (tagConnections.length > 0) {
        await tx.reviewTag.createMany({
          data: tagConnections.map((tc) => ({
            review_id: reviewId,
            tag_id: tc.tag_id,
          })),
        });
      }
    });
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: updateData,
    include: { tags: { include: { tag: true } } },
  });

  return res.json({
    id: updated.id,
    title: updated.title,
    content: updated.content,
    media_type: updated.media_type,
    rating: updated.rating,
    likes_count: updated.likes_count,
    is_author_revealed: updated.is_author_revealed,
    created_at: updated.created_at,
    tags: updated.tags.map((rt) => rt.tag.name),
  });
}

async function deleteReview(req, res) {
  const reviewId = parseInt(req.params.id, 10);

  if (isNaN(reviewId)) {
    return res.status(400).json({ error: "Невалидный ID рецензии" });
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    return res.status(404).json({ error: "Рецензия не найдена" });
  }

  if (review.user_id !== req.userId) {
    return res.status(403).json({ error: "Нет прав для удаления этой рецензии" });
  }

  await prisma.review.delete({ where: { id: reviewId } });

  return res.status(204).end();
}

async function getUserReviews(req, res) {
  const reviews = await prisma.review.findMany({
    where: { user_id: req.userId },
    include: { tags: { include: { tag: true } } },
    orderBy: { created_at: "desc" },
  });

  const data = reviews.map((review) => ({
    id: review.id,
    title: review.title,
    content: review.content,
    media_type: review.media_type,
    rating: review.rating,
    likes_count: review.likes_count,
    is_author_revealed: review.is_author_revealed,
    created_at: review.created_at,
    tags: review.tags.map((rt) => rt.tag.name),
  }));

  return res.json(data);
}

async function getReviewById(req, res) {
  const reviewId = parseInt(req.params.id, 10);

  if (isNaN(reviewId)) {
    return res.status(400).json({ error: "Невалидный ID рецензии" });
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      author: { select: { username: true } },
      tags: { include: { tag: true } },
      _count: { select: { comments: true } },
    },
  });

  if (!review) {
    return res.status(404).json({ error: "Рецензия не найдена" });
  }

  let hasVoted = false;
  let isBookmarked = false;

  if (req.userId) {
    const [vote, bookmark] = await Promise.all([
      prisma.vote.findUnique({
        where: { user_id_review_id: { user_id: req.userId, review_id: reviewId } },
      }),
      prisma.bookmark.findUnique({
        where: { user_id_review_id: { user_id: req.userId, review_id: reviewId } },
      }),
    ]);
    hasVoted = !!vote;
    isBookmarked = !!bookmark;
  }

  return res.json({
    id: review.id,
    title: review.title,
    content: review.content,
    media_type: review.media_type,
    rating: review.rating,
    likes_count: review.likes_count,
    is_author_revealed: review.is_author_revealed,
    author: review.is_author_revealed ? review.author.username : "Аноним",
    created_at: review.created_at,
    tags: review.tags.map((rt) => rt.tag.name),
    comments_count: review._count.comments,
    has_voted: hasVoted,
    is_bookmarked: isBookmarked,
  });
}

const MAX_TAGS_COUNT = 5;
const MAX_TAG_LENGTH = 50;

function validateTags(tags) {
  if (tags === undefined || tags === null) {
    return { value: [] };
  }

  if (!Array.isArray(tags)) {
    return { error: "tags должен быть массивом строк" };
  }

  if (tags.length > MAX_TAGS_COUNT) {
    return { error: `Максимум ${MAX_TAGS_COUNT} тегов` };
  }

  const cleaned = [];
  for (const tag of tags) {
    if (typeof tag !== "string") {
      return { error: "Каждый тег должен быть строкой" };
    }
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed) {
      continue;
    }
    if (trimmed.length > MAX_TAG_LENGTH) {
      return { error: `Тег не должен превышать ${MAX_TAG_LENGTH} символов` };
    }
    cleaned.push(trimmed);
  }

  return { value: [...new Set(cleaned)] };
}

async function buildTagConnections(tagNames) {
  await Promise.all(
    tagNames.map((name) =>
      prisma.tag.upsert({ where: { name }, update: {}, create: { name } })
    )
  );

  const tags = await prisma.tag.findMany({
    where: { name: { in: tagNames } },
    select: { id: true },
  });

  return tags.map((tag) => ({ tag_id: tag.id }));
}

module.exports = {
  getReviews,
  createReview,
  voteOnReview,
  removeVote,
  updateReview,
  deleteReview,
  getUserReviews,
  getReviewById,
};
