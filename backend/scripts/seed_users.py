"""Create or update the users/{uid} profile documents for the test accounts.

Run from backend/:  python -m scripts.seed_users
Safe to re-run. Edit NAMES or ROLES below, or edit the documents in the Firebase console.
"""

from firebase_admin import auth, firestore

from app.core.config import get_settings
from app.firebase_db import init_firebase

USERS = [
    {"email": "shopkeeper@smartinventory.com", "name": "Test Shopkeeper", "role": "shopkeeper"},
    {"email": "dealer@smartinventory.com", "name": "Test Dealer", "role": "dealer"},
]


def main() -> None:
    init_firebase(get_settings().firebase_key_path)
    db = firestore.client()
    for user in USERS:
        record = auth.get_user_by_email(user["email"])
        db.collection("users").document(record.uid).set({"name": user["name"], "role": user["role"]})
        print(f"users/{record.uid}: {user['name']} ({user['role']}) <- {user['email']}")


if __name__ == "__main__":
    main()
