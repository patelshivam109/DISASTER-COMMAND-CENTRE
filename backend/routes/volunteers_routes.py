from flask import Blueprint, g, jsonify, request

from models import Disaster, Volunteer, VolunteerAssignment, db, utcnow
from routes.access_control import require_auth, require_roles
from services.workflow_service import (
    ensure_general_disaster,
    ensure_volunteer_profile_for_user,
    log_activity,
)

volunteer_bp = Blueprint("volunteer_bp", __name__)

VERIFICATION_STATUSES = {"Pending", "Verified"}


def parse_non_negative_int(value, field_name):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None, jsonify({"error": f"{field_name} must be a number"}), 400
    if parsed < 0:
        return None, jsonify({"error": f"{field_name} cannot be negative"}), 400
    return parsed, None, None


def get_current_volunteer_profile():
    profile = ensure_volunteer_profile_for_user(g.current_user)
    if not profile:
        return None, (jsonify({"error": "Volunteer profile not found"}), 404)
    return profile, None


@volunteer_bp.route("/volunteers", methods=["POST"])
@require_roles("admin")
def add_volunteer():
    data = request.get_json() or {}

    if not data.get("name") or not data.get("phone"):
        return jsonify({"error": "Name and phone are required"}), 400

    disaster_id = data.get("disaster_id")
    if disaster_id:
        disaster = db.session.get(Disaster, disaster_id)
        if not disaster:
            return jsonify({"error": "Disaster not found"}), 404
    else:
        disaster = ensure_general_disaster()

    verification_status = data.get("verification_status") or data.get("availability") or "Pending"
    if verification_status not in VERIFICATION_STATUSES:
        verification_status = "Pending"

    try:
        hours_logged = max(int(data.get("hours_logged", 0)), 0)
    except (TypeError, ValueError):
        hours_logged = 0

    volunteer = Volunteer(
        name=data["name"],
        phone=data["phone"],
        skills=data.get("skills"),
        availability=data.get("availability", "Available"),
        verification_status=verification_status,
        hours_logged=hours_logged,
        disaster_id=disaster.id,
        user_id=data.get("user_id"),
    )

    db.session.add(volunteer)
    db.session.flush()
    log_activity(
        action="Volunteer Added",
        details=f"{volunteer.name} profile created",
        actor=g.current_user,
        volunteer_id=volunteer.id,
    )
    db.session.commit()

    return jsonify({"message": "Volunteer added successfully", "volunteer": volunteer.to_dict()}), 201


@volunteer_bp.route("/volunteers", methods=["GET"])
@require_auth
def get_all_volunteers():
    role = (g.current_user.role or "").lower()
    if role == "admin":
        volunteers = Volunteer.query.order_by(Volunteer.id.desc()).all()
        return jsonify([volunteer.to_dict() for volunteer in volunteers]), 200

    volunteer, error = get_current_volunteer_profile()
    if error:
        return error
    return jsonify([volunteer.to_dict()]), 200


@volunteer_bp.route("/volunteers/me", methods=["GET"])
@require_roles("volunteer")
def get_my_volunteer_profile():
    volunteer, error = get_current_volunteer_profile()
    if error:
        return error

    assignments = (
        VolunteerAssignment.query.filter_by(volunteer_id=volunteer.id)
        .order_by(VolunteerAssignment.assigned_at.desc())
        .all()
    )
    return (
        jsonify(
            {
                "profile": volunteer.to_dict(),
                "assignments": [assignment.to_dict() for assignment in assignments],
            }
        ),
        200,
    )


