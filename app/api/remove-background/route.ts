import { NextRequest } from "next/server";

export const runtime = "edge";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DEFAULT_REMOVE_BG_URL = "https://api.remove.bg/v1.0/removebg";

function errorResponse(error: string, message: string, status: number) {
  return Response.json({ error, message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return errorResponse("SERVICE_UNAVAILABLE", "Image processing is not configured yet. Please try again later.", 503);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("INVALID_FILE", "Please upload a valid image file.", 400);
  }

  const image = formData.get("image");
  if (!(image instanceof File) || !ACCEPTED_TYPES.has(image.type) || image.size > MAX_FILE_SIZE) {
    return errorResponse("INVALID_FILE", "Please upload a JPG, PNG, or WebP image under 10 MB.", 400);
  }

  const upstreamFormData = new FormData();
  upstreamFormData.append("image_file", image, image.name);
  upstreamFormData.append("size", "auto");
  upstreamFormData.append("format", "png");

  let upstream: Response;
  try {
    upstream = await fetch(process.env.REMOVE_BG_API_URL ?? DEFAULT_REMOVE_BG_URL, {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: upstreamFormData,
      signal: request.signal,
    });
  } catch {
    return errorResponse("SERVICE_UNAVAILABLE", "The image processing service is unavailable. Please try again later.", 503);
  }

  if (!upstream.ok || !upstream.body) {
    const unavailable = [401, 402, 429].includes(upstream.status);
    return errorResponse(
      unavailable ? "SERVICE_UNAVAILABLE" : "PROCESSING_FAILED",
      unavailable ? "The image processing service is temporarily unavailable. Please try again later." : "We could not process this image. Please try a different one.",
      unavailable ? 503 : 502,
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": 'attachment; filename="image-without-background.png"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

