import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const WORKSPACE_DIR = "/tmp/agentforge-workspace";

interface FileEntry {
  name: string;
  type: "file" | "directory";
  size: number;
  modified: string;
  path: string;
}

async function listDir(dirPath: string, relativeTo: string): Promise<FileEntry[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const result: FileEntry[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(relativeTo, fullPath);

    if (entry.isDirectory()) {
      result.push({
        name: entry.name,
        type: "directory",
        size: 0,
        modified: "",
        path: relPath,
      });
    } else if (entry.isFile()) {
      const stat = await fs.stat(fullPath);
      result.push({
        name: entry.name,
        type: "file",
        size: stat.size,
        modified: stat.mtime.toISOString(),
        path: relPath,
      });
    }
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    // Ensure workspace exists
    await fs.mkdir(WORKSPACE_DIR, { recursive: true });

    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get("path");

    if (filePath) {
      // Read a specific file
      const resolved = path.resolve(path.join(WORKSPACE_DIR, filePath));
      if (!resolved.startsWith(path.resolve(WORKSPACE_DIR))) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      try {
        const content = await fs.readFile(resolved, "utf-8");
        return NextResponse.json({ content, path: filePath });
      } catch {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
    }

    // List workspace files
    const subPath = searchParams.get("dir") || "";
    const dirPath = path.resolve(path.join(WORKSPACE_DIR, subPath));
    if (!dirPath.startsWith(path.resolve(WORKSPACE_DIR))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const entries = await listDir(dirPath, WORKSPACE_DIR);
    return NextResponse.json({ files: entries, workspace: WORKSPACE_DIR });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to list workspace" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { filePath } = await request.json() as { filePath: string };
    const resolved = path.resolve(path.join(WORKSPACE_DIR, filePath));
    if (!resolved.startsWith(path.resolve(WORKSPACE_DIR))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await fs.unlink(resolved).catch(() => {});
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
