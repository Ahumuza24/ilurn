from fastapi.testclient import TestClient


def signup_learner(client: TestClient, email: str = "alex@example.com") -> dict[str, object]:
    response = client.post(
        "/auth/signup",
        json={
            "name": "Alex",
            "email": email,
            "password": "learner-pass-123",
            "role": "LEARNER",
            "dob": "2016-06-10",
            "parent_email": "parent@example.com",
        },
    )
    assert response.status_code == 200
    return response.json()


def signup_admin(client: TestClient, email: str = "admin@example.com") -> dict[str, object]:
    response = client.post(
        "/auth/signup",
        json={
            "name": "Admin",
            "email": email,
            "password": "admin-pass-123",
            "role": "ADMIN",
            "admin_code": "test-admin-code",
        },
    )
    assert response.status_code == 200
    return response.json()


def start_session(client: TestClient, user_id: int, assessment_type: str) -> int:
    response = client.post("/sessions/start", json={"user_id": user_id, "assessment_type": assessment_type})
    assert response.status_code == 200
    return response.json()["session_id"]


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_signup_login_and_me_returns_role_redirect(client: TestClient) -> None:
    signup = signup_learner(client)

    assert signup["user"]["role"] == "LEARNER"
    assert signup["redirect_to"] == "/dashboard/learner"

    login = client.post(
        "/auth/login",
        json={"email": "alex@example.com", "password": "learner-pass-123"},
    )
    assert login.status_code == 200
    assert login.json()["user"]["user_id"] == signup["user"]["user_id"]

    me = client.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["user"]["role"] == "LEARNER"


def test_register_session_submit_end_and_progress(client: TestClient) -> None:
    auth = signup_learner(client)
    user = auth["user"]
    assert user["age_group"] == "PUPIL"

    session_id = start_session(client, int(user["user_id"]), "word-reading")
    responses = [
        {"question_id": "letter_0", "response": "A", "is_correct": True, "response_time_ms": 500},
        {"question_id": "word_0", "response": "cat", "is_correct": True, "response_time_ms": 700},
    ]
    submit = client.post(
        "/assessments/word-reading/submit",
        json={"user_id": user["user_id"], "session_id": session_id, "responses": responses},
    )
    assert submit.status_code == 200
    assert submit.json()["raw_score"] == 2

    ended = client.patch(f"/sessions/{session_id}/end")
    assert ended.status_code == 200
    assert ended.json()["duration_ms"] >= 0

    progress = client.get(f"/users/{user['user_id']}/progress")
    assert progress.status_code == 200
    assert progress.json()["progress"][0]["score_band"] == "Emerging"
    assert "raw_score" not in progress.json()["progress"][0]


def test_spelling_discontinues_after_10_wrong(client: TestClient) -> None:
    auth = signup_learner(client)
    user = auth["user"]
    session_id = start_session(client, int(user["user_id"]), "spelling")
    responses = [
        {"question_id": f"spell_{index}", "response": "", "is_correct": False, "response_time_ms": 1000}
        for index in range(10)
    ]

    response = client.post(
        "/assessments/spelling/submit",
        json={"user_id": user["user_id"], "session_id": session_id, "responses": responses},
    )

    assert response.status_code == 200
    assert response.json()["discontinued"] is True


def test_admin_students_requires_admin_role(client: TestClient) -> None:
    assert client.get("/admin/students").status_code == 401
    signup_learner(client)
    assert client.get("/admin/students").status_code == 403
    signup_admin(client)
    assert client.get("/admin/students").status_code == 200


def test_admin_csv_export_uses_anonymized_learner_value(client: TestClient) -> None:
    learner = signup_learner(client)
    user = learner["user"]
    signup_admin(client)

    response = client.get("/admin/export?format=csv")

    assert response.status_code == 200
    assert response.text.splitlines()[0] == "Learner,Age Group,Registration ID,Last Assessment Date,Score Band"
    assert "Alex" not in response.text
    assert str(user["registration_id"]) in response.text


def test_admin_can_manage_assessment_items(client: TestClient) -> None:
    assert client.get("/admin/assessment-items").status_code == 401
    signup_admin(client)

    created = client.post(
        "/admin/assessment-items",
        json={
            "assessment_type": "spelling-bee",
            "item_type": "word",
            "text": "planet",
            "sentence": "The planet is round.",
            "difficulty": "medium",
            "sort_order": 999,
            "active": True,
        },
    )
    assert created.status_code == 200
    item = created.json()
    assert item["text"] == "planet"

    updated = client.patch(f"/admin/assessment-items/{item['id']}", json={"text": "orbit", "active": True})
    assert updated.status_code == 200
    assert updated.json()["text"] == "orbit"

    bee_questions = client.get("/assessments/spelling-bee/questions")
    assert bee_questions.status_code == 200
    assert any(question["text"] == "orbit" for question in bee_questions.json()["questions"])

    deleted = client.delete(f"/admin/assessment-items/{item['id']}")
    assert deleted.status_code == 200
    bee_questions_after_delete = client.get("/assessments/spelling-bee/questions")
    assert all(question["text"] != "orbit" for question in bee_questions_after_delete.json()["questions"])
