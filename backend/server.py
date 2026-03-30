from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
JWT_SECRET = os.environ.get('JWT_SECRET', 'dgcrm-secret-2026')
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


# ── Auth Helper ──
async def get_current_user(request: Request):
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")

    # Check Emergent OAuth sessions
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        expires_at = session.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at and expires_at < datetime.now(timezone.utc):
            raise HTTPException(401, "Session expired")
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        if user:
            return user

    # Check JWT
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
        if user:
            return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except Exception:
        pass

    raise HTTPException(401, "Invalid token")


# ── Auth Routes ──
@api_router.post("/auth/register")
async def register(data: UserRegister):
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(400, "Email already registered")

    hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    await db.users.insert_one({
        "user_id": user_id, "email": data.email, "name": data.name,
        "password": hashed, "picture": "", "primary_vehicle": "", "primary_market": "",
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    await db.settings.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id,
        "key": "handlers", "value": ["Unassigned"]
    })

    token = jwt.encode({"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7)}, JWT_SECRET, algorithm="HS256")
    return {"token": token, "user": {"user_id": user_id, "email": data.email, "name": data.name, "picture": ""}}


@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not bcrypt.checkpw(data.password.encode(), user.get("password", "").encode()):
        raise HTTPException(401, "Invalid credentials")
    token = jwt.encode({"user_id": user["user_id"], "exp": datetime.now(timezone.utc) + timedelta(days=7)}, JWT_SECRET, algorithm="HS256")
    return {"token": token, "user": {"user_id": user["user_id"], "email": user["email"], "name": user["name"], "picture": user.get("picture", "")}}


@api_router.post("/auth/session")
async def auth_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(400, "session_id required")

    async with httpx.AsyncClient() as http_client:
        resp = await http_client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    if resp.status_code != 200:
        raise HTTPException(401, "Invalid session")

    data = resp.json()
    email = data["email"]
    name = data.get("name", "")
    picture = data.get("picture", "")
    session_token = data.get("session_token", str(uuid.uuid4()))

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user:
        user_id = user["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": name,
            "password": "", "picture": picture, "primary_vehicle": "", "primary_market": "",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.settings.insert_one({
            "id": str(uuid.uuid4()), "user_id": user_id,
            "key": "handlers", "value": ["Unassigned"]
        })

    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    response.set_cookie("session_token", session_token, path="/", secure=True, httponly=True, samesite="none", max_age=7*24*3600)

    token = jwt.encode({"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7)}, JWT_SECRET, algorithm="HS256")
    return {"token": token, "user": {"user_id": user_id, "email": email, "name": name, "picture": picture}}


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
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_many({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}


# ── Companies ──
@api_router.get("/companies")
async def get_companies(request: Request):
    user = await get_current_user(request)
    return await db.companies.find({"user_id": user["user_id"]}, {"_id": 0}).sort("last_modified", -1).to_list(1000)


@api_router.post("/companies")
async def create_company(data: CompanyCreate, request: Request):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    company = {"id": str(uuid.uuid4()), "user_id": user["user_id"], **data.model_dump(), "created_at": now, "last_modified": now}
    await db.companies.insert_one(company)
    company.pop("_id", None)
    return company


@api_router.get("/companies/{company_id}")
async def get_company(company_id: str, request: Request):
    user = await get_current_user(request)
    company = await db.companies.find_one({"id": company_id, "user_id": user["user_id"]}, {"_id": 0})
    if not company:
        raise HTTPException(404, "Company not found")
    return company


@api_router.put("/companies/{company_id}")
async def update_company(company_id: str, data: CompanyUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["last_modified"] = datetime.now(timezone.utc).isoformat()
    result = await db.companies.update_one({"id": company_id, "user_id": user["user_id"]}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(404, "Company not found")
    return await db.companies.find_one({"id": company_id}, {"_id": 0})


@api_router.delete("/companies/{company_id}")
async def delete_company(company_id: str, request: Request):
    user = await get_current_user(request)
    await db.companies.delete_one({"id": company_id, "user_id": user["user_id"]})
    await db.activities.delete_many({"company_id": company_id, "user_id": user["user_id"]})
    await db.earnings.delete_many({"company_id": company_id, "user_id": user["user_id"]})
    return {"message": "Deleted"}


# ── Activities ──
@api_router.get("/activities")
async def get_activities(request: Request):
    user = await get_current_user(request)
    return await db.activities.find({"user_id": user["user_id"]}, {"_id": 0}).sort("date_time", -1).to_list(1000)


@api_router.get("/activities/company/{company_id}")
async def get_company_activities(company_id: str, request: Request):
    user = await get_current_user(request)
    return await db.activities.find({"company_id": company_id, "user_id": user["user_id"]}, {"_id": 0}).sort("date_time", -1).to_list(1000)


@api_router.post("/activities")
async def create_activity(data: ActivityCreate, request: Request):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    activity = {"id": str(uuid.uuid4()), "user_id": user["user_id"], **data.model_dump(), "date_time": now, "created_at": now}
    await db.activities.insert_one(activity)
    activity.pop("_id", None)
    return activity


# ── Earnings ──
@api_router.get("/earnings")
async def get_earnings(request: Request):
    user = await get_current_user(request)
    return await db.earnings.find({"user_id": user["user_id"]}, {"_id": 0}).sort("date", -1).to_list(1000)


@api_router.post("/earnings")
async def create_earning(data: EarningsCreate, request: Request):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    earning = {"id": str(uuid.uuid4()), "user_id": user["user_id"], **data.model_dump(), "created_at": now}
    await db.earnings.insert_one(earning)
    earning.pop("_id", None)
    return earning


@api_router.delete("/earnings/{earning_id}")
async def delete_earning(earning_id: str, request: Request):
    user = await get_current_user(request)
    await db.earnings.delete_one({"id": earning_id, "user_id": user["user_id"]})
    return {"message": "Deleted"}


@api_router.get("/earnings/summary")
async def earnings_summary(request: Request):
    user = await get_current_user(request)
    earnings = await db.earnings.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(1000)
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
    doc = await db.settings.find_one({"user_id": user["user_id"], "key": "handlers"}, {"_id": 0})
    return doc.get("value", ["Unassigned"]) if doc else ["Unassigned"]


@api_router.put("/settings/handlers")
async def update_handlers(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    handlers = body.get("handlers", [])
    await db.settings.update_one({"user_id": user["user_id"], "key": "handlers"}, {"$set": {"value": handlers}}, upsert=True)
    return handlers


@api_router.put("/settings/handlers/rename")
async def rename_handler(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    old_name, new_name = body.get("old_name"), body.get("new_name")
    if not old_name or not new_name:
        raise HTTPException(400, "old_name and new_name required")
    uid = user["user_id"]
    doc = await db.settings.find_one({"user_id": uid, "key": "handlers"}, {"_id": 0})
    if doc:
        handlers = [new_name if h == old_name else h for h in doc.get("value", [])]
        await db.settings.update_one({"user_id": uid, "key": "handlers"}, {"$set": {"value": handlers}})
    await db.companies.update_many({"user_id": uid, "handler": old_name}, {"$set": {"handler": new_name}})
    await db.activities.update_many({"user_id": uid, "handler": old_name}, {"$set": {"handler": new_name}})
    return {"message": "Handler renamed"}


@api_router.get("/settings/profile")
async def get_profile(request: Request):
    user = await get_current_user(request)
    return {"name": user.get("name", ""), "email": user.get("email", ""), "primary_vehicle": user.get("primary_vehicle", ""), "primary_market": user.get("primary_market", ""), "picture": user.get("picture", "")}


@api_router.put("/settings/profile")
async def update_profile(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    update = {f: body[f] for f in ["name", "primary_vehicle", "primary_market"] if f in body}
    if update:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    return {"message": "Profile updated"}


# ── Dashboard ──
@api_router.get("/dashboard")
async def get_dashboard(request: Request):
    user = await get_current_user(request)
    uid = user["user_id"]
    companies = await db.companies.find({"user_id": uid}, {"_id": 0}).to_list(1000)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    week_later = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")
    total = len(companies)
    active = sum(1 for c in companies if c.get("status") == "Active")
    pending = sum(1 for c in companies if c.get("status") in ["Applied", "Waiting"])
    overdue = sum(1 for c in companies if c.get("follow_up_date") and c["follow_up_date"] < today and c.get("status") not in ["Active"])
    recent = await db.activities.find({"user_id": uid}, {"_id": 0}).sort("date_time", -1).limit(10).to_list(10)
    upcoming = sorted([c for c in companies if c.get("follow_up_date") and today <= c["follow_up_date"] <= week_later], key=lambda x: x.get("follow_up_date", ""))[:10]
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
    count = await db.companies.count_documents({"user_id": uid})
    if count > 0:
        return {"message": "Data already exists", "count": count}

    await db.settings.update_one({"user_id": uid, "key": "handlers"}, {"$set": {"value": ["King Solomon", "Sarah", "Unassigned"]}}, upsert=True)
    now = datetime.now(timezone.utc)
    td = timedelta

    companies = [
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
    await db.companies.insert_many(companies)

    activities = [
        {"id": str(uuid.uuid4()), "user_id": uid, "company_id": companies[0]["id"], "company_name": "Amazon Flex", "type": "Phone", "outcome": "Interested", "handler": "King Solomon", "date_time": (now-td(days=2)).isoformat(), "notes": "John said they're expanding DFW routes. Very positive. Will send contract details.", "next_action": f"Call on {(now+td(days=1)).strftime('%b %d, %Y')}", "created_at": (now-td(days=2)).isoformat()},
        {"id": str(uuid.uuid4()), "user_id": uid, "company_id": companies[0]["id"], "company_name": "Amazon Flex", "type": "Email", "outcome": "Pending", "handler": "King Solomon", "date_time": (now-td(days=7)).isoformat(), "notes": "Sent initial inquiry email with availability and vehicle details.", "next_action": f"Call on {(now-td(days=3)).strftime('%b %d, %Y')}", "created_at": (now-td(days=7)).isoformat()},
        {"id": str(uuid.uuid4()), "user_id": uid, "company_id": companies[1]["id"], "company_name": "DoorDash", "type": "Meeting", "outcome": "Interested", "handler": "King Solomon", "date_time": (now-td(days=5)).isoformat(), "notes": "Orientation completed. Account activated for DFW zone.", "next_action": "Start first delivery shift", "created_at": (now-td(days=5)).isoformat()},
        {"id": str(uuid.uuid4()), "user_id": uid, "company_id": companies[4]["id"], "company_name": "Spark Driver (Walmart)", "type": "Phone", "outcome": "Callback", "handler": "Sarah", "date_time": (now-td(days=1)).isoformat(), "notes": "David mentioned new zone opening. Asked to call back tomorrow.", "next_action": f"Call David on {now.strftime('%b %d, %Y')}", "created_at": (now-td(days=1)).isoformat()},
    ]
    await db.activities.insert_many(activities)

    earnings_data = [
        {"id": str(uuid.uuid4()), "user_id": uid, "company_id": companies[1]["id"], "company_name": "DoorDash", "date": (now-td(days=1)).strftime("%Y-%m-%d"), "hours": 6, "miles": 85, "gross_earnings": 145.50, "tips": 42.00, "platform_fees": 12.50, "net_earnings": 175.00, "notes": "Lunch + dinner shift", "created_at": (now-td(days=1)).isoformat()},
        {"id": str(uuid.uuid4()), "user_id": uid, "company_id": companies[2]["id"], "company_name": "Uber Eats", "date": (now-td(days=1)).strftime("%Y-%m-%d"), "hours": 4, "miles": 52, "gross_earnings": 95.00, "tips": 28.50, "platform_fees": 8.75, "net_earnings": 114.75, "notes": "Dinner rush only", "created_at": (now-td(days=1)).isoformat()},
        {"id": str(uuid.uuid4()), "user_id": uid, "company_id": companies[1]["id"], "company_name": "DoorDash", "date": (now-td(days=2)).strftime("%Y-%m-%d"), "hours": 8, "miles": 120, "gross_earnings": 198.00, "tips": 55.00, "platform_fees": 15.00, "net_earnings": 238.00, "notes": "Full day shift", "created_at": (now-td(days=2)).isoformat()},
        {"id": str(uuid.uuid4()), "user_id": uid, "company_id": companies[9]["id"], "company_name": "Favor Delivery", "date": (now-td(days=3)).strftime("%Y-%m-%d"), "hours": 5, "miles": 60, "gross_earnings": 110.00, "tips": 35.00, "platform_fees": 10.00, "net_earnings": 135.00, "notes": "Afternoon run", "created_at": (now-td(days=3)).isoformat()},
    ]
    await db.earnings.insert_many(earnings_data)
    return {"message": "Seeded 10 companies, 4 activities, 4 earnings entries"}


# ── CSV Export ──
@api_router.get("/export/companies")
async def export_companies(request: Request):
    user = await get_current_user(request)
    return await db.companies.find({"user_id": user["user_id"]}, {"_id": 0, "user_id": 0}).to_list(1000)


@api_router.get("/export/activities")
async def export_activities(request: Request):
    user = await get_current_user(request)
    return await db.activities.find({"user_id": user["user_id"]}, {"_id": 0, "user_id": 0}).to_list(1000)


# ── File Upload ──
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

@api_router.post("/companies/{company_id}/files")
async def upload_file(company_id: str, request: Request, file: UploadFile = File(...)):
    user = await get_current_user(request)
    company = await db.companies.find_one({"id": company_id, "user_id": user["id"]}, {"_id": 0})
    if not company:
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

    doc = {
        "id": file_id,
        "company_id": company_id,
        "user_id": user["id"],
        "original_name": file.filename,
        "stored_name": stored_name,
        "size": file_size,
        "is_image": is_image,
        "ext": ext,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.documents.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/companies/{company_id}/files")
async def list_files(company_id: str, request: Request):
    user = await get_current_user(request)
    docs = await db.documents.find({"company_id": company_id, "user_id": user["id"]}, {"_id": 0}).sort("uploaded_at", -1).to_list(200)
    return docs

@api_router.delete("/companies/{company_id}/files/{file_id}")
async def delete_file(company_id: str, file_id: str, request: Request):
    user = await get_current_user(request)
    doc = await db.documents.find_one({"id": file_id, "company_id": company_id, "user_id": user["id"]})
    if not doc:
        raise HTTPException(404, "File not found")
    file_path = UPLOAD_DIR / company_id / doc["stored_name"]
    if file_path.exists():
        file_path.unlink()
    await db.documents.delete_one({"id": file_id})
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
  "serviceType": ["array of applicable service types from: Food Delivery, Package/Parcel Delivery, Grocery Delivery, Catering Delivery, Medical/Pharmacy (Rx), Alcohol Delivery, Cannabis Delivery, Freight (Non-CDL), Vehicle Transport, Moving/Hauling, Pet Transport, NEMT/Senior Transport, Construction/Building Supply, Rideshare, Job Board/Contract Platform, Gig/Master Contractor, Document/Legal Courier, Hotshot/Expedited, Marine/Boat & Waterway, Floral/Perishable, Auto Parts/Automotive, Laundry/Dry Cleaning, Blood/Specimen/Lab, Newspaper/Publication, E-commerce Returns/Reverse Logistics, Organ/Tissue Transport"],
  "vehicles": ["array from: Car, SUV, Van, Truck, Bike, Motorcycle, Box Truck, Semi"],
  "workModel": ["array from: W-2, 1099, Both, Other"],
  "activeStates": ["array of US state abbreviations where they operate, or ALL_50"],
  "signUpUrl": "string or empty",
  "videoUrl": "string or empty",
  "notes": "Brief 1-2 sentence description of this company"
}
If you don't know a field, use an empty string or empty array. Be accurate — only include information you are confident about."""
        )

        user_message = UserMessage(
            text=f"Provide detailed company information for the gig/delivery company: {company_name}"
        )

        response = await chat.send_message(user_message)

        # Parse the JSON response
        text = response.strip()
        # Remove code fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

        data = json_lib.loads(text)
        return {"success": True, "data": data}

    except json_lib.JSONDecodeError as e:
        logger.error(f"AI autofill JSON parse error: {e}, raw: {response[:200] if 'response' in dir() else 'N/A'}")
        return {"success": False, "message": "AI returned invalid format. Try again."}
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
            system_message="""You are an AI assistant for a gig delivery driver CRM. Analyze the communication log and provide:
1. URGENT: Which companies need immediate follow-up (overdue or critical)
2. PRIORITY RANKING: Top 5 companies to contact today with brief reason
3. SUGGESTED ACTIONS: For each urgent item, suggest what to say/do

Keep it actionable, concise, and formatted clearly. Use the company names."""
        )
        comms_text = "\n".join([
            f"- {c.get('companyName','?')}: {c.get('type','?')} ({c.get('direction','')}) on {c.get('date','?')} - {c.get('outcome') or c.get('status','?')} - Subject: {c.get('subject','')} - Notes: {c.get('notes','')[:100]} - Reply by: {c.get('replyBy','N/A')}"
            for c in communications[:50]
        ])
        prompt = f"Here are the recent communications across all companies:\n{comms_text}\n\nToday is {datetime.now(timezone.utc).strftime('%Y-%m-%d')}. Analyze and give me my priority action list."
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
            system_message="You are an email writing assistant for a gig delivery driver. Write professional but personable emails. Keep them brief (3-5 sentences). Include a clear call-to-action. Return ONLY the email body text, no subject line."
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
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"keywords_{uuid.uuid4().hex[:8]}",
            system_message="""You are an expert at generating optimal job search keywords for gig delivery/driving jobs. 
Return ONLY valid JSON with no markdown, no code fences. Use this schema:
{
  "keywords": ["keyword1", "keyword2", ...],
  "searchQueries": ["full search query 1", "full search query 2", ...],
  "tips": "Brief tip about searching effectively for these types of gigs"
}
Generate 8-12 highly targeted keywords and 4-6 full search queries optimized for job boards."""
        )
        prompt = f"""Generate optimized job search keywords for a gig driver looking for work:
Service Types: {', '.join(service_types) if service_types else 'Any delivery/driving'}
Vehicles Available: {', '.join(vehicles) if vehicles else 'Car'}
Target States: {', '.join(states) if states else 'Nationwide'}
Search Platforms: {', '.join(sources) if sources else 'All major job boards'}

Create keywords that will find the best matching gig opportunities across these platforms."""
        response = await chat.send_message(UserMessage(text=prompt))
        text = response.strip()
        if text.startswith("```"): text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"): text = text[:-3]
        if text.startswith("json"): text = text[4:]
        import json as json_lib
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
            system_message="""You are an expert gig economy job search assistant. Find relevant gig driving and delivery opportunities.
Return ONLY valid JSON with no markdown, no code fences. Use this exact schema:
{
  "results": [
    {
      "id": "unique_id_string",
      "title": "Job/Gig Title",
      "company": "Company Name",
      "source": "Indeed|Craigslist|CBDriver.com|LinkedIn|Google|Other",
      "location": "City, State",
      "description": "2-3 sentence description of the opportunity",
      "payEstimate": "$X-Y/hr or per delivery estimate",
      "requirements": ["req1", "req2"],
      "url": "actual or likely URL to apply/learn more",
      "postedDate": "relative date like '2 days ago' or 'This week'",
      "matchScore": 85,
      "workModel": "1099|W-2|Both",
      "tags": ["tag1", "tag2"]
    }
  ],
  "searchUrls": {
    "source_name": "direct_search_url"
  },
  "summary": "Brief 1-2 sentence summary of what was found"
}
Return 8-15 realistic, accurate gig opportunities. Include REAL companies and platforms that actually exist. 
For URLs, use actual application/signup URLs when known, or construct realistic search URLs.
Match results to the specified sources - distribute results across the selected platforms.
Each result should have a unique id (use format 'job_1', 'job_2', etc)."""
        )

        state_text = ', '.join(states) if states else 'Nationwide'
        source_text = ', '.join(sources) if sources else 'All platforms'
        prompt = f"""Search for gig driving/delivery job opportunities matching these criteria:

Service Types Wanted: {', '.join(service_types) if service_types else 'Any'}
Vehicles Available: {', '.join(vehicles) if vehicles else 'Any'}
Target States/Areas: {state_text}
Search Sources: {source_text}
Additional Keywords: {keywords or 'None specified'}

Find the best matching opportunities from these specific platforms: {source_text}
For each source, also provide a direct search URL the user can click to search manually.
Focus on REAL companies and gig platforms. Be specific about locations matching the target states."""

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
    outreach_type = body.get("type", "email")  # email, message, cover_letter

    if not EMERGENT_LLM_KEY:
        return {"success": False, "message": "LLM key not configured"}

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import json as json_lib

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"outreach_{uuid.uuid4().hex[:8]}",
            system_message="""You are an expert at writing compelling outreach messages for gig drivers applying to delivery/driving companies.
Return ONLY valid JSON with no markdown, no code fences. Use this schema:
{
  "subject": "Email subject line",
  "body": "The full message body text",
  "followUpNote": "Suggested follow-up action and timing",
  "tone": "professional|casual|enthusiastic"
}
Write personalized, professional but approachable messages. Keep them concise (3-5 paragraphs max).
Include specific details about the company and role. End with a clear call-to-action."""
        )

        prompt = f"""Draft a {outreach_type} for this gig opportunity:

Company: {job.get('company', 'Unknown')}
Position: {job.get('title', 'Gig Driver')}
Description: {job.get('description', '')}
Location: {job.get('location', '')}
Pay: {job.get('payEstimate', '')}
Requirements: {', '.join(job.get('requirements', []))}

Applicant Name: {user_name or 'the driver'}
About the Applicant: {user_info or 'Experienced gig driver with reliable vehicle'}

Write a compelling {outreach_type} that highlights relevant experience and enthusiasm."""

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
    """AI does everything: search, rank, and draft outreach for top matches"""
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
            system_message="""You are an AI assistant that handles the entire job search and outreach process for gig drivers.
Return ONLY valid JSON. Schema:
{
  "results": [
    {
      "id": "job_1",
      "title": "Job Title",
      "company": "Company",
      "source": "Platform",
      "location": "City, State",
      "description": "Description",
      "payEstimate": "$X/hr",
      "requirements": ["req1"],
      "url": "apply_url",
      "matchScore": 95,
      "workModel": "1099",
      "tags": ["tag1"],
      "outreach": {
        "subject": "Email subject",
        "body": "Full email body",
        "followUpNote": "Follow up in X days"
      }
    }
  ],
  "searchUrls": {"source": "url"},
  "summary": "What I found and recommend"
}
Find 6-10 top opportunities and draft outreach for each. Rank by match score. Be thorough and specific."""
        )

        prompt = f"""Run a complete auto-pilot job search and outreach campaign:

Driver Profile:
- Name: {user_name or 'Gig Driver'}
- About: {user_info or 'Experienced independent driver'}
- Service Types: {', '.join(service_types) if service_types else 'General delivery'}
- Vehicles: {', '.join(vehicles) if vehicles else 'Car'}
- Target Areas: {', '.join(states) if states else 'Nationwide'}

Search these platforms: {', '.join(sources) if sources else 'All'}

For each opportunity found:
1. Score the match (0-100)
2. Draft a personalized outreach email
3. Suggest follow-up timing
Sort by best match first."""

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
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "job": body.get("job", {}),
        "status": body.get("status", "saved"),
        "outreach": body.get("outreach", None),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.saved_jobs.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/job-hunter/saved")
async def get_saved_jobs(request: Request):
    user = await get_current_user(request)
    return await db.saved_jobs.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api_router.delete("/job-hunter/saved/{job_id}")
async def delete_saved_job(job_id: str, request: Request):
    user = await get_current_user(request)
    await db.saved_jobs.delete_one({"id": job_id, "user_id": user["user_id"]})
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
async def shutdown_db_client():
    client.close()
