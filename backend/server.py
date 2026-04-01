from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Depends
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import shutil

from database import engine, AsyncSessionLocal, get_db
from models import User, Company, Activity, Earning, Setting, Document, SavedJob, UserSession

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
JWT_SECRET = os.environ.get('JWT_SECRET')
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_PUBLISHABLE_KEY = os.environ.get('SUPABASE_PUBLISHABLE_KEY', '')
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ── Pydantic Models ──
class UserRegister(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class CompanyCreate(BaseModel):
    name: str
    website: str = ""
    main_phone: str = ""
    active_states: List[str] = []
    work_model: List[str] = []
    service_type: List[str] = []
    vehicles: List[str] = []
    status: str = "Researching"
    priority: str = "Medium"
    handler: str = ""
    follow_up_date: Optional[str] = None
    signup_url: str = ""
    notes: str = ""
    contact_name: str = ""
    contact_title: str = ""
    contact_email: str = ""
    contact_phone: str = ""
    contact_linkedin: str = ""
    contact_method: str = ""
    vehicle_other: str = ""
    service_other: str = ""

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    website: Optional[str] = None
    main_phone: Optional[str] = None
    active_states: Optional[List[str]] = None
    work_model: Optional[List[str]] = None
    service_type: Optional[List[str]] = None
    vehicles: Optional[List[str]] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    handler: Optional[str] = None
    follow_up_date: Optional[str] = None
    signup_url: Optional[str] = None
    notes: Optional[str] = None
    contact_name: Optional[str] = None
    contact_title: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_linkedin: Optional[str] = None
    contact_method: Optional[str] = None
    vehicle_other: Optional[str] = None
    service_other: Optional[str] = None

class ActivityCreate(BaseModel):
    company_id: str
    company_name: str
    type: str
    outcome: str
    handler: str
    notes: str = ""
    next_action: str = ""

class EarningsCreate(BaseModel):
    company_id: str
    company_name: str
    date: str
    hours: float = 0
    miles: float = 0
    gross_earnings: float = 0
    tips: float = 0
    platform_fees: float = 0
    net_earnings: float = 0
    notes: str = ""


def _row_to_dict(row):
    """Convert a SQLAlchemy model instance to a dict."""
    d = {}
    for c in row.__table__.columns:
        d[c.name] = getattr(row, c.name)
    return d


import time as _time

# ── Supabase Token Cache ──
_token_cache = {}
_CACHE_TTL = 300  # 5 minutes


async def _verify_supabase_token(token):
    """Verify a Supabase access token by calling Supabase Auth API."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": SUPABASE_PUBLISHABLE_KEY,
            },
        )
        if resp.status_code == 200:
            return resp.json()
    return None


# ── Auth Helper ──
async def get_current_user(request: Request):
    global _token_cache
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")

    # Check in-memory cache
    cached = _token_cache.get(token)
    if cached and cached[1] > _time.time():
        return cached[0]

    # Verify with Supabase Auth API
    sb_user = await _verify_supabase_token(token)
    if sb_user:
        email = sb_user.get("email", "")
        sb_name = (sb_user.get("user_metadata") or {}).get("full_name", "")
        sb_id = sb_user.get("id", "")

        async with AsyncSessionLocal() as db:
            # Look up existing user by email
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()

            if user:
                # Update name if changed
                if sb_name and sb_name != user.name:
                    user.name = sb_name
                    await db.commit()
                user_dict = _row_to_dict(user)
                _token_cache[token] = (user_dict, _time.time() + _CACHE_TTL)
                return user_dict

            # Auto-create new user on first Supabase login
            user_id = sb_id or f"user_{uuid.uuid4().hex[:12]}"
            new_user = User(
                user_id=user_id, email=email, name=sb_name,
                password="", picture="", primary_vehicle="", primary_market="",
                created_at=datetime.now(timezone.utc).isoformat(),
            )
            db.add(new_user)
            await db.flush()
            db.add(Setting(
                id=str(uuid.uuid4()), user_id=user_id,
                key="handlers", value=["Unassigned"],
            ))
            await db.commit()
            await db.refresh(new_user)
            user_dict = _row_to_dict(new_user)
            _token_cache[token] = (user_dict, _time.time() + _CACHE_TTL)
            return user_dict

    # Fallback: try legacy JWT (for existing sessions)
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(User).where(User.user_id == payload["user_id"])
            )
            user = result.scalar_one_or_none()
            if user:
                user_dict = _row_to_dict(user)
                _token_cache[token] = (user_dict, _time.time() + _CACHE_TTL)
                return user_dict
    except Exception:
        pass

    # Prune cache if it grows too large
    if len(_token_cache) > 200:
        now = _time.time()
        _token_cache = {k: v for k, v in _token_cache.items() if v[1] > now}

    raise HTTPException(401, "Invalid token")


# ── Auth Routes ──
# Registration and login are handled by Supabase Auth on the frontend.
# The backend only verifies Supabase JWT tokens and manages user profiles.

@api_router.get("/auth/me")
async def auth_me(request: Request):
    user = await get_current_user(request)
    return {
        "user_id": user["user_id"], "email": user["email"], "name": user["name"],
        "picture": user.get("picture", ""), "primary_vehicle": user.get("primary_vehicle", ""),
        "primary_market": user.get("primary_market", "")
    }


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    # Clear any cached token
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        _token_cache.pop(auth[7:], None)
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}


# ── Companies ──
@api_router.get("/companies")
async def get_companies(request: Request):
    user = await get_current_user(request)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Company).where(Company.user_id == user["user_id"]).order_by(Company.last_modified.desc())
        )
        return [_row_to_dict(r) for r in result.scalars().all()]


@api_router.post("/companies")
async def create_company(data: CompanyCreate, request: Request):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    company = Company(id=str(uuid.uuid4()), user_id=user["user_id"], **data.model_dump(), created_at=now, last_modified=now)
    async with AsyncSessionLocal() as db:
        db.add(company)
        await db.commit()
        await db.refresh(company)
        return _row_to_dict(company)


@api_router.get("/companies/{company_id}")
async def get_company(company_id: str, request: Request):
    user = await get_current_user(request)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Company).where(Company.id == company_id, Company.user_id == user["user_id"])
        )
        company = result.scalar_one_or_none()
        if not company:
            raise HTTPException(404, "Company not found")
        return _row_to_dict(company)


@api_router.put("/companies/{company_id}")
async def update_company(company_id: str, data: CompanyUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["last_modified"] = datetime.now(timezone.utc).isoformat()
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Company).where(Company.id == company_id, Company.user_id == user["user_id"])
        )
        company = result.scalar_one_or_none()
        if not company:
            raise HTTPException(404, "Company not found")
        for k, v in update_data.items():
            setattr(company, k, v)
        await db.commit()
        await db.refresh(company)
        return _row_to_dict(company)


@api_router.delete("/companies/{company_id}")
async def delete_company(company_id: str, request: Request):
    user = await get_current_user(request)
    uid = user["user_id"]
    async with AsyncSessionLocal() as db:
        await db.execute(delete(Company).where(Company.id == company_id, Company.user_id == uid))
        await db.execute(delete(Activity).where(Activity.company_id == company_id, Activity.user_id == uid))
        await db.execute(delete(Earning).where(Earning.company_id == company_id, Earning.user_id == uid))
        await db.commit()
    return {"message": "Deleted"}


# ── Activities ──
@api_router.get("/activities")
async def get_activities(request: Request):
    user = await get_current_user(request)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Activity).where(Activity.user_id == user["user_id"]).order_by(Activity.date_time.desc())
        )
        return [_row_to_dict(r) for r in result.scalars().all()]


@api_router.get("/activities/company/{company_id}")
async def get_company_activities(company_id: str, request: Request):
    user = await get_current_user(request)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Activity).where(Activity.company_id == company_id, Activity.user_id == user["user_id"]).order_by(Activity.date_time.desc())
        )
        return [_row_to_dict(r) for r in result.scalars().all()]


@api_router.post("/activities")
async def create_activity(data: ActivityCreate, request: Request):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    activity = Activity(id=str(uuid.uuid4()), user_id=user["user_id"], **data.model_dump(), date_time=now, created_at=now)
    async with AsyncSessionLocal() as db:
        db.add(activity)
        await db.commit()
        await db.refresh(activity)
        return _row_to_dict(activity)


# ── Earnings ──
@api_router.get("/earnings")
async def get_earnings(request: Request):
    user = await get_current_user(request)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Earning).where(Earning.user_id == user["user_id"]).order_by(Earning.date.desc())
        )
        return [_row_to_dict(r) for r in result.scalars().all()]


@api_router.post("/earnings")
async def create_earning(data: EarningsCreate, request: Request):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    earning = Earning(id=str(uuid.uuid4()), user_id=user["user_id"], **data.model_dump(), created_at=now)
    async with AsyncSessionLocal() as db:
        db.add(earning)
        await db.commit()
        await db.refresh(earning)
        return _row_to_dict(earning)


@api_router.delete("/earnings/{earning_id}")
async def delete_earning(earning_id: str, request: Request):
    user = await get_current_user(request)
    async with AsyncSessionLocal() as db:
        await db.execute(delete(Earning).where(Earning.id == earning_id, Earning.user_id == user["user_id"]))
        await db.commit()
    return {"message": "Deleted"}


@api_router.get("/earnings/summary")
async def earnings_summary(request: Request):
    user = await get_current_user(request)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Earning).where(Earning.user_id == user["user_id"])
        )
        earnings = [_row_to_dict(r) for r in result.scalars().all()]

    now = datetime.now(timezone.utc)
    week_start = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%d")
    month_start = now.strftime("%Y-%m-01")
    year_start = now.strftime("%Y-01-01")
    weekly = sum(e.get("net_earnings", 0) for e in earnings if e.get("date", "") >= week_start)
    monthly = sum(e.get("net_earnings", 0) for e in earnings if e.get("date", "") >= month_start)
    yearly = sum(e.get("net_earnings", 0) for e in earnings if e.get("date", "") >= year_start)
    by_platform = {}
    hours_by_platform = {}
    for e in earnings:
        name = e.get("company_name", "Unknown")
        by_platform[name] = by_platform.get(name, 0) + e.get("net_earnings", 0)
        hours_by_platform[name] = hours_by_platform.get(name, 0) + e.get("hours", 0)
    per_hour = {n: round(by_platform[n] / h, 2) if h > 0 else 0 for n, h in hours_by_platform.items()}
    return {"weekly": weekly, "monthly": monthly, "yearly": yearly, "by_platform": by_platform, "per_hour_by_platform": per_hour}


# ── Settings ──
@api_router.get("/settings/handlers")
async def get_handlers(request: Request):
    user = await get_current_user(request)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Setting).where(Setting.user_id == user["user_id"], Setting.key == "handlers")
        )
        doc = result.scalar_one_or_none()
        return doc.value if doc and doc.value else ["Unassigned"]


@api_router.put("/settings/handlers")
async def update_handlers(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    handlers = body.get("handlers", [])
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Setting).where(Setting.user_id == user["user_id"], Setting.key == "handlers")
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.value = handlers
        else:
            db.add(Setting(id=str(uuid.uuid4()), user_id=user["user_id"], key="handlers", value=handlers))
        await db.commit()
    return handlers


@api_router.put("/settings/handlers/rename")
async def rename_handler(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    old_name, new_name = body.get("old_name"), body.get("new_name")
    if not old_name or not new_name:
        raise HTTPException(400, "old_name and new_name required")
    uid = user["user_id"]
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Setting).where(Setting.user_id == uid, Setting.key == "handlers"))
        doc = result.scalar_one_or_none()
        if doc and doc.value:
            doc.value = [new_name if h == old_name else h for h in doc.value]
        await db.execute(update(Company).where(Company.user_id == uid, Company.handler == old_name).values(handler=new_name))
        await db.execute(update(Activity).where(Activity.user_id == uid, Activity.handler == old_name).values(handler=new_name))
        await db.commit()
    return {"message": "Handler renamed"}


@api_router.get("/settings/profile")
async def get_profile(request: Request):
    user = await get_current_user(request)
    return {"name": user.get("name", ""), "email": user.get("email", ""), "primary_vehicle": user.get("primary_vehicle", ""), "primary_market": user.get("primary_market", ""), "picture": user.get("picture", "")}


@api_router.put("/settings/profile")
async def update_profile(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    update_fields = {f: body[f] for f in ["name", "primary_vehicle", "primary_market"] if f in body}
    if update_fields:
        async with AsyncSessionLocal() as db:
            await db.execute(update(User).where(User.user_id == user["user_id"]).values(**update_fields))
            await db.commit()
    return {"message": "Profile updated"}


# ── Dashboard ──
@api_router.get("/dashboard")
async def get_dashboard(request: Request):
    user = await get_current_user(request)
    uid = user["user_id"]
    async with AsyncSessionLocal() as db:
        comp_result = await db.execute(select(Company).where(Company.user_id == uid))
        companies = [_row_to_dict(r) for r in comp_result.scalars().all()]

        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        week_later = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")
        total = len(companies)
        active = sum(1 for c in companies if c.get("status") == "Active")
        pending = sum(1 for c in companies if c.get("status") in ["Applied", "Waiting"])
        overdue = sum(1 for c in companies if c.get("follow_up_date") and c["follow_up_date"] < today and c.get("status") not in ["Active"])

        act_result = await db.execute(
            select(Activity).where(Activity.user_id == uid).order_by(Activity.date_time.desc()).limit(10)
        )
        recent = [_row_to_dict(r) for r in act_result.scalars().all()]

    upcoming = sorted(
        [c for c in companies if c.get("follow_up_date") and today <= c["follow_up_date"] <= week_later],
        key=lambda x: x.get("follow_up_date", "")
    )[:10]
    return {"total_companies": total, "active_gigs": active, "applications_pending": pending, "overdue_followups": overdue, "recent_activities": recent, "upcoming_followups": upcoming}


# ── AI Recommendation ──
@api_router.post("/ai/recommendation")
async def ai_recommendation(request: Request):
    await get_current_user(request)
    body = await request.json()
    if not EMERGENT_LLM_KEY:
        return {"recommendation": "Configure your LLM API key to get AI-powered recommendations."}
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"rec_{uuid.uuid4().hex[:8]}", system_message="You are a gig economy advisor for independent delivery drivers. Generate brief, actionable recommendations (2-3 sentences max). Be specific and address the handler by name if provided.")
        prompt = f"Company: {body.get('name','Unknown')}\nStatus: {body.get('status','Unknown')}\nPriority: {body.get('priority','Medium')}\nHandler: {body.get('handler','Unassigned')}\nFollow-up: {body.get('follow_up_date','Not set')}\nServices: {', '.join(body.get('service_type',[]))}\nWork Model: {', '.join(body.get('work_model',[]))}\nContact: {body.get('contact_name','Unknown')}\nNotes: {body.get('notes','')}\n\nGenerate a brief actionable recommendation."
        response = await chat.send_message(UserMessage(text=prompt))
        return {"recommendation": response}
    except Exception as e:
        logger.error(f"AI recommendation error: {e}")
        return {"recommendation": "Unable to generate recommendation at this time."}


# ── Seed Data ──
@api_router.post("/seed")
async def seed_data(request: Request):
    user = await get_current_user(request)
    uid = user["user_id"]

    async with AsyncSessionLocal() as db:
        count_result = await db.execute(select(func.count()).select_from(Company).where(Company.user_id == uid))
        count = count_result.scalar()
        if count > 0:
            return {"message": "Data already exists", "count": count}

        # Update handlers
        result = await db.execute(select(Setting).where(Setting.user_id == uid, Setting.key == "handlers"))
        existing = result.scalar_one_or_none()
        if existing:
            existing.value = ["King Solomon", "Sarah", "Unassigned"]
        else:
            db.add(Setting(id=str(uuid.uuid4()), user_id=uid, key="handlers", value=["King Solomon", "Sarah", "Unassigned"]))

        now = datetime.now(timezone.utc)
        td = timedelta

        companies_data = [
            {"id": str(uuid.uuid4()), "user_id": uid, "name": "Amazon Flex", "website": "https://flex.amazon.com", "main_phone": "1-888-281-6901", "active_states": ["TX","CA","FL","NY","WA","IL","GA","AZ","NC","OH","PA","NJ","MA","VA","CO"], "work_model": ["Route"], "service_type": ["Package Delivery"], "vehicles": ["Car","SUV","Minivan"], "status": "Waiting", "priority": "High", "handler": "King Solomon", "follow_up_date": (now+td(days=2)).strftime("%Y-%m-%d"), "signup_url": "https://flex.amazon.com/signup", "notes": "Expanding DFW routes. Very positive initial contact.", "contact_name": "John Martinez", "contact_title": "Regional Manager", "contact_email": "john.m@amazonflex.io", "contact_phone": "+1 (206) 555-0147", "contact_linkedin": "https://linkedin.com/in/jmartinez", "contact_method": "LinkedIn", "vehicle_other": "", "service_other": "", "created_at": (now-td(days=10)).isoformat(), "last_modified": now.isoformat()},
            {"id": str(uuid.uuid4()), "user_id": uid, "name": "DoorDash", "website": "https://www.doordash.com", "main_phone": "1-855-973-1040", "active_states": ["TX","CA","FL","NY"], "work_model": ["App / On Demand"], "service_type": ["Food Delivery","Grocery"], "vehicles": ["Car","SUV","Bike / Scooter"], "status": "Active", "priority": "High", "handler": "King Solomon", "follow_up_date": None, "signup_url": "https://dasher.doordash.com/signup", "notes": "Active and earning. Good peak hours.", "contact_name": "Lisa Chen", "contact_title": "Driver Operations", "contact_email": "lisa.c@doordash.com", "contact_phone": "+1 (650) 555-0189", "contact_linkedin": "", "contact_method": "Email", "vehicle_other": "", "service_other": "", "created_at": (now-td(days=30)).isoformat(), "last_modified": (now-td(days=1)).isoformat()},
            {"id": str(uuid.uuid4()), "user_id": uid, "name": "Uber Eats", "website": "https://www.ubereats.com", "main_phone": "1-800-253-6882", "active_states": ["TX","CA","FL"], "work_model": ["App / On Demand"], "service_type": ["Food Delivery","Package Delivery"], "vehicles": ["Car","SUV"], "status": "Active", "priority": "Medium", "handler": "Sarah", "follow_up_date": None, "signup_url": "https://www.uber.com/us/en/drive/", "notes": "Consistent orders in DFW area.", "contact_name": "Marcus Johnson", "contact_title": "Area Manager", "contact_email": "marcus.j@uber.com", "contact_phone": "+1 (415) 555-0122", "contact_linkedin": "https://linkedin.com/in/mjohnson", "contact_method": "Phone", "vehicle_other": "", "service_other": "", "created_at": (now-td(days=25)).isoformat(), "last_modified": (now-td(days=3)).isoformat()},
            {"id": str(uuid.uuid4()), "user_id": uid, "name": "GoPuff", "website": "https://www.gopuff.com", "main_phone": "1-855-400-7833", "active_states": ["TX","CA","FL","PA","NY"], "work_model": ["App / On Demand"], "service_type": ["Grocery","Package Delivery"], "vehicles": ["Car","SUV"], "status": "Applied", "priority": "Medium", "handler": "King Solomon", "follow_up_date": (now+td(days=5)).strftime("%Y-%m-%d"), "signup_url": "https://apply.gopuff.com/", "notes": "Applied last week. Awaiting background check.", "contact_name": "Amy Roberts", "contact_title": "Recruiter", "contact_email": "amy.r@gopuff.com", "contact_phone": "+1 (267) 555-0134", "contact_linkedin": "", "contact_method": "Email", "vehicle_other": "", "service_other": "", "created_at": (now-td(days=7)).isoformat(), "last_modified": (now-td(days=2)).isoformat()},
            {"id": str(uuid.uuid4()), "user_id": uid, "name": "Spark Driver (Walmart)", "website": "https://drive4spark.walmart.com", "main_phone": "1-800-925-6278", "active_states": ["TX","AR","GA","FL","CA","NC"], "work_model": ["Route","App / On Demand"], "service_type": ["Grocery","Package Delivery"], "vehicles": ["Car","SUV","Minivan"], "status": "Offered", "priority": "High", "handler": "Sarah", "follow_up_date": (now+td(days=1)).strftime("%Y-%m-%d"), "signup_url": "https://drive4spark.walmart.com/apply", "notes": "Received offer for DFW zone. Need to accept by Friday.", "contact_name": "David Park", "contact_title": "Zone Manager", "contact_email": "david.p@walmart.com", "contact_phone": "+1 (479) 555-0156", "contact_linkedin": "https://linkedin.com/in/dpark", "contact_method": "Phone", "vehicle_other": "", "service_other": "", "created_at": (now-td(days=14)).isoformat(), "last_modified": now.isoformat()},
            {"id": str(uuid.uuid4()), "user_id": uid, "name": "Curri", "website": "https://www.curri.com", "main_phone": "1-888-928-7741", "active_states": ["TX","CA"], "work_model": ["Fleet"], "service_type": ["Construction","Freight"], "vehicles": ["Cargo Van","Box Truck","Pickup Truck"], "status": "Researching", "priority": "Low", "handler": "Unassigned", "follow_up_date": (now+td(days=14)).strftime("%Y-%m-%d"), "signup_url": "https://www.curri.com/drivers", "notes": "Construction material delivery. Requires larger vehicle.", "contact_name": "Tom Wilson", "contact_title": "Fleet Coordinator", "contact_email": "tom.w@curri.com", "contact_phone": "+1 (310) 555-0178", "contact_linkedin": "", "contact_method": "Email", "vehicle_other": "", "service_other": "", "created_at": (now-td(days=3)).isoformat(), "last_modified": (now-td(days=1)).isoformat()},
            {"id": str(uuid.uuid4()), "user_id": uid, "name": "Better Trucks", "website": "https://www.bettertrucks.com", "main_phone": "1-800-555-8888", "active_states": ["TX","FL","GA","NC","TN"], "work_model": ["Route"], "service_type": ["Package Delivery","Delivery Route"], "vehicles": ["Car","SUV","Cargo Van"], "status": "Applied", "priority": "Medium", "handler": "King Solomon", "follow_up_date": (now-td(days=2)).strftime("%Y-%m-%d"), "signup_url": "https://bettertrucks.com/apply", "notes": "Regional carrier. Good rates for route delivery.", "contact_name": "Rachel Adams", "contact_title": "Operations Lead", "contact_email": "rachel@bettertrucks.com", "contact_phone": "+1 (704) 555-0190", "contact_linkedin": "https://linkedin.com/in/radams", "contact_method": "LinkedIn", "vehicle_other": "", "service_other": "", "created_at": (now-td(days=12)).isoformat(), "last_modified": (now-td(days=2)).isoformat()},
            {"id": str(uuid.uuid4()), "user_id": uid, "name": "Instacart", "website": "https://www.instacart.com", "main_phone": "1-888-246-7822", "active_states": ["TX","CA","FL","NY","IL","WA"], "work_model": ["App / On Demand"], "service_type": ["Grocery"], "vehicles": ["Car","SUV"], "status": "Waiting", "priority": "Low", "handler": "Sarah", "follow_up_date": (now+td(days=3)).strftime("%Y-%m-%d"), "signup_url": "https://shoppers.instacart.com/", "notes": "Waitlisted for DFW zone. Check back next month.", "contact_name": "Jennifer Lee", "contact_title": "Shopper Support", "contact_email": "jennifer.l@instacart.com", "contact_phone": "+1 (415) 555-0167", "contact_linkedin": "", "contact_method": "Email", "vehicle_other": "", "service_other": "", "created_at": (now-td(days=20)).isoformat(), "last_modified": (now-td(days=5)).isoformat()},
            {"id": str(uuid.uuid4()), "user_id": uid, "name": "GoShare", "website": "https://www.goshare.co", "main_phone": "1-800-555-4673", "active_states": ["TX","CA","AZ"], "work_model": ["Fleet"], "service_type": ["Freight","Vehicle Transport"], "vehicles": ["Pickup Truck","Cargo Van","Box Truck"], "status": "Researching", "priority": "Medium", "handler": "King Solomon", "follow_up_date": (now+td(days=7)).strftime("%Y-%m-%d"), "signup_url": "https://www.goshare.co/driver", "notes": "Moving and delivery platform. Interesting pay structure.", "contact_name": "Carlos Ruiz", "contact_title": "Driver Relations", "contact_email": "carlos@goshare.co", "contact_phone": "+1 (858) 555-0143", "contact_linkedin": "https://linkedin.com/in/cruiz", "contact_method": "Phone", "vehicle_other": "", "service_other": "", "created_at": (now-td(days=5)).isoformat(), "last_modified": (now-td(days=1)).isoformat()},
            {"id": str(uuid.uuid4()), "user_id": uid, "name": "Favor Delivery", "website": "https://www.favordelivery.com", "main_phone": "1-512-555-3287", "active_states": ["TX"], "work_model": ["App / On Demand"], "service_type": ["Food Delivery","Grocery","Package Delivery"], "vehicles": ["Car","SUV","Bike / Scooter"], "status": "Active", "priority": "Medium", "handler": "Sarah", "follow_up_date": None, "signup_url": "https://favordelivery.com/runners", "notes": "Texas only. Good supplemental income in DFW.", "contact_name": "Mike Torres", "contact_title": "City Lead", "contact_email": "mike.t@favordelivery.com", "contact_phone": "+1 (512) 555-0198", "contact_linkedin": "", "contact_method": "SMS", "vehicle_other": "", "service_other": "", "created_at": (now-td(days=45)).isoformat(), "last_modified": (now-td(days=7)).isoformat()},
        ]

        for c in companies_data:
            db.add(Company(**c))

        activities_data = [
            {"id": str(uuid.uuid4()), "user_id": uid, "company_id": companies_data[0]["id"], "company_name": "Amazon Flex", "type": "Phone", "outcome": "Interested", "handler": "King Solomon", "date_time": (now-td(days=2)).isoformat(), "notes": "John said they're expanding DFW routes. Very positive. Will send contract details.", "next_action": f"Call on {(now+td(days=1)).strftime('%b %d, %Y')}", "created_at": (now-td(days=2)).isoformat()},
            {"id": str(uuid.uuid4()), "user_id": uid, "company_id": companies_data[0]["id"], "company_name": "Amazon Flex", "type": "Email", "outcome": "Pending", "handler": "King Solomon", "date_time": (now-td(days=7)).isoformat(), "notes": "Sent initial inquiry email with availability and vehicle details.", "next_action": f"Call on {(now-td(days=3)).strftime('%b %d, %Y')}", "created_at": (now-td(days=7)).isoformat()},
            {"id": str(uuid.uuid4()), "user_id": uid, "company_id": companies_data[1]["id"], "company_name": "DoorDash", "type": "Meeting", "outcome": "Interested", "handler": "King Solomon", "date_time": (now-td(days=5)).isoformat(), "notes": "Orientation completed. Account activated for DFW zone.", "next_action": "Start first delivery shift", "created_at": (now-td(days=5)).isoformat()},
            {"id": str(uuid.uuid4()), "user_id": uid, "company_id": companies_data[4]["id"], "company_name": "Spark Driver (Walmart)", "type": "Phone", "outcome": "Callback", "handler": "Sarah", "date_time": (now-td(days=1)).isoformat(), "notes": "David mentioned new zone opening. Asked to call back tomorrow.", "next_action": f"Call David on {now.strftime('%b %d, %Y')}", "created_at": (now-td(days=1)).isoformat()},
        ]

        for a in activities_data:
            db.add(Activity(**a))

        earnings_data = [
            {"id": str(uuid.uuid4()), "user_id": uid, "company_id": companies_data[1]["id"], "company_name": "DoorDash", "date": (now-td(days=1)).strftime("%Y-%m-%d"), "hours": 6, "miles": 85, "gross_earnings": 145.50, "tips": 42.00, "platform_fees": 12.50, "net_earnings": 175.00, "notes": "Lunch + dinner shift", "created_at": (now-td(days=1)).isoformat()},
            {"id": str(uuid.uuid4()), "user_id": uid, "company_id": companies_data[2]["id"], "company_name": "Uber Eats", "date": (now-td(days=1)).strftime("%Y-%m-%d"), "hours": 4, "miles": 52, "gross_earnings": 95.00, "tips": 28.50, "platform_fees": 8.75, "net_earnings": 114.75, "notes": "Dinner rush only", "created_at": (now-td(days=1)).isoformat()},
            {"id": str(uuid.uuid4()), "user_id": uid, "company_id": companies_data[1]["id"], "company_name": "DoorDash", "date": (now-td(days=2)).strftime("%Y-%m-%d"), "hours": 8, "miles": 120, "gross_earnings": 198.00, "tips": 55.00, "platform_fees": 15.00, "net_earnings": 238.00, "notes": "Full day shift", "created_at": (now-td(days=2)).isoformat()},
            {"id": str(uuid.uuid4()), "user_id": uid, "company_id": companies_data[9]["id"], "company_name": "Favor Delivery", "date": (now-td(days=3)).strftime("%Y-%m-%d"), "hours": 5, "miles": 60, "gross_earnings": 110.00, "tips": 35.00, "platform_fees": 10.00, "net_earnings": 135.00, "notes": "Afternoon run", "created_at": (now-td(days=3)).isoformat()},
        ]

        for e in earnings_data:
            db.add(Earning(**e))

        await db.commit()
    return {"message": "Seeded 10 companies, 4 activities, 4 earnings entries"}


# ── CSV Export ──
@api_router.get("/export/companies")
async def export_companies(request: Request):
    user = await get_current_user(request)
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Company).where(Company.user_id == user["user_id"]))
        rows = [_row_to_dict(r) for r in result.scalars().all()]
        for r in rows:
            r.pop("user_id", None)
        return rows


@api_router.get("/export/activities")
async def export_activities(request: Request):
    user = await get_current_user(request)
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Activity).where(Activity.user_id == user["user_id"]))
        rows = [_row_to_dict(r) for r in result.scalars().all()]
        for r in rows:
            r.pop("user_id", None)
        return rows


# ── File Upload ──
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

@api_router.post("/companies/{company_id}/files")
async def upload_file(company_id: str, request: Request, file: UploadFile = File(...)):
    user = await get_current_user(request)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Company).where(Company.id == company_id, Company.user_id == user["user_id"])
        )
        if not result.scalar_one_or_none():
            raise HTTPException(404, "Company not found")

    company_dir = UPLOAD_DIR / company_id
    company_dir.mkdir(exist_ok=True)
    file_id = str(uuid.uuid4())[:8]
    safe_name = file.filename.replace("/", "_").replace("\\", "_")
    stored_name = f"{file_id}_{safe_name}"
    file_path = company_dir / stored_name
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_size = file_path.stat().st_size
    ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
    is_image = ext in ("jpg", "jpeg", "png", "gif", "webp", "bmp", "svg")

    doc = Document(
        id=file_id, company_id=company_id, user_id=user["user_id"],
        original_name=file.filename, stored_name=stored_name,
        size=file_size, is_image=is_image, ext=ext,
        uploaded_at=datetime.now(timezone.utc).isoformat()
    )
    async with AsyncSessionLocal() as db:
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        return _row_to_dict(doc)


@api_router.get("/companies/{company_id}/files")
async def list_files(company_id: str, request: Request):
    user = await get_current_user(request)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Document).where(Document.company_id == company_id, Document.user_id == user["user_id"]).order_by(Document.uploaded_at.desc())
        )
        return [_row_to_dict(r) for r in result.scalars().all()]


@api_router.delete("/companies/{company_id}/files/{file_id}")
async def delete_file(company_id: str, file_id: str, request: Request):
    user = await get_current_user(request)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Document).where(Document.id == file_id, Document.company_id == company_id, Document.user_id == user["user_id"])
        )
        doc = result.scalar_one_or_none()
        if not doc:
            raise HTTPException(404, "File not found")
        file_path = UPLOAD_DIR / company_id / doc.stored_name
        if file_path.exists():
            file_path.unlink()
        await db.execute(delete(Document).where(Document.id == file_id))
        await db.commit()
    return {"ok": True}


@api_router.get("/files/{company_id}/{stored_name}")
async def serve_file(company_id: str, stored_name: str):
    file_path = UPLOAD_DIR / company_id / stored_name
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    import mimetypes
    mime, _ = mimetypes.guess_type(str(file_path))
    content = file_path.read_bytes()
    return Response(content=content, media_type=mime or "application/octet-stream", headers={"Content-Disposition": f'inline; filename="{stored_name}"'})


# ── Send Email via SendGrid ──
@api_router.post("/email/send")
async def send_email(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    to_email = body.get("to_email", "")
    subject = body.get("subject", "")
    html_body = body.get("body", "")
    reply_to = body.get("reply_to", user.get("email", ""))

    if not to_email or not subject:
        raise HTTPException(400, "to_email and subject are required")

    if not SENDGRID_API_KEY or not SENDER_EMAIL:
        return {"sent": False, "message": "SendGrid not configured. Add SENDGRID_API_KEY and SENDER_EMAIL to backend .env to enable email sending."}

    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail, Email, To, ReplyTo, Content
        message = Mail(
            from_email=Email(SENDER_EMAIL, f"{user.get('name', 'DriverGigsPro')} via DriverGigsPro"),
            to_emails=To(to_email),
            subject=subject,
            html_content=Content("text/html", html_body.replace("\n", "<br>") if html_body else "<p>No content</p>")
        )
        message.reply_to = ReplyTo(reply_to)
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        return {"sent": True, "status_code": response.status_code}
    except Exception as e:
        logger.error(f"SendGrid error: {e}")
        return {"sent": False, "message": str(e)}


# ── AI Company Auto-fill ──
@api_router.post("/ai/company-autofill")
async def ai_company_autofill(request: Request):
    body = await request.json()
    company_name = body.get("company_name", "").strip()
    if not company_name:
        raise HTTPException(400, "company_name is required")
    if not EMERGENT_LLM_KEY:
        return {"success": False, "message": "LLM key not configured"}
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import json as json_lib
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"autofill_{uuid.uuid4().hex[:8]}",
            system_message="""You are a knowledgeable assistant that provides company information for gig delivery/driving platforms. Return ONLY valid JSON with no markdown, no code fences, no extra text. Use this exact schema:
{
  "name": "string",
  "website": "string or empty",
  "mainPhone": "string or empty",
  "contactName": "string or empty",
  "contactTitle": "string or empty",
  "contactEmail": "string or empty",
  "contactPhone": "string or empty",
  "contactLinkedin": "string or empty",
  "preferredContact": "Email or Phone or LinkedIn",
  "serviceType": ["array of applicable service types"],
  "vehicles": ["array from: Car, SUV, Van, Truck, Bike, Motorcycle, Box Truck, Semi"],
  "workModel": ["array from: W-2, 1099, Both, Other"],
  "activeStates": ["array of US state abbreviations"],
  "signUpUrl": "string or empty",
  "videoUrl": "string or empty",
  "notes": "Brief 1-2 sentence description"
}
If you don't know a field, use an empty string or empty array."""
        )
        response = await chat.send_message(UserMessage(text=f"Provide detailed company information for the gig/delivery company: {company_name}"))
        text = response.strip()
        if text.startswith("```"): text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"): text = text[:-3]
        if text.startswith("json"): text = text[4:]
        data = json_lib.loads(text.strip())
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"AI autofill error: {e}")
        return {"success": False, "message": str(e)}


