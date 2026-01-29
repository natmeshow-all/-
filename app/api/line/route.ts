import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { messages, to } = body;

        const lineAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        const targetUserId = to || process.env.LINE_USER_ID;

        if (!lineAccessToken || !targetUserId) {
            console.error('Missing Line credentials', { lineAccessToken: !!lineAccessToken, targetUserId: !!targetUserId });
            return NextResponse.json({ error: 'Messaging API setup incomplete' }, { status: 500 });
        }

        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${lineAccessToken}`,
            },
            body: JSON.stringify({
                to: targetUserId,
                messages: messages,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Line API error:', data);
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error in Line API route:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
