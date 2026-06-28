from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import uuid
import resend
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend setup
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
MANAGER_EMAIL = os.environ.get('MANAGER_EMAIL', 'manager@gaia.ae')
RESTAURANT_NAME = os.environ.get('RESTAURANT_NAME', 'GAIA')
resend.api_key = RESEND_API_KEY

# Server-side rate limit window: 15 minutes per IP
RATE_LIMIT_WINDOW_SECONDS = 15 * 60
_rate_limit_store: dict[str, float] = {}

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LowRatingAlert(BaseModel):
    rating: int = Field(ge=1, le=5)
    waiter_name: str
    comment: Optional[str] = ""
    language: Optional[str] = "en"


def _client_ip(req: Request) -> str:
    # Trust common forwarded headers behind ingress
    fwd = req.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return req.client.host if req.client else "unknown"


def _rate_limited(key: str) -> tuple[bool, float]:
    now = datetime.now(timezone.utc).timestamp()
    last = _rate_limit_store.get(key)
    if last is not None and (now - last) < RATE_LIMIT_WINDOW_SECONDS:
        remaining = RATE_LIMIT_WINDOW_SECONDS - (now - last)
        return True, remaining
    _rate_limit_store[key] = now
    return False, 0.0


def _build_email_html(rating: int, waiter_name: str, comment: str) -> str:
    stars_filled = "&#9733;" * rating
    stars_empty = "&#9734;" * (5 - rating)
    safe_comment = (comment or "").replace("<", "&lt;").replace(">", "&gt;")
    if not safe_comment.strip():
        safe_comment = "<em style='color:#7A7571'>No additional comment</em>"
    return f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FDFBF7;font-family:Arial,sans-serif;padding:32px 0;">
      <tr><td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E6E2D8;">
          <tr><td style="padding:32px 32px 16px;text-align:center;border-bottom:1px solid #E6E2D8;">
            <div style="font-size:11px;letter-spacing:4px;color:#7A7571;text-transform:uppercase;">{RESTAURANT_NAME} &middot; Service Recovery Alert</div>
            <div style="height:1px;background:#D4AF37;width:48px;margin:16px auto;"></div>
            <div style="font-size:22px;color:#2C2A29;letter-spacing:1px;">A guest needs your attention</div>
          </td></tr>
          <tr><td style="padding:28px 32px;">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;color:#7A7571;text-transform:uppercase;">Rating</p>
            <p style="margin:0 0 24px;font-size:28px;color:#D4AF37;letter-spacing:4px;">{stars_filled}<span style="color:#E6E2D8;">{stars_empty}</span> <span style="font-size:14px;color:#2C2A29;">({rating}/5)</span></p>

            <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;color:#7A7571;text-transform:uppercase;">Waiter</p>
            <p style="margin:0 0 24px;font-size:18px;color:#2C2A29;">{waiter_name}</p>

            <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;color:#7A7571;text-transform:uppercase;">Guest Comment</p>
            <p style="margin:0;font-size:15px;color:#2C2A29;line-height:1.6;">{safe_comment}</p>
          </td></tr>
          <tr><td style="padding:20px 32px 32px;border-top:1px solid #E6E2D8;text-align:center;">
            <p style="margin:0;font-size:10px;letter-spacing:2px;color:#9A938C;text-transform:uppercase;">Intercept &amp; recover this experience before the guest leaves.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
    """


@api_router.get("/")
async def root():
    return {"message": "GAIA backend running"}


@api_router.get("/config")
async def get_config():
    """Expose non-secret config so frontend can show manager email in UI if needed."""
    return {
        "restaurant_name": RESTAURANT_NAME,
        "manager_email": MANAGER_EMAIL,
        "rate_limit_window_seconds": RATE_LIMIT_WINDOW_SECONDS,
        "email_configured": bool(RESEND_API_KEY and RESEND_API_KEY != "re_your_api_key_here"),
    }


@api_router.post("/alerts/low-rating")
async def send_low_rating_alert(payload: LowRatingAlert, request: Request):
    if payload.rating >= 4:
        raise HTTPException(status_code=400, detail="Alerts are only for ratings below 4 stars.")

    ip = _client_ip(request)
    rate_key = f"alert:{ip}"
    limited, remaining = _rate_limited(rate_key)
    if limited:
        raise HTTPException(
            status_code=429,
            detail={
                "message": "Rate limited. Please wait before sending another alert.",
                "retry_after_seconds": int(remaining),
            },
        )

    # Persist a record (best-effort)
    try:
        await db.alerts.insert_one({
            "id": str(uuid.uuid4()),
            "rating": payload.rating,
            "waiter_name": payload.waiter_name,
            "comment": payload.comment or "",
            "language": payload.language or "en",
            "ip": ip,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        logger.warning(f"Failed to persist alert: {e}")

    if not RESEND_API_KEY or RESEND_API_KEY == "re_your_api_key_here":
        logger.warning("RESEND_API_KEY not configured — skipping email send.")
        return {
            "status": "queued",
            "email_sent": False,
            "message": "Alert recorded. Email sending is not configured.",
        }

    subject = f"[{RESTAURANT_NAME}] Service Recovery — {payload.rating}★ for {payload.waiter_name}"
    html_content = _build_email_html(payload.rating, payload.waiter_name, payload.comment or "")
    params = {
        "from": SENDER_EMAIL,
        "to": [MANAGER_EMAIL],
        "subject": subject,
        "html": html_content,
    }

    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        return {
            "status": "success",
            "email_sent": True,
            "email_id": email.get("id") if isinstance(email, dict) else None,
        }
    except Exception as e:
        logger.error(f"Failed to send alert email: {e}")
        # Don't fail the whole submission — alert was persisted locally on client too
        return {
            "status": "error",
            "email_sent": False,
            "message": f"Email send failed: {str(e)}",
        }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
