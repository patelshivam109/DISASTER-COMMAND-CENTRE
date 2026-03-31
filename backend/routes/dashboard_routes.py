from flask import Blueprint, g, jsonify
import re

try:
    from models import ActivityLog, Disaster, Resource, VolunteerAssignment
    from routes.access_control import require_roles
    from services.workflow_service import ensure_volunteer_profile_for_user
except ModuleNotFoundError:
    from ..models import ActivityLog, Disaster, Resource, VolunteerAssignment
    from .access_control import require_roles
    from ..services.workflow_service import ensure_volunteer_profile_for_user

dashboard_bp = Blueprint("dashboard_bp", __name__)


def affected_display_score(value):
    text = str(value or "").strip()
    if not text:
        return 0

    numbers = [int(item) for item in re.findall(r"\d+", text)]
    if not numbers:
        return 0

    if "-" in text and len(numbers) >= 2:
        return max(numbers[0], numbers[1])
    if text.startswith(">"):
        return numbers[0] + 1
    if text.startswith("<"):
        return max(numbers[0] - 1, 0)
    if text.endswith("+"):
        return numbers[0]
    return max(numbers)


@dashboard_bp.route("/dashboard/admin", methods=["GET"])
@require_roles("admin")
def get_admin_dashboard():
    disasters = Disaster.query.filter(Disaster.type != "General").all()
    active_disasters = len([disaster for disaster in disasters if disaster.status != "Closed"])
    closed_disasters = len([disaster for disaster in disasters if disaster.status == "Closed"])

    assigned_volunteers = (
        VolunteerAssignment.query.filter(
            VolunteerAssignment.status.in_(["Assigned", "Accepted", "In Progress"])
        ).count()
    )

    resources = Resource.query.all()
    resource_warnings = [resource.to_dict() for resource in resources if resource.stock_level() != "Normal"]
    exhausted_resources = [resource.to_dict() for resource in resources if (resource.quantity or 0) <= 0]

    completed_disasters = (
        Disaster.query.filter_by(status="Closed")
        .order_by(Disaster.id.desc())
        .limit(5)
        .all()
    )

    resource_usage_per_disaster = []
    for disaster in disasters:
        total_allocated = sum(max(allocation.quantity or 0, 0) for allocation in disaster.resource_allocations)
        resource_usage_per_disaster.append(
            {
                "disaster_id": disaster.id,
                "disaster_label": f"{disaster.type} - {disaster.location}",
                "total_allocated": total_allocated,
            }
        )
    resource_usage_per_disaster.sort(key=lambda item: item["total_allocated"], reverse=True)

    monthly_hours = {}
    assignments = VolunteerAssignment.query.all()
    for assignment in assignments:
        logged_hours = max(assignment.hours_logged or 0, 0)
        if logged_hours == 0:
            continue
        reference_time = assignment.completed_at or assignment.assigned_at
        if not reference_time:
            continue
        month_key = reference_time.strftime("%Y-%m")
        monthly_hours[month_key] = monthly_hours.get(month_key, 0) + logged_hours

    month_keys = sorted(monthly_hours.keys())[-12:]
    volunteer_hours_per_month = [
        {"month": month_key, "hours": monthly_hours[month_key]} for month_key in month_keys
    ]

    priority_rank = {"Critical": 3, "High": 2, "Moderate": 1}
    open_disasters = [disaster for disaster in disasters if disaster.status != "Closed"]
    most_critical_disaster = None
    if open_disasters:
        most_critical = max(
            open_disasters,
            key=lambda disaster: (
                priority_rank.get(disaster.priority, 0),
                affected_display_score(disaster.affected_display),
                disaster.id,
            ),
        )
        most_critical_disaster = {
            "id": most_critical.id,
            "label": f"{most_critical.type} - {most_critical.location}",
            "priority": most_critical.priority,
            "status": most_critical.status,
            "affected_display": most_critical.affected_display or "0",
        }

    recent_activity = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(20).all()

    return (
        jsonify(
            {
                "total_active_disasters": active_disasters,
                "total_closed_disasters": closed_disasters,
                "total_volunteers_assigned": assigned_volunteers,
                "resource_stock_warnings": resource_warnings,
                "resource_exhausted": exhausted_resources,
                "recently_completed_disasters": [disaster.to_dict() for disaster in completed_disasters],
                "recent_activity": [log.to_dict() for log in recent_activity],
                "active_vs_closed": {
                    "active": active_disasters,
                    "closed": closed_disasters,
                },
                "resource_usage_per_disaster": resource_usage_per_disaster,
                "volunteer_hours_per_month": volunteer_hours_per_month,
                "most_critical_disaster": most_critical_disaster,
            }
        ),
        200,
    )


@dashboard_bp.route("/dashboard/volunteer", methods=["GET"])
@require_roles("volunteer")
def get_volunteer_dashboard():
    volunteer = ensure_volunteer_profile_for_user(g.current_user)
    assignments = (
        VolunteerAssignment.query.filter_by(volunteer_id=g.current_user.id)
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
