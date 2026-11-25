import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app

LOCAL = "http://localhost:5173"
HOSTED = ["https://smart-inventory-da834.web.app", "https://smart-inventory-da834.firebaseapp.com"]


def preflight(client, origin, path="/scan", method="POST"):
    """The OPTIONS request a browser sends before a cross-origin call with an Authorization header."""
    return client.options(
        path,
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": "authorization",
        },
    )


@pytest.fixture
def client():
    return TestClient(create_app(Settings(_env_file=None)), raise_server_exceptions=False)


def test_default_origins_are_the_local_app_and_both_hosting_addresses():
    assert Settings(_env_file=None).cors_origins == [LOCAL, *HOSTED]


@pytest.mark.parametrize("origin", [LOCAL, *HOSTED])
def test_preflight_from_an_allowed_origin_is_accepted(client, origin):
    res = preflight(client, origin)
    assert res.status_code == 200
    assert res.headers["access-control-allow-origin"] == origin
    assert "authorization" in res.headers["access-control-allow-headers"].lower()


@pytest.mark.parametrize(
    "origin",
    [
        "https://evil.example",
        "http://smart-inventory-da834.web.app",  # plain http is not the hosted site
        "https://smart-inventory-da834.web.app.evil.example",
        "http://localhost:4173",
    ],
)
def test_preflight_from_any_other_origin_is_refused(client, origin):
    res = preflight(client, origin)
    assert res.status_code == 400
    assert "access-control-allow-origin" not in res.headers


def test_the_setting_replaces_the_whole_list(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", '["https://shop.example"]')
    custom = TestClient(create_app(Settings(_env_file=None)), raise_server_exceptions=False)
    assert preflight(custom, "https://shop.example").status_code == 200
    assert preflight(custom, HOSTED[0]).status_code == 400


def test_a_real_call_from_the_hosted_page_gets_the_allow_header(client):
    res = client.get("/health", headers={"Origin": HOSTED[0]})
    assert res.status_code == 200
    assert res.headers["access-control-allow-origin"] == HOSTED[0]
