import requests, base64, json

BASE = "http://localhost:8000/api/v1"
AUTH = {"Authorization": "Bearer sk_dev_key1"}

# 1. Create session
r = requests.post(f"{BASE}/session/create", headers=AUTH)
session = r.json()
print("Session:", session["session_id"])

# 2. Load test image
with open(r"C:\Users\kevin.vega\face-id-matcher\web\public\assets\academic.jpg", "rb") as f:
    img_b64 = base64.b64encode(f.read()).decode()

# 3. Test passive liveness
r = requests.post(f"{BASE}/liveness", headers=AUTH, json={
    "mode": "passive",
    "image": img_b64,
    "session_id": session["session_id"],
})
print(json.dumps(r.json(), indent=2))
