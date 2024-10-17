import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

interface VideoInfo {
  duration: number;
  height: number;
  width: number;
}

export async function getVideoInfo(filePath: string): Promise<VideoInfo> {
  const ffprobeCommand = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`;

  try {
    const { stdout } = await execAsync(ffprobeCommand);
    const data = JSON.parse(stdout);

    const videoStream = data.streams.find(
      (stream: any) => stream.codec_type === "video"
    );

    if (!videoStream) {
      throw new Error("No video stream found");
    }

    const duration = parseFloat(data.format.duration);
    const height = videoStream.height;
    const width = videoStream.width;

    return {
      duration,
      height,
      width,
    };
  } catch (error) {
    console.error("Error getting video info:", error);
    throw error;
  }
}
