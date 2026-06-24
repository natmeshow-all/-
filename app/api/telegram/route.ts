import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { message, parseMode = 'HTML', botToken, chatId } = body;

        const telegramBotToken = botToken || process.env.TELEGRAM_BOT_TOKEN;
        const targetChatId = chatId || process.env.TELEGRAM_CHAT_ID;

        if (!telegramBotToken || !targetChatId) {
            console.error('Missing Telegram credentials');
            return NextResponse.json({ error: 'Telegram API setup incomplete' }, { status: 500 });
        }

        const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
        
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: targetChatId,
                text: message,
                parse_mode: parseMode,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Telegram API error:', data);
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error in Telegram API route:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
