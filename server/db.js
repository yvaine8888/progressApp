import 'dotenv/config'
import mysql from 'mysql2/promise'

const requiredSettings = ['DB_HOST', 'DB_USER', 'DB_NAME']
const missingSettings = requiredSettings.filter((setting) => !process.env[setting])

if (missingSettings.length > 0) {
  throw new Error(
    `Missing MySQL settings in .env: ${missingSettings.join(', ')}`,
  )
}

const port = Number(process.env.DB_PORT ?? 3306)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('DB_PORT must be a valid port number between 1 and 65535.')
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

export default pool
