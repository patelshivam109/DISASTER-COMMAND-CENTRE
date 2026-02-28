from flask import Blueprint, request, jsonify
from models import db, Disaster
from routes.access_control import require_roles

disaster_bp = Blueprint("disaster_bp", __name__)
ALLOWED_PRIORITIES = {"Critical", "High", "Moderate"}
ALLOWED_STATUSES = {"Active", "Recovering", "Closed"}

# ----------------- ADD DISASTER -----------------
@disaster_bp.route("/disasters", methods=["POST"])
@require_roles("admin")
def add_disaster():
    data = request.get_json() or {}

    if not data or "type" not in data or "location" not in data:
        return jsonify({"error": "Type and location are required"}), 400

    priority = data.get("priority", "Moderate")
    if priority not in ALLOWED_PRIORITIES:
        return jsonify({"error": "Invalid priority value"}), 400

    status = data.get("status", "Active")
    if status not in ALLOWED_STATUSES:
        return jsonify({"error": "Invalid status value"}), 400

    new_disaster = Disaster(
        type=data["type"],
        location=data["location"],
        severity=data.get("severity"),
        priority=priority,
        status=status,
        response_team=data.get("response_team"),
        date=data.get("date")
    )

    db.session.add(new_disaster)
    db.session.commit()

    return jsonify({"message": "Disaster added successfully", "disaster": new_disaster.to_dict()}), 201


# ----------------- GET ALL DISASTERS -----------------
@disaster_bp.route("/disasters", methods=["GET"])
def get_disasters():
    disasters = Disaster.query.all()
    return jsonify([d.to_dict() for d in disasters]), 200


# ----------------- UPDATE DISASTER (ADMIN ONLY) -----------------
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
    }

    if "priority" in data and data["priority"] not in ALLOWED_PRIORITIES:
        return jsonify({"error": "Invalid priority value"}), 400

    if "status" in data and data["status"] not in ALLOWED_STATUSES:
        return jsonify({"error": "Invalid status value"}), 400

    updated = False
    for field in editable_fields:
        if field in data:
            setattr(disaster, field, data[field])
            updated = True

    if not updated:
        return jsonify({"error": "No valid fields provided for update"}), 400

    db.session.commit()
    return jsonify({"message": "Disaster updated successfully", "disaster": disaster.to_dict()}), 200


# ----------------- DELETE DISASTER (ADMIN ONLY) -----------------
@disaster_bp.route("/disasters/<int:disaster_id>", methods=["DELETE"])
@require_roles("admin")
def delete_disaster(disaster_id):
    disaster = db.session.get(Disaster, disaster_id)
    if not disaster:
        return jsonify({"error": "Disaster not found"}), 404

    db.session.delete(disaster)
    db.session.commit()

    return jsonify({"message": "Disaster deleted successfully"}), 200
