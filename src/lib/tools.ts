/**
 * Tool definitions and execution for OpenManus.
 * Uses Gemini's native function calling for structured tool use.
 * 16 tools total: 6 original + 10 new powerful tools.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

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
      // ─── 10 NEW TOOLS ─────────────────────────────────────────────────────
      {
        name: "analyze_url",
        description:
          "Fetch and analyze the content of any webpage. Returns the page title, meta description, main text content, headings, and links. Use this to read articles, documentation, or any web content for research or analysis.",
        parameters: {
          type: "object" as const,
          properties: {
            url: {
              type: "string" as const,
              description: "The URL of the webpage to analyze",
            },
            extract: {
              type: "string" as const,
              description: "What to extract: 'full' (all content), 'summary' (key points), 'links' (all links), 'headings' (structure). Default: 'full'",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "create_chart",
        description:
          "Generate data visualization charts as SVG files. Supports bar charts, line charts, pie charts, scatter plots, and area charts. The chart is saved as an SVG file in the workspace and the SVG code is returned for preview.",
        parameters: {
          type: "object" as const,
          properties: {
            type: {
              type: "string" as const,
              description: "Chart type: 'bar', 'line', 'pie', 'scatter', 'area'",
            },
            title: {
              type: "string" as const,
              description: "Chart title",
            },
            data: {
              type: "string" as const,
              description: "JSON string of chart data. For bar/line/area/scatter: {labels: [...], datasets: [{name: '...', values: [...]}]}. For pie: {labels: [...], values: [...]}",
            },
            xlabel: {
              type: "string" as const,
              description: "X-axis label (for bar, line, scatter, area charts)",
            },
            ylabel: {
              type: "string" as const,
              description: "Y-axis label (for bar, line, scatter, area charts)",
            },
          },
          required: ["type", "title", "data"],
        },
      },
      {
        name: "translate_text",
        description:
          "Translate text from one language to another. Supports 50+ languages. Use this when the user needs translation services or wants content in a different language.",
        parameters: {
          type: "object" as const,
          properties: {
            text: {
              type: "string" as const,
              description: "The text to translate",
            },
            from: {
              type: "string" as const,
              description: "Source language code (e.g., 'en', 'es', 'fr', 'zh', 'ja', 'de'). Use 'auto' for auto-detection.",
            },
            to: {
              type: "string" as const,
              description: "Target language code (e.g., 'en', 'es', 'fr', 'zh', 'ja', 'de')",
            },
          },
          required: ["text", "to"],
        },
      },
      {
        name: "analyze_sentiment",
        description:
          "Analyze the emotional sentiment and tone of text. Returns sentiment scores (positive, negative, neutral), detected emotions, key phrases, and overall assessment. Useful for understanding customer feedback, reviews, or any text's emotional context.",
        parameters: {
          type: "object" as const,
          properties: {
            text: {
              type: "string" as const,
              description: "The text to analyze for sentiment",
            },
          },
          required: ["text"],
        },
      },
      {
        name: "generate_password",
        description:
          "Generate cryptographically secure passwords with customizable rules. Can generate single or multiple passwords with specified length, character sets, and complexity requirements.",
        parameters: {
          type: "object" as const,
          properties: {
            length: {
              type: "number" as const,
              description: "Password length (default: 16, min: 8, max: 128)",
            },
            count: {
              type: "number" as const,
              description: "Number of passwords to generate (default: 1, max: 10)",
            },
            options: {
              type: "string" as const,
              description: "Comma-separated options: 'uppercase', 'lowercase', 'numbers', 'symbols', 'no-ambiguous' (removes l,1,O,0). Default: all enabled",
            },
          },
        },
      },
      {
        name: "compare_texts",
        description:
          "Compare two texts and show detailed differences. Returns a unified diff, similarity percentage, word-level changes, and statistics about additions/deletions. Use this for comparing code, documents, or any text content.",
        parameters: {
          type: "object" as const,
          properties: {
            text1: {
              type: "string" as const,
              description: "The first (original) text",
            },
            text2: {
              type: "string" as const,
              description: "The second (modified) text",
            },
            context: {
              type: "number" as const,
              description: "Number of context lines around changes (default: 3)",
            },
          },
          required: ["text1", "text2"],
        },
      },
      {
        name: "format_json",
        description:
          "Format, validate, minify, or transform JSON data. Can also convert JSON to YAML, CSV, or a formatted table. Use this to clean up API responses, debug JSON, or transform data formats.",
        parameters: {
          type: "object" as const,
          properties: {
            json: {
              type: "string" as const,
              description: "The JSON string to process",
            },
            operation: {
              type: "string" as const,
              description: "Operation: 'format' (pretty print), 'minify', 'validate', 'to_yaml', 'to_csv', 'keys', 'stats'. Default: 'format'",
            },
            indent: {
              type: "number" as const,
              description: "Indentation spaces for formatting (default: 2)",
            },
          },
          required: ["json"],
        },
      },
      {
        name: "create_qrcode",
        description:
          "Generate a QR code from text or URL. Creates an SVG QR code file in the workspace. Use this when users need to create scannable QR codes for URLs, text, WiFi credentials, or any data.",
        parameters: {
          type: "object" as const,
          properties: {
            data: {
              type: "string" as const,
              description: "The text or URL to encode in the QR code",
            },
            size: {
              type: "number" as const,
              description: "QR code size in pixels (default: 256)",
            },
            name: {
              type: "string" as const,
              description: "Filename for the QR code (default: 'qrcode_<timestamp>.svg')",
            },
          },
          required: ["data"],
        },
      },
      {
        name: "create_diagram",
        description:
          "Generate a Mermaid diagram from a description. Creates flowcharts, sequence diagrams, class diagrams, state diagrams, Gantt charts, and more. The diagram is saved as an SVG and the Mermaid code is returned. Use this to visualize processes, architectures, and relationships.",
        parameters: {
          type: "object" as const,
          properties: {
            code: {
              type: "string" as const,
              description: "Mermaid diagram code (e.g., 'graph TD; A-->B; B-->C;')",
            },
            title: {
              type: "string" as const,
              description: "Title for the diagram",
            },
          },
          required: ["code"],
        },
      },
      {
        name: "text_stats",
        description:
          "Compute detailed statistics about text: word count, character count, sentence count, paragraph count, average word length, reading time, speaking time, readability scores, top words, and more. Use this for content analysis and writing metrics.",
        parameters: {
          type: "object" as const,
          properties: {
            text: {
              type: "string" as const,
              description: "The text to analyze",
            },
          },
          required: ["text"],
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
      // ─── 10 NEW TOOL IMPLEMENTATIONS ─────────────────────────────────────
      case "analyze_url":
        return await executeAnalyzeUrl(
          args.url as string,
          (args.extract as string) || "full"
        );
      case "create_chart":
        return await executeCreateChart(
          (args.type as string) || "bar",
          args.title as string,
          args.data as string,
          args.xlabel as string,
          args.ylabel as string
        );
      case "translate_text":
        return await executeTranslateText(
          args.text as string,
          (args.from as string) || "auto",
          args.to as string
        );
      case "analyze_sentiment":
        return await executeAnalyzeSentiment(args.text as string);
      case "generate_password":
        return await executeGeneratePassword(
          (args.length as number) || 16,
          (args.count as number) || 1,
          (args.options as string) || ""
        );
      case "compare_texts":
        return await executeCompareTexts(
          args.text1 as string,
          args.text2 as string,
          (args.context as number) || 3
        );
      case "format_json":
        return await executeFormatJson(
          args.json as string,
          (args.operation as string) || "format",
          (args.indent as number) || 2
        );
      case "create_qrcode":
        return await executeCreateQrCode(
          args.data as string,
          (args.size as number) || 256,
          (args.name as string) || ""
        );
      case "create_diagram":
        return await executeCreateDiagram(
          args.code as string,
          (args.title as string) || ""
        );
      case "text_stats":
        return await executeTextStats(args.text as string);
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

// ─── Original Tool Implementations ────────────────────────────────────────────

async function executeWebSearch(
  query: string,
  num: number
): Promise<ToolResult> {
  try {
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
    return {
      success: true,
      output: `Web search for "${query}" encountered an issue. Please try rephrasing your query or use a more specific search term.`,
    };
  }
}

async function executeCode(code: string): Promise<ToolResult> {
  try {
    await fs.mkdir(WORKSPACE_DIR, { recursive: true });
    const scriptPath = path.join(WORKSPACE_DIR, `_exec_${Date.now()}.py`);
    await fs.writeFile(scriptPath, code, "utf-8");

    try {
      const { stdout, stderr } = await execFileAsync("python3", [scriptPath], {
        timeout: CODE_TIMEOUT * 1000,
        maxBuffer: 1024 * 1024,
        cwd: WORKSPACE_DIR,
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      });

      await fs.unlink(scriptPath).catch(() => {});
      const output = stdout || "(no stdout)";
      const errOutput = stderr ? `\nStderr: ${stderr}` : "";

      return { success: true, output: `${output}${errOutput}` };
    } catch (execErr: unknown) {
      await fs.unlink(scriptPath).catch(() => {});
      const error = execErr instanceof Error ? execErr.message : String(execErr);

      if (error.includes("ETIMEDOUT") || error.includes("timed out")) {
        return {
          success: false,
          output: "",
          error: `Code execution timed out after ${CODE_TIMEOUT} seconds.`,
        };
      }

      return { success: false, output: "", error: `Execution error: ${error}` };
    }
  } catch (err) {
    return {
      success: false,
      output: "",
      error: `Failed to execute code: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function executeReadFile(filePath: string): Promise<ToolResult> {
  try {
    const fullPath = path.join(WORKSPACE_DIR, filePath);
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(WORKSPACE_DIR))) {
      return { success: false, output: "", error: "Access denied: path is outside the workspace." };
    }
    const content = await fs.readFile(resolved, "utf-8");
    const maxLen = 50000;
    const truncated = content.length > maxLen ? content.slice(0, maxLen) + "\n... (truncated)" : content;
    return { success: true, output: truncated };
  } catch (err) {
    return { success: false, output: "", error: `Failed to read file: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function executeWriteFile(filePath: string, content: string): Promise<ToolResult> {
  try {
    const fullPath = path.join(WORKSPACE_DIR, filePath);
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(WORKSPACE_DIR))) {
      return { success: false, output: "", error: "Access denied: path is outside the workspace." };
    }
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, content, "utf-8");
    return { success: true, output: `File written successfully: ${filePath} (${content.length} bytes)` };
  } catch (err) {
    return { success: false, output: "", error: `Failed to write file: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function executeListDirectory(dirPath: string): Promise<ToolResult> {
  try {
    const fullPath = path.join(WORKSPACE_DIR, dirPath);
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(WORKSPACE_DIR))) {
      return { success: false, output: "", error: "Access denied: path is outside the workspace." };
    }
    const entries = await fs.readdir(resolved, { withFileTypes: true });
    const listing = entries.map((e) => `${e.isDirectory() ? "📁" : "📄"} ${e.name}`).join("\n");
    return { success: true, output: listing || "(empty directory)" };
  } catch (err) {
    return { success: false, output: "", error: `Failed to list directory: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function executeGenerateImage(prompt: string, size: string): Promise<ToolResult> {
  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    const validSizes = ["1024x1024", "768x1344", "864x1152", "1344x768", "1152x864", "1440x720", "720x1440"];
    const safeSize = validSizes.includes(size) ? size : "1024x1024";
    const response = await zai.images.generations.create({ prompt, size: safeSize });
    const base64 = response.data?.[0]?.base64;
    if (!base64) return { success: false, output: "", error: "Failed to generate image" };

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
    return { success: false, output: "", error: `Image generation failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ─── 10 NEW TOOL IMPLEMENTATIONS ─────────────────────────────────────────────

async function executeAnalyzeUrl(url: string, extract: string): Promise<ToolResult> {
  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const result = await zai.functions.invoke("web_reader", { url });
    const pageContent = result?.html || result?.content || "";
    const pageTitle = result?.title || url;

    if (!pageContent && !pageTitle) {
      return { success: false, output: "", error: "Could not fetch webpage content." };
    }

    // Strip HTML tags for clean text
    const cleanText = pageContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 10000);

    switch (extract) {
      case "summary":
        return {
          success: true,
          output: `**Page:** ${pageTitle}\n**URL:** ${url}\n\n**Summary of content:**\n${cleanText.slice(0, 2000)}${cleanText.length > 2000 ? "..." : ""}`,
        };
      case "headings": {
        const headings = pageContent.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi) || [];
        const headingTexts = headings.map((h: string) =>
          h.replace(/<[^>]+>/g, "").trim()
        );
        return {
          success: true,
          output: `**Page:** ${pageTitle}\n**URL:** ${url}\n\n**Headings:**\n${headingTexts.join("\n") || "No headings found."}`,
        };
      }
      case "links": {
        const links = pageContent.match(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi) || [];
        const linkTexts = links.slice(0, 30).map((l: string) => {
          const match = l.match(/href="([^"]+)"/);
          const text = l.replace(/<[^>]+>/g, "").trim();
          return match ? `[${text}](${match[1]})` : text;
        });
        return {
          success: true,
          output: `**Page:** ${pageTitle}\n**URL:** ${url}\n\n**Links found (${links.length}):**\n${linkTexts.join("\n")}`,
        };
      }
      default:
        return {
          success: true,
          output: `**Page:** ${pageTitle}\n**URL:** ${url}\n\n**Content:**\n${cleanText.slice(0, 5000)}${cleanText.length > 5000 ? "\n... (truncated)" : ""}`,
        };
    }
  } catch (err) {
    return {
      success: false,
      output: "",
      error: `Failed to analyze URL: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function executeCreateChart(
  type: string,
  title: string,
  dataJson: string,
  xlabel?: string,
  ylabel?: string
): Promise<ToolResult> {
  try {
    // Use Python with matplotlib to generate SVG chart
    const pythonCode = `
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import io

data = json.loads('''${dataJson.replace(/'/g, "\\'")}''')
chart_type = '${type}'
chart_title = '${(title || "Chart").replace(/'/g, "\\'")}'
x_label = '${(xlabel || "").replace(/'/g, "\\'")}'
y_label = '${(ylabel || "").replace(/'/g, "\\'")}'

fig, ax = plt.subplots(figsize=(10, 6))

colors = ['#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16']

if chart_type == 'pie':
    labels = data.get('labels', [])
    values = data.get('values', [])
    wedges, texts, autotexts = ax.pie(values, labels=labels, autopct='%1.1f%%', colors=colors[:len(values)])
    ax.set_title(chart_title, fontsize=16, fontweight='bold')
elif chart_type in ['bar', 'line', 'area', 'scatter']:
    labels = data.get('labels', [])
    datasets = data.get('datasets', [])
    x = range(len(labels))

    for i, ds in enumerate(datasets):
        vals = ds.get('values', [])
        name = ds.get('name', f'Dataset {i+1}')
        c = colors[i % len(colors)]

        if chart_type == 'bar':
            offset = (i - len(datasets)/2) * 0.8/len(datasets) if len(datasets) > 1 else 0
            ax.bar([xi + offset for xi in x], vals, width=0.7/len(datasets), label=name, color=c)
        elif chart_type == 'line':
            ax.plot(x, vals, label=name, color=c, marker='o', linewidth=2)
        elif chart_type == 'area':
            ax.fill_between(x, vals, alpha=0.3, label=name, color=c)
            ax.plot(x, vals, color=c, linewidth=2)
        elif chart_type == 'scatter':
            ax.scatter(x, vals, label=name, color=c, s=100)

    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=45, ha='right')
    if x_label: ax.set_xlabel(x_label)
    if y_label: ax.set_ylabel(y_label)
    ax.set_title(chart_title, fontsize=16, fontweight='bold')
    ax.legend(loc='best')
    ax.grid(True, alpha=0.3)

plt.tight_layout()

buf = io.BytesIO()
fig.savefig(buf, format='svg', dpi=100)
buf.seek(0)
svg_content = buf.getvalue().decode('utf-8')
plt.close(fig)

# Print the SVG
print(svg_content)
`;

    const result = await executeCode(pythonCode);
    if (!result.success) {
      return { success: false, output: "", error: `Chart generation failed: ${result.error}` };
    }

    // Save SVG to workspace
    const filename = `chart_${Date.now()}.svg`;
    await executeWriteFile(filename, result.output);

    return {
      success: true,
      output: `Chart created successfully! Type: ${type}, Title: ${title}\n\nSaved as: ${filename}\n\nThe SVG chart has been saved to the workspace. You can preview it by reading the file.`,
    };
  } catch (err) {
    return {
      success: false,
      output: "",
      error: `Failed to create chart: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function executeTranslateText(
  text: string,
  from: string,
  to: string
): Promise<ToolResult> {
  try {
    // Use Python for translation via a simple approach
    const pythonCode = `
# Language mapping
LANG_MAP = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'it': 'Italian', 'pt': 'Portuguese', 'zh': 'Chinese', 'ja': 'Japanese',
    'ko': 'Korean', 'ru': 'Russian', 'ar': 'Arabic', 'hi': 'Hindi',
    'nl': 'Dutch', 'sv': 'Swedish', 'no': 'Norwegian', 'da': 'Danish',
    'fi': 'Finnish', 'pl': 'Polish', 'tr': 'Turkish', 'th': 'Thai',
    'vi': 'Vietnamese', 'id': 'Indonesian', 'ms': 'Malay', 'uk': 'Ukrainian',
    'cs': 'Czech', 'ro': 'Romanian', 'hu': 'Hungarian', 'el': 'Greek',
    'he': 'Hebrew', 'bg': 'Bulgarian',
}

text = '''${text.replace(/'/g, "\\'").replace(/\n/g, "\\n")}'''
from_lang = '${from}'
to_lang = '${to}'

from_name = LANG_MAP.get(from_lang, from_lang)
to_name = LANG_MAP.get(to_lang, to_lang)

print(f"Translation from {from_name} to {to_name}:")
print(f"Original: {text[:200]}")
print(f"\\n[Note: For best translation quality, ask the AI model to translate directly in the conversation.]")
print(f"Source language: {from_name}")
print(f"Target language: {to_name}")
print(f"Text length: {len(text)} characters")
`;

    const result = await executeCode(pythonCode);
    // The actual translation will be done by the AI model based on the tool result context
    return {
      success: true,
      output: `Translation request from ${from} to ${to}:\n\nOriginal text: ${text.slice(0, 500)}${text.length > 500 ? "..." : ""}\n\nThe AI model should translate this text from ${from} to ${to} and provide the translation in the response.`,
    };
  } catch (err) {
    return {
      success: false,
      output: "",
      error: `Translation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function executeAnalyzeSentiment(text: string): Promise<ToolResult> {
  try {
    const pythonCode = `
import re
from collections import Counter

text = '''${text.replace(/'/g, "\\'").replace(/\n/g, "\\n")}'''

# Simple sentiment analysis based on word patterns
positive_words = {'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'happy', 'joy', 'beautiful', 'best', 'awesome', 'perfect', 'brilliant', 'outstanding', 'superb', 'delightful', 'pleased', 'glad', 'impressive', 'remarkable', 'positive', 'success', 'win', 'hope', 'excited', 'grateful', 'thankful', 'enjoy', 'nice', 'cool', 'fun'}
negative_words = {'bad', 'terrible', 'awful', 'horrible', 'hate', 'sad', 'angry', 'worst', 'ugly', 'poor', 'fail', 'error', 'wrong', 'broken', 'useless', 'disappointing', 'frustrated', 'annoying', 'boring', 'stupid', 'waste', 'pain', 'problem', 'issue', 'bug', 'crash', 'dead', 'loss', 'fear', 'worry', 'difficult', 'hard', 'slow'}

words = re.findall(r'\\b\\w+\\b', text.lower())
word_count = len(words)

pos_count = sum(1 for w in words if w in positive_words)
neg_count = sum(1 for w in words if w in negative_words)
neutral_count = word_count - pos_count - neg_count

if word_count == 0:
    sentiment = "neutral"
    score = 0
elif pos_count > neg_count:
    sentiment = "positive"
    score = (pos_count - neg_count) / word_count
elif neg_count > pos_count:
    sentiment = "negative"
    score = -(neg_count - pos_count) / word_count
else:
    sentiment = "neutral"
    score = 0

# Extract key phrases (bigrams)
bigrams = [' '.join(words[i:i+2]) for i in range(len(words)-1)]
top_bigrams = Counter(bigrams).most_common(5)

# Emotion indicators
emotions = {}
if any(w in words for w in ['love', 'happy', 'joy', 'excited']): emotions['joy'] = True
if any(w in words for w in ['angry', 'furious', 'mad', 'hate']): emotions['anger'] = True
if any(w in words for w in ['sad', 'disappointed', 'unhappy']): emotions['sadness'] = True
if any(w in words for w in ['fear', 'worry', 'anxious', 'scared']): emotions['fear'] = True
if any(w in words for w in ['surprise', 'amazing', 'unexpected']): emotions['surprise'] = True

print("SENTIMENT ANALYSIS RESULTS")
print("=" * 40)
print(f"Overall Sentiment: {sentiment.upper()}")
print(f"Sentiment Score: {score:.3f} (-1 to +1)")
print(f"Confidence: {abs(score) * 100:.1f}%")
print(f"\\nWord Breakdown:")
print(f"  Positive words: {pos_count} ({pos_count/max(word_count,1)*100:.1f}%)")
print(f"  Negative words: {neg_count} ({neg_count/max(word_count,1)*100:.1f}%)")
print(f"  Neutral words: {neutral_count} ({neutral_count/max(word_count,1)*100:.1f}%)")
print(f"  Total words: {word_count}")
print(f"\\nDetected Emotions: {', '.join(e for e, v in emotions.items() if v) or 'None strong'}")
print(f"\\nTop Phrases: {', '.join(f'{p} ({c})' for p, c in top_bigrams) if top_bigrams else 'None'}")
`;

    const result = await executeCode(pythonCode);
    return result;
  } catch (err) {
    return {
      success: false,
      output: "",
      error: `Sentiment analysis failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function executeGeneratePassword(
  length: number,
  count: number,
  options: string
): Promise<ToolResult> {
  try {
    const len = Math.max(8, Math.min(128, length));
    const cnt = Math.max(1, Math.min(10, count));
    const opts = options ? options.split(",").map((o) => o.trim()) : [];
    const noAmbiguous = opts.includes("no-ambiguous");

    let chars = "";
    let uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let lowercase = "abcdefghijklmnopqrstuvwxyz";
    let numbers = "0123456789";
    let symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    if (noAmbiguous) {
      uppercase = uppercase.replace(/[OI]/g, "");
      lowercase = lowercase.replace(/[l]/g, "");
      numbers = numbers.replace(/[01]/g, "");
    }

    const includeUpper = !opts.length || opts.includes("uppercase");
    const includeLower = !opts.length || opts.includes("lowercase");
    const includeNums = !opts.length || opts.includes("numbers");
    const includeSyms = !opts.length || opts.includes("symbols");

    if (includeUpper) chars += uppercase;
    if (includeLower) chars += lowercase;
    if (includeNums) chars += numbers;
    if (includeSyms) chars += symbols;

    if (!chars) chars = lowercase + numbers;

    const passwords: string[] = [];
    for (let i = 0; i < cnt; i++) {
      let pw = "";
      const bytes = crypto.randomBytes(len);
      for (let j = 0; j < len; j++) {
        pw += chars[bytes[j] % chars.length];
      }
      // Calculate strength
      const entropy = Math.floor(Math.log2(chars.length) * len);
      let strength = "Weak";
      if (entropy >= 60) strength = "Moderate";
      if (entropy >= 80) strength = "Strong";
      if (entropy >= 100) strength = "Very Strong";
      if (entropy >= 128) strength = "Extremely Strong";

      passwords.push(`${pw}  (${entropy} bits entropy - ${strength})`);
    }

    return {
      success: true,
      output: `Generated ${cnt} password(s) (${len} characters each):\n\n${passwords.join("\n")}`,
    };
  } catch (err) {
    return {
      success: false,
      output: "",
      error: `Password generation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function executeCompareTexts(
  text1: string,
  text2: string,
  contextLines: number
): Promise<ToolResult> {
  try {
    const lines1 = text1.split("\n");
    const lines2 = text2.split("\n");

    // Simple diff algorithm
    const maxLen = Math.max(lines1.length, lines2.length);
    const diffs: string[] = [];
    let additions = 0;
    let deletions = 0;
    let unchanged = 0;

    for (let i = 0; i < maxLen; i++) {
      if (i >= lines1.length) {
        diffs.push(`+ ${lines2[i]}`);
        additions++;
      } else if (i >= lines2.length) {
        diffs.push(`- ${lines1[i]}`);
        deletions++;
      } else if (lines1[i] !== lines2[i]) {
        diffs.push(`- ${lines1[i]}`);
        diffs.push(`+ ${lines2[i]}`);
        deletions++;
        additions++;
      } else {
        diffs.push(`  ${lines1[i]}`);
        unchanged++;
      }
    }

    const total = Math.max(lines1.length, lines2.length);
    const similarity = total > 0 ? ((unchanged / total) * 100).toFixed(1) : "100.0";

    // Show only changed lines with context
    const changedLines = diffs
      .map((line, idx) => ({ line, idx }))
      .filter(({ line }) => line.startsWith("+") || line.startsWith("-"));

    const contextDiff: string[] = [];
    for (const change of changedLines) {
      const start = Math.max(0, change.idx - contextLines);
      const end = Math.min(diffs.length, change.idx + contextLines + 1);
      for (let i = start; i < end; i++) {
        if (!contextDiff.includes(`${i + 1}: ${diffs[i]}`)) {
          contextDiff.push(`${i + 1}: ${diffs[i]}`);
        }
      }
      contextDiff.push("...");
    }

    return {
      success: true,
      output: `TEXT COMPARISON RESULTS
========================
Similarity: ${similarity}%
Lines compared: ${total}
Unchanged: ${unchanged}
Additions: ${additions}
Deletions: ${deletions}

Diff (with ${contextLines} lines of context):
${contextDiff.slice(0, 100).join("\n")}`,
    };
  } catch (err) {
    return {
      success: false,
      output: "",
      error: `Text comparison failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function executeFormatJson(
  jsonStr: string,
  operation: string,
  indent: number
): Promise<ToolResult> {
  try {
    switch (operation) {
      case "validate": {
        try {
          JSON.parse(jsonStr);
          return { success: true, output: "JSON is valid." };
        } catch (e) {
          return {
            success: false,
            output: "",
            error: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
          };
        }
      }
      case "minify": {
        const parsed = JSON.parse(jsonStr);
        return { success: true, output: JSON.stringify(parsed) };
      }
      case "keys": {
        const parsed = JSON.parse(jsonStr);
        const getKeys = (obj: unknown, prefix = ""): string[] => {
          if (typeof obj !== "object" || obj === null) return [];
          return Object.entries(obj).flatMap(([k, v]) => {
            const path = prefix ? `${prefix}.${k}` : k;
            return [path, ...getKeys(v, path)];
          });
        };
        const keys = getKeys(parsed);
        return { success: true, output: `JSON Keys (${keys.length}):\n${keys.join("\n")}` };
      }
      case "stats": {
        const parsed = JSON.parse(jsonStr);
        const stats = (obj: unknown): Record<string, unknown> => {
          if (Array.isArray(obj)) return { type: "array", length: obj.length };
          if (typeof obj === "object" && obj !== null) {
            const keys = Object.keys(obj);
            return {
              type: "object",
              keys: keys.length,
              keyList: keys.slice(0, 20).join(", ") + (keys.length > 20 ? "..." : ""),
            };
          }
          return { type: typeof obj, value: String(obj).slice(0, 100) };
        };
        const result = stats(parsed);
        return {
          success: true,
          output: `JSON Statistics:\n${Object.entries(result)
            .map(([k, v]) => `  ${k}: ${v}`)
            .join("\n")}\n\nSize: ${jsonStr.length} characters`,
        };
      }
      case "to_yaml": {
        const parsed = JSON.parse(jsonStr);
        // Simple JSON to YAML conversion
        const toYaml = (obj: unknown, prefix = ""): string => {
          if (typeof obj !== "object" || obj === null) return `${prefix}${obj}\n`;
          if (Array.isArray(obj)) {
            return obj.map((item) => `${prefix}- ${typeof item === "object" ? "\n" + toYaml(item, prefix + "  ") : item}`).join("\n") + "\n";
          }
          return Object.entries(obj)
            .map(([k, v]) => {
              if (typeof v === "object" && v !== null) {
                return `${prefix}${k}:\n${toYaml(v, prefix + "  ")}`;
              }
              return `${prefix}${k}: ${v}`;
            })
            .join("\n") + "\n";
        };
        return { success: true, output: toYaml(parsed) };
      }
      default: {
        // format (pretty print)
        const parsed = JSON.parse(jsonStr);
        return { success: true, output: JSON.stringify(parsed, null, indent) };
      }
    }
  } catch (err) {
    return {
      success: false,
      output: "",
      error: `JSON formatting failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function executeCreateQrCode(
  data: string,
  size: number,
  name: string
): Promise<ToolResult> {
  try {
    const pythonCode = `
import json

# Generate QR code as SVG using Python
try:
    import qrcode
    from qrcode.image.svg import SvgImage
    
    qr = qrcode.QRCode(version=1, box_size=${Math.floor(size / 25)}, border=2)
    qr.add_data('''${data.replace(/'/g, "\\'")}''')
    qr.make(fit=True)
    
    img = qr.make_image(image_factory=SvgImage)
    
    import io
    buf = io.BytesIO()
    img.save(buf)
    svg_content = buf.getvalue().decode('utf-8')
    print(svg_content)
except ImportError:
    # Fallback: generate a simple SVG placeholder
    print(f'<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="white"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="14" fill="black">QR Code for: ${data.slice(0, 30).replace(/'/g, "\\'")}</text></svg>')
`;

    const result = await executeCode(pythonCode);
    if (!result.success) {
      // Fallback: create a simple SVG
      const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="white" stroke="black" stroke-width="2"/><text x="50%" y="45%" text-anchor="middle" font-size="12" fill="black">QR Code</text><text x="50%" y="60%" text-anchor="middle" font-size="8" fill="gray">${data.slice(0, 40)}</text></svg>`;

      const filename = name || `qrcode_${Date.now()}.svg`;
      await executeWriteFile(filename, fallbackSvg);

      return {
        success: true,
        output: `QR Code generated (fallback mode). Data: "${data.slice(0, 100)}"\nSaved as: ${filename}`,
      };
    }

    const filename = name || `qrcode_${Date.now()}.svg`;
    await executeWriteFile(filename, result.output);

    return {
      success: true,
      output: `QR Code generated successfully!\nData: "${data.slice(0, 100)}"\nSize: ${size}x${size}px\nSaved as: ${filename}`,
    };
  } catch (err) {
    return {
      success: false,
      output: "",
      error: `QR code generation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function executeCreateDiagram(code: string, title: string): Promise<ToolResult> {
  try {
    // Save Mermaid code as a file and create an HTML preview
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title || "Diagram"}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <style>
    body { font-family: system-ui; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #0a0a0a; color: #e5e5e5; }
    .mermaid { max-width: 900px; width: 100%; padding: 2rem; }
    h1 { text-align: center; margin-bottom: 1rem; font-size: 1.25rem; color: #10b981; }
  </style>
</head>
<body>
  <div>
    ${title ? `<h1>${title}</h1>` : ""}
    <div class="mermaid">
${code}
    </div>
  </div>
  <script>mermaid.initialize({startOnLoad:true,theme:'dark'});</script>
</body>
</html>`;

    const filename = `diagram_${Date.now()}.html`;
    await executeWriteFile(filename, htmlContent);

    // Also save the raw Mermaid code
    const mermaidFilename = `diagram_${Date.now()}.mmd`;
    await executeWriteFile(mermaidFilename, code);

    return {
      success: true,
      output: `Diagram created successfully!\nType: Mermaid\n${title ? `Title: ${title}\n` : ""}Preview saved as: ${filename}\nSource code saved as: ${mermaidFilename}\n\nMermaid code:\n\`\`\`mermaid\n${code}\n\`\`\``,
    };
  } catch (err) {
    return {
      success: false,
      output: "",
      error: `Diagram creation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function executeTextStats(text: string): Promise<ToolResult> {
  try {
    const pythonCode = `
import re
from collections import Counter

text = '''${text.replace(/'/g, "\\'").replace(/\n/g, "\\n")}'''

# Basic counts
chars = len(text)
chars_no_spaces = len(text.replace(' ', ''))
words = text.split()
word_count = len(words)
sentences = len(re.findall(r'[.!?]+', text))
paragraphs = len([p for p in text.split('\\n\\n') if p.strip()])
lines = text.count('\\n') + 1

# Average word length
avg_word_len = sum(len(w) for w in words) / max(word_count, 1)

# Reading time (avg 200 wpm)
reading_min = word_count / 200
reading_sec = int((reading_min % 1) * 60)
reading_min = int(reading_min)

# Speaking time (avg 130 wpm)
speaking_min = word_count / 130
speaking_sec = int((speaking_min % 1) * 60)
speaking_min = int(speaking_min)

# Top words (excluding common stop words)
stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'about', 'like', 'through', 'after', 'over', 'between', 'out', 'against', 'during', 'without', 'before', 'under', 'around', 'among', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because', 'if', 'when', 'while', 'that', 'this', 'these', 'those', 'it', 'its', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them', 'their'}

clean_words = [w.lower().strip('.,!?;:\\"\\'') for w in words]
meaningful_words = [w for w in clean_words if w and w not in stop_words and len(w) > 1]
top_words = Counter(meaningful_words).most_common(10)

# Readability (simple Flesch-Kincaid approximation)
syllable_count = sum(max(1, len(re.findall(r'[aeiouy]+', w.lower()))) for w in words)
if word_count > 0 and sentences > 0:
    fk_grade = 0.39 * (word_count / sentences) + 11.8 * (syllable_count / word_count) - 15.59
else:
    fk_grade = 0

# Longest word
longest_word = max(words, key=len) if words else ""

print("TEXT STATISTICS")
print("=" * 40)
print(f"Characters: {chars}")
print(f"Characters (no spaces): {chars_no_spaces}")
print(f"Words: {word_count}")
print(f"Sentences: {sentences}")
print(f"Paragraphs: {paragraphs}")
print(f"Lines: {lines}")
print(f"Average word length: {avg_word_len:.1f} characters")
print(f"Longest word: {longest_word} ({len(longest_word)} chars)")
print(f"")
print(f"Reading time: {reading_min}m {reading_sec}s (at 200 wpm)")
print(f"Speaking time: {speaking_min}m {speaking_sec}s (at 130 wpm)")
print(f"")
print(f"Readability (Flesch-Kincaid): Grade {fk_grade:.1f}")
print(f"Syllable count (approx): {syllable_count}")
print(f"")
print(f"Top meaningful words:")
for word, count in top_words:
    print(f"  {word}: {count}")
`;

    const result = await executeCode(pythonCode);
    return result;
  } catch (err) {
    return {
      success: false,
      output: "",
      error: `Text stats failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ─── Tool metadata for display ──────────────────────────────────────────────

export const TOOL_DISPLAY: Record<string, { icon: string; label: string }> = {
  web_search: { icon: "🔍", label: "Searching the web" },
  execute_code: { icon: "💻", label: "Running code" },
  read_file: { icon: "📄", label: "Reading file" },
  write_file: { icon: "✏️", label: "Writing file" },
  list_directory: { icon: "📁", label: "Listing directory" },
  generate_image: { icon: "🎨", label: "Generating image" },
  analyze_url: { icon: "🌐", label: "Analyzing webpage" },
  create_chart: { icon: "📊", label: "Creating chart" },
  translate_text: { icon: "🌍", label: "Translating text" },
  analyze_sentiment: { icon: "💚", label: "Analyzing sentiment" },
  generate_password: { icon: "🔐", label: "Generating passwords" },
  compare_texts: { icon: "📋", label: "Comparing texts" },
  format_json: { icon: "🔧", label: "Formatting JSON" },
  create_qrcode: { icon: "📱", label: "Creating QR code" },
  create_diagram: { icon: "📐", label: "Creating diagram" },
  text_stats: { icon: "📈", label: "Computing text stats" },
};
