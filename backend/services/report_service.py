from datetime import datetime, timezone


def _ensure_timezone(value):
    if not value:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _parse_disaster_date(value):
    if not value:
        return None

    text = str(value).strip()
    if not text:
        return None

    try:
        parsed = datetime.fromisoformat(text)
        return _ensure_timezone(parsed)
    except ValueError:
        pass

    for fmt in ("%Y-%m-%d", "%d-%m-%Y"):
        try:
            parsed = datetime.strptime(text, fmt)
            return parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _derive_start_time(disaster):
    candidates = []

    if getattr(disaster, "created_at", None):
        candidates.append(_ensure_timezone(disaster.created_at))

    parsed_date = _parse_disaster_date(disaster.date)
    if parsed_date:
        candidates.append(parsed_date)

    if disaster.resource_allocations:
        for allocation in disaster.resource_allocations:
            if allocation.created_at:
                candidates.append(_ensure_timezone(allocation.created_at))

    if disaster.volunteer_assignments:
        for assignment in disaster.volunteer_assignments:
            if assignment.assigned_at:
                candidates.append(_ensure_timezone(assignment.assigned_at))

    if disaster.progress_updates:
        for update in disaster.progress_updates:
            if update.created_at:
                candidates.append(_ensure_timezone(update.created_at))

    if not candidates:
        return datetime.now(timezone.utc)

    return min(candidates)


def _derive_end_time(disaster):
    if disaster.status == "Closed" and getattr(disaster, "closed_at", None):
        return _ensure_timezone(disaster.closed_at)
    return datetime.now(timezone.utc)


def build_disaster_report_summary(disaster):
    allocations = disaster.resource_allocations or []
    assignments = disaster.volunteer_assignments or []

    total_resources_used = sum(max(allocation.quantity or 0, 0) for allocation in allocations)
    total_volunteers_assigned = len({assignment.volunteer_id for assignment in assignments})
    total_hours_logged = sum(max(assignment.hours_logged or 0, 0) for assignment in assignments)

    start_time = _derive_start_time(disaster)
    end_time = _derive_end_time(disaster)
    if end_time < start_time:
        end_time = start_time

    duration_hours = int((end_time - start_time).total_seconds() // 3600)
    duration_days = round(duration_hours / 24, 2)

    resources_by_name = {}
    for allocation in allocations:
        resource_name = allocation.resource.name if allocation.resource else "Unknown Resource"
        resources_by_name[resource_name] = resources_by_name.get(resource_name, 0) + max(
            allocation.quantity or 0, 0
        )

    return {
        "disaster_id": disaster.id,
        "disaster_label": f"{disaster.type} - {disaster.location}",
        "status": disaster.status,
        "priority": disaster.priority,
        "total_resources_used": total_resources_used,
        "total_volunteers_assigned": total_volunteers_assigned,
        "total_hours_logged": total_hours_logged,
        "duration_hours": duration_hours,
        "duration_days": duration_days,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "resource_usage_breakdown": [
            {"resource_name": name, "quantity_used": quantity}
            for name, quantity in sorted(resources_by_name.items(), key=lambda item: item[0])
        ],
    }


def _escape_pdf_text(value):
    ascii_safe = str(value).encode("latin-1", "replace").decode("latin-1")
    return ascii_safe.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def render_simple_pdf(title, lines):
    content_lines = [title] + lines
    text_commands = ["BT", "/F1 12 Tf", "50 760 Td"]

    for index, line in enumerate(content_lines):
        safe_line = _escape_pdf_text(line)
        if index > 0:
            text_commands.append("0 -18 Td")
        text_commands.append(f"({safe_line}) Tj")

    text_commands.append("ET")
    stream = "\n".join(text_commands).encode("latin-1", "replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length "
        + str(len(stream)).encode("ascii")
        + b" >>\nstream\n"
        + stream
        + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    pdf = b"%PDF-1.4\n"
    offsets = [0]

    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf += f"{index} 0 obj\n".encode("ascii")
        pdf += obj + b"\n"
        pdf += b"endobj\n"

    xref_start = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n".encode("ascii")
    pdf += b"0000000000 65535 f \n"

    for offset in offsets[1:]:
        pdf += f"{offset:010d} 00000 n \n".encode("ascii")

    pdf += f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\n".encode("ascii")
    pdf += f"startxref\n{xref_start}\n%%EOF".encode("ascii")

    return pdf


def build_disaster_report_pdf(disaster):
    summary = build_disaster_report_summary(disaster)
    lines = [
        f"Disaster: {summary['disaster_label']}",
        f"Status: {summary['status']}",
        f"Priority: {summary['priority']}",
        f"Total resources used: {summary['total_resources_used']}",
        f"Total volunteers assigned: {summary['total_volunteers_assigned']}",
        f"Total hours logged: {summary['total_hours_logged']}",
        f"Duration (hours): {summary['duration_hours']}",
        f"Duration (days): {summary['duration_days']}",
        f"Start time: {summary['start_time']}",
        f"End time: {summary['end_time']}",
    ]

    for resource_entry in summary["resource_usage_breakdown"]:
        lines.append(
            f"Resource usage - {resource_entry['resource_name']}: {resource_entry['quantity_used']}"
        )

    return render_simple_pdf("Disaster Summary Report", lines)
