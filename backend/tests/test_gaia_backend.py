"""Backend tests for GAIA service-recovery endpoints."""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://elite-service-stars.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _fresh_ip_headers():
    """Use a unique X-Forwarded-For per test so the per-IP rate-limit store is isolated."""
    return {"X-Forwarded-For": f"10.0.{uuid.uuid4().int % 255}.{uuid.uuid4().int % 255}"}


class TestConfig:
    def test_get_config(self):
        r = requests.get(f"{API}/config", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["restaurant_name"] == "GAIA"
        assert data["manager_email"] == "manager@gaia.ae"
        assert data["rate_limit_window_seconds"] == 900
        assert data["email_configured"] is False


class TestLowRatingAlert:
    def test_low_rating_alert_returns_email_not_sent(self):
        headers = {"Content-Type": "application/json", **_fresh_ip_headers()}
        body = {"rating": 3, "waiter_name": "Ahmed", "comment": "Slow service", "language": "en"}
        r = requests.post(f"{API}/alerts/low-rating", json=body, headers=headers, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email_sent"] is False
        assert "status" in data
        assert data["status"] == "queued"

    def test_high_rating_returns_400(self):
        headers = {"Content-Type": "application/json", **_fresh_ip_headers()}
        body = {"rating": 5, "waiter_name": "Ahmed", "comment": "", "language": "en"}
        r = requests.post(f"{API}/alerts/low-rating", json=body, headers=headers, timeout=15)
        assert r.status_code == 400, r.text

    def test_rate_limit_second_call_429(self):
        # Stable, unique IP for this single test so cooldown actually triggers
        headers = {"Content-Type": "application/json", "X-Forwarded-For": f"10.99.{uuid.uuid4().int % 255}.{uuid.uuid4().int % 255}"}
        body = {"rating": 2, "waiter_name": "Sara", "comment": "test", "language": "en"}

        r1 = requests.post(f"{API}/alerts/low-rating", json=body, headers=headers, timeout=15)
        assert r1.status_code == 200, r1.text

        # second consecutive call from same IP within 15 min
        r2 = requests.post(f"{API}/alerts/low-rating", json=body, headers=headers, timeout=15)
        assert r2.status_code == 429, r2.text
        data = r2.json()
        # FastAPI wraps detail in {"detail": {...}}
        detail = data.get("detail", {})
        if isinstance(detail, dict):
            assert "retry_after_seconds" in detail
            assert isinstance(detail["retry_after_seconds"], int)
            assert detail["retry_after_seconds"] > 0
        else:
            pytest.fail(f"Expected dict detail with retry_after_seconds, got: {data}")

    def test_rating_below_1_validation(self):
        headers = {"Content-Type": "application/json", **_fresh_ip_headers()}
        body = {"rating": 0, "waiter_name": "Ahmed", "comment": "", "language": "en"}
        r = requests.post(f"{API}/alerts/low-rating", json=body, headers=headers, timeout=15)
        assert r.status_code == 422, r.text
