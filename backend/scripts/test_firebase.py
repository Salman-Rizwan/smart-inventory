import firebase_admin
from firebase_admin import auth, credentials, firestore

cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
print("Project:", cred.project_id)

db = firestore.client()
ref = db.collection("scans").document()
ref.set({"spark_plug": 3, "petrol_filter": 1, "scannedAt": firestore.SERVER_TIMESTAMP})
data = ref.get().to_dict()
print("Wrote and read back scans/" + ref.id + ":", data)

users = list(auth.list_users().iterate_all())
print(f"Auth users ({len(users)}):", [u.email for u in users])
