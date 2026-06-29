import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const reqFormData = await request.formData();
        const file = reqFormData.get('image') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

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
