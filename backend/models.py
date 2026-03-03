from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def utcnow():
    return datetime.now(timezone.utc)


def iso_or_none(value):
    return value.isoformat() if value else None


class Disaster(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(100), nullable=False)
    severity = db.Column(db.String(50))
    priority = db.Column(db.String(20), default="Moderate")
    status = db.Column(db.String(50), default="Active")
    response_team = db.Column(db.String(120))
    date = db.Column(db.String(50))
    affected_count = db.Column(db.Integer, default=0)

    # Legacy relationships kept for backward compatibility with existing DB.
    legacy_resources = db.relationship("Resource", backref="legacy_disaster", lazy=True)
    legacy_volunteers = db.relationship("Volunteer", backref="legacy_disaster", lazy=True)

    resource_allocations = db.relationship(
        "ResourceAllocation",
        back_populates="disaster",
        cascade="all, delete-orphan",
        lazy=True,
    )
    volunteer_assignments = db.relationship(
        "VolunteerAssignment",
        back_populates="disaster",
        cascade="all, delete-orphan",
        lazy=True,
    )
    progress_updates = db.relationship(
        "DisasterProgressUpdate",
        back_populates="disaster",
        cascade="all, delete-orphan",
        lazy=True,
    )
    activity_logs = db.relationship("ActivityLog", back_populates="disaster", lazy=True)

    def to_dict(self):
        active_assignments = [
            assignment
            for assignment in self.volunteer_assignments
            if assignment.status in {"Assigned", "Accepted", "In Progress"}
        ]
        return {
            "id": self.id,
            "type": self.type,
            "location": self.location,
            "severity": self.severity,
            "priority": self.priority,
            "status": self.status,
            "response_team": self.response_team,
            "date": self.date,
            "affected_count": self.affected_count or 0,
            "assigned_volunteers_count": len(active_assignments),
            "allocated_resources_count": len(self.resource_allocations),
        }


class Resource(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(100), default="General")
    quantity = db.Column(db.Integer, nullable=False)
    location = db.Column(db.String(100))
    warehouse_info = db.Column(db.String(150))
    status = db.Column(db.String(50), default="Available")
    low_threshold = db.Column(db.Integer, default=50)
    critical_threshold = db.Column(db.Integer, default=20)

    # Legacy column retained so existing rows remain valid.
    disaster_id = db.Column(db.Integer, db.ForeignKey("disaster.id"), nullable=False)

    allocations = db.relationship(
        "ResourceAllocation",
        back_populates="resource",
        cascade="all, delete-orphan",
        lazy=True,
    )
    activity_logs = db.relationship("ActivityLog", back_populates="resource", lazy=True)

    def stock_level(self):
        if self.quantity <= (self.critical_threshold or 20):
            return "Critical"
        if self.quantity <= (self.low_threshold or 50):
            return "Low"
        return "Normal"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "quantity": self.quantity,
            "location": self.location,
            "warehouse_info": self.warehouse_info,
            "status": self.status,
            "stock_level": self.stock_level(),
            "low_threshold": self.low_threshold,
            "critical_threshold": self.critical_threshold,
            "disaster_id": self.disaster_id,
        }


class Volunteer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    skills = db.Column(db.String(200))
    availability = db.Column(db.String(50), default="Available")
    verification_status = db.Column(db.String(30), default="Pending")
    hours_logged = db.Column(db.Integer, default=0)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), unique=True)

    # Legacy column retained so existing rows remain valid.
    disaster_id = db.Column(db.Integer, db.ForeignKey("disaster.id"), nullable=False)

    user = db.relationship("User", back_populates="volunteer_profile")
    assignments = db.relationship(
        "VolunteerAssignment",
        back_populates="volunteer",
        cascade="all, delete-orphan",
        lazy=True,
    )
    activity_logs = db.relationship("ActivityLog", back_populates="volunteer", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "skills": self.skills,
            "availability": self.availability,
            "verification_status": self.verification_status,
            "hours_logged": self.hours_logged,
            "disaster_id": self.disaster_id,
            "user_id": self.user_id,
        }


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="volunteer")

    volunteer_profile = db.relationship("Volunteer", back_populates="user", uselist=False)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "volunteer_id": self.volunteer_profile.id if self.volunteer_profile else None,
        }


