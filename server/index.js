const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

/* =========================================================
   DATA STORAGE
========================================================= */

const DATA_DIR = path.join(__dirname, "data");
const PLANS_FILE = path.join(DATA_DIR, "cleanup-plans.json");

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
      recursive: true,
    });
  }

  if (!fs.existsSync(PLANS_FILE)) {
    fs.writeFileSync(PLANS_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

function readJson(filePath, fallback = []) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }

    const content = fs.readFileSync(filePath, "utf8");

    if (!content.trim()) {
      return fallback;
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("JSON read error:", error);
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

ensureStorage();

/* =========================================================
   HEALTH
========================================================= */

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "LazyDesk AI API is running",
  });
});

/* =========================================================
   GENERATE CLEANUP PLAN
========================================================= */

app.post("/api/generate-cleanup-plan", async (req, res) => {
  try {
    const {
      files = [],
      workspaceName = "My Workspace",
      mode = "lazy",
    } = req.body;

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one filename.",
      });
    }

    const cleanFiles = files.map((file) => String(file).trim()).filter(Boolean);

    if (cleanFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid filenames were provided.",
      });
    }

    const prompt = `
You are LazyDesk AI, a local AI-powered digital file cleanup assistant.

Your job is to create a safe cleanup plan for messy filenames.

Workspace:
${workspaceName}

Mode:
${mode}

Files:
${JSON.stringify(cleanFiles, null, 2)}

IMPORTANT RULES:

- Do not delete any file.
- Do not claim that files are duplicates unless the filenames strongly suggest it.
- Do not invent file contents.
- Base your suggestions only on the filenames provided.
- Suggest clearer, professional filenames.
- Preserve the correct file extension.
- Suggest a logical folder path for each file.
- Keep folder names simple and practical.
- Prefer date-first naming only when the filename clearly contains a date or month.
- Preserve recognizable company, client, or project names.
- If a filename is already good, keep it similar.
- Avoid overly long filenames.
- Do not include characters that are invalid in Windows filenames.
- Do not use markdown.
- Return valid JSON only.

For every file return:

{
  "original_name": "",
  "suggested_name": "",
  "folder": "",
  "reason": "",
  "confidence": "high"
}

confidence must be one of:
"high", "medium", "low"

Return exactly this JSON structure:

{
  "summary": "",
  "files": []
}
`;

    const ollamaResponse = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemma3:1b",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        stream: false,
        format: "json",
        options: {
          temperature: 0.25,
        },
      }),
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();

      console.error("Ollama error:", errorText);

      return res.status(500).json({
        success: false,
        message: "Failed to communicate with Ollama.",
      });
    }

    const ollamaData = await ollamaResponse.json();
    const content = ollamaData.message?.content;

    console.log("Gemma raw response:");
    console.log(content);

    if (!content) {
      return res.status(500).json({
        success: false,
        message: "Gemma returned an empty response.",
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch (error) {
      console.error("JSON parse error:", error);

      return res.status(500).json({
        success: false,
        message: "AI returned invalid JSON.",
        raw: content,
      });
    }

    const rawItems = Array.isArray(parsed.files) ? parsed.files : [];

    if (rawItems.length === 0) {
      return res.status(500).json({
        success: false,
        message: "AI did not return any cleanup items.",
      });
    }

    const normalizedFiles = rawItems.map((item, index) => {
      const originalName =
        item.original_name || cleanFiles[index] || `file-${index + 1}`;

      const suggestedName = item.suggested_name || originalName;

      return {
        id: crypto.randomUUID(),
        original_name: String(originalName),
        suggested_name: String(suggestedName),
        folder: String(item.folder || "Unsorted"),
        reason: String(item.reason || "Suggested cleanup"),
        confidence: ["high", "medium", "low"].includes(
          String(item.confidence || "").toLowerCase(),
        )
          ? String(item.confidence).toLowerCase()
          : "medium",
      };
    });

    const plans = readJson(PLANS_FILE, []);

    const record = {
      id: crypto.randomUUID(),
      workspace_name: workspaceName,
      mode,
      summary:
        parsed.summary ||
        `Cleanup plan generated for ${normalizedFiles.length} files.`,
      status: "GENERATED",
      files: normalizedFiles,
      created_at: new Date().toISOString(),
      approved_at: null,
    };

    plans.unshift(record);

    writeJson(PLANS_FILE, plans);

    return res.json({
      success: true,
      plan: record,
    });
  } catch (error) {
    console.error("Generate cleanup plan error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate cleanup plan.",
      error: error.message,
    });
  }
});

/* =========================================================
   GET ALL SAVED PLANS
========================================================= */

app.get("/api/cleanup-plans", (req, res) => {
  try {
    const plans = readJson(PLANS_FILE, []);

    return res.json({
      success: true,
      count: plans.length,
      plans,
    });
  } catch (error) {
    console.error("Get plans error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load cleanup plans.",
    });
  }
});

/* =========================================================
   GET ONE PLAN
========================================================= */

app.get("/api/cleanup-plans/:id", (req, res) => {
  try {
    const { id } = req.params;

    const plans = readJson(PLANS_FILE, []);

    const plan = plans.find((item) => item.id === id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Cleanup plan not found.",
      });
    }

    return res.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error("Get plan error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load cleanup plan.",
    });
  }
});

/* =========================================================
   APPROVE PLAN
========================================================= */

app.patch("/api/cleanup-plans/:id/approve", (req, res) => {
  try {
    const { id } = req.params;

    const plans = readJson(PLANS_FILE, []);

    const index = plans.findIndex((item) => item.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "Cleanup plan not found.",
      });
    }

    plans[index] = {
      ...plans[index],
      status: "APPROVED",
      approved_at: new Date().toISOString(),
    };

    writeJson(PLANS_FILE, plans);

    return res.json({
      success: true,
      message: "Cleanup plan approved.",
      plan: plans[index],
    });
  } catch (error) {
    console.error("Approve plan error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve cleanup plan.",
    });
  }
});

/* =========================================================
   DELETE PLAN
========================================================= */

app.delete("/api/cleanup-plans/:id", (req, res) => {
  try {
    const { id } = req.params;

    const plans = readJson(PLANS_FILE, []);

    const exists = plans.some((item) => item.id === id);

    if (!exists) {
      return res.status(404).json({
        success: false,
        message: "Cleanup plan not found.",
      });
    }

    const updatedPlans = plans.filter((item) => item.id !== id);

    writeJson(PLANS_FILE, updatedPlans);

    return res.json({
      success: true,
      message: "Cleanup plan deleted.",
    });
  } catch (error) {
    console.error("Delete plan error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete cleanup plan.",
    });
  }
});

/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, () => {
  console.log(`LazyDesk AI server running on port ${PORT}`);
  console.log(`Local data directory: ${DATA_DIR}`);
});
