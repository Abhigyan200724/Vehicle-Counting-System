
import base64
import cv2
import numpy as np
from ultralytics import YOLO


class LiveVehicleTracker:
    def __init__(self):
        self.model = YOLO("yolo11n.pt")

        self.counted_ids = set()
        self.previous_positions = {}
        self.class_counts = {
            "car": 0,
            "motorcycle": 0,
            "bus": 0,
            "truck": 0
        }
        self.direction_counts = {"up": 0, "down": 0}

        self.frames_processed = 0
        self.visible_total = 0
        self.peak_visible = 0

        self.class_names = {
            2: "car",
            3: "motorcycle",
            5: "bus",
            7: "truck"
        }

    def process_frame(self, frame):
        height, width = frame.shape[:2]
        line_y = int(height * 0.60)

        results = self.model.track(
            source=frame,
            persist=True,
            tracker="bytetrack.yaml",
            conf=0.35,
            classes=[2, 3, 5, 7],
            imgsz=480,
            device="cpu",
            verbose=False
        )

        result = results[0]
        visible = 0

        if result.boxes is not None and result.boxes.id is not None:
            boxes = result.boxes.xyxy.cpu().numpy()
            ids = result.boxes.id.int().cpu().tolist()
            classes = result.boxes.cls.int().cpu().tolist()

            visible = len(ids)

            for box, track_id, class_id in zip(boxes, ids, classes):
                x1, y1, x2, y2 = map(int, box)
                center_y = (y1 + y2) // 2

                previous_y = self.previous_positions.get(track_id)

                if track_id not in self.counted_ids and previous_y is not None:
                    if previous_y < line_y <= center_y:
                        self.counted_ids.add(track_id)
                        self.direction_counts["down"] += 1
                        name = self.class_names.get(class_id)
                        if name:
                            self.class_counts[name] += 1

                    elif previous_y > line_y >= center_y:
                        self.counted_ids.add(track_id)
                        self.direction_counts["up"] += 1
                        name = self.class_names.get(class_id)
                        if name:
                            self.class_counts[name] += 1

                self.previous_positions[track_id] = center_y

        self.frames_processed += 1
        self.visible_total += visible
        self.peak_visible = max(self.peak_visible, visible)

        average_visible = self.visible_total / self.frames_processed

        if average_visible <= 4:
            density = "Low"
        elif average_visible <= 10:
            density = "Medium"
        else:
            density = "High"

        annotated = result.plot()
        cv2.line(
            annotated,
            (0, line_y),
            (width, line_y),
            (0, 255, 255),
            2
        )

        success, encoded = cv2.imencode(
            ".jpg",
            annotated,
            [cv2.IMWRITE_JPEG_QUALITY, 60]
        )

        if not success:
            raise ValueError("Could not encode processed camera frame")

        image_base64 = base64.b64encode(
            encoded.tobytes()
        ).decode("utf-8")

        statistics = {
            "frames_processed": self.frames_processed,
            "total_unique_vehicles": len(self.counted_ids),
            "vehicles_by_class": self.class_counts,
            "direction_counts": self.direction_counts,
            "average_visible_vehicles": round(average_visible, 2),
            "peak_visible_vehicles": self.peak_visible,
            "traffic_density": density,
            "visible_vehicles": visible
        }

        return image_base64, statistics