# ── AI Follow-up Analysis ──
@api_router.post("/ai/followup-analysis")
async def ai_followup_analysis(request: Request):
    await get_current_user(request)
    body = await request.json()
    communications = body.get("communications", [])
    if not EMERGENT_LLM_KEY:
        return {"analysis": "Configure your LLM API key for AI-powered follow-up reminders."}
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"followup_{uuid.uuid4().hex[:8]}",
            system_message="You are an AI assistant for a gig delivery driver CRM. Analyze the communication log and provide:\n1. URGENT: Which companies need immediate follow-up\n2. PRIORITY RANKING: Top 5 companies to contact today\n3. SUGGESTED ACTIONS: For each urgent item, suggest what to say/do\nKeep it actionable and concise."
        )
        comms_text = "\n".join([
            f"- {c.get('companyName','?')}: {c.get('type','?')} on {c.get('date','?')} - {c.get('outcome') or c.get('status','?')} - Notes: {c.get('notes','')[:100]}"
            for c in communications[:50]
        ])
        prompt = f"Recent communications:\n{comms_text}\n\nToday is {datetime.now(timezone.utc).strftime('%Y-%m-%d')}. Give me my priority action list."
        response = await chat.send_message(UserMessage(text=prompt))
        return {"analysis": response}
    except Exception as e:
        logger.error(f"AI follow-up error: {e}")
        return {"analysis": "Unable to generate follow-up analysis at this time."}