class ResourceAllocation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    resource_id = db.Column(db.Integer, db.ForeignKey("resource.id"), nullable=False)
    disaster_id = db.Column(db.Integer, db.ForeignKey("disaster.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    notes = db.Column(db.String(250))
    allocated_by = db.Column(db.String(80))
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    resource = db.relationship("Resource", back_populates="allocations")
    disaster = db.relationship("Disaster", back_populates="resource_allocations")

    def to_dict(self):
        return {
            "id": self.id,
            "resource_id": self.resource_id,
            "resource_name": self.resource.name if self.resource else None,
            "disaster_id": self.disaster_id,
            "disaster_label": (
                f"{self.disaster.type} - {self.disaster.location}" if self.disaster else None
            ),
            "quantity": self.quantity,
            "notes": self.notes,
            "allocated_by": self.allocated_by,
            "created_at": iso_or_none(self.created_at),
        }


class VolunteerAssignment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    volunteer_id = db.Column(db.Integer, db.ForeignKey("volunteer.id"), nullable=False)
    disaster_id = db.Column(db.Integer, db.ForeignKey("disaster.id"), nullable=False)
    task_details = db.Column(db.String(250))
    status = db.Column(db.String(30), default="Assigned")
    hours_logged = db.Column(db.Integer, default=0)
    assigned_by = db.Column(db.String(80))
    assigned_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    completed_at = db.Column(db.DateTime)

    volunteer = db.relationship("Volunteer", back_populates="assignments")
    disaster = db.relationship("Disaster", back_populates="volunteer_assignments")

    __table_args__ = (
        db.UniqueConstraint("volunteer_id", "disaster_id", name="uix_volunteer_disaster"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "volunteer_id": self.volunteer_id,
            "volunteer_name": self.volunteer.name if self.volunteer else None,
            "disaster_id": self.disaster_id,
            "disaster_label": (
                f"{self.disaster.type} - {self.disaster.location}" if self.disaster else None
            ),
            "task_details": self.task_details,
            "status": self.status,
            "hours_logged": self.hours_logged,
            "assigned_by": self.assigned_by,
            "assigned_at": iso_or_none(self.assigned_at),
            "completed_at": iso_or_none(self.completed_at),
        }


class DisasterProgressUpdate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    disaster_id = db.Column(db.Integer, db.ForeignKey("disaster.id"), nullable=False)
    message = db.Column(db.String(300), nullable=False)
    created_by = db.Column(db.String(80))
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    disaster = db.relationship("Disaster", back_populates="progress_updates")

    def to_dict(self):
        return {
            "id": self.id,
            "disaster_id": self.disaster_id,
            "message": self.message,
            "created_by": self.created_by,
            "created_at": iso_or_none(self.created_at),
        }


class ActivityLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    action = db.Column(db.String(120), nullable=False)
    details = db.Column(db.String(300))
    actor_role = db.Column(db.String(30))
    actor_name = db.Column(db.String(80))
    disaster_id = db.Column(db.Integer, db.ForeignKey("disaster.id"))
    resource_id = db.Column(db.Integer, db.ForeignKey("resource.id"))
    volunteer_id = db.Column(db.Integer, db.ForeignKey("volunteer.id"))
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    disaster = db.relationship("Disaster", back_populates="activity_logs")
    resource = db.relationship("Resource", back_populates="activity_logs")
    volunteer = db.relationship("Volunteer", back_populates="activity_logs")

    def to_dict(self):
        return {
            "id": self.id,
            "action": self.action,
            "details": self.details,
            "actor_role": self.actor_role,
            "actor_name": self.actor_name,
            "disaster_id": self.disaster_id,
            "resource_id": self.resource_id,
            "volunteer_id": self.volunteer_id,
            "created_at": iso_or_none(self.created_at),
        }

