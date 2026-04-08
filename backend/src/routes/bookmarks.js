const { Router } = require("express");
const { getUserBookmarks, addBookmark, removeBookmark } = require("../controllers/bookmarks");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = Router();

/**
 * @openapi
 * /bookmarks:
 *   get:
 *     tags: [Bookmarks]
 *     summary: Мои закладки
 *     description: |
 *       Возвращает пагинированный список рецензий, добавленных в закладки текущим пользователем.
 *       Включает `has_voted` для корректного отображения кнопки голоса.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Список закладок
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewListResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get("/bookmarks", authenticate, asyncHandler(getUserBookmarks));

/**
 * @openapi
 * /reviews/{id}/bookmark:
 *   post:
 *     tags: [Bookmarks]
 *     summary: Добавить в закладки
 *     description: Добавляет рецензию в закладки текущего пользователя.
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
 *       201:
 *         description: Рецензия добавлена в закладки
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookmarkStatusResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Рецензия уже в закладках
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Рецензия уже в закладках"
 */
router.post("/reviews/:id/bookmark", authenticate, asyncHandler(addBookmark));

/**
 * @openapi
 * /reviews/{id}/bookmark:
 *   delete:
 *     tags: [Bookmarks]
 *     summary: Удалить из закладок
 *     description: Убирает рецензию из закладок текущего пользователя.
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
 *         description: Рецензия убрана из закладок
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookmarkStatusResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Закладка не найдена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Закладка не найдена"
 */
router.delete("/reviews/:id/bookmark", authenticate, asyncHandler(removeBookmark));

module.exports = router;
