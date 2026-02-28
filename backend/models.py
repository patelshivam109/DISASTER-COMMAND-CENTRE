from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Disaster(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(100), nullable=False)
    severity = db.Column(db.String(50))
    priority = db.Column(db.String(20), default="Moderate")
    status = db.Column(db.String(50), default="Active")
    response_team = db.Column(db.String(120))
    date = db.Column(db.String(50))

    # relationship
    resources = db.relationship("Resource", backref="disaster", lazy=True)
    volunteers = db.relationship("Volunteer", backref="disaster", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "location": self.location,
            "severity": self.severity,
            "priority": self.priority,
            "status": self.status,
            "response_team": self.response_team,
            "date": self.date
        }


class Resource(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    location = db.Column(db.String(100))
    status = db.Column(db.String(50), default="Available")

    disaster_id = db.Column(
        db.Integer,
        db.ForeignKey("disaster.id"),
        nullable=False
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "quantity": self.quantity,
            "location": self.location,
            "status": self.status,
            "disaster_id": self.disaster_id
        }
class Volunteer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    skills = db.Column(db.String(200))
    availability = db.Column(db.String(50), default="Available")
    hours_logged = db.Column(db.Integer, default=0)

    disaster_id = db.Column(
        db.Integer,
        db.ForeignKey("disaster.id"),
        nullable=False
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "skills": self.skills,
            "availability": self.availability,
            "hours_logged": self.hours_logged,
            "disaster_id": self.disaster_id
        }


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="volunteer")  # 'admin' or 'volunteer'

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
        }

