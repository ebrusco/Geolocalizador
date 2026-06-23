from datetime import datetime, timezone, date


COST_PER_CALL_USD = 0.04
FREE_MONTHLY_CREDIT_USD = 200.0


class UsageTracker:
    """Tracks real API calls to Google Places for cost control."""

    def __init__(self):
        self._calls: list[dict] = []

    def record_call(self, search_id: int | None = None):
        self._calls.append({
            "timestamp": datetime.now(timezone.utc),
            "cost_usd": COST_PER_CALL_USD,
            "search_id": search_id,
        })

    def _filter_calls(self, target_date: date | None = None, month: bool = False) -> list[dict]:
        if target_date is None:
            target_date = datetime.now(timezone.utc).date()

        if month:
            return [c for c in self._calls
                    if c["timestamp"].year == target_date.year
                    and c["timestamp"].month == target_date.month]
        else:
            return [c for c in self._calls
                    if c["timestamp"].date() == target_date]

    def get_today(self) -> dict:
        calls = self._filter_calls()
        total_cost = len(calls) * COST_PER_CALL_USD
        return {"calls": len(calls), "cost_usd": round(total_cost, 2)}

    def get_month(self, target_date: date | None = None) -> dict:
        calls = self._filter_calls(target_date, month=True)
        total_cost = len(calls) * COST_PER_CALL_USD
        return {"calls": len(calls), "cost_usd": round(total_cost, 2)}

    def get_summary(self) -> dict:
        today = self.get_today()
        month = self.get_month()

        free_remaining = max(0, FREE_MONTHLY_CREDIT_USD - month["cost_usd"])
        is_free_exhausted = free_remaining <= 0
        real_cost = max(0, month["cost_usd"] - FREE_MONTHLY_CREDIT_USD)

        free_calls_remaining = int(free_remaining / COST_PER_CALL_USD)
        free_calls_total = int(FREE_MONTHLY_CREDIT_USD / COST_PER_CALL_USD)

        return {
            "calls_today": today["calls"],
            "cost_today_usd": today["cost_usd"],
            "calls_month": month["calls"],
            "cost_month_usd": month["cost_usd"],
            "free_credit_total_usd": FREE_MONTHLY_CREDIT_USD,
            "free_credit_remaining_usd": round(free_remaining, 2),
            "free_credit_pct": round((free_remaining / FREE_MONTHLY_CREDIT_USD) * 100, 1),
            "free_calls_remaining": free_calls_remaining,
            "free_calls_total": free_calls_total,
            "is_free_exhausted": is_free_exhausted,
            "real_cost_usd": round(real_cost, 2),
            "cost_per_call_usd": COST_PER_CALL_USD,
        }

    def get_daily_breakdown(self, target_date: date | None = None) -> list[dict]:
        """Returns hourly breakdown for a given day."""
        calls = self._filter_calls(target_date)
        hours: dict[int, int] = {}
        for c in calls:
            h = c["timestamp"].hour
            hours[h] = hours.get(h, 0) + 1
        return [{"hour": h, "calls": n} for h, n in sorted(hours.items())]


usage_tracker = UsageTracker()
