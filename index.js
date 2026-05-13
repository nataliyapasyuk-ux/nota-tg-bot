const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json());

// Разрешаем CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
});

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN; 
const EXPECTED_SECRET = process.env.SECRET_KEY || process.env['nota-notify']; 

// Создаем файл для привязок, если его нет
const USERS_FILE = './users.json';
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}));
}

// ==========================================
// 1. СЛУШАЕМ КОМАНДЫ ОТ ТЕЛЕГРАМА
// ==========================================
app.post('/tg-webhook', async (req, res) => {
    res.sendStatus(200); // Обязательно сразу отвечаем ТГ, что запрос принят

    const message = req.body.message;
    if (!message || !message.text) return;

    const chatId = message.chat.id;
    const text = message.text;

    // Ловим команду привязки (например: /start notacross_4)
    if (text.startsWith('/start notacross_')) {
        const forumId = text.split('_')[1];

        // Читаем базу, добавляем новую связку и сохраняем
        const users = JSON.parse(fs.readFileSync(USERS_FILE));
        users[forumId] = chatId;
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

        // Отправляем радостное сообщение пользователю
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: `✅ Супер! Ваш профиль на форуме Notacross (ID: ${forumId}) успешно привязан. Теперь сюда будут приходить уведомления.`
            })
        });
    }
});

// ==========================================
// 2. ПРИНИМАЕМ ПУШИ С ФОРУМА
// ==========================================
app.post('/notify', async (req, res) => {
    // ВАЖНО: теперь мы ждем forumId (например, 4), а не chatId
    const { secret, forumId, message } = req.body;

    if (secret !== EXPECTED_SECRET) {
        return res.status(403).json({ error: 'Доступ запрещен. Неверный ключ.' });
    }

    if (!forumId || !message) {
        return res.status(400).json({ error: 'Отсутствует forumId или текст сообщения' });
    }

    // Ищем Телеграм ID по форумному ID
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    const chatId = users[forumId];

    // Если человек не привязал бота — просто игнорируем, это не ошибка
    if (!chatId) {
        return res.status(200).json({ info: 'Пользователь не привязан к Телеграму' });
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
    res.send('Notacross Bot v2 is running! Webhooks ready.');
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
