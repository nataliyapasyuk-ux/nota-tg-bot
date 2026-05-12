const express = require('express');

const app = express();
app.use(express.json());

// Разрешаем браузерам отправлять нам запросы (обходим CORS)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

const PORT = process.env.PORT || 3000;
// Берем токен (на всякий случай проверяем и системную переменную хостинга)
const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN; 

// 🔥 ИЩЕМ ПАРОЛЬ В ЛЮБОЙ ИЗ ДВУХ ПЕРЕМЕННЫХ 🔥
const EXPECTED_SECRET = process.env.SECRET_KEY || process.env['nota-notify']; 

app.post('/notify', async (req, res) => {
    const { secret, chatId, message } = req.body;

    // Сравниваем присланный пароль с ожидаемым
    if (secret !== EXPECTED_SECRET) {
        return res.status(403).json({ error: 'Доступ запрещен. Неверный ключ.' });
    }

    if (!chatId || !message) {
        return res.status(400).json({ error: 'Отсутствует chatId или текст сообщения' });
    }

    try {
        const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        
        const response = await fetch(tgUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            })
        });

        const data = await response.json();
        
        if (!data.ok) {
            console.error('Ошибка Telegram API:', data);
            return res.status(500).json({ error: 'Ошибка отправки в ТГ', details: data });
        }

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Ошибка сервера:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

app.get('/', (req, res) => {
    res.send('Notacross Notifier Bot is running! 🚀 CORS enabled & Secret check updated!');
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
