const { Router } = require("express");
const { getComments, createComment, deleteComment } = require("../controllers/comments");
const { authenticate } = require("../middleware/auth");
const { optionalAuth } = require("../middleware/optional-auth");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = Router({ mergeParams: true });

/**
 * @openapi
 * /reviews/{reviewId}/comments:
 *   get:
 *     tags: [Comments]
 *     summary: Список комментариев к рецензии
 *     description: |
 *       Возвращает пагинированный список комментариев, отсортированных по дате (от старых к новым).
 *       Если передан JWT — в поле `is_own` будет true для собственных комментариев.
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     parameters:
 *       - name: reviewId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID рецензии
 *       - $ref: '#/components/parameters/PageParam'
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Количество комментариев на странице (макс 50, по умолчанию 20)
 *     responses:
 *       200:
 *         description: Список комментариев
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommentListResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.get("/:reviewId/comments", optionalAuth, asyncHandler(getComments));

/**
 * @openapi
 * /reviews/{reviewId}/comments:
 *   post:
 *     tags: [Comments]
 *     summary: Добавить комментарий
 *     description: |
 *       Создаёт комментарий к рецензии.
 *       По умолчанию комментарий анонимный (`is_anonymous: true`).
 *       Чтобы показать имя — передайте `is_anonymous: false`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: reviewId
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
 *             $ref: '#/components/schemas/CreateCommentRequest'
 *     responses:
 *       201:
 *         description: Комментарий создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommentResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Рецензия не найдена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/:reviewId/comments", authenticate, asyncHandler(createComment));

/**
 * @openapi
 * /reviews/{reviewId}/comments/{id}:
 *   delete:
 *     tags: [Comments]
 *     summary: Удалить комментарий
 *     description: Удаляет комментарий. Доступно только автору комментария.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: reviewId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID рецензии
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID комментария
 *     responses:
 *       204:
 *         description: Комментарий удалён
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete("/:reviewId/comments/:id", authenticate, asyncHandler(deleteComment));

module.exports = router;
