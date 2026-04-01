from sqlalchemy import Column, String, Float, Integer, Boolean, Text, JSON, ForeignKey, UniqueConstraint
from database import Base


class User(Base):
    __tablename__ = 'users'
    user_id = Column(String, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), default="")
    password = Column(String(255), default="")
    picture = Column(Text, default="")
    primary_vehicle = Column(String(100), default="")
    primary_market = Column(String(100), default="")
    created_at = Column(String(50))


class Company(Base):
    __tablename__ = 'companies'
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String(255), default="")
    website = Column(Text, default="")
    main_phone = Column(String(50), default="")
    active_states = Column(JSON, default=[])
    work_model = Column(JSON, default=[])
    service_type = Column(JSON, default=[])
    vehicles = Column(JSON, default=[])
    status = Column(String(50), default="Researching", index=True)
    priority = Column(String(20), default="Medium")
    handler = Column(String(100), default="", index=True)
    follow_up_date = Column(String(20), nullable=True)
    signup_url = Column(Text, default="")
    notes = Column(Text, default="")
    contact_name = Column(String(255), default="")
    contact_title = Column(String(255), default="")
    contact_email = Column(String(255), default="")
    contact_phone = Column(String(50), default="")
    contact_linkedin = Column(Text, default="")
    contact_method = Column(String(50), default="")
    vehicle_other = Column(String(255), default="")
    service_other = Column(String(255), default="")
    created_at = Column(String(50))
    last_modified = Column(String(50), index=True)


class Activity(Base):
    __tablename__ = 'activities'
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
    company_id = Column(String, index=True)
    company_name = Column(String(255), default="")
    type = Column(String(50), default="")
    outcome = Column(String(50), default="")
    handler = Column(String(100), default="")
    notes = Column(Text, default="")
    next_action = Column(Text, default="")
    date_time = Column(String(50), index=True)
    created_at = Column(String(50))


class Earning(Base):
    __tablename__ = 'earnings'
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
    company_id = Column(String, default="")
    company_name = Column(String(255), default="")
    date = Column(String(20), default="", index=True)
    hours = Column(Float, default=0)
    miles = Column(Float, default=0)
    gross_earnings = Column(Float, default=0)
    tips = Column(Float, default=0)
    platform_fees = Column(Float, default=0)
    net_earnings = Column(Float, default=0)
    notes = Column(Text, default="")
    created_at = Column(String(50))


class Setting(Base):
    __tablename__ = 'settings'
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
    key = Column(String(100), nullable=False)
    value = Column(JSON)
    __table_args__ = (
        UniqueConstraint('user_id', 'key', name='uq_settings_user_key'),
    )


class Document(Base):
    __tablename__ = 'documents'
    id = Column(String, primary_key=True)
    company_id = Column(String, index=True)
    user_id = Column(String, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
    original_name = Column(String(500), default="")
    stored_name = Column(String(500), default="")
    size = Column(Integer, default=0)
    is_image = Column(Boolean, default=False)
    ext = Column(String(20), default="")
    uploaded_at = Column(String(50))


class SavedJob(Base):
    __tablename__ = 'saved_jobs'
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
    job = Column(JSON)
    status = Column(String(50), default="saved")
    outreach = Column(JSON, nullable=True)
    created_at = Column(String(50), index=True)


class UserSession(Base):
    __tablename__ = 'user_sessions'
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
    session_token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(String(50))
    created_at = Column(String(50))
