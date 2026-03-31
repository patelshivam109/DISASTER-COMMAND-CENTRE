from flask import Blueprint, g, jsonify, request

try:
    from models import Disaster, Resource, ResourceAllocation, db
    from routes.access_control import require_auth, require_roles
    from services.workflow_service import ensure_general_disaster, log_activity
except ModuleNotFoundError:
    from ..models import Disaster, Resource, ResourceAllocation, db
    from .access_control import require_auth, require_roles
    from ..services.workflow_service import ensure_general_disaster, log_activity

resource_bp = Blueprint("resource_bp", __name__)


def parse_positive_int(value, field_name):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None, jsonify({"error": f"{field_name} must be a number"}), 400
    if parsed < 0:
        return None, jsonify({"error": f"{field_name} cannot be negative"}), 400
    return parsed, None, None


@resource_bp.route("/resources", methods=["POST"])
@require_roles("admin")
def add_resource():
    data = request.get_json() or {}

    if not data.get("name"):
        return jsonify({"error": "Resource name is required"}), 400

    quantity, error_response, status_code = parse_positive_int(data.get("quantity"), "quantity")
    if error_response:
        return error_response, status_code

    low_threshold, error_response, status_code = parse_positive_int(
        data.get("low_threshold", 50), "low_threshold"
    )
    if error_response:
        return error_response, status_code

    critical_threshold, error_response, status_code = parse_positive_int(
        data.get("critical_threshold", 20), "critical_threshold"
    )
    if error_response:
        return error_response, status_code

    disaster_id = data.get("disaster_id")
    if disaster_id:
        disaster = db.session.get(Disaster, disaster_id)
        if not disaster:
            return jsonify({"error": "Disaster not found"}), 404
    else:
        disaster = ensure_general_disaster()

    resource = Resource(
        name=data["name"],
        category=data.get("category", "General"),
        quantity=quantity,
        location=data.get("location"),
        warehouse_info=data.get("warehouse_info"),
        status=data.get("status", "Available"),
        low_threshold=low_threshold,
        critical_threshold=critical_threshold,
        disaster_id=disaster.id,
    )

    db.session.add(resource)
    db.session.flush()
    log_activity(
        action="Resource Added",
        details=f"{resource.name} stock: {resource.quantity}",
        actor=g.current_user,
        resource_id=resource.id,
    )
    db.session.commit()

    return jsonify({"message": "Resource added successfully", "resource": resource.to_dict()}), 201


@resource_bp.route("/resources", methods=["GET"])
@require_auth
def get_all_resources():
    resources = Resource.query.order_by(Resource.id.desc()).all()
    return jsonify([resource.to_dict() for resource in resources]), 200


@resource_bp.route("/resources/<int:resource_id>", methods=["PATCH"])
@require_roles("admin")
def update_resource(resource_id):
    resource = db.session.get(Resource, resource_id)
    if not resource:
        return jsonify({"error": "Resource not found"}), 404

    data = request.get_json() or {}
    editable_fields = {
        "name",
        "category",
        "location",
        "warehouse_info",
        "status",
    }
    updated = False

    if "quantity" in data:
        parsed, error_response, status_code = parse_positive_int(data["quantity"], "quantity")
        if error_response:
            return error_response, status_code
        resource.quantity = parsed
        updated = True

    if "low_threshold" in data:
        parsed, error_response, status_code = parse_positive_int(data["low_threshold"], "low_threshold")
        if error_response:
            return error_response, status_code
        resource.low_threshold = parsed
        updated = True

    if "critical_threshold" in data:
        parsed, error_response, status_code = parse_positive_int(
            data["critical_threshold"], "critical_threshold"
        )
        if error_response:
            return error_response, status_code
        resource.critical_threshold = parsed
        updated = True

    if "disaster_id" in data:
        disaster = db.session.get(Disaster, data["disaster_id"])
        if not disaster:
            return jsonify({"error": "Disaster not found"}), 404
        resource.disaster_id = disaster.id
        updated = True

    for field in editable_fields:
        if field in data:
            setattr(resource, field, data[field])
            updated = True

    if not updated:
        return jsonify({"error": "No valid fields provided for update"}), 400

    log_activity(
        action="Resource Updated",
        details=f"{resource.name} stock: {resource.quantity}",
        actor=g.current_user,
        resource_id=resource.id,
    )
    db.session.commit()
    return jsonify({"message": "Resource updated successfully", "resource": resource.to_dict()}), 200


@resource_bp.route("/resources/<int:resource_id>/allocate", methods=["POST"])
@require_roles("admin")
def allocate_resource(resource_id):
    resource = db.session.get(Resource, resource_id)
    if not resource:
        return jsonify({"error": "Resource not found"}), 404

    data = request.get_json() or {}
    disaster = db.session.get(Disaster, data.get("disaster_id"))
    if not disaster:
        return jsonify({"error": "Disaster not found"}), 404
    if disaster.status == "Closed":
        return jsonify({"error": "Cannot allocate resources to a closed disaster"}), 400

    quantity, error_response, status_code = parse_positive_int(data.get("quantity"), "quantity")
    if error_response:
        return error_response, status_code
    if quantity == 0:
        return jsonify({"error": "Allocation quantity must be greater than 0"}), 400
    if quantity > resource.quantity:
        return jsonify({"error": "Insufficient stock for allocation"}), 400

    resource.quantity -= quantity
    allocation = ResourceAllocation(
        resource_id=resource.id,
        disaster_id=disaster.id,
        quantity=quantity,
        notes=(data.get("notes") or "").strip() or None,
        allocated_by=g.current_user.username,
    )
    db.session.add(allocation)
    log_activity(
        action="Resource Allocated",
        details=f"{quantity} of {resource.name} allocated to {disaster.type} - {disaster.location}",
        actor=g.current_user,
        disaster_id=disaster.id,
        resource_id=resource.id,
    )

    exhaustion_alert = None
    if resource.quantity <= 0:
        exhaustion_alert = f"{resource.name} stock is exhausted."
        log_activity(
            action="Resource Exhausted",
            details=exhaustion_alert,
            actor=g.current_user,
            resource_id=resource.id,
            disaster_id=disaster.id,
        )
    db.session.commit()

    return (
        jsonify(
            {
                "message": "Resource allocated successfully",
                "resource": resource.to_dict(),
                "allocation": allocation.to_dict(),
                "alert": exhaustion_alert,
            }
        ),
        201,
    )


@resource_bp.route("/resources/allocations", methods=["GET"])
@require_auth
def get_resource_allocations():
    disaster_id = request.args.get("disaster_id", type=int)
    resource_id = request.args.get("resource_id", type=int)

    query = ResourceAllocation.query
    if disaster_id:
        query = query.filter_by(disaster_id=disaster_id)
    if resource_id:
        query = query.filter_by(resource_id=resource_id)

    allocations = query.order_by(ResourceAllocation.created_at.desc()).all()
    return jsonify([allocation.to_dict() for allocation in allocations]), 200


@resource_bp.route("/disasters/<int:disaster_id>/resources", methods=["GET"])
@require_auth
def get_resources_by_disaster(disaster_id):
    allocations = (
        ResourceAllocation.query.filter_by(disaster_id=disaster_id)
        .order_by(ResourceAllocation.created_at.desc())
        .all()
    )
    return jsonify([allocation.to_dict() for allocation in allocations]), 200
