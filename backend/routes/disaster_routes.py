import io

from flask import Blueprint, g, jsonify, request, send_file

from models import (
    ActivityLog,
    Disaster,
    DisasterProgressUpdate,
    ResourceAllocation,
    VolunteerAssignment,
    utcnow,
    db,
)
from routes.access_control import require_auth, require_roles
from services.report_service import build_disaster_report_pdf, build_disaster_report_summary
from services.workflow_service import (
    build_disaster_workflow_flags,
    can_transition_disaster_status,
    get_active_assignment_count,
    log_activity,
)

disaster_bp = Blueprint("disaster_bp", __name__)

ALLOWED_PRIORITIES = {"Critical", "High", "Moderate"}
ALLOWED_STATUSES = {"Created", "Active", "Recovering", "Closed"}


def validate_affected_display(raw_value):
    if raw_value is None:
        return None, "affected_display is required"
    if not isinstance(raw_value, str):
        raw_value = str(raw_value)
    if not raw_value.strip():
        return None, "affected_display cannot be empty"
    if len(raw_value) > 50:
        return None, "affected_display must be 50 characters or fewer"
    return raw_value, None


@disaster_bp.route("/disasters", methods=["POST"])
@require_roles("admin")
def add_disaster():
    data = request.get_json() or {}

    if not data.get("type") or not data.get("location"):
        return jsonify({"error": "Type and location are required"}), 400

    priority = data.get("priority", "Moderate")
    if priority not in ALLOWED_PRIORITIES:
        return jsonify({"error": "Invalid priority value"}), 400

    status = data.get("status", "Created")
    if status not in ALLOWED_STATUSES:
        return jsonify({"error": "Invalid status value"}), 400
    if status != "Created":
        return jsonify({"error": "New disasters must begin in Created status"}), 400

    affected_input = data.get("affected_display", data.get("affected_count", "0"))
    affected_display, affected_error = validate_affected_display(affected_input)
    if affected_error:
        return jsonify({"error": affected_error}), 400

    disaster = Disaster(
        type=data["type"],
        location=data["location"],
        severity=data.get("severity", priority),
        priority=priority,
        status=status,
        response_team=data.get("response_team"),
        date=data.get("date"),
        affected_display=affected_display,
    )

    db.session.add(disaster)
    db.session.flush()
    log_activity(
        action="Disaster Created",
        details=f"Admin created disaster: {disaster.type} at {disaster.location}",
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
        "response_team",
        "date",
    }

    if "priority" in data and data["priority"] not in ALLOWED_PRIORITIES:
        return jsonify({"error": "Invalid priority value"}), 400

    updated = False
    previous_status = disaster.status
    status_changed = False
    if "status" in data:
        new_status = data["status"]
        if new_status not in ALLOWED_STATUSES:
            return jsonify({"error": "Invalid status value"}), 400
        if not can_transition_disaster_status(disaster.status, new_status):
            return (
                jsonify(
                    {
                        "error": (
                            f"Invalid lifecycle transition from {disaster.status} to {new_status}. "
                            "Allowed flow: Created -> Active -> Recovering -> Closed."
                        )
                    }
                ),
                400,
            )
        if new_status == "Closed":
            active_assignments = get_active_assignment_count(disaster.id)
            if active_assignments > 0:
                return (
                    jsonify(
                        {
                            "error": (
                                "Cannot close disaster while volunteers are still active "
                                f"({active_assignments} active assignment(s))."
                            )
                        }
                    ),
                    400,
                )
            disaster.closed_at = utcnow()
        else:
            disaster.closed_at = None
        disaster.status = new_status
        status_changed = previous_status != new_status
        updated = updated or status_changed

    for field in editable_fields:
        if field in data:
            setattr(disaster, field, data[field])
            updated = True

    if not updated:
        return jsonify({"error": "No valid fields provided for update"}), 400

    if status_changed:
        if disaster.status == "Closed":
            log_activity(
                action="Disaster Marked Closed",
                details=f"{disaster.type} at {disaster.location}",
                actor=g.current_user,
                disaster_id=disaster.id,
            )
        else:
            log_activity(
                action="Disaster Lifecycle Updated",
                details=f"{previous_status} -> {disaster.status} for {disaster.type} at {disaster.location}",
                actor=g.current_user,
                disaster_id=disaster.id,
            )
    else:
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

    log_activity(
        action="Disaster Deleted",
        details=f"{disaster.type} at {disaster.location}",
        actor=g.current_user,
        disaster_id=disaster.id,
    )
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
                "workflow": build_disaster_workflow_flags(disaster),
                "report_summary": build_disaster_report_summary(disaster),
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


@disaster_bp.route("/disasters/<int:disaster_id>/update-affected", methods=["PUT"])
@require_roles("admin")
def update_disaster_affected(disaster_id):
    disaster = db.session.get(Disaster, disaster_id)
    if not disaster:
        return jsonify({"error": "Disaster not found"}), 404

    data = request.get_json() or {}
    affected_display, affected_error = validate_affected_display(data.get("affected_display"))
    if affected_error:
        return jsonify({"error": affected_error}), 400

    previous_value = disaster.affected_display or ""
    disaster.affected_display = affected_display

    log_activity(
        action="Affected People Updated",
        details=(
            f"{disaster.type} at {disaster.location}: "
            f"'{previous_value or 'N/A'}' -> '{affected_display}'"
        ),
        actor=g.current_user,
        disaster_id=disaster.id,
    )
    db.session.commit()
    return jsonify({"message": "Affected people display updated", "disaster": disaster.to_dict()}), 200


@disaster_bp.route("/disasters/<int:disaster_id>/report", methods=["GET"])
@require_roles("admin")
def get_disaster_report(disaster_id):
    disaster = db.session.get(Disaster, disaster_id)
    if not disaster:
        return jsonify({"error": "Disaster not found"}), 404

    summary = build_disaster_report_summary(disaster)
    log_activity(
        action="Report Generated",
        details=f"Summary report generated for {disaster.type} at {disaster.location}",
        actor=g.current_user,
        disaster_id=disaster.id,
    )
    db.session.commit()
    return jsonify({"message": "Report generated", "report": summary}), 200


@disaster_bp.route("/disasters/<int:disaster_id>/report/pdf", methods=["GET"])
@require_roles("admin")
def download_disaster_report_pdf(disaster_id):
    disaster = db.session.get(Disaster, disaster_id)
    if not disaster:
        return jsonify({"error": "Disaster not found"}), 404

    pdf_bytes = build_disaster_report_pdf(disaster)
    file_name = f"disaster-report-{disaster.id}.pdf"
    log_activity(
        action="Report Downloaded",
        details=f"PDF report downloaded for {disaster.type} at {disaster.location}",
        actor=g.current_user,
        disaster_id=disaster.id,
    )
    db.session.commit()

    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=file_name,
    )
