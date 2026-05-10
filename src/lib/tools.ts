/**
 * Tool definitions and execution for OpenManus.
 * Uses Gemini's native function calling for structured tool use.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execFileAsync = promisify(execFile);

// Workspace directory for file operations
const WORKSPACE_DIR = "/tmp/agentforge-workspace";

// Maximum execution time for code (seconds)
const CODE_TIMEOUT = 30;

// ─── Gemini Function Declarations ────────────────────────────────────────────

export const OPENMANUS_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "web_search",
        description:
          "Search the web for current information. Returns a list of results with titles, URLs, and snippets. Use this to find up-to-date information, documentation, news, or any facts you are not certain about.",
        parameters: {
          type: "object" as const,
          properties: {
            query: {
              type: "string" as const,
              description: "The search query string",
            },
            num: {
              type: "number" as const,
              description: "Number of results to return (default: 5, max: 10)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "execute_code",
        description:
          "Execute Python code and return the output. Use this for calculations, data processing, running scripts, or any computational task. The code runs in a sandboxed environment with common libraries (numpy, pandas, requests, etc.). Code that takes longer than 30 seconds will be killed.",
        parameters: {
          type: "object" as const,
          properties: {
            code: {
              type: "string" as const,
              description: "Python code to execute",
            },
            description: {
              type: "string" as const,
              description: "Brief description of what the code does (for display)",
            },
          },
          required: ["code"],
        },
      },
      {
        name: "read_file",
        description:
          "Read the contents of a file from the workspace. Use this to inspect existing files, review code, or read data files.",
        parameters: {
          type: "object" as const,
          properties: {
            path: {
              type: "string" as const,
              description:
                "Path to the file relative to the workspace (e.g., 'src/main.py')",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "write_file",
        description:
          "Write content to a file in the workspace. Creates parent directories if they don't exist. Use this to create scripts, save data, or write output files.",
        parameters: {
          type: "object" as const,
          properties: {
            path: {
              type: "string" as const,
              description:
                "Path to the file relative to the workspace (e.g., 'src/main.py')",
            },
            content: {
              type: "string" as const,
              description: "Content to write to the file",
            },
          },
          required: ["path", "content"],
        },
      },
      {
        name: "list_directory",
        description:
          "List files and directories in the workspace. Use this to explore the project structure or find files.",
        parameters: {
          type: "object" as const,
          properties: {
            path: {
              type: "string" as const,
              description:
                "Path to the directory relative to workspace (default: '.' for root)",
            },
          },
        },
      },
      {
        name: "generate_image",
        description:
          "Generate an image from a text description using AI. Use this when the user wants to create visual content, illustrations, logos, or any image. Describe what you want in detail.",
        parameters: {
          type: "object" as const,
          properties: {
            prompt: {
              type: "string" as const,
              description: "Detailed description of the image to generate",
            },
            size: {
              type: "string" as const,
              description: "Image size: 1024x1024 (square), 1344x768 (landscape), 768x1344 (portrait)",
            },
          },
          required: ["prompt"],
        },
      },
    ],
  },
];

// ─── Tool Execution ──────────────────────────────────────────────────────────

interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    switch (name) {
      case "web_search":
        return await executeWebSearch(
          args.query as string,
          (args.num as number) || 5
        );
      case "execute_code":
        return await executeCode(args.code as string);
      case "read_file":
        return await executeReadFile(args.path as string);
      case "write_file":
        return await executeWriteFile(
          args.path as string,
          args.content as string
        );
      case "list_directory":
        return await executeListDirectory(
          (args.path as string) || "."
        );
      case "generate_image":
        return await executeGenerateImage(
          args.prompt as string,
          (args.size as string) || "1024x1024"
        );
      default:
        return { success: false, output: "", error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return {
      success: false,
      output: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Web Search ──────────────────────────────────────────────────────────────

async function executeWebSearch(
  query: string,
  num: number
): Promise<ToolResult> {
  try {
    // Use z-ai-web-dev-sdk for web search
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const results = await zai.functions.invoke("web_search", {
      query,
      num: Math.min(num, 10),
    });

    if (!Array.isArray(results) || results.length === 0) {
      return { success: true, output: "No search results found." };
    }

    const formatted = results
      .map(
        (r: { name?: string; url?: string; snippet?: string; host_name?: string }, i: number) =>
          `[${i + 1}] ${r.name || "Untitled"}\n    URL: ${r.url || "N/A"}\n    ${r.snippet || "No description"}`
      )
      .join("\n\n");

    return {
      success: true,
      output: `Found ${results.length} results:\n\n${formatted}`,
    };
  } catch (err) {
    // Fallback: provide a generic response
    return {
      success: true,
      output: `Web search for "${query}" encountered an issue. Please try rephrasing your query or use a more specific search term.`,
    };
  }
}

// ─── Code Execution ──────────────────────────────────────────────────────────

async function executeCode(code: string): Promise<ToolResult> {
  try {
    // Ensure workspace exists
    await fs.mkdir(WORKSPACE_DIR, { recursive: true });

    // Write code to a temp file
    const scriptPath = path.join(WORKSPACE_DIR, `_exec_${Date.now()}.py`);
    await fs.writeFile(scriptPath, code, "utf-8");

    try {
      const { stdout, stderr } = await execFileAsync("python3", [scriptPath], {
        timeout: CODE_TIMEOUT * 1000,
        maxBuffer: 1024 * 1024, // 1MB
        cwd: WORKSPACE_DIR,
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      });

      // Clean up script
      await fs.unlink(scriptPath).catch(() => {});

      const output = stdout || "(no stdout)";
      const errOutput = stderr ? `\nStderr: ${stderr}` : "";

      return {
        success: true,
        output: `${output}${errOutput}`,
      };
    } catch (execErr: unknown) {
      // Clean up script
      await fs.unlink(scriptPath).catch(() => {});

      const error =
        execErr instanceof Error ? execErr.message : String(execErr);

      // Check for timeout
      if (error.includes("ETIMEDOUT") || error.includes("timed out")) {
        return {
          success: false,
          output: "",
          error: `Code execution timed out after ${CODE_TIMEOUT} seconds.`,
        };
      }

      return {
        success: false,
        output: "",
        error: `Execution error: ${error}`,
      };
    }
  } catch (err) {
    return {
      success: false,
      output: "",
      error: `Failed to execute code: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ─── File Operations ─────────────────────────────────────────────────────────

async function executeReadFile(filePath: string): Promise<ToolResult> {
  try {
    const fullPath = path.join(WORKSPACE_DIR, filePath);
    // Ensure path is within workspace
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(WORKSPACE_DIR))) {
      return {
        success: false,
        output: "",
        error: "Access denied: path is outside the workspace.",
      };
    }

    const content = await fs.readFile(resolved, "utf-8");
    // Truncate very large files
    const maxLen = 50000;
    const truncated =
      content.length > maxLen
        ? content.slice(0, maxLen) + "\n... (truncated)"
        : content;

    return { success: true, output: truncated };
  } catch (err) {
    return {
      success: false,
      output: "",
      error: `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function executeWriteFile(
  filePath: string,
  content: string
): Promise<ToolResult> {
  try {
    const fullPath = path.join(WORKSPACE_DIR, filePath);
    // Ensure path is within workspace
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(WORKSPACE_DIR))) {
      return {
        success: false,
        output: "",
        error: "Access denied: path is outside the workspace.",
      };
    }

    // Create parent directories
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, content, "utf-8");

    return {
      success: true,
      output: `File written successfully: ${filePath} (${content.length} bytes)`,
    };
  } catch (err) {
    return {
      success: false,
      output: "",
      error: `Failed to write file: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function executeListDirectory(dirPath: string): Promise<ToolResult> {
  try {
    const fullPath = path.join(WORKSPACE_DIR, dirPath);
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(WORKSPACE_DIR))) {
      return {
        success: false,
        output: "",
        error: "Access denied: path is outside the workspace.",
      };
    }

    const entries = await fs.readdir(resolved, { withFileTypes: true });
    const listing = entries
      .map((e) => `${e.isDirectory() ? "📁" : "📄"} ${e.name}`)
      .join("\n");

    return {
      success: true,
      output: listing || "(empty directory)",
    };
  } catch (err) {
    return {
      success: false,
      output: "",
      error: `Failed to list directory: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ─── Tool metadata for display ──────────────────────────────────────────────

// ─── Image Generation ─────────────────────────────────────────────────────

async function executeGenerateImage(
  prompt: string,
  size: string
): Promise<ToolResult> {
  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const validSizes = ["1024x1024", "768x1344", "864x1152", "1344x768", "1152x864", "1440x720", "720x1440"];
    const safeSize = validSizes.includes(size) ? size : "1024x1024";

    const response = await zai.images.generations.create({
      prompt,
      size: safeSize,
    });

    const base64 = response.data?.[0]?.base64;
    if (!base64) {
      return { success: false, output: "", error: "Failed to generate image" };
    }

    // Save image to workspace
    await fs.mkdir(WORKSPACE_DIR, { recursive: true });
    const filename = `image_${Date.now()}.png`;
    const filePath = path.join(WORKSPACE_DIR, filename);
    const buffer = Buffer.from(base64, "base64");
    await fs.writeFile(filePath, buffer);

    return {
      success: true,
      output: `Image generated successfully. Saved as: ${filename}. The image has been created and saved to the workspace. Describe the image to the user and mention it's saved as ${filename}.`,
    };
  } catch (err) {
    return {
      success: false,
      output: "",
      error: `Image generation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ─── Tool metadata for display ──────────────────────────────────────────────

export const TOOL_DISPLAY: Record<string, { icon: string; label: string }> = {
  web_search: { icon: "🔍", label: "Searching" },
  execute_code: { icon: "💻", label: "Running code" },
  read_file: { icon: "📄", label: "Reading file" },
  write_file: { icon: "✏️", label: "Writing file" },
  list_directory: { icon: "📁", label: "Listing directory" },
  generate_image: { icon: "🎨", label: "Generating image" },
};