@volunteer_bp.route("/volunteers/<int:volunteer_id>", methods=["PATCH"])
@require_roles("admin")
def update_volunteer(volunteer_id):
    volunteer = db.session.get(Volunteer, volunteer_id)
    if not volunteer:
        return jsonify({"error": "Volunteer not found"}), 404

    data = request.get_json() or {}
    editable_fields = {"name", "phone", "skills", "availability"}
    updated = False

    if "verification_status" in data:
        if data["verification_status"] not in VERIFICATION_STATUSES:
            return jsonify({"error": "Invalid verification_status"}), 400
        volunteer.verification_status = data["verification_status"]
        updated = True

    if "hours_logged" in data:
        parsed, error_response, status_code = parse_non_negative_int(data["hours_logged"], "hours_logged")
        if error_response:
            return error_response, status_code
        volunteer.hours_logged = parsed
        updated = True

    if "disaster_id" in data:
        disaster = db.session.get(Disaster, data["disaster_id"])
        if not disaster:
            return jsonify({"error": "Disaster not found"}), 404
        volunteer.disaster_id = disaster.id
        updated = True

    for field in editable_fields:
        if field in data:
            setattr(volunteer, field, data[field])
            updated = True

    if not updated:
        return jsonify({"error": "No valid fields provided for update"}), 400

    log_activity(
        action="Volunteer Updated",
        details=f"{volunteer.name} profile updated",
        actor=g.current_user,
        volunteer_id=volunteer.id,
    )
    db.session.commit()
    return jsonify({"message": "Volunteer updated successfully", "volunteer": volunteer.to_dict()}), 200


@volunteer_bp.route("/volunteers/<int:volunteer_id>", methods=["DELETE"])
@require_roles("admin")
def delete_volunteer(volunteer_id):
    volunteer = db.session.get(Volunteer, volunteer_id)
    if not volunteer:
        return jsonify({"error": "Volunteer not found"}), 404

    db.session.delete(volunteer)
    db.session.commit()
    return jsonify({"message": "Volunteer removed successfully"}), 200


@volunteer_bp.route("/volunteers/<int:volunteer_id>/assignments", methods=["POST"])
@require_roles("admin")
def assign_volunteer(volunteer_id):
    volunteer = db.session.get(Volunteer, volunteer_id)
    if not volunteer:
        return jsonify({"error": "Volunteer not found"}), 404

    data = request.get_json() or {}
    disaster = db.session.get(Disaster, data.get("disaster_id"))
    if not disaster:
        return jsonify({"error": "Disaster not found"}), 404
    if disaster.status == "Closed":
        return jsonify({"error": "Cannot assign volunteers to a closed disaster"}), 400
    if volunteer.verification_status != "Verified":
        return jsonify({"error": "Volunteer must be verified before assignment"}), 400

    task_details = (data.get("task_details") or "").strip() or "General field support"

    assignment = VolunteerAssignment.query.filter_by(
        volunteer_id=volunteer.id, disaster_id=disaster.id
    ).first()
    if assignment:
        return jsonify({"error": "Volunteer is already assigned to this disaster"}), 409

    assignment = VolunteerAssignment(
        volunteer_id=volunteer.id,
        disaster_id=disaster.id,
        task_details=task_details,
        status="Assigned",
        assigned_by=g.current_user.username,
    )
    db.session.add(assignment)

    volunteer.disaster_id = disaster.id
    log_activity(
        action="Volunteer Assigned",
        details=f"{volunteer.name} assigned to {disaster.type} - {disaster.location}",
        actor=g.current_user,
        disaster_id=disaster.id,
        volunteer_id=volunteer.id,
    )
    db.session.commit()
    return jsonify({"message": "Volunteer assignment saved", "assignment": assignment.to_dict()}), 201


@volunteer_bp.route("/assignments", methods=["GET"])
@require_auth
def get_assignments():
    role = (g.current_user.role or "").lower()
    if role == "admin":
        assignments = VolunteerAssignment.query.order_by(VolunteerAssignment.assigned_at.desc()).all()
        return jsonify([assignment.to_dict() for assignment in assignments]), 200

    volunteer, error = get_current_volunteer_profile()
    if error:
        return error
    assignments = (
        VolunteerAssignment.query.filter_by(volunteer_id=volunteer.id)
        .order_by(VolunteerAssignment.assigned_at.desc())
        .all()
    )
    return jsonify([assignment.to_dict() for assignment in assignments]), 200


