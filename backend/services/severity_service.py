def calculate_severity(data):
    rainfall = data.get("rainfall", 0)

    if rainfall > 120:
        return "High"
    elif rainfall > 70:
        return "Medium"
    return "Low"
