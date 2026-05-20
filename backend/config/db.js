// ============================================================
// config/db.js — Pools SQL Server (2 bases distinctes)
//
//   • Base "auth" → BNA               (Users, authentification)
//   • Base "dw"   → DW_BNA_Placements (Data Warehouse, chatbot)
//
// Usage :
//   const { getPool }   = require("../config/db"); // BNA (par défaut)
//   const { getDwPool } = require("../config/db"); // Data Warehouse
// ============================================================
const mssql = require("mssql");
require("dotenv").config();

const DB_NAME_AUTH = process.env.DB_NAME_AUTH || "BNA";
const DB_NAME_DW   = process.env.DB_NAME_DW   || "DW_BNA_Placements";

function buildConfig(database) {
  return {
    server:   process.env.DB_SERVER,
    database,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt:                false,
      trustServerCertificate: true,
      enableArithAbort:       true,
    },
    connectionTimeout: 10_000,
    requestTimeout:    15_000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30_000,
    },
  };
}

// Un pool par base, indexé par nom de base
const pools = {};

function createPool(database) {
  return new mssql.ConnectionPool(buildConfig(database))
    .connect()
    .then(pool => {
      console.log(`✅ Pool SQL Server connecté → ${database}`);
      pool.on("error", err => {
        console.error(`❌ Pool SQL Server (${database}) erreur:`, err);
        delete pools[database];
      });
      return pool;
    })
    .catch(err => {
      delete pools[database];
      throw err;
    });
}

function poolFor(database) {
  if (!pools[database]) pools[database] = createPool(database);
  return pools[database];
}

// Pool par défaut = base d'authentification BNA
function getPool()  { return poolFor(DB_NAME_AUTH); }
function getDwPool() { return poolFor(DB_NAME_DW); }

function resetPool(kind = "auth") {
  const db = kind === "dw" ? DB_NAME_DW : DB_NAME_AUTH;
  delete pools[db];
}

module.exports = {
  mssql,
  getPool,
  getDwPool,
  resetPool,
};
