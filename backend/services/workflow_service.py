from sqlalchemy import func, or_

from models import ActivityLog, Disaster, Volunteer, VolunteerAssignment, db

DISASTER_LIFECYCLE = ("Created", "Active", "Recovering", "Closed")
ACTIVE_ASSIGNMENT_STATUSES = {"Assigned", "Accepted", "In Progress"}


def normalize_email(value):
    return (value or "").strip().lower()


def normalize_phone(value):
    return (value or "").strip()


def ensure_general_disaster():
    disaster = Disaster.query.filter_by(type="General", location="Unassigned").first()
    if disaster:
        return disaster

    disaster = Disaster(
        type="General",
        location="Unassigned",
        severity="Low",
        priority="Moderate",
        status="Active",
        response_team="Default",
        date=None,
        affected_display="0",
    )
    db.session.add(disaster)
    db.session.commit()
    return disaster


def ensure_volunteer_profile_for_user(user):
    if not user or (user.role or "").lower() != "volunteer":
        return None

    profile = Volunteer.query.filter_by(user_id=user.id).first()
    if not profile:
        email = normalize_email(getattr(user, "email", None))
        phone = normalize_phone(getattr(user, "phone", None))
        if email or phone:
            query = Volunteer.query.filter(Volunteer.user_id.is_(None))
            contact_filters = []
            if email:
                contact_filters.append(func.lower(Volunteer.email) == email)
            if phone:
                contact_filters.append(Volunteer.phone == phone)
            profile = query.filter(or_(*contact_filters)).first() if contact_filters else None

    if not profile:
        default_disaster = ensure_general_disaster()
        profile = Volunteer(
            name=user.name or user.username,
            email=getattr(user, "email", None),
            phone=normalize_phone(getattr(user, "phone", None)) or "N/A",
            skills="General",
            availability="Available",
            verification_status="Verified" if getattr(user, "verified", False) else "Pending",
            hours_logged=0,
            disaster_id=default_disaster.id,
            user_id=user.id,
        )
        db.session.add(profile)
        db.session.commit()
        return profile

    profile.user_id = user.id
    profile.name = profile.name or user.name or user.username
    profile.email = profile.email or getattr(user, "email", None)
    profile.phone = profile.phone or normalize_phone(getattr(user, "phone", None)) or "N/A"
    if getattr(user, "verified", False):
        profile.verification_status = "Verified"
    db.session.commit()
    return profile


def can_transition_disaster_status(current_status, new_status):
    if current_status == new_status:
        return True

    if current_status not in DISASTER_LIFECYCLE or new_status not in DISASTER_LIFECYCLE:
        return False

    current_index = DISASTER_LIFECYCLE.index(current_status)
    new_index = DISASTER_LIFECYCLE.index(new_status)
    return new_index == current_index + 1


def get_active_assignment_count(disaster_id):
    return (
        VolunteerAssignment.query.filter_by(disaster_id=disaster_id)
        .filter(VolunteerAssignment.status.in_(list(ACTIVE_ASSIGNMENT_STATUSES)))
        .count()
    )


def build_disaster_workflow_flags(disaster):
    assignments = VolunteerAssignment.query.filter_by(disaster_id=disaster.id).all()
    active_assignments = [assignment for assignment in assignments if assignment.status in ACTIVE_ASSIGNMENT_STATUSES]
    completed_assignments = [assignment for assignment in assignments if assignment.status == "Completed"]

    has_resource_exhaustion = any(
        allocation.resource and (allocation.resource.quantity or 0) <= 0
        for allocation in disaster.resource_allocations
    )

    suggestions = []
    alerts = []

    if disaster.status == "Active" and assignments and len(completed_assignments) == len(assignments):
        suggestions.append("All tasks are completed. Consider moving this disaster to Recovering.")

    if has_resource_exhaustion:
        alerts.append("Some allocated resources are exhausted and require replenishment.")

    return {
        "lifecycle": list(DISASTER_LIFECYCLE),
        "can_allocate_resources": disaster.status != "Closed",
        "can_assign_volunteers": disaster.status != "Closed",
        "active_assignments_count": len(active_assignments),
        "resource_exhausted": has_resource_exhaustion,
        "suggestions": suggestions,
        "alerts": alerts,
    }


def log_activity(
    action,
    details=None,
    actor=None,
    disaster_id=None,
    resource_id=None,
    volunteer_id=None,
):
    log = ActivityLog(
        action=action,
        details=details,
        actor_role=(actor.role if actor else None),
        actor_name=(actor.username if actor else None),
        disaster_id=disaster_id,
        resource_id=resource_id,
        volunteer_id=volunteer_id,
    )
    db.session.add(log)
    return log
