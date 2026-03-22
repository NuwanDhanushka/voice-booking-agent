import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
const API_KEY = process.env.API_KEY ?? '';

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    try {
        const { path } = await params;
        const targetUrl = `${API_BASE_URL}/${path.join('/')}`;

        const contentType = request.headers.get('content-type') || '';
        const headers: HeadersInit = { 'x-api-key': API_KEY };
        let body: BodyInit;

        if (contentType.includes('multipart/form-data')) {
            // Forward FormData properly so Node fetch assigns multipart boundaries securely
            body = await request.formData();
        } else {
            // Forward arbitrary JSON payloads safely
            body = await request.text();
            if (contentType) {
                headers['Content-Type'] = contentType;
            } else {
                headers['Content-Type'] = 'application/json';
            }
        }

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers,
            body,
        });

        // Always assume backend yields JSON representations (or nestjs error shapes)
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Internal Proxy Error' },
            { status: 500 }
        );
    }
}
