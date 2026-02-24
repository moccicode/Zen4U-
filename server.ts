import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import * as cheerio from "cheerio";

const db = new Database("zen4u.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT,
    department TEXT,
    name TEXT,
    email TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_url TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_favorite INTEGER DEFAULT 0
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth Routes
  app.post("/api/auth/signup", (req, res) => {
    const { company, department, name, email } = req.body;
    try {
      const info = db.prepare("INSERT INTO users (company, department, name, email) VALUES (?, ?, ?, ?)").run(company, department, name, email);
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  // API Routes
  app.get("/api/memos", (req, res) => {
    const memos = db.prepare("SELECT * FROM memos ORDER BY created_at DESC").all();
    res.json(memos);
  });

  app.post("/api/memos", (req, res) => {
    const { article_url, content } = req.body;
    const info = db.prepare("INSERT INTO memos (article_url, content) VALUES (?, ?)").run(article_url, content);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/memos/:id", (req, res) => {
    const { id } = req.params;
    const { content, is_favorite } = req.body;
    
    try {
      if (content !== undefined) {
        db.prepare("UPDATE memos SET content = ? WHERE id = ?").run(content, id);
      }
      if (is_favorite !== undefined) {
        db.prepare("UPDATE memos SET is_favorite = ? WHERE id = ?").run(is_favorite ? 1 : 0, id);
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Server] Update error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/memos/:id", (req, res) => {
    const { id } = req.params;
    try {
      const info = db.prepare("DELETE FROM memos WHERE id = ?").run(id);
      if (info.changes > 0) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Memo not found" });
      }
    } catch (error: any) {
      console.error("[Server] Delete error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // New endpoint to fetch article content
  app.post("/api/fetch-article", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove scripts, styles, and other noise
      $('script, style, nav, footer, header, aside, .ads, #ads').remove();

      // Try to find the main content
      let content = $('article').text() || $('main').text() || $('body').text();
      
      // Clean up whitespace
      content = content.replace(/\s+/g, ' ').trim().substring(0, 15000); // Limit to 15k chars for Gemini

      res.json({ content });
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ error: "Failed to fetch article content" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
