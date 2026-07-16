const express = require("express");
const { Pool } = require("pg");
const { createClient } = require("redis");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

/* ============================
   PostgreSQL
============================ */

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "testdb",
  user: process.env.DB_USER || "testuser",
  password: process.env.DB_PASSWORD || "testpass",
});

/* ============================
   Redis
============================ */

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || "localhost"}:${
    process.env.REDIS_PORT || 6379
  }`,
});

redisClient.on("error", (err) => {
  console.error("❌ Redis:", err.message);
});

async function connectRedis() {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log("✅ Redis conectado");
    }
  } catch (error) {
    console.error("Error conectando Redis:", error.message);
  }
}

/* ============================
   Crear tabla si no existe
============================ */

async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users(
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL
      );
    `);

    console.log("✅ Tabla users lista");
  } catch (err) {
    console.error("Error inicializando BD:", err.message);
  }
}

/* ============================
   Health Check
============================ */

app.get("/health", async (req, res) => {
  let dbStatus = false;
  let redisStatus = false;

  try {
    await pool.query("SELECT NOW()");
    dbStatus = true;
  } catch {}

  redisStatus = redisClient.isOpen;

  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      postgres: dbStatus,
      redis: redisStatus,
    },
  });
});

/* ============================
   Crear usuario
============================ */

app.post("/users", async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      error: "Nombre y correo son obligatorios",
    });
  }

  try {
    const result = await pool.query(
      "INSERT INTO users(name,email) VALUES($1,$2) RETURNING *",
      [name, email]
    );

    const user = result.rows[0];

    try {
      await redisClient.set(`user:${user.id}`, JSON.stringify(user));
    } catch (err) {
      console.log("No fue posible guardar en Redis");
    }

    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

/* ============================
   Obtener usuario
============================ */

app.get("/users/:id", async (req, res) => {
  const id = req.params.id;

  /* Buscar en Redis */

  try {
    const cache = await redisClient.get(`user:${id}`);

    if (cache) {
      return res.json({
        source: "cache",
        data: JSON.parse(cache),
      });
    }
  } catch (err) {}

  /* Buscar en PostgreSQL */

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE id=$1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Usuario no encontrado",
      });
    }

    const user = result.rows[0];

    try {
      await redisClient.set(
        `user:${id}`,
        JSON.stringify(user)
      );
    } catch (err) {}

    res.json({
      source: "database",
      data: user,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

/* ============================
   Ruta principal
============================ */

app.get("/", (req, res) => {
  res.json({
    message: "Aplicación Jenkins MultiContainer funcionando",
  });
});

/* ============================
   Inicio del servidor
============================ */

async function startServer() {
  await initializeDatabase();
  await connectRedis();

  app.listen(PORT, () => {
    console.log(`🚀 Servidor iniciado en http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

/* ============================
   Exportaciones
============================ */

module.exports = {
  app,
  pool,
  redisClient,
  connectRedis,
  initializeDatabase,
};