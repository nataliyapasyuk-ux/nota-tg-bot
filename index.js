const express = require('express');
const app = express();
app.use(express.json());

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
const VPS_NOTIFY_URL = "https://notahub.ru/distrib/database/nota/notify.php";

// ==========================================
// 1. СЛУШАЕМ КОМАНДЫ ОТ ТЕЛЕГРАМА (WEBHOOK)
// ==========================================
app.post('/tg-webhook', async (req, res) => {
    res.sendStatus(200);

    const message = req.body.message;
    if (!message || !message.text) return;

    const chatId = message.chat.id;
    const text = message.text;

    if (text.startsWith('/start ') && text.length > 7) {
        const token = text.split(' ')[1];

        try {
            const response = await fetch(VPS_NOTIFY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    secret: EXPECTED_SECRET,
                    action: 'exchange_tg_token',
                    token: token,
                    telegram_id: chatId,
                    forum_prefix: 'notacross'
                })
            });

            const result = await response.json();

            if (result.success) {
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `✅ <b>Успешно привязано!</b>\n\nВаш аккаунт привязан к основе (ID: ${result.user_id}). Теперь уведомления для всех ваших твинков, связанных с этим мэйном, будут приходить в этот чат автоматически!`,
                        parse_mode: 'HTML'
                    })
                });
            } else {
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `❌ <b>Ошибка!</b> Код авторизации устарел. Пожалуйста, сгенерируйте новый код в модалке на форуме.`,
                        parse_mode: 'HTML'
                    })
                });
            }
        } catch (err) {
            console.error('Ошибка при обмене токена:', err);
        }
    } 
    else if (text === '/start') {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: `👋 Привет! Чтобы подключить моментальные уведомления, открой модалку уведомлений (колокольчик) на форуме и нажми кнопку активации.`,
                parse_mode: 'HTML'
            })
        });
    }
});

// ==========================================
// 2. ПРИНИМАЕМ ПУШИ С ФОРУМА ДЛЯ ОТПРАВКИ
// ==========================================
app.post('/notify', async (req, res) => {
    const { secret, telegramId, message } = req.body;

    if (secret !== EXPECTED_SECRET) return res.status(403).json({ error: 'Forbidden' });
    if (!telegramId || !message) return res.status(400).json({ error: 'Missing data' });

    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: telegramId,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            })
        });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Internal error' });
    }
});

app.listen(PORT, () => console.log(`Бот запущен на порту ${PORT}`));
