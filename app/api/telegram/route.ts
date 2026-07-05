import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { message, image, document, filename = 'report.xlsx', parseMode = 'HTML', botToken, chatId } = body;

        const telegramBotToken = (botToken || process.env.TELEGRAM_BOT_TOKEN)?.trim();
        const targetChatId = (chatId || process.env.TELEGRAM_CHAT_ID)?.trim();

        if (!telegramBotToken || !targetChatId) {
            console.error('Missing Telegram credentials');
            return NextResponse.json({ error: 'Telegram API setup incomplete' }, { status: 500 });
        }

        let telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
        let options: RequestInit = {};

        if (document) {
            telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendDocument`;
            const formData = new FormData();
            formData.append('chat_id', targetChatId);
            if (message) formData.append('caption', message);
            formData.append('parse_mode', parseMode);
            
            // document format: base64 string
            const base64Data = document.replace(/^data:.*?;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            formData.append('document', blob, filename);

            options = {
                method: 'POST',
                body: formData,
            };
        } else if (image) {
            telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendPhoto`;
            const formData = new FormData();
            formData.append('chat_id', targetChatId);
            if (message) formData.append('caption', message);
            formData.append('parse_mode', parseMode);
            
            // image format: data:image/png;base64,...
            const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const blob = new Blob([buffer], { type: 'image/png' });
            formData.append('photo', blob, 'report.png');

            options = {
                method: 'POST',
                body: formData,
            };
        } else {
            options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: targetChatId, text: message, parse_mode: parseMode }),
            };
        }
        
        const response = await fetch(telegramUrl, options);

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
