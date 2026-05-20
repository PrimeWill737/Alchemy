import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/request-session";
import { isCloudinaryConfigured, uploadBufferToCloudinary } from "@/lib/cloudinary-upload";

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

function isProbablyVideo(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  return /\.(mp4|webm|mov|mkv|avi|m4v|wmv|mpeg|mpg|3gp|flv|ogv|ts|mts|m2ts)$/i.test(file.name);
}

function isProbablyImage(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|bmp|svg|heic|heif|avif|tiff?|ico|jfif|psd|raw|cr2|nef|arw)$/i.test(
    file.name,
  );
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      {
        error:
          "Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const video = isProbablyVideo(file);
  const image = isProbablyImage(file);
  if (!video && !image) {
    return NextResponse.json(
      { error: "Upload an image or video file (any common format)." },
      { status: 400 },
    );
  }

  if (video) {
    if (file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: "Video must be 100 MB or smaller." }, { status: 400 });
    }
  } else if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image must be 50 MB or smaller." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadBufferToCloudinary(buffer);

    const kind = result.resource_type === "video" ? "video" : "image";

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      kind,
      resourceType: result.resource_type,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
