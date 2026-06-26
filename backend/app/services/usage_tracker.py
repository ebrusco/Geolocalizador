from datetime import datetime, timezone, date

import app.database as db

COST_PER_CALL_USD = 0.04
FREE_MONTHLY_CREDIT_USD = 200.0
_SAFETY_FACTOR = 0.90  # reserve 10% for Geocoding / Maps JS API shared credit


class UsageTracker:
    """Tracks Google Places API calls. Persists to DB when available; falls back to RAM."""

    def __init__(self):
        self._calls: list[dict] = []  # in-memory fallback
        self._summary_cache: dict | None = None
        self._cache_at: datetime | None = None
        self._CACHE_TTL_S = 30

    async def record_call(self, search_id: int | None = None):
        now = datetime.now(timezone.utc)
        self._calls.append({"timestamp": now, "cost_usd": COST_PER_CALL_USD, "search_id": search_id})
        if db.pool:
            try:
                await db.pool.execute(
                    "INSERT INTO api_usage (search_id, cost_usd, created_at) VALUES ($1, $2, $3)",
                    search_id, COST_PER_CALL_USD, now,
                )
                self._summary_cache = None  # invalidate cache on write
            except Exception:
                pass  # already recorded in-memory

    async def get_summary(self) -> dict:
        if db.pool:
            now = datetime.now(timezone.utc)
            if (self._summary_cache is not None and self._cache_at is not None
                    and (now - self._cache_at).total_seconds() < self._CACHE_TTL_S):
                return self._summary_cache
            try:
                row = await db.pool.fetchrow("""
                    SELECT
                        COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)              AS calls_today,
                        COALESCE(SUM(cost_usd) FILTER (WHERE created_at::date = CURRENT_DATE), 0) AS cost_today,
                        COUNT(*) FILTER (WHERE date_trunc('month', created_at) = date_trunc('month', NOW())) AS calls_month,
                        COALESCE(SUM(cost_usd) FILTER (WHERE date_trunc('month', created_at) = date_trunc('month', NOW())), 0) AS cost_month
                    FROM api_usage
                """)
                result = self._build_summary(
                    int(row["calls_today"]),
                    float(row["cost_today"]),
                    int(row["calls_month"]),
                    float(row["cost_month"]),
                )
                self._summary_cache = result
                self._cache_at = now
                return result
            except Exception:
                pass
        return self._get_from_memory()

    def _get_from_memory(self) -> dict:
        today = datetime.now(timezone.utc).date()
        month_key = (today.year, today.month)
        today_calls = [c for c in self._calls if c["timestamp"].date() == today]
        month_calls = [c for c in self._calls
                       if (c["timestamp"].year, c["timestamp"].month) == month_key]
        return self._build_summary(
            len(today_calls),
            sum(c["cost_usd"] for c in today_calls),
            len(month_calls),
            sum(c["cost_usd"] for c in month_calls),
        )

    def _build_summary(self, calls_today: int, cost_today: float,
                       calls_month: int, cost_month: float) -> dict:
        effective_credit = FREE_MONTHLY_CREDIT_USD * _SAFETY_FACTOR
        free_remaining = max(0.0, effective_credit - cost_month)
        real_cost = max(0.0, cost_month - effective_credit)
        free_calls_remaining = int(free_remaining / COST_PER_CALL_USD)
        free_calls_total = int(effective_credit / COST_PER_CALL_USD)
        return {
            "calls_today": calls_today,
            "cost_today_usd": round(cost_today, 2),
            "calls_month": calls_month,
            "cost_month_usd": round(cost_month, 2),
            "free_credit_total_usd": FREE_MONTHLY_CREDIT_USD,
            "free_credit_remaining_usd": round(free_remaining, 2),
            "free_credit_pct": round((free_remaining / effective_credit) * 100, 1) if effective_credit > 0 else 0.0,
            "free_calls_remaining": free_calls_remaining,
            "free_calls_total": free_calls_total,
            "is_free_exhausted": free_remaining <= 0,
            "real_cost_usd": round(real_cost, 2),
            "cost_per_call_usd": COST_PER_CALL_USD,
        }

    async def get_daily_breakdown(self, target_date: date | None = None) -> list[dict]:
        if target_date is None:
            target_date = datetime.now(timezone.utc).date()
        if db.pool:
            try:
                rows = await db.pool.fetch("""
                    SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC') AS hour, COUNT(*) AS calls
                    FROM api_usage
                    WHERE created_at::date = $1
                    GROUP BY 1 ORDER BY 1
                """, target_date)
                return [{"hour": int(r["hour"]), "calls": int(r["calls"])} for r in rows]
            except Exception:
                pass
        calls = [c for c in self._calls if c["timestamp"].date() == target_date]
        hours: dict[int, int] = {}
        for c in calls:
            h = c["timestamp"].hour
            hours[h] = hours.get(h, 0) + 1
        return [{"hour": h, "calls": n} for h, n in sorted(hours.items())]


usage_tracker = UsageTracker()
