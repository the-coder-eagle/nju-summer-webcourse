import { Config, Destroy, Init, Provide } from "@midwayjs/core";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Course, CreateCourseInput } from "../interface";
import { toISODate } from "../utils/date";

type CourseRow = {
  id: number;
  title: string;
  description: string;
  created_at: string;
};

@Provide()
export class CourseService {
  @Config("courseDatabase.path")
  databasePath: string;

  private database: DatabaseSync;

  @Init()
  async initialize() {
    const absolutePath = resolve(process.cwd(), this.databasePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    this.database = new DatabaseSync(absolutePath);
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const row = this.database
      .prepare("SELECT COUNT(*) AS total FROM courses")
      .get() as {
      total: number;
    };

    if (row.total === 0) {
      const insert = this.database.prepare(
        "INSERT INTO courses (title, description) VALUES (?, ?)",
      );
      insert.run("HTML 与 CSS", "构建语义清晰、响应式且可访问的页面。");
      insert.run("React 与 Next.js", "理解组件、状态、路由和服务端渲染。");
      insert.run(
        "API 与数据持久化",
        "使用 Midway.js、OpenAPI 和 SQLite 完成全栈闭环。",
      );
    }
  }

  list(): Course[] {
    const rows = this.database
      .prepare(
        "SELECT id, title, description, created_at FROM courses ORDER BY id",
      )
      .all() as CourseRow[];

    return rows.map(mapCourse);
  }

  create(input: CreateCourseInput): Course {
    const result = this.database
      .prepare("INSERT INTO courses (title, description) VALUES (?, ?)")
      .run(input.title.trim(), input.description.trim());
    const row = this.database
      .prepare(
        "SELECT id, title, description, created_at FROM courses WHERE id = ?",
      )
      .get(result.lastInsertRowid) as CourseRow;

    return mapCourse(row);
  }

  @Destroy()
  async close() {
    this.database?.close();
  }
}

function mapCourse(row: CourseRow): Course {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    createdAt: toISODate(row.created_at),
  };
}
