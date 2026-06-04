"""Serialize naive UTC datetimes for API clients (always with Z suffix)."""
from datetime import datetime, timezone


def format_utc_iso(dt):
    """Convert stored UTC datetime to ISO-8601 string ending with Z."""
    if dt is None:
        return None
    if isinstance(dt, str):
        s = dt.strip()
        if not s:
            return s
        if s.endswith('Z') or '+' in s[10:] or (len(s) > 6 and s[-6] in '+-'):
            return s
        return s.replace(' ', 'T') + 'Z'
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt.isoformat().replace('+00:00', '') + 'Z'