# ── AI Draft Email ──
@api_router.post("/ai/draft-email")
async def ai_draft_email(request: Request):
    await get_current_user(request)
    body = await request.json()
    if not EMERGENT_LLM_KEY:
        return {"draft": "Configure your LLM API key to generate email drafts."}
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"draft_{uuid.uuid4().hex[:8]}",
            system_message="You are an email writing assistant for a gig delivery driver. Write professional but personable emails. Keep them brief (3-5 sentences). Include a clear call-to-action. Return ONLY the email body text."
        )
        prompt = f"""Draft a follow-up email for:
Company: {body.get('companyName','the company')}
Contact: {body.get('contactName','the contact')}
Status: {body.get('status','Unknown')}
Last interaction: {body.get('lastInteraction','No previous interaction')}
Purpose: {body.get('purpose','Follow up on application status')}
My name: {body.get('senderName','the driver')}"""
        response = await chat.send_message(UserMessage(text=prompt))
        return {"draft": response}
    except Exception as e:
        logger.error(f"AI draft error: {e}")
        return {"draft": "Unable to generate draft at this time."}


# ── AI Job Hunter ──
@api_router.post("/ai/generate-keywords")
async def generate_keywords(request: Request):
    body = await request.json()
    service_types = body.get("service_types", [])
    vehicles = body.get("vehicles", [])
    states = body.get("states", [])
    sources = body.get("sources", [])
    if not EMERGENT_LLM_KEY:
        return {"success": False, "message": "LLM key not configured"}
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import json as json_lib
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"keywords_{uuid.uuid4().hex[:8]}",
            system_message="""You are an expert at generating optimal job search keywords for gig delivery/driving jobs.
Return ONLY valid JSON: {"keywords": [...], "searchQueries": [...], "tips": "..."}
Generate 8-12 highly targeted keywords and 4-6 full search queries."""
        )
        prompt = f"""Generate optimized job search keywords:
Service Types: {', '.join(service_types) if service_types else 'Any delivery/driving'}
Vehicles: {', '.join(vehicles) if vehicles else 'Car'}
Target States: {', '.join(states) if states else 'Nationwide'}
Platforms: {', '.join(sources) if sources else 'All'}"""
        response = await chat.send_message(UserMessage(text=prompt))
        text = response.strip()
        if text.startswith("```"): text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"): text = text[:-3]
        if text.startswith("json"): text = text[4:]
        data = json_lib.loads(text.strip())
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Generate keywords error: {e}")
        return {"success": False, "message": str(e)}


