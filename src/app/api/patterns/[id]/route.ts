import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { BeadPatternDto } from '@/types';

// In-memory storage (shared with parent route in production would use DB)
const patterns = new Map<string, BeadPatternDto>();

// Validation schemas
const updatePatternSchema = z.object({
  name: z.string().optional(),
  author: z.string().optional(),
  notes: z.string().optional(),
  field: z.string().optional(),
  colors: z.array(z.object({
    r: z.number().min(0).max(255),
    g: z.number().min(0).max(255),
    b: z.number().min(0).max(255),
    a: z.number().min(0).max(255).optional(),
    name: z.string().optional(),
    symbol: z.string().optional(),
  })).optional(),
  isPublic: z.boolean().optional(),
  price: z.number().optional(),
});

// GET /api/patterns/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const pattern = patterns.get(params.id);

  if (!pattern) {
    return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
  }

  return NextResponse.json(pattern);
}

// PUT /api/patterns/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = patterns.get(params.id);

    if (!existing) {
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
    }

    const body = await request.json();
    const updates = updatePatternSchema.parse(body);

    const updated: BeadPatternDto = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    patterns.set(params.id, updated);

    return NextResponse.json(updated);
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

// DELETE /api/patterns/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!patterns.has(params.id)) {
    return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
  }

  patterns.delete(params.id);

  return new NextResponse(null, { status: 204 });
}
