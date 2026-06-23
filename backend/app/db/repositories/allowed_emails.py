import asyncpg


async def list_all(pool: asyncpg.Pool) -> list[dict]:
    rows = await pool.fetch(
        "SELECT id, email, added_by, created_at FROM allowed_emails ORDER BY created_at"
    )
    return [dict(r) for r in rows]


async def get_all_emails(pool: asyncpg.Pool) -> set[str]:
    rows = await pool.fetch("SELECT email FROM allowed_emails")
    return {r["email"].lower() for r in rows}


async def add(pool: asyncpg.Pool, email: str, added_by: str) -> dict | None:
    try:
        row = await pool.fetchrow(
            "INSERT INTO allowed_emails (email, added_by) VALUES ($1, $2) RETURNING id, email, added_by, created_at",
            email.lower().strip(),
            added_by,
        )
        return dict(row) if row else None
    except asyncpg.UniqueViolationError:
        return None


async def remove(pool: asyncpg.Pool, email_id: int) -> bool:
    result = await pool.execute("DELETE FROM allowed_emails WHERE id = $1", email_id)
    return result == "DELETE 1"


async def seed_from_env(pool: asyncpg.Pool, emails_csv: str):
    if not emails_csv:
        return
    for email in emails_csv.split(","):
        email = email.strip().lower()
        if email:
            try:
                await pool.execute(
                    "INSERT INTO allowed_emails (email, added_by) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING",
                    email,
                    "env",
                )
            except Exception:
                pass