@api_router.post("/ai/search-jobs")
async def search_jobs(request: Request):
    body = await request.json()
    service_types = body.get("service_types", [])
    vehicles = body.get("vehicles", [])
    states = body.get("states", [])
    sources = body.get("sources", [])
    keywords = body.get("keywords", "")
    if not EMERGENT_LLM_KEY:
        return {"success": False, "message": "LLM key not configured"}
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import json as json_lib
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"jobsearch_{uuid.uuid4().hex[:8]}",
            system_message="""You are an expert gig economy job search assistant. Return ONLY valid JSON:
{"results": [{"id":"job_1","title":"...","company":"...","source":"...","location":"...","description":"...","payEstimate":"...","requirements":[],"url":"...","postedDate":"...","matchScore":85,"workModel":"1099","tags":[]}], "searchUrls":{"source":"url"}, "summary":"..."}
Return 8-15 realistic gig opportunities with real companies."""
        )
        prompt = f"""Search for gig driving/delivery jobs:
Service Types: {', '.join(service_types) if service_types else 'Any'}
Vehicles: {', '.join(vehicles) if vehicles else 'Any'}
States: {', '.join(states) if states else 'Nationwide'}
Sources: {', '.join(sources) if sources else 'All'}
Keywords: {keywords or 'None'}"""
        response = await chat.send_message(UserMessage(text=prompt))
        text = response.strip()
        if text.startswith("```"): text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"): text = text[:-3]
        if text.startswith("json"): text = text[4:]
        data = json_lib.loads(text.strip())
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Job search error: {e}")
        return {"success": False, "message": str(e)}