@volunteer_bp.route("/assignments/<int:assignment_id>", methods=["DELETE"])
@require_roles("admin")
def remove_assignment(assignment_id):
    assignment = db.session.get(VolunteerAssignment, assignment_id)
    if not assignment:
        return jsonify({"error": "Assignment not found"}), 404

    volunteer_name = assignment.volunteer.name if assignment.volunteer else "Volunteer"
    disaster_id = assignment.disaster_id
    volunteer_id = assignment.volunteer_id

    db.session.delete(assignment)
    log_activity(
        action="Assignment Removed",
        details=f"{volunteer_name} removed from disaster assignment",
        actor=g.current_user,
        disaster_id=disaster_id,
        volunteer_id=volunteer_id,
    )
    db.session.commit()
    return jsonify({"message": "Assignment removed"}), 200


@volunteer_bp.route("/assignments/<int:assignment_id>/respond", methods=["POST"])
@require_roles("volunteer")
def respond_to_assignment(assignment_id):
    volunteer, error = get_current_volunteer_profile()
    if error:
        return error

    assignment = db.session.get(VolunteerAssignment, assignment_id)
    if not assignment:
        return jsonify({"error": "Assignment not found"}), 404
    if assignment.volunteer_id != volunteer.id:
        return jsonify({"error": "Forbidden: assignment does not belong to you"}), 403

    data = request.get_json() or {}
    action = (data.get("action") or "").strip().lower()
    if action == "accept":
        assignment.status = "Accepted"
        log_action = "Volunteer Accepted Assignment"
        log_details = f"{volunteer.name} accepted assignment"
    elif action == "reject":
        assignment.status = "Rejected"
        log_action = "Volunteer Rejected Assignment"
        log_details = f"{volunteer.name} rejected assignment"
    else:
        return jsonify({"error": "Action must be accept or reject"}), 400

    log_activity(
        action=log_action,
        details=log_details,
        actor=g.current_user,
        disaster_id=assignment.disaster_id,
        volunteer_id=volunteer.id,
    )
    db.session.commit()
    return jsonify({"message": "Assignment updated", "assignment": assignment.to_dict()}), 200


@volunteer_bp.route("/assignments/<int:assignment_id>/hours", methods=["POST"])
@require_roles("volunteer")
def log_assignment_hours(assignment_id):
    volunteer, error = get_current_volunteer_profile()
    if error:
        return error

    assignment = db.session.get(VolunteerAssignment, assignment_id)
    if not assignment:
        return jsonify({"error": "Assignment not found"}), 404
    if assignment.volunteer_id != volunteer.id:
        return jsonify({"error": "Forbidden: assignment does not belong to you"}), 403

    data = request.get_json() or {}
    hours, error_response, status_code = parse_non_negative_int(data.get("hours"), "hours")
    if error_response:
        return error_response, status_code
    if hours == 0:
        return jsonify({"error": "Hours must be greater than 0"}), 400

    assignment.hours_logged += hours
    volunteer.hours_logged += hours
    if assignment.status == "Assigned":
        assignment.status = "In Progress"

    log_activity(
        action="Hours Logged",
        details=f"{volunteer.name} logged {hours} hour(s)",
        actor=g.current_user,
        disaster_id=assignment.disaster_id,
        volunteer_id=volunteer.id,
    )
    db.session.commit()
    return jsonify({"message": "Hours logged successfully", "assignment": assignment.to_dict()}), 200


@volunteer_bp.route("/assignments/<int:assignment_id>/complete", methods=["POST"])
@require_roles("volunteer")
def complete_assignment(assignment_id):
    volunteer, error = get_current_volunteer_profile()
    if error:
        return error

    assignment = db.session.get(VolunteerAssignment, assignment_id)
    if not assignment:
        return jsonify({"error": "Assignment not found"}), 404
    if assignment.volunteer_id != volunteer.id:
        return jsonify({"error": "Forbidden: assignment does not belong to you"}), 403

    assignment.status = "Completed"
    assignment.completed_at = utcnow()

    log_activity(
        action="Assignment Completed",
        details=f"{volunteer.name} completed assigned task",
        actor=g.current_user,
        disaster_id=assignment.disaster_id,
        volunteer_id=volunteer.id,
    )
    db.session.commit()
    return jsonify({"message": "Assignment marked as completed", "assignment": assignment.to_dict()}), 200
