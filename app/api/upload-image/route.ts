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
        formData.append('files[]', new Blob([buffer], { type: 'image/jpeg' }), 'report.jpg');

        const response = await fetch('https://uguu.se/upload.php', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Image hosting upload failed: ${response.status}`);
        }

        const data = await response.json();
        if (data && data.success && data.files && data.files.length > 0) {
            const url = data.files[0].url;
            return NextResponse.json({ url });
        } else {
            throw new Error('Image hosting returned invalid response');
        }
    } catch (error) {
        console.error('Image upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
