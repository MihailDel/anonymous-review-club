const { Router } = require("express");
const { getTags } = require("../controllers/tags");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = Router();

/**
 * @openapi
 * /tags:
 *   get:
 *     tags: [Tags]
 *     summary: Список тегов
 *     description: |
 *       Возвращает список тегов для автокомплита.
 *       Без параметра `search` — возвращает все теги (до 20).
 *       С параметром `search` — фильтрует по префиксу (case-insensitive).
 *     parameters:
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Префикс для поиска тегов
 *         example: фэнт
 *     responses:
 *       200:
 *         description: Массив имён тегов
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *               maxItems: 20
 *               example: ["фэнтези", "фэнтези-мир"]
 */
router.get("/", asyncHandler(getTags));

module.exports = router;
