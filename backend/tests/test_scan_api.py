from tests.conftest import FakeCamera, FakeRepository


def test_health(make_client):
    client, _ = make_client()
    assert client.get("/health").json() == "ok"


def test_scan_returns_counts_and_saves(make_client):
    client, repo = make_client()
    res = client.post("/scan")
    assert res.status_code == 200
    assert res.json() == {"counts": {"spark_plug": 3, "petrol_filter": 1}, "inferenceMs": 412}
    assert repo.saved == [({"spark_plug": 3, "petrol_filter": 1}, 412)]


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
