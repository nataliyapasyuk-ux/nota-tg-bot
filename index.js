const express = require('express');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); // Разрешаем запросы с любых доменов
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    
    // Браузер перед POST-запросом шлет проверочный OPTIONS-запрос. Отвечаем ему ОК.
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN; 
const SECRET_KEY = process.env.SECRET_KEY; 

app.post('/notify', async (req, res) => {
    const { secret, chatId, message } = req.body;

    if (secret !== SECRET_KEY) {
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
    res.send('Notacross Notifier Bot is running! 🚀 CORS enabled!');
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
