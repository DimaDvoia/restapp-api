require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();

// Подключение к базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Добавим логирование подключения
console.log('Connecting to database...');

// Настройка CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Telegram-WebApp-Version', 'Origin', 'Accept'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  credentials: true
}));

app.use(express.json());

// Обработка OPTIONS запросов
app.options('*', cors());

// Добавляем middleware для логирования запросов
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Добавляем заголовки безопасности
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  next();
});

// Добавляем пинг-роут
app.get('/ping', (req, res) => {
  res.send('pong');
});

// API для получения категорий меню
app.get('/api/menu/categories', async (req, res) => {
  try {
    console.log('Получен запрос на /api/menu/categories');
    const result = await pool.query('SELECT * FROM menu_categories ORDER BY id ASC');
    console.log('Результат запроса:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при получении категорий:', error);
    res.status(500).json({ error: 'Ошибка загрузки категорий' });
  }
});

// API для получения блюд по категории
app.get('/api/menu/items/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const result = await pool.query(
      'SELECT * FROM menu_items WHERE category_id = $1',
      [categoryId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при получении блюд:', error);
    res.status(500).json({ error: 'Ошибка загрузки блюд' });
  }
});

// API для поиска доступных столов
app.post('/api/tables/available', async (req, res) => {
  try {
    const { date, time, guests } = req.body;
    console.log('Поиск столов:', { date, time, guests });

    const result = await pool.query(`
      SELECT * FROM tables 
      WHERE guests_number_min <= $1 
      AND guests_number_max >= $1
      AND id NOT IN (
        SELECT table_id FROM bookings 
        WHERE booking_date = $2 
        AND booking_time = $3
      )
    `, [guests, date, time]);

    console.log('Найдены столы:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при поиске столов:', error);
    res.status(500).json({ error: 'Ошибка при поиске столов' });
  }
});

module.exports = app; 