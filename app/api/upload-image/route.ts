import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { base64Image } = body;

        if (!base64Image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        // Convert base64 data URL to buffer
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        const formData = new FormData();
        formData.append('reqtype', 'fileupload');
        formData.append('fileToUpload', new Blob([buffer], { type: 'image/jpeg' }), 'report.jpg');

        const response = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Image hosting upload failed');
        }

        const url = await response.text();
        return NextResponse.json({ url });
    } catch (error) {
        console.error('Image upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
