"""Fuso horário do restaurante. O servidor (Render) roda em UTC, mas o "dia" do restaurante é o de Brasília."""
import os
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

APP_TZ = ZoneInfo(os.getenv("APP_TIMEZONE", "America/Sao_Paulo"))


def today() -> str:
    return datetime.now(APP_TZ).strftime("%Y-%m-%d")


def local_day_bounds(day: str | None) -> tuple[datetime, datetime]:
    """Início/fim do dia no fuso do restaurante, convertidos para UTC (como o banco guarda)."""
    d = datetime.strptime(day, "%Y-%m-%d").date() if day else datetime.now(APP_TZ).date()
    start = datetime.combine(d, time.min, tzinfo=APP_TZ)
    end = datetime.combine(d + timedelta(days=1), time.min, tzinfo=APP_TZ)
    return start.astimezone(timezone.utc), end.astimezone(timezone.utc)


def local_date(dt: datetime) -> str:
    """Data (YYYY-MM-DD) de um instante no fuso do restaurante. Datas sem fuso são tratadas como UTC."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(APP_TZ).strftime("%Y-%m-%d")
