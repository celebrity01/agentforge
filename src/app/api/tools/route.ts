/**
 * Utility Tools API - Handles all client-side slash command operations
 * that don't need the full AI pipeline. Processes transformations,
 * encodings, conversions, and calculations server-side.
 */

import { NextRequest } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tool, args } = body as { tool: string; args: Record<string, unknown> };

    switch (tool) {
      // ─── Encoding / Decoding ─────────────────────────────────
      case "base64_encode":
        return json({ result: Buffer.from(String(args.text || "")).toString("base64") });
      case "base64_decode":
        return json({ result: Buffer.from(String(args.text || ""), "base64").toString("utf-8") });
      case "url_encode":
        return json({ result: encodeURIComponent(String(args.text || "")) });
      case "url_decode":
        return json({ result: decodeURIComponent(String(args.text || "")) });
      case "html_escape":
        return json({ result: String(args.text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;") });
      case "html_unescape":
        return json({ result: String(args.text || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'") });
      case "string_escape":
        return json({ result: JSON.stringify(String(args.text || "")) });
      case "string_unescape":
        try { return json({ result: JSON.parse(String(args.text || "")) }); }
        catch { return json({ result: String(args.text || ""), error: "Invalid escaped string" }); }

      // ─── Hash Generation ────────────────────────────────────
      case "hash_md5":
        return json({ result: crypto.createHash("md5").update(String(args.text || "")).digest("hex") });
      case "hash_sha1":
        return json({ result: crypto.createHash("sha1").update(String(args.text || "")).digest("hex") });
      case "hash_sha256":
        return json({ result: crypto.createHash("sha256").update(String(args.text || "")).digest("hex") });
      case "hash_sha512":
        return json({ result: crypto.createHash("sha512").update(String(args.text || "")).digest("hex") });

      // ─── UUID Generation ────────────────────────────────────
      case "uuid_v4":
        return json({ result: crypto.randomUUID() });
      case "uuid_multiple": {
        const count = Math.min(Number(args.count) || 5, 20);
        const uuids = Array.from({ length: count }, () => crypto.randomUUID());
        return json({ result: uuids.join("\n") });
      }

      // ─── Timestamp Conversion ───────────────────────────────
      case "timestamp_now":
        return json({ result: `Unix: ${Math.floor(Date.now() / 1000)}\nISO: ${new Date().toISOString()}\nLocal: ${new Date().toLocaleString()}` });
      case "timestamp_to_date": {
        const ts = Number(args.timestamp);
        if (isNaN(ts)) return json({ result: "Invalid timestamp", error: true });
        const ms = ts > 1e12 ? ts : ts * 1000;
        const d = new Date(ms);
        return json({ result: `ISO: ${d.toISOString()}\nUTC: ${d.toUTCString()}\nLocal: ${d.toLocaleString()}\nRelative: ${timeAgo(d)}` });
      }
      case "date_to_timestamp": {
        const d = new Date(String(args.date || ""));
        if (isNaN(d.getTime())) return json({ result: "Invalid date string", error: true });
        return json({ result: `Unix: ${Math.floor(d.getTime() / 1000)}\nMilliseconds: ${d.getTime()}` });
      }

      // ─── Color Conversion ───────────────────────────────────
      case "color_convert": {
        const color = String(args.color || "").trim();
        const conv = convertColor(color);
        return json({ result: conv });
      }

      // ─── Text Transformations ───────────────────────────────
      case "case_upper":
        return json({ result: String(args.text || "").toUpperCase() });
      case "case_lower":
        return json({ result: String(args.text || "").toLowerCase() });
      case "case_title":
        return json({ result: String(args.text || "").replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase()) });
      case "case_camel":
        return json({ result: String(args.text || "").replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : "") });
      case "case_snake":
        return json({ result: String(args.text || "").replace(/([A-Z])/g, "_$1").replace(/[-\s]+/g, "_").toLowerCase().replace(/^_/, "") });
      case "case_kebab":
        return json({ result: String(args.text || "").replace(/([A-Z])/g, "-$1").replace(/[_\s]+/g, "-").toLowerCase().replace(/^-/, "") });
      case "case_constant":
        return json({ result: String(args.text || "").replace(/([A-Z])/g, "_$1").replace(/[-\s]+/g, "_").toUpperCase().replace(/^_/, "") });
      case "case_dot":
        return json({ result: String(args.text || "").replace(/([A-Z])/g, ".$1").replace(/[-_\s]+/g, ".").toLowerCase().replace(/^\./, "") });

      // ─── Text Operations ────────────────────────────────────
      case "sort_lines": {
        const lines = String(args.text || "").split("\n");
        const reverse = Boolean(args.reverse);
        lines.sort();
        if (reverse) lines.reverse();
        return json({ result: lines.join("\n") });
      }
      case "sort_lines_numeric": {
        const lines = String(args.text || "").split("\n");
        lines.sort((a, b) => {
          const na = parseFloat(a.trim());
          const nb = parseFloat(b.trim());
          if (!isNaN(na) && !isNaN(nb)) return na - nb;
          return a.localeCompare(b);
        });
        return json({ result: lines.join("\n") });
      }
      case "dedup_lines": {
        const lines = String(args.text || "").split("\n");
        const unique = [...new Set(lines)];
        return json({ result: unique.join("\n"), info: `Removed ${lines.length - unique.length} duplicate(s)` });
      }
      case "trim_whitespace": {
        const text = String(args.text || "");
        return json({ result: text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim() });
      }
      case "reverse_text":
        return json({ result: String(args.text || "").split("").reverse().join("") });
      case "reverse_words":
        return json({ result: String(args.text || "").split(" ").reverse().join(" ") });
      case "reverse_lines":
        return json({ result: String(args.text || "").split("\n").reverse().join("\n") });
      case "add_line_numbers": {
        const lines = String(args.text || "").split("\n");
        const startAt = Number(args.start) || 1;
        const padded = lines.map((l, i) => `${String(startAt + i).padStart(4)} | ${l}`);
        return json({ result: padded.join("\n") });
      }
      case "remove_line_numbers": {
        const lines = String(args.text || "").split("\n");
        const cleaned = lines.map((l) => l.replace(/^\s*\d+\s*\|\s*/, ""));
        return json({ result: cleaned.join("\n") });
      }
      case "repeat_text": {
        const text = String(args.text || "");
        const count = Math.min(Math.max(Number(args.count) || 1, 1), 100);
        return json({ result: text.repeat(count) });
      }
      case "truncate_text": {
        const text = String(args.text || "");
        const maxLen = Math.min(Number(args.maxLength) || 100, 100000);
        return json({ result: text.length > maxLen ? text.slice(0, maxLen) + "..." : text });
      }
      case "strip_html":
        return json({ result: String(args.text || "").replace(/<[^>]*>/g, "") });
      case "slugify":
        return json({ result: String(args.text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") });
      case "word_wrap": {
        const text = String(args.text || "");
        const width = Math.min(Number(args.width) || 80, 200);
        const words = text.split(/\s+/);
        const linesRes: string[] = [];
        let current = "";
        for (const word of words) {
          if (current.length + word.length + 1 > width) {
            linesRes.push(current);
            current = word;
          } else {
            current = current ? current + " " + word : word;
          }
        }
        if (current) linesRes.push(current);
        return json({ result: linesRes.join("\n") });
      }
      case "pad_text": {
        const text = String(args.text || "");
        const padChar = String(args.padChar || " ");
        const width = Number(args.width) || 40;
        return json({ result: text.padStart(width, padChar[0] || " ") });
      }

      // ─── Number Base Conversion ─────────────────────────────
      case "base_convert": {
        const num = String(args.number || "0");
        const fromBase = Number(args.from) || 10;
        const toBase = Number(args.to) || 16;
        const decimal = parseInt(num, fromBase);
        if (isNaN(decimal)) return json({ result: "Invalid number", error: true });
        return json({ result: decimal.toString(toBase).toUpperCase() });
      }
      case "number_info": {
        const num = String(args.number || "0");
        const decimal = parseInt(num, num.startsWith("0x") ? 16 : num.startsWith("0b") ? 2 : 10);
        if (isNaN(decimal)) return json({ result: "Invalid number", error: true });
        return json({ result: `Decimal: ${decimal}\nBinary: ${decimal.toString(2)}\nOctal: ${decimal.toString(8)}\nHexadecimal: ${decimal.toString(16).toUpperCase()}\nBase64: ${Buffer.from(String(decimal)).toString("base64")}` });
      }

      // ─── Unit Conversion ────────────────────────────────────
      case "convert_temperature": {
        const val = Number(args.value);
        const from = String(args.from || "c").toLowerCase();
        const results: string[] = [];
        if (from === "c") {
          results.push(`Fahrenheit: ${(val * 9/5 + 32).toFixed(2)}`);
          results.push(`Kelvin: ${(val + 273.15).toFixed(2)}`);
        } else if (from === "f") {
          results.push(`Celsius: ${((val - 32) * 5/9).toFixed(2)}`);
          results.push(`Kelvin: ${((val - 32) * 5/9 + 273.15).toFixed(2)}`);
        } else {
          results.push(`Celsius: ${(val - 273.15).toFixed(2)}`);
          results.push(`Fahrenheit: ${((val - 273.15) * 9/5 + 32).toFixed(2)}`);
        }
        return json({ result: results.join("\n") });
      }
      case "convert_length": {
        const val = Number(args.value);
        const from = String(args.from || "m").toLowerCase();
        const convFactors: Record<string, number> = { mm: 0.001, cm: 0.01, m: 1, km: 1000, "in": 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 };
        const meters = val * (convFactors[from] || 1);
        const results = Object.entries(convFactors).map(([unit, factor]) => `${unit}: ${(meters / factor).toFixed(6)}`);
        return json({ result: results.join("\n") });
      }
      case "convert_weight": {
        const val = Number(args.value);
        const from = String(args.from || "kg").toLowerCase();
        const convFactors: Record<string, number> = { mg: 0.000001, g: 0.001, kg: 1, oz: 0.0283495, lb: 0.453592, t: 1000 };
        const kg = val * (convFactors[from] || 1);
        const results = Object.entries(convFactors).map(([unit, factor]) => `${unit}: ${(kg / factor).toFixed(6)}`);
        return json({ result: results.join("\n") });
      }

      // ─── Ciphers ────────────────────────────────────────────
      case "rot13": {
        const text = String(args.text || "");
        const result = text.replace(/[a-zA-Z]/g, (c) => {
          const base = c <= "Z" ? 65 : 97;
          return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
        });
        return json({ result });
      }
      case "caesar_encrypt": {
        const text = String(args.text || "");
        const shift = ((Number(args.shift) || 3) % 26 + 26) % 26;
        const result = text.replace(/[a-zA-Z]/g, (c) => {
          const base = c <= "Z" ? 65 : 97;
          return String.fromCharCode(((c.charCodeAt(0) - base + shift) % 26) + base);
        });
        return json({ result });
      }
      case "caesar_decrypt": {
        const text = String(args.text || "");
        const shift = ((26 - (Number(args.shift) || 3)) % 26 + 26) % 26;
        const result = text.replace(/[a-zA-Z]/g, (c) => {
          const base = c <= "Z" ? 65 : 97;
          return String.fromCharCode(((c.charCodeAt(0) - base + shift) % 26) + base);
        });
        return json({ result });
      }
      case "binary_encode":
        return json({ result: String(args.text || "").split("").map((c) => c.charCodeAt(0).toString(2).padStart(8, "0")).join(" ") });
      case "binary_decode": {
        const bytes = String(args.text || "").trim().split(/\s+/);
        const result = bytes.map((b) => String.fromCharCode(parseInt(b, 2))).join("");
        return json({ result });
      }
      case "hex_encode":
        return json({ result: Buffer.from(String(args.text || "")).toString("hex") });
      case "hex_decode":
        return json({ result: Buffer.from(String(args.text || ""), "hex").toString("utf-8") });
      case "morse_encode": {
        const morseMap: Record<string, string> = { a: ".-", b: "-...", c: "-.-.", d: "-..", e: ".", f: "..-.", g: "--.", h: "....", i: "..", j: ".---", k: "-.-", l: ".-..", m: "--", n: "-.", o: "---", p: ".--.", q: "--.-", r: ".-.", s: "...", t: "-", u: "..-", v: "...-", w: ".--", x: "-..-", y: "-.--", z: "--..", "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-", "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----." };
        const text = String(args.text || "").toLowerCase();
        const result = text.split("").map((c) => c === " " ? "/" : morseMap[c] || c).join(" ");
        return json({ result });
      }
      case "morse_decode": {
        const morseMap: Record<string, string> = { ".-": "a", "-...": "b", "-.-.": "c", "-..": "d", ".": "e", "..-.": "f", "--.": "g", "....": "h", "..": "i", ".---": "j", "-.-": "k", ".-..": "l", "--": "m", "-.": "n", "---": "o", ".--.": "p", "--.-": "q", ".-.": "r", "...": "s", "-": "t", "..-": "u", "...-": "v", ".--": "w", "-..-": "x", "-.--": "y", "--..": "z", "-----": "0", ".----": "1", "..---": "2", "...--": "3", "....-": "4", ".....": "5", "-....": "6", "--...": "7", "---..": "8", "----.": "9" };
        const morse = String(args.text || "");
        const result = morse.split(" / ").map((word) =>
          word.split(" ").map((code) => morseMap[code] || code).join("")
        ).join(" ");
        return json({ result });
      }

      // ─── JWT Decode ─────────────────────────────────────────
      case "jwt_decode": {
        try {
          const token = String(args.token || "");
          const parts = token.split(".");
          if (parts.length !== 3) return json({ result: "Invalid JWT format", error: true });
          const decodeB64 = (s: string) => {
            const padded = s + "=".repeat((4 - s.length % 4) % 4);
            return Buffer.from(padded, "base64").toString("utf-8");
          };
          const header = JSON.parse(decodeB64(parts[0]));
          const payload = JSON.parse(decodeB64(parts[1]));
          return json({ result: `Header:\n${JSON.stringify(header, null, 2)}\n\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nSignature: ${parts[2].slice(0, 20)}...` });
        } catch {
          return json({ result: "Invalid JWT token", error: true });
        }
      }

      // ─── CSV Parse ──────────────────────────────────────────
      case "csv_parse": {
        const csv = String(args.csv || "");
        const rows = csv.trim().split("\n").map((row) =>
          row.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
        );
        if (rows.length === 0) return json({ result: "No data" });
        const colWidths = rows[0].map((_, i) =>
          Math.max(...rows.map((r) => (r[i] || "").length))
        );
        const formatted = rows.map((row) =>
          row.map((cell, i) => cell.padEnd(colWidths[i] || 0)).join(" | ")
        );
        const separator = colWidths.map((w) => "-".repeat(w)).join("-+-");
        formatted.splice(1, 0, separator);
        return json({ result: formatted.join("\n") });
      }

      // ─── Lorem Ipsum ────────────────────────────────────────
      case "lorem_ipsum": {
        const count = Math.min(Number(args.count) || 3, 20);
        const paragraphs = [
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
          "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
          "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante.",
          "Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra.",
          "Vestibulum erat wisi, condimentum sed, commodo vitae, ornare sit amet, wisi. Aenean fermentum, elit eget tincidunt condimentum, eros ipsum rutrum orci.",
        ];
        const result = Array.from({ length: count }, (_, i) => paragraphs[i % paragraphs.length]).join("\n\n");
        return json({ result });
      }

      // ─── Regex Test ─────────────────────────────────────────
      case "regex_test": {
        const pattern = String(args.pattern || "");
        const text = String(args.text || "");
        const flags = String(args.flags || "g");
        try {
          const regex = new RegExp(pattern, flags);
          const matches = [...text.matchAll(regex)];
          if (matches.length === 0) return json({ result: "No matches found." });
          const result = matches.map((m, i) => `Match ${i + 1}: "${m[0]}" at index ${m.index}`).join("\n");
          return json({ result: `Found ${matches.length} match(es):\n${result}` });
        } catch (e) {
          return json({ result: `Invalid regex: ${e instanceof Error ? e.message : String(e)}`, error: true });
        }
      }

      // ─── HTTP Status Codes ──────────────────────────────────
      case "http_status": {
        const code = Number(args.code);
        const statusMap: Record<number, string> = {
          200: "OK", 201: "Created", 204: "No Content", 301: "Moved Permanently",
          302: "Found", 304: "Not Modified", 400: "Bad Request", 401: "Unauthorized",
          403: "Forbidden", 404: "Not Found", 405: "Method Not Allowed",
          408: "Request Timeout", 409: "Conflict", 422: "Unprocessable Entity",
          429: "Too Many Requests", 500: "Internal Server Error",
          502: "Bad Gateway", 503: "Service Unavailable", 504: "Gateway Timeout",
        };
        if (code && statusMap[code]) {
          return json({ result: `${code}: ${statusMap[code]}` });
        }
        return json({ result: Object.entries(statusMap).map(([k, v]) => `${k}: ${v}`).join("\n") });
      }

      // ─── Git Ignore Generator ───────────────────────────────
      case "gitignore": {
        const type = String(args.type || "node").toLowerCase();
        const templates: Record<string, string> = {
          node: "node_modules/\ndist/\nbuild/\n.env\n.env.local\n*.log\n.DS_Store\ncoverage/\n.next/",
          python: "__pycache__/\n*.py[cod]\n*.egg-info/\ndist/\nbuild/\n.env\n.venv/\n*.egg\n.mypy_cache/\n.pytest_cache/",
          go: "bin/\n*.exe\n*.test\n*.out\nvendor/\n.env",
          rust: "target/\n**/*.rs.bk\nCargo.lock\n.env",
          java: "*.class\n*.jar\n*.war\ntarget/\n.gradle/\n.idea/\n*.iml\n.env",
          react: "node_modules/\nbuild/\n.env\n.env.local\n.DS_Store\n*.log\ncoverage/\n.next/",
        };
        return json({ result: templates[type] || templates.node });
      }

      // ─── ASCII Art ──────────────────────────────────────────
      case "ascii_art": {
        const text = String(args.text || "Hello").toUpperCase().slice(0, 10);
        const font: Record<string, string[]> = {
          A: ["  ##  ", " #  # ", "#    #", "######", "#    #", "#    #"],
          B: ["##### ", "#    #", "##### ", "#    #", "#    #", "##### "],
          C: [" #####", "#     ", "#     ", "#     ", "#     ", " #####"],
          D: ["##### ", "#    #", "#    #", "#    #", "#    #", "##### "],
          E: ["######", "#     ", "##### ", "#     ", "#     ", "######"],
          F: ["######", "#     ", "##### ", "#     ", "#     ", "#     "],
          G: [" #####", "#     ", "#  ###", "#    #", "#    #", " #####"],
          H: ["#    #", "#    #", "######", "#    #", "#    #", "#    #"],
          I: [" #####", "   #  ", "   #  ", "   #  ", "   #  ", " #####"],
          J: ["  ####", "     #", "     #", "     #", "#    #", " #### "],
          K: ["#   # ", "#  #  ", "###   ", "#  #  ", "#   # ", "#    #"],
          L: ["#     ", "#     ", "#     ", "#     ", "#     ", "######"],
          M: ["#    #", "##  ##", "# ## #", "#    #", "#    #", "#    #"],
          N: ["#    #", "##   #", "# #  #", "#  # #", "#   ##", "#    #"],
          O: [" #### ", "#    #", "#    #", "#    #", "#    #", " #### "],
          P: ["##### ", "#    #", "##### ", "#     ", "#     ", "#     "],
          Q: [" #### ", "#    #", "#    #", "#  # #", "#   # ", " ### #"],
          R: ["##### ", "#    #", "##### ", "#  #  ", "#   # ", "#    #"],
          S: [" #####", "#     ", " #####", "     #", "     #", "##### "],
          T: ["#######", "   #   ", "   #   ", "   #   ", "   #   ", "   #   "],
          U: ["#    #", "#    #", "#    #", "#    #", "#    #", " #### "],
          V: ["#    #", "#    #", "#    #", " #  # ", " #  # ", "  ##  "],
          W: ["#    #", "#    #", "# ## #", "##  ##", "#    #", "#    #"],
          X: ["#    #", " #  # ", "  ##  ", "  ##  ", " #  # ", "#    #"],
          Y: ["#    #", " #  # ", "  ##  ", "  #   ", "  #   ", "  #   "],
          Z: ["######", "    # ", "   #  ", "  #   ", " #    ", "######"],
          " ": ["      ", "      ", "      ", "      ", "      ", "      "],
        };
        const lines: string[] = Array(6).fill("");
        for (const char of text) {
          const glyph = font[char] || font[" "];
          for (let row = 0; row < 6; row++) {
            lines[row] += (glyph[row] || "      ") + " ";
          }
        }
        return json({ result: lines.join("\n") });
      }

      // ─── Token Estimation ───────────────────────────────────
      case "estimate_tokens": {
        const text = String(args.text || "");
        const tokens = Math.ceil(text.length / 4);
        return json({ result: `Estimated tokens: ~${tokens}\nCharacters: ${text.length}\nWords: ${text.split(/\s+/).filter(Boolean).length}\nCost estimate (Gemini Flash): ~$${(tokens * 0.000000075).toFixed(6)}` });
      }

      // ─── Password Strength ──────────────────────────────────
      case "password_strength": {
        const pw = String(args.password || "");
        let score = 0;
        if (pw.length >= 8) score++;
        if (pw.length >= 12) score++;
        if (pw.length >= 16) score++;
        if (/[a-z]/.test(pw)) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^a-zA-Z0-9]/.test(pw)) score++;
        const labels = ["Very Weak", "Weak", "Fair", "Moderate", "Strong", "Very Strong", "Excellent", "Maximum"];
        return json({ result: `Password: ${"*".repeat(pw.length)}\nLength: ${pw.length}\nStrength: ${labels[score] || "Unknown"} (${score}/7)\nHas lowercase: ${/[a-z]/.test(pw)}\nHas uppercase: ${/[A-Z]/.test(pw)}\nHas numbers: ${/[0-9]/.test(pw)}\nHas symbols: ${/[^a-zA-Z0-9]/.test(pw)}` });
      }

      default:
        return json({ result: `Unknown utility: ${tool}`, error: true });
    }
  } catch (err) {
    return json({
      result: `Error: ${err instanceof Error ? err.message : String(err)}`,
      error: true,
    });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function json(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function convertColor(color: string): string {
  const hexMatch = color.match(/^#?([0-9a-f]{3,8})$/i);
  const rgbMatch = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  const hslMatch = color.match(/^hsla?\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/i);

  let r = 0, g = 0, b = 0;

  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else if (rgbMatch) {
    r = parseInt(rgbMatch[1]);
    g = parseInt(rgbMatch[2]);
    b = parseInt(rgbMatch[3]);
  } else if (hslMatch) {
    const h = parseInt(hslMatch[1]) / 360;
    const s = parseInt(hslMatch[2]) / 100;
    const l = parseInt(hslMatch[3]) / 100;
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
    g = Math.round(hue2rgb(p, q, h) * 255);
    b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
  } else {
    return `Could not parse color: ${color}`;
  }

  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  const rgb = `rgb(${r}, ${g}, ${b})`;

  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0;
  const ll = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = ll > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }

  const hsl = `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(ll * 100)}%)`;

  return `HEX: ${hex}\nRGB: ${rgb}\nHSL: ${hsl}`;
}
