import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { BeadPatternDto } from '@/types';
import { DEFAULT_COLORS } from '@/types';
import { generateId, uint8ArrayToBase64 } from '@/lib/utils';

// In-memory storage (replace with database in production)
const patterns = new Map<string, BeadPatternDto>();

// Validation schemas
const createPatternSchema = z.object({
  name: z.string().optional().default('Untitled'),
  author: z.string().optional(),
  width: z.number().min(3).max(50).default(8),
  height: z.number().min(1).max(1000).default(100),
});

// GET /api/patterns - List all patterns
export async function GET() {
  const list = Array.from(patterns.values());
  return NextResponse.json({ patterns: list });
}

// POST /api/patterns - Create new pattern
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createPatternSchema.parse(body);

    const id = generateId();
    const now = new Date().toISOString();

    // Create empty field
    const field = new Uint8Array(data.width * data.height);

    const pattern: BeadPatternDto = {
      id,
      name: data.name,
      author: data.author,
      width: data.width,
      height: data.height,
      field: uint8ArrayToBase64(field),
      colors: DEFAULT_COLORS,
      createdAt: now,
      updatedAt: now,
      isPublic: false,
    };

    patterns.set(id, pattern);

    return NextResponse.json(pattern, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
