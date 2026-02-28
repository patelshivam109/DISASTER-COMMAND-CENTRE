from flask import Blueprint, request, jsonify
from models import db, Volunteer, Disaster
from routes.access_control import require_roles

volunteer_bp = Blueprint("volunteer_bp", __name__)

# ----------------- ADD VOLUNTEER -----------------
@volunteer_bp.route("/volunteers", methods=["POST"])
@require_roles("admin")
def add_volunteer():
    data = request.get_json() or {}

    required = ["name", "phone"]
    if not data or not all(key in data for key in required):
        return jsonify({"error": "Missing required fields"}), 400
    
    disaster_id = data.get("disaster_id")

    # If no valid disaster_id is provided, attach to a default "General" disaster
    if not disaster_id:
        disaster = Disaster.query.filter_by(type="General", location="Unassigned").first()
        if not disaster:
            disaster = Disaster(
                type="General",
                location="Unassigned",
                severity="Low",
                date=None,
            )
            db.session.add(disaster)
            db.session.commit()
        disaster_id = disaster.id
    else:
        disaster = Disaster.query.get(disaster_id)
        if not disaster:
            return jsonify({"error": "Disaster not found"}), 404

    volunteer = Volunteer(
        name=data["name"],
        phone=data["phone"],
        skills=data.get("skills"),
        availability=data.get("availability", "Available"),
        hours_logged=data.get("hours_logged", 0),
        disaster_id=disaster_id,
    )

    db.session.add(volunteer)
    db.session.commit()

    return jsonify({"message": "Volunteer added successfully", "volunteer": volunteer.to_dict()}), 201


# ----------------- GET VOLUNTEERS BY DISASTER -----------------
@volunteer_bp.route("/disasters/<int:disaster_id>/volunteers", methods=["GET"])
def get_volunteers_by_disaster(disaster_id):
    volunteers = Volunteer.query.filter_by(disaster_id=disaster_id).all()
    return jsonify([v.to_dict() for v in volunteers]), 200


# ----------------- GET ALL VOLUNTEERS -----------------
@volunteer_bp.route("/volunteers", methods=["GET"])
def get_all_volunteers():
    volunteers = Volunteer.query.all()
    return jsonify([v.to_dict() for v in volunteers]), 200


# ----------------- UPDATE VOLUNTEER (ADMIN ONLY) -----------------
@volunteer_bp.route("/volunteers/<int:volunteer_id>", methods=["PATCH"])
@require_roles("admin")
def update_volunteer(volunteer_id):
    volunteer = db.session.get(Volunteer, volunteer_id)
    if not volunteer:
        return jsonify({"error": "Volunteer not found"}), 404

    data = request.get_json() or {}

    if "disaster_id" in data:
        disaster = db.session.get(Disaster, data["disaster_id"])
        if not disaster:
            return jsonify({"error": "Disaster not found"}), 404
        volunteer.disaster_id = data["disaster_id"]

    editable_fields = {"name", "phone", "skills", "availability", "hours_logged"}
    updated = False

    for field in editable_fields:
        if field in data:
            setattr(volunteer, field, data[field])
            updated = True

    if "disaster_id" in data:
        updated = True

    if not updated:
        return jsonify({"error": "No valid fields provided for update"}), 400

    db.session.commit()
    return jsonify({"message": "Volunteer updated successfully", "volunteer": volunteer.to_dict()}), 200


# ----------------- DELETE VOLUNTEER (ADMIN ONLY) -----------------
@volunteer_bp.route("/volunteers/<int:volunteer_id>", methods=["DELETE"])
@require_roles("admin")
def delete_volunteer(volunteer_id):
    volunteer = db.session.get(Volunteer, volunteer_id)
    if not volunteer:
        return jsonify({"error": "Volunteer not found"}), 404

    db.session.delete(volunteer)
    db.session.commit()
    return jsonify({"message": "Volunteer removed successfully"}), 200
