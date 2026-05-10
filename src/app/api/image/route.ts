import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, size } = body as {
      prompt: string;
      size?: string;
    };

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // We use z-ai-web-dev-sdk for image generation
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const validSizes = ["1024x1024", "768x1344", "864x1152", "1344x768", "1152x864", "1440x720", "720x1440"];
    const imageResponse = await zai.images.generations.create({
      prompt,
      size: validSizes.includes(size || "") ? size : "1024x1024",
    });

    const base64 = imageResponse.data?.[0]?.base64;
    if (!base64) {
      return new Response(
        JSON.stringify({ error: "Failed to generate image" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ base64, prompt }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Image generation error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Image generation failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
