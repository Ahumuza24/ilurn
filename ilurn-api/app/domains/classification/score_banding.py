def get_score_band(raw_score: int) -> str:
    if raw_score < 20:
        return "Emerging"
    if raw_score < 40:
        return "Developing"
    return "Proficient"