@api_router.post("/ai/draft-outreach")
async def draft_outreach(request: Request):
    body = await request.json()
    job = body.get("job", {})
    user_name = body.get("user_name", "")
    user_info = body.get("user_info", "")
    outreach_type = body.get("type", "email")
    if not EMERGENT_LLM_KEY:
        return {"success": False, "message": "LLM key not configured"}
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import json as json_lib
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"outreach_{uuid.uuid4().hex[:8]}",
            system_message="""You are an expert at writing compelling outreach messages for gig drivers.
Return ONLY valid JSON: {"subject":"...","body":"...","followUpNote":"...","tone":"professional|casual|enthusiastic"}
Write personalized, concise messages (3-5 paragraphs max)."""
        )
        prompt = f"""Draft a {outreach_type} for:
Company: {job.get('company', 'Unknown')}
Position: {job.get('title', 'Gig Driver')}
Description: {job.get('description', '')}
Location: {job.get('location', '')}
Pay: {job.get('payEstimate', '')}
Requirements: {', '.join(job.get('requirements', []))}
Applicant: {user_name or 'Gig Driver'}
About: {user_info or 'Experienced gig driver'}"""
        response = await chat.send_message(UserMessage(text=prompt))
        text = response.strip()
        if text.startswith("```"): text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"): text = text[:-3]
        if text.startswith("json"): text = text[4:]
        data = json_lib.loads(text.strip())
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Draft outreach error: {e}")
        return {"success": False, "message": str(e)}


