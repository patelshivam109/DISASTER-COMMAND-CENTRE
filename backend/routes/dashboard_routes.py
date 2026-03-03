from flask import Blueprint, g, jsonify

from models import ActivityLog, Disaster, Resource, VolunteerAssignment
from routes.access_control import require_roles
from services.workflow_service import ensure_volunteer_profile_for_user

dashboard_bp = Blueprint("dashboard_bp", __name__)


@dashboard_bp.route("/dashboard/admin", methods=["GET"])
@require_roles("admin")
def get_admin_dashboard():
    active_disasters = (
        Disaster.query.filter(Disaster.status != "Closed").filter(Disaster.type != "General").count()
    )
    assigned_volunteers = (
        VolunteerAssignment.query.filter(
            VolunteerAssignment.status.in_(["Assigned", "Accepted", "In Progress"])
        ).count()
    )

    resources = Resource.query.all()
    resource_warnings = [resource.to_dict() for resource in resources if resource.stock_level() != "Normal"]

    completed_disasters = (
        Disaster.query.filter_by(status="Closed")
        .order_by(Disaster.id.desc())
        .limit(5)
        .all()
    )
    recent_activity = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(20).all()

    return (
        jsonify(
            {
                "total_active_disasters": active_disasters,
                "total_volunteers_assigned": assigned_volunteers,
                "resource_stock_warnings": resource_warnings,
                "recently_completed_disasters": [disaster.to_dict() for disaster in completed_disasters],
                "recent_activity": [log.to_dict() for log in recent_activity],
            }
        ),
        200,
    )


@dashboard_bp.route("/dashboard/volunteer", methods=["GET"])
@require_roles("volunteer")
def get_volunteer_dashboard():
    volunteer = ensure_volunteer_profile_for_user(g.current_user)
    assignments = (
        VolunteerAssignment.query.filter_by(volunteer_id=volunteer.id)
        .order_by(VolunteerAssignment.assigned_at.desc())
        .all()
    )
    active_assignment = next(
        (assignment for assignment in assignments if assignment.status in ["Assigned", "Accepted", "In Progress"]),
        assignments[0] if assignments else None,
    )

    recent_activity = (
        ActivityLog.query.filter_by(volunteer_id=volunteer.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(10)
        .all()
    )

    return (
        jsonify(
            {
                "assigned_disaster": active_assignment.to_dict() if active_assignment else None,
                "hours_logged": volunteer.hours_logged,
                "task_status": active_assignment.status if active_assignment else "No active task",
                "personal_profile": volunteer.to_dict(),
                "assignments": [assignment.to_dict() for assignment in assignments],
                "recent_activity": [log.to_dict() for log in recent_activity],
            }
        ),
        200,
    )
