const { prisma } = require("../db");

async function getTags(req, res) {
  const where = {};

  if (req.query.search && typeof req.query.search === "string" && req.query.search.trim()) {
    where.name = { startsWith: req.query.search.trim().toLowerCase(), mode: "insensitive" };
  }

  const tags = await prisma.tag.findMany({
    where,
    orderBy: { name: "asc" },
    take: 20,
  });

  return res.json(tags.map((t) => t.name));
}

module.exports = { getTags };
