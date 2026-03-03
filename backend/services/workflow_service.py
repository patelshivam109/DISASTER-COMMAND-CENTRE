from models import ActivityLog, Disaster, Volunteer, db


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
        affected_count=0,
    )
    db.session.add(disaster)
    db.session.commit()
    return disaster


def ensure_volunteer_profile_for_user(user):
    if not user or (user.role or "").lower() != "volunteer":
        return None

    profile = Volunteer.query.filter_by(user_id=user.id).first()
    if profile:
        return profile

    default_disaster = ensure_general_disaster()
    profile = Volunteer(
        name=user.username,
        phone="N/A",
        skills="General",
        availability="Available",
        verification_status="Pending",
        hours_logged=0,
        disaster_id=default_disaster.id,
        user_id=user.id,
    )
    db.session.add(profile)
    db.session.commit()
    return profile


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
