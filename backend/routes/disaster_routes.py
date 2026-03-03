from flask import Blueprint, g, jsonify, request

from models import (
    ActivityLog,
    Disaster,
    DisasterProgressUpdate,
    ResourceAllocation,
    VolunteerAssignment,
    db,
)
from routes.access_control import require_auth, require_roles
from services.workflow_service import log_activity

disaster_bp = Blueprint("disaster_bp", __name__)

ALLOWED_PRIORITIES = {"Critical", "High", "Moderate"}
ALLOWED_STATUSES = {"Active", "Recovering", "Closed"}


@disaster_bp.route("/disasters", methods=["POST"])
@require_roles("admin")
def add_disaster():
    data = request.get_json() or {}

    if not data.get("type") or not data.get("location"):
        return jsonify({"error": "Type and location are required"}), 400

    priority = data.get("priority", "Moderate")
    if priority not in ALLOWED_PRIORITIES:
        return jsonify({"error": "Invalid priority value"}), 400

    status = data.get("status", "Active")
    if status not in ALLOWED_STATUSES:
        return jsonify({"error": "Invalid status value"}), 400

    try:
        affected_count = max(int(data.get("affected_count", 0)), 0)
    except (TypeError, ValueError):
        return jsonify({"error": "affected_count must be a number"}), 400

    disaster = Disaster(
        type=data["type"],
        location=data["location"],
        severity=data.get("severity", priority),
        priority=priority,
        status=status,
        response_team=data.get("response_team"),
        date=data.get("date"),
        affected_count=affected_count,
    )

    db.session.add(disaster)
    db.session.flush()
    log_activity(
        action="Disaster Created",
        details=f"{disaster.type} at {disaster.location}",
        actor=g.current_user,
        disaster_id=disaster.id,
    )
    db.session.commit()

    return (
        jsonify({"message": "Disaster added successfully", "disaster": disaster.to_dict()}),
        201,
    )


@disaster_bp.route("/disasters", methods=["GET"])
@require_auth
def get_disasters():
    disasters = Disaster.query.order_by(Disaster.id.desc()).all()
    return jsonify([disaster.to_dict() for disaster in disasters]), 200


@disaster_bp.route("/disasters/<int:disaster_id>", methods=["PATCH"])
@require_roles("admin")
def update_disaster(disaster_id):
    disaster = db.session.get(Disaster, disaster_id)
    if not disaster:
        return jsonify({"error": "Disaster not found"}), 404

    data = request.get_json() or {}
    editable_fields = {
        "type",
        "location",
        "severity",
        "priority",
        "status",
        "response_team",
        "date",
        "affected_count",
    }

    if "priority" in data and data["priority"] not in ALLOWED_PRIORITIES:
        return jsonify({"error": "Invalid priority value"}), 400
    if "status" in data and data["status"] not in ALLOWED_STATUSES:
        return jsonify({"error": "Invalid status value"}), 400

    updated = False
    for field in editable_fields:
        if field in data:
            value = data[field]
            if field == "affected_count":
                try:
                    value = max(int(value), 0)
                except (TypeError, ValueError):
                    return jsonify({"error": "affected_count must be a number"}), 400
            setattr(disaster, field, value)
            updated = True

    if not updated:
        return jsonify({"error": "No valid fields provided for update"}), 400

    log_activity(
        action="Disaster Updated",
        details=f"{disaster.type} at {disaster.location}",
        actor=g.current_user,
        disaster_id=disaster.id,
    )
    db.session.commit()
    return jsonify({"message": "Disaster updated successfully", "disaster": disaster.to_dict()}), 200


@disaster_bp.route("/disasters/<int:disaster_id>", methods=["DELETE"])
@require_roles("admin")
def delete_disaster(disaster_id):
    disaster = db.session.get(Disaster, disaster_id)
    if not disaster:
        return jsonify({"error": "Disaster not found"}), 404

    db.session.delete(disaster)
    db.session.commit()
    return jsonify({"message": "Disaster deleted successfully"}), 200


@disaster_bp.route("/disasters/<int:disaster_id>/operations", methods=["GET"])
@require_auth
def get_disaster_operations(disaster_id):
    disaster = db.session.get(Disaster, disaster_id)
    if not disaster:
        return jsonify({"error": "Disaster not found"}), 404

    assignments = (
        VolunteerAssignment.query.filter_by(disaster_id=disaster_id)
        .order_by(VolunteerAssignment.assigned_at.desc())
        .all()
    )
    allocations = (
        ResourceAllocation.query.filter_by(disaster_id=disaster_id)
        .order_by(ResourceAllocation.created_at.desc())
        .all()
    )
    progress_updates = (
        DisasterProgressUpdate.query.filter_by(disaster_id=disaster_id)
        .order_by(DisasterProgressUpdate.created_at.desc())
        .all()
    )
    activity_logs = (
        ActivityLog.query.filter_by(disaster_id=disaster_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(50)
        .all()
    )

    return (
        jsonify(
            {
                "disaster": disaster.to_dict(),
                "assigned_volunteers": [assignment.to_dict() for assignment in assignments],
                "allocated_resources": [allocation.to_dict() for allocation in allocations],
                "progress_updates": [update.to_dict() for update in progress_updates],
                "activity_logs": [log.to_dict() for log in activity_logs],
            }
        ),
        200,
    )


@disaster_bp.route("/disasters/<int:disaster_id>/progress", methods=["POST"])
@require_roles("admin")
def add_progress_update(disaster_id):
    disaster = db.session.get(Disaster, disaster_id)
    if not disaster:
        return jsonify({"error": "Disaster not found"}), 404

    data = request.get_json() or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"error": "Progress message is required"}), 400

    progress_update = DisasterProgressUpdate(
        disaster_id=disaster.id,
        message=message,
        created_by=g.current_user.username,
    )
    db.session.add(progress_update)
    log_activity(
        action="Progress Update",
        details=message,
        actor=g.current_user,
        disaster_id=disaster.id,
    )
    db.session.commit()

    return jsonify({"message": "Progress update recorded", "progress": progress_update.to_dict()}), 201


@disaster_bp.route("/activity", methods=["GET"])
@require_auth
def get_activity_feed():
    logs = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(30).all()
    return jsonify([log.to_dict() for log in logs]), 200
