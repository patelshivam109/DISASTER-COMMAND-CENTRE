from flask import Blueprint, request, jsonify
from models import db, Resource, Disaster
from routes.access_control import require_roles

resource_bp = Blueprint("resource_bp", __name__)

# ----------------- ADD RESOURCE -----------------
@resource_bp.route("/resources", methods=["POST"])
@require_roles("admin")
def add_resource():
    data = request.get_json() or {}

    required = ["name", "quantity", "disaster_id"]
    if not data or not all(key in data for key in required):
        return jsonify({"error": "Missing required fields"}), 400

    disaster = db.session.get(Disaster, data["disaster_id"])
    if not disaster:
        return jsonify({"error": "Disaster not found"}), 404

    resource = Resource(
        name=data["name"],
        quantity=data["quantity"],
        location=data.get("location"),
        status=data.get("status", "Available"),
        disaster_id=data["disaster_id"]
    )

    db.session.add(resource)
    db.session.commit()

    return jsonify({"message": "Resource added successfully", "resource": resource.to_dict()}), 201


# ----------------- GET RESOURCES BY DISASTER -----------------
@resource_bp.route("/disasters/<int:disaster_id>/resources", methods=["GET"])
def get_resources_by_disaster(disaster_id):
    resources = Resource.query.filter_by(disaster_id=disaster_id).all()
    return jsonify([r.to_dict() for r in resources]), 200


# ----------------- GET ALL RESOURCES -----------------
@resource_bp.route("/resources", methods=["GET"])
def get_all_resources():
    resources = Resource.query.all()
    return jsonify([r.to_dict() for r in resources]), 200


# ----------------- UPDATE RESOURCE (ADMIN ONLY) -----------------
@resource_bp.route("/resources/<int:resource_id>", methods=["PATCH"])
@require_roles("admin")
def update_resource(resource_id):
    resource = db.session.get(Resource, resource_id)
    if not resource:
        return jsonify({"error": "Resource not found"}), 404

    data = request.get_json() or {}

    if "disaster_id" in data:
        disaster = db.session.get(Disaster, data["disaster_id"])
        if not disaster:
            return jsonify({"error": "Disaster not found"}), 404
        resource.disaster_id = data["disaster_id"]

    editable_fields = {"name", "quantity", "location", "status"}
    updated = False

    for field in editable_fields:
        if field in data:
            setattr(resource, field, data[field])
            updated = True

    if "disaster_id" in data:
        updated = True

    if not updated:
        return jsonify({"error": "No valid fields provided for update"}), 400

    db.session.commit()
    return jsonify({"message": "Resource updated successfully", "resource": resource.to_dict()}), 200
