import time
from collections import Counter

import cv2
from ultralytics import YOLO

model = YOLO("models/best.pt")

cam = cv2.VideoCapture(0)
for _ in range(15):  # discard frames while auto-exposure settles
    cam.read()
ok, frame = cam.read()
cam.release()
if not ok:
    raise SystemExit("Webcam not found - check camera permission")

start = time.time()
result = model.predict(frame, conf=0.5, verbose=False)[0]
ms = (time.time() - start) * 1000

counts = Counter(model.names[int(c)] for c in result.boxes.cls)
print("Counts:", dict(counts), f"| inference {ms:.0f} ms")
cv2.imwrite("scripts/test_output.jpg", result.plot())