@api_router.post("/ai/auto-pilot")
async def auto_pilot_search(request: Request):
    body = await request.json()
    service_types = body.get("service_types", [])
    vehicles = body.get("vehicles", [])
    states = body.get("states", [])
    sources = body.get("sources", [])
    user_name = body.get("user_name", "")
    user_info = body.get("user_info", "")
    if not EMERGENT_LLM_KEY:
        return {"success": False, "message": "LLM key not configured"}
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import json as json_lib
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"autopilot_{uuid.uuid4().hex[:8]}",
            system_message="""You are an AI that handles the entire job search and outreach process.
Return ONLY valid JSON:
{"results":[{"id":"job_1","title":"...","company":"...","source":"...","location":"...","description":"...","payEstimate":"...","requirements":[],"url":"...","matchScore":95,"workModel":"1099","tags":[],"outreach":{"subject":"...","body":"...","followUpNote":"..."}}],"searchUrls":{},"summary":"..."}
Find 6-10 opportunities and draft outreach for each."""
        )
        prompt = f"""Auto-pilot job search:
Name: {user_name or 'Gig Driver'}
About: {user_info or 'Experienced driver'}
Services: {', '.join(service_types) if service_types else 'General delivery'}
Vehicles: {', '.join(vehicles) if vehicles else 'Car'}
Areas: {', '.join(states) if states else 'Nationwide'}
Sources: {', '.join(sources) if sources else 'All'}"""
        response = await chat.send_message(UserMessage(text=prompt))
        text = response.strip()
        if text.startswith("```"): text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"): text = text[:-3]
        if text.startswith("json"): text = text[4:]
        data = json_lib.loads(text.strip())
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Auto-pilot error: {e}")
        return {"success": False, "message": str(e)}


@api_router.post("/job-hunter/save")
async def save_job_result(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    doc = SavedJob(
        id=str(uuid.uuid4()), user_id=user["user_id"],
        job=body.get("job", {}), status=body.get("status", "saved"),
        outreach=body.get("outreach"), created_at=datetime.now(timezone.utc).isoformat()
    )
    async with AsyncSessionLocal() as db:
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        return _row_to_dict(doc)


@api_router.get("/job-hunter/saved")
async def get_saved_jobs(request: Request):
    user = await get_current_user(request)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(SavedJob).where(SavedJob.user_id == user["user_id"]).order_by(SavedJob.created_at.desc())
        )
        return [_row_to_dict(r) for r in result.scalars().all()]


@api_router.delete("/job-hunter/saved/{job_id}")
async def delete_saved_job(job_id: str, request: Request):
    user = await get_current_user(request)
    async with AsyncSessionLocal() as db:
        await db.execute(delete(SavedJob).where(SavedJob.id == job_id, SavedJob.user_id == user["user_id"]))
        await db.commit()
    return {"message": "Deleted"}


# ── App setup ──
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db():
    await engine.dispose()
