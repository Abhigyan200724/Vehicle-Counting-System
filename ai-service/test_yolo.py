from ultralytics import YOLO

print("Loading YOLO11n model...")

model = YOLO("yolo11n.pt")

print("YOLO11n loaded successfully!")
print("Available classes:", model.names)

results = model.predict(
    source="https://ultralytics.com/images/bus.jpg",
    conf=0.35,
    classes=[2, 3, 5, 7],
    save=True
)

print("Vehicle detection completed!")
print("Output saved in runs/detect/")
