import { eq } from "drizzle-orm";
import { db } from "./db";
import { videos, jobs } from "./db/schema";
import { nanoid } from "nanoid";
import path from "node:path";
import { fileTypeFromBuffer } from "file-type";
import { PENDING_PROCESSING_DIR, PENDING_UPLOAD_DIR } from "./config";

export async function handleRequest(req: Request): Promise<Response> {
  const response = await getResponse(req);

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  return response;
}

async function getResponse(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response(null);
  }

  if (url.pathname === "/video" && req.method === "POST") {
    return handleUpload(req);
  }

  const videoStatusMatch = url.pathname.match(/^\/video\/([a-zA-Z0-9_-]+)$/);
  if (videoStatusMatch && req.method === "GET") {
    const videoId = videoStatusMatch[1];
    return handleGetVideo(videoId);
  }

  return new Response("Not Found", { status: 404 });
}

async function handleUpload(req: Request): Promise<Response> {
  try {
    const formData = await req.formData();
    const videoId = formData.get("videoId") as string;
    const channelId = formData.get("channelId") as string;
    const mediaFile = formData.get("media") as File | null;
    const thumbnailFile = formData.get("thumbnail") as File | null;

    if (!mediaFile || !thumbnailFile) {
      return Response.json(
        {
          message: "Both media and thumbnail files are required as form data.",
        },
        { status: 400 }
      );
    }

    const existingVideo = await db.query.videos.findFirst({
      where: eq(videos.id, videoId),
    });

    if (existingVideo) {
      return Response.json(
        { message: "A video with this ID already exists." },
        { status: 409 }
      );
    }

    const [mediaJobId, thumbnailJobId] = await Promise.all([
      processAndSaveFile(videoId, mediaFile, "media"),
      processAndSaveFile(videoId, thumbnailFile, "thumbnail"),
    ]);

    if (mediaJobId instanceof Response) {
      return mediaJobId;
    }
    if (thumbnailJobId instanceof Response) {
      return thumbnailJobId;
    }

    await db.insert(videos).values({
      id: videoId,
      thumbnailJobId,
      mediaJobId,
      channelId,
    });

    return Response.json({
      message: "Media and thumbnail uploaded successfully.",
      videoId,
      mediaJobId,
      thumbnailJobId,
    });
  } catch (error) {
    console.error("Error processing upload:", error);
    return Response.json(
      { message: "Error processing upload." },
      { status: 500 }
    );
  }
}

async function handleGetVideo(videoId: string): Promise<Response> {
  try {
    const video = await db.query.videos.findFirst({
      where: eq(videos.id, videoId),
      with: {
        thumbnailJob: true,
        mediaJob: true,
      },
    });

    if (video) {
      const status = {
        videoId,
        thumbnail: sanitizeJob(video.thumbnailJob),
        media: sanitizeJob(video.mediaJob),
      };
      return Response.json(status);
    } else {
      return Response.json({ message: "Video not found." }, { status: 404 });
    }
  } catch (error) {
    console.error("Error querying video status:", error);
    return Response.json(
      { message: "Error retrieving video information." },
      { status: 500 }
    );
  }
}

async function processAndSaveFile(
  videoId: string,
  file: File,
  fileType: "media" | "thumbnail"
): Promise<string | Response> {
  const arrayBuffer = await file.arrayBuffer();
  const detectedFileType = await fileTypeFromBuffer(arrayBuffer);

  if (!detectedFileType) {
    return Response.json(
      { message: `Invalid file type for ${fileType}` },
      { status: 400 }
    );
  }

  if (fileType === "media" && !detectedFileType.mime.startsWith("video/")) {
    return Response.json(
      { message: "The uploaded media file is not a valid video." },
      { status: 400 }
    );
  }

  if (fileType === "thumbnail" && !detectedFileType.mime.startsWith("image/")) {
    return Response.json(
      { message: "The uploaded thumbnail file is not a valid image." },
      { status: 400 }
    );
  }

  const jobId = nanoid();
  const fileName = `${jobId}.${detectedFileType.ext}`;
  const targetDir =
    fileType === "media" ? PENDING_PROCESSING_DIR : PENDING_UPLOAD_DIR;
  const filePath = path.join(targetDir, fileName);

  await Bun.write(filePath, file);

  const initialStatus = fileType === "media" ? "pending_processing" : "hashing";

  const [job] = await db
    .insert(jobs)
    .values({
      id: jobId,
      videoId,
      fileName,
      originalFileSize: file.size,
      processedFileSize: fileType === "media" ? null : file.size,
      fileType,
      status: initialStatus,
    })
    .returning();

  return job.id;
}

function sanitizeJob(job: typeof jobs.$inferSelect) {
  const {
    id,
    originalFileSize,
    processedFileSize,
    status,
    createdAt,
    updatedAt,
    hash,
  } = job;
  return {
    id,
    originalFileSize,
    processedFileSize,
    status,
    createdAt,
    updatedAt,
    hash,
  };
}
