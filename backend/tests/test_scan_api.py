import pytest

from app.core.exceptions import ForbiddenError
from app.services.role_checker import RoleChecker
from tests.conftest import FakeCamera, FakeRepository, FakeUsers


def test_health(make_client):
    client, _ = make_client()
    assert client.get("/health").json() == "ok"


def test_scan_returns_counts_and_saves(make_client):
    client, repo = make_client()
    res = client.post("/scan")
    assert res.status_code == 200
    body = res.json()
    assert body["counts"] == {"spark_plug": 3, "petrol_filter": 1}
    assert body["inferenceMs"] == 412
    assert [(r.counts, r.inference_ms, r.trigger) for r in repo.saved] == [
        ({"spark_plug": 3, "petrol_filter": 1}, 412, "manual")
    ]


def test_scan_requires_authentication(make_client):
    client, repo = make_client(authenticated=False)
    res = client.post("/scan")
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "unauthorized"
    assert repo.saved == []


def test_scan_rejects_bad_token(make_client):
    client, _ = make_client(authenticated=False)
    res = client.post("/scan", headers={"Authorization": "Bearer not-a-real-token"})
    assert res.status_code == 401


def test_camera_failure_is_503_with_error_envelope(make_client):
    client, repo = make_client(camera=FakeCamera(fail=True))
    res = client.post("/scan")
    assert res.status_code == 503
    assert res.json()["error"]["code"] == "camera_unavailable"
    assert repo.saved == []


def test_storage_failure_is_502(make_client):
    client, _ = make_client(repository=FakeRepository(fail=True))
    res = client.post("/scan")
    assert res.status_code == 502
    assert res.json()["error"]["code"] == "storage_failed"


def test_snapshot_404_before_first_scan_then_served(make_client):
    client, _ = make_client()
    assert client.get("/snapshot/latest.jpg").status_code == 404
    client.post("/scan")
    res = client.get("/snapshot/latest.jpg")
    assert res.status_code == 200
    assert res.headers["content-type"] == "image/jpeg"


def test_unknown_route_and_method(make_client):
    client, _ = make_client()
    assert client.get("/nope").status_code == 404
    assert client.get("/scan").status_code == 405


def test_request_id_header(make_client):
    client, _ = make_client()
    assert client.get("/health", headers={"X-Request-ID": "abc"}).headers["X-Request-ID"] == "abc"
    assert client.get("/health").headers["X-Request-ID"]


def test_scan_compares_with_pos_and_saves_statuses(make_client):
    client, repo = make_client(
        repository=FakeRepository(pos_counts={"spark_plug": 2, "petrol_filter": 1}),
    )
    body = client.post("/scan").json()
    assert body["products"]["spark_plug"] == {"visual": 3, "pos": 2, "status": "Mismatch"}
    assert body["products"]["petrol_filter"] == {"visual": 1, "pos": 1, "status": "Matched"}
    assert repo.statuses == [{"spark_plug": "Mismatch", "petrol_filter": "Matched"}]


def test_part_without_a_pos_record_is_skipped(make_client):
    client, repo = make_client(repository=FakeRepository(pos_counts={"spark_plug": 3}))
    body = client.post("/scan").json()
    assert list(body["products"]) == ["spark_plug"]
    assert repo.statuses == [{"spark_plug": "Matched"}]


def test_reconciliation_failure_does_not_lose_the_scan(make_client):
    client, repo = make_client(repository=FakeRepository(products_fail=True))
    res = client.post("/scan")
    assert res.status_code == 200
    assert res.json()["products"] == {}
    assert len(repo.saved) == 1


def test_scan_opens_an_alert_for_a_mismatch(make_client):
    client, repo = make_client(repository=FakeRepository(pos_counts={"spark_plug": 2, "petrol_filter": 1}))
    assert client.post("/scan").status_code == 200
    assert [(a["product"], a["state"]) for a in repo.alerts] == [("spark_plug", "Open")]


def test_scan_raises_an_order_once_a_part_stays_low(make_client):
    from tests.conftest import FakeDetector

    client, repo = make_client(
        repository=FakeRepository(reorder_level=2, reorder_qty=10),
        detector=FakeDetector({"spark_plug": 1, "petrol_filter": 5}),
    )
    client.post("/scan")
    assert repo.orders == []
    client.post("/scan")
    assert [(o["product"], o["qty"]) for o in repo.orders] == [("spark_plug", 10)]


def test_scan_now_in_the_dark_returns_a_typed_422_with_a_next_step(make_client):
    from app.services.scan_service import ScanPolicy
    from tests.conftest import FakeCamera

    client, repo = make_client(camera=FakeCamera(brightness=5), policy=ScanPolicy(min_frame_brightness=40))
    res = client.post("/scan")
    assert res.status_code == 422
    assert res.json() == {
        "error": {
            "code": "frame_too_dark",
            "message": "Too dark to count the parts. Turn on the shelf light, then scan again.",
        }
    }
    assert repo.saved == []


# --- M10: the camera and the shelf photo are the shopkeeper's ---


@pytest.mark.parametrize("role", ["dealer", None, "admin"])
def test_only_the_shopkeeper_can_scan_or_see_the_shelf(make_client, role):
    # a dealer, a user with no profile and an unknown role all hold valid tokens, and all are refused
    client, repo = make_client(role=role)
    for res in (client.post("/scan"), client.get("/snapshot/latest.jpg")):
        assert res.status_code == 403
        assert res.json()["error"] == {
            "code": "forbidden",
            "message": ForbiddenError.message,
        }
        assert "Sign in with the shopkeeper account" in ForbiddenError.message
    assert repo.saved == [] and repo.status_writes == []


def test_an_unreadable_profile_is_a_storage_error_not_a_refusal(make_client):
    client, repo = make_client()
    client.app.state.role_checker = RoleChecker(FakeUsers(fail=True))
    res = client.post("/scan")
    assert res.status_code == 502 and res.json()["error"]["code"] == "storage_failed"
    assert repo.saved == []


def test_a_missing_token_is_still_401_before_any_role_lookup(make_client):
    client, _ = make_client(authenticated=False)
    users = FakeUsers({"test-user": "shopkeeper"})
    client.app.state.role_checker = RoleChecker(users)
    assert client.get("/snapshot/latest.jpg").status_code == 401
    assert users.reads == 0
