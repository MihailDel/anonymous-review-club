const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Anonymous Review Club API",
      version: "1.0.0",
      description:
        "REST API для платформы анонимных рецензий на медиаконтент. " +
        "Авторство рецензии скрыто до достижения порога лайков, после чего раскрывается автоматически.",
      contact: {
        name: "Anonymous Review Club",
      },
    },
    servers: [
      {
        url: "/api",
        description: "API сервер",
      },
    ],
    tags: [
      { name: "Auth", description: "Регистрация и аутентификация" },
      { name: "Reviews", description: "CRUD операции с рецензиями" },
      { name: "Votes", description: "Голосование за рецензии (лайк/анлайк)" },
      { name: "Comments", description: "Комментарии к рецензиям" },
      { name: "Tags", description: "Теги для рецензий" },
      { name: "Bookmarks", description: "Закладки пользователя" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT токен, полученный при регистрации или входе. Срок действия — 7 дней.",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Сообщение об ошибке",
              example: "Рецензия не найдена",
            },
          },
          required: ["error"],
        },
        MediaType: {
          type: "string",
          enum: ["book", "film", "music", "series", "games", "podcasts"],
          description: "Тип медиаконтента",
          example: "book",
        },
        AuthResponse: {
          type: "object",
          properties: {
            user: {
              type: "object",
              properties: {
                id: { type: "integer", example: 1 },
                username: { type: "string", example: "john_doe" },
              },
              required: ["id", "username"],
            },
            token: {
              type: "string",
              description: "JWT токен (7 дней)",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
          },
          required: ["user", "token"],
        },
        RegisterRequest: {
          type: "object",
          properties: {
            username: {
              type: "string",
              minLength: 3,
              maxLength: 50,
              description: "Уникальное имя пользователя",
              example: "john_doe",
            },
            email: {
              type: "string",
              format: "email",
              description: "Email (уникальный)",
              example: "john@example.com",
            },
            password: {
              type: "string",
              minLength: 6,
              description: "Пароль (минимум 6 символов)",
              example: "securePassword123",
            },
          },
          required: ["username", "email", "password"],
        },
        LoginRequest: {
          type: "object",
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },
            password: {
              type: "string",
              example: "securePassword123",
            },
          },
          required: ["email", "password"],
        },
        ReviewResponse: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            title: { type: "string", example: "Гарри Поттер и философский камень" },
            content: { type: "string", example: "Потрясающая книга, с которой начинается великая история..." },
            media_type: { $ref: "#/components/schemas/MediaType" },
            rating: {
              type: "integer",
              nullable: true,
              minimum: 1,
              maximum: 5,
              description: "Оценка 1-5 (null если не указана)",
              example: 5,
            },
            likes_count: { type: "integer", example: 12 },
            is_author_revealed: {
              type: "boolean",
              description: "true если likes_count >= REVEAL_THRESHOLD",
              example: true,
            },
            author: {
              type: "string",
              description: "Имя автора или «Аноним» если не раскрыт",
              example: "john_doe",
            },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2026-04-08T12:00:00.000Z",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              example: ["фэнтези", "магия"],
            },
            comments_count: { type: "integer", example: 3 },
            has_voted: {
              type: "boolean",
              description: "Голосовал ли текущий пользователь (false если не авторизован)",
              example: false,
            },
            is_bookmarked: {
              type: "boolean",
              description: "В закладках ли у текущего пользователя",
              example: false,
            },
          },
        },
        ReviewListResponse: {
          type: "object",
          properties: {
            reviews: {
              type: "array",
              items: { $ref: "#/components/schemas/ReviewResponse" },
            },
            total: { type: "integer", description: "Общее количество записей", example: 42 },
            page: { type: "integer", example: 1 },
            totalPages: { type: "integer", example: 5 },
          },
          required: ["reviews", "total", "page", "totalPages"],
        },
        CreateReviewRequest: {
          type: "object",
          properties: {
            title: {
              type: "string",
              maxLength: 200,
              description: "Название произведения",
              example: "Гарри Поттер и философский камень",
            },
            content: {
              type: "string",
              maxLength: 10000,
              description: "Текст рецензии",
              example: "Потрясающая книга, которая заставляет поверить в чудеса...",
            },
            media_type: { $ref: "#/components/schemas/MediaType" },
            rating: {
              type: "integer",
              nullable: true,
              minimum: 1,
              maximum: 5,
              description: "Оценка (необязательно)",
              example: 5,
            },
            tags: {
              type: "array",
              items: { type: "string", maxLength: 50 },
              maxItems: 5,
              description: "Теги (макс 5 штук, каждый макс 50 символов)",
              example: ["фэнтези", "магия"],
            },
          },
          required: ["title", "content", "media_type"],
        },
        UpdateReviewRequest: {
          type: "object",
          description: "Все поля необязательны, но хотя бы одно должно присутствовать",
          properties: {
            title: { type: "string", maxLength: 200, example: "Обновлённое название" },
            content: { type: "string", maxLength: 10000, example: "Обновлённый текст рецензии..." },
            media_type: { $ref: "#/components/schemas/MediaType" },
            rating: {
              type: "integer",
              nullable: true,
              minimum: 1,
              maximum: 5,
              example: 4,
            },
            tags: {
              type: "array",
              items: { type: "string", maxLength: 50 },
              maxItems: 5,
              example: ["новый-тег"],
            },
          },
        },
        MyReviewResponse: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            title: { type: "string", example: "Мой отзыв" },
            content: { type: "string", example: "Текст..." },
            media_type: { $ref: "#/components/schemas/MediaType" },
            rating: { type: "integer", nullable: true, example: 4 },
            likes_count: { type: "integer", example: 5 },
            is_author_revealed: { type: "boolean", example: false },
            created_at: { type: "string", format: "date-time" },
            tags: {
              type: "array",
              items: { type: "string" },
              example: ["тег1"],
            },
          },
        },
        VoteResponse: {
          type: "object",
          properties: {
            likes_count: { type: "integer", description: "Обновлённое количество лайков", example: 11 },
            is_author_revealed: {
              type: "boolean",
              description: "Раскрыт ли автор после голоса",
              example: true,
            },
            author: {
              type: "string",
              description: "Имя автора или «Аноним»",
              example: "john_doe",
            },
          },
          required: ["likes_count", "is_author_revealed", "author"],
        },
        CommentResponse: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            content: { type: "string", example: "Отличная рецензия!" },
            is_anonymous: { type: "boolean", description: "Анонимный ли комментарий", example: true },
            author: {
              type: "string",
              description: "Имя автора или «Аноним»",
              example: "Аноним",
            },
            is_own: {
              type: "boolean",
              description: "Принадлежит ли комментарий текущему пользователю",
              example: false,
            },
            created_at: { type: "string", format: "date-time" },
          },
        },
        CommentListResponse: {
          type: "object",
          properties: {
            comments: {
              type: "array",
              items: { $ref: "#/components/schemas/CommentResponse" },
            },
            total: { type: "integer", example: 5 },
            page: { type: "integer", example: 1 },
            totalPages: { type: "integer", example: 1 },
          },
          required: ["comments", "total", "page", "totalPages"],
        },
        CreateCommentRequest: {
          type: "object",
          properties: {
            content: {
              type: "string",
              maxLength: 2000,
              description: "Текст комментария",
              example: "Очень интересная рецензия!",
            },
            is_anonymous: {
              type: "boolean",
              description: "Анонимный комментарий (по умолчанию true)",
              default: true,
              example: true,
            },
          },
          required: ["content"],
        },
        BookmarkStatusResponse: {
          type: "object",
          properties: {
            is_bookmarked: { type: "boolean", example: true },
          },
          required: ["is_bookmarked"],
        },
      },
      parameters: {
        PageParam: {
          name: "page",
          in: "query",
          schema: { type: "integer", minimum: 1, default: 1 },
          description: "Номер страницы",
        },
        LimitParam: {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 50, default: 10 },
          description: "Количество записей на странице (макс 50)",
        },
      },
      responses: {
        UnauthorizedError: {
          description: "Токен не предоставлен или невалиден",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { error: "Токен не предоставлен" },
            },
          },
        },
        ForbiddenError: {
          description: "Нет прав для выполнения операции",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { error: "Нет прав для выполнения операции" },
            },
          },
        },
        NotFoundError: {
          description: "Ресурс не найден",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { error: "Ресурс не найден" },
            },
          },
        },
        ValidationError: {
          description: "Ошибка валидации входных данных",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec };
