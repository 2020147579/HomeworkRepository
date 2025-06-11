const express = require("express");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");

const app = express();
const PORT = 3000;

app.use(express.static("public"));

app.use(express.json());

const db = new sqlite3.Database("product.db", (err) => {
  if (err) {
    console.error("Database connection error:", err.message);
  } else {
    console.log("Connected to product.db");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

app.get("/movies", (req, res) => {
  const sort = req.query.sort;
  const search = req.query.search;
  let sql = "SELECT * FROM movies";
  const params = [];

  if (search) {
    sql += " WHERE movie_title LIKE ?";
    params.push(`%${search}%`);
  }

  if (sort === "grade-desc") {
    sql += " ORDER BY movie_rate DESC";
  } else if (sort === "grade-asc") {
    sql += " ORDER BY movie_rate ASC";
  } else if (sort === "date-desc") {
    sql += " ORDER BY movie_release_date DESC";
  } else if (sort === "date-asc") {
    sql += " ORDER BY movie_release_date ASC";
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: "Database error" });
    } else {
      res.json(rows);
    }
  });
});

app.get("/movies/:id", (req, res) => {
  const movieId = req.params.id;

  const sql = "SELECT * FROM movies WHERE movie_id = ?";
  db.get(sql, [movieId], (err, row) => {
    if (err) {
      res.status(500).json({ error: "Database error" });
    } else if (!row) {
      res.status(404).json({ error: "Movie not found" });
    } else {
      res.json(row);
    }
  });
  
  app.post("/comments", (req, res) => {
    const { movie_id, comment } = req.body;
    const filePath = path.join(__dirname, "public", "comment.json");

    fs.readFile(filePath, "utf-8", (err, data) => {
      if (err) return res.status(500).json({ error: "파일 읽기 실패" });

      let commentsData = JSON.parse(data);
      let target = commentsData.find(c => c.movie_id == movie_id);

      if (target) {
        target.comments.push(comment);
      } else {
        commentsData.push({ movie_id: Number(movie_id), comments: [comment] });
      }

      fs.writeFile(filePath, JSON.stringify(commentsData, null, 2), err => {
        if (err) return res.status(500).json({ error: "파일 저장 실패" });
        res.json({ success: true });
      });
    });
  });
});