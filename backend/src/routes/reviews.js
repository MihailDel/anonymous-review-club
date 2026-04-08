const { Router } = require("express");
const {
  getReviews,
  createReview,
  voteOnReview,
  removeVote,
  updateReview,
  deleteReview,
  getUserReviews,
  getReviewById,
} = require("../controllers/reviews");
const { authenticate } = require("../middleware/auth");
const { optionalAuth } = require("../middleware/optional-auth");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = Router();

/**
 * @openapi
 * /reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: Лента рецензий
 *     description: |
 *       Возвращает пагинированный список рецензий с фильтрацией и сортировкой.
 *       Если передан JWT — в ответе будут поля `has_voted` и `is_bookmarked` для текущего пользователя.
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Поиск по названию (case-insensitive)
 *         example: Гарри Поттер
 *       - name: media_type
 *         in: query
 *         schema:
 *           $ref: '#/components/schemas/MediaType'
 *         description: Фильтр по типу медиа
 *       - name: sort
 *         in: query
 *         schema:
 *           type: string
 *           enum: [date_desc, date_asc, popular, rating]
 *           default: date_desc
 *         description: |
 *           Сортировка:
 *           - `date_desc` — сначала новые (по умолчанию)
 *           - `date_asc` — сначала старые
 *           - `popular` — по количеству лайков
 *           - `rating` — по рейтингу
 *       - name: tag
 *         in: query
 *         schema:
 *           type: string
 *         description: Фильтр по тегу (точное совпадение)
 *         example: фэнтези
 *     responses:
 *       200:
 *         description: Список рецензий
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewListResponse'
 */
router.get("/", optionalAuth, asyncHandler(getReviews));

/**
 * @openapi
 * /reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Создать рецензию
 *     description: |
 *       Публикует новую анонимную рецензию.
 *       Автор всегда скрыт при создании (`is_author_revealed: false`).
 *
 *       **Антиспам:** нельзя создать рецензию с тем же названием (case-insensitive) чаще чем раз в 24 часа.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateReviewRequest'
 *     responses:
 *       201:
 *         description: Рецензия создана
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         description: Рецензия с таким названием уже опубликована за последние 24 часа
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Вы уже публиковали рецензию на это произведение сегодня"
 */
router.post("/", authenticate, asyncHandler(createReview));

/**
 * @openapi
 * /reviews/my:
 *   get:
 *     tags: [Reviews]
 *     summary: Мои рецензии
 *     description: Возвращает все рецензии текущего пользователя (без пагинации, от новых к старым).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список рецензий пользователя
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MyReviewResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get("/my", authenticate, asyncHandler(getUserReviews));

/**
 * @openapi
 * /reviews/{id}:
 *   get:
 *     tags: [Reviews]
 *     summary: Получить рецензию по ID
 *     description: |
 *       Возвращает полные данные рецензии.
 *       Если передан JWT — включает `has_voted` и `is_bookmarked`.
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID рецензии
 *     responses:
 *       200:
 *         description: Данные рецензии
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewResponse'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get("/:id", optionalAuth, asyncHandler(getReviewById));

/**
 * @openapi
 * /reviews/{id}:
 *   put:
 *     tags: [Reviews]
 *     summary: Редактировать рецензию
 *     description: |
 *       Обновляет рецензию. Доступно только автору.
 *       Все поля необязательны, но хотя бы одно должно присутствовать.
 *       При обновлении тегов — старые заменяются полностью.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID рецензии
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateReviewRequest'
 *     responses:
 *       200:
 *         description: Обновлённая рецензия
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MyReviewResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put("/:id", authenticate, asyncHandler(updateReview));

/**
 * @openapi
 * /reviews/{id}:
 *   delete:
 *     tags: [Reviews]
 *     summary: Удалить рецензию
 *     description: |
 *       Удаляет рецензию. Доступно только автору.
 *       Каскадно удаляются голоса, комментарии, закладки и теги.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID рецензии
 *     responses:
 *       204:
 *         description: Рецензия удалена
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete("/:id", authenticate, asyncHandler(deleteReview));

/**
 * @openapi
 * /reviews/{id}/vote:
 *   post:
 *     tags: [Votes]
 *     summary: Поставить лайк
 *     description: |
 *       Голосует за рецензию (лайк). Выполняется в атомарной транзакции.
 *
 *       **Правила:**
 *       - Нельзя голосовать за свою рецензию (403)
 *       - Нельзя голосовать повторно (409)
 *       - При достижении порога лайков (`REVEAL_THRESHOLD`, по умолчанию 10) автор раскрывается автоматически
 *       - Раскрытие одностороннее — не откатывается при снятии лайка
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID рецензии
 *     responses:
 *       200:
 *         description: Голос учтён
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VoteResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Нельзя голосовать за свою рецензию
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Нельзя голосовать за свою рецензию"
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Пользователь уже голосовал за эту рецензию
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Вы уже голосовали за эту рецензию"
 */
router.post("/:id/vote", authenticate, asyncHandler(voteOnReview));

/**
 * @openapi
 * /reviews/{id}/vote:
 *   delete:
 *     tags: [Votes]
 *     summary: Снять лайк
 *     description: |
 *       Удаляет голос пользователя. Декрементирует `likes_count`.
 *
 *       **Важно:** если автор уже был раскрыт, снятие лайка не откатывает раскрытие.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID рецензии
 *     responses:
 *       200:
 *         description: Голос снят
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VoteResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Голос не найден (пользователь не голосовал)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Голос не найден"
 */
router.delete("/:id/vote", authenticate, asyncHandler(removeVote));

module.exports = router;
