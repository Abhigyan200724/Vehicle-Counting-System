
import cv2
from pathlib import Path
from ultralytics import YOLO
from collections import Counter

# COCO vehicle class IDs
VEHICLE_CLASSES = [2, 3, 5, 7]

CONFIDENCE = 0.35
IMAGE_SIZE = 480

# Counting line: 60% down from the top of the video
LINE_POSITION = 0.60


def get_density(vehicle_count):
    """
    Basic traffic density estimate based on
    the average number of visible vehicles.
    Thresholds can be calibrated later.
    """
    if vehicle_count <= 4:
        return "Low"
    elif vehicle_count <= 10:
        return "Medium"
    else:
        return "High"


def process_video(input_path, output_path):

    # Create a fresh model/tracker for each video.
    # This prevents tracking IDs from one upload
    # carrying over into another upload.
    detector = YOLO("yolo11n.pt")

    cap = cv2.VideoCapture(str(input_path))

    if not cap.isOpened():
        raise ValueError("Unable to open video file")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    fps = cap.get(cv2.CAP_PROP_FPS)

    if fps <= 0:
        fps = 25

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    line_y = int(height * LINE_POSITION)

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")

    writer = cv2.VideoWriter(
        str(output_path),
        fourcc,
        fps,
        (width, height)
    )

    if not writer.isOpened():
        cap.release()
        raise ValueError("Unable to create output video")

    # Tracking and counting data
    counted_ids = set()
    all_track_ids = set()

    previous_positions = {}

    class_counts = Counter()
    direction_counts = Counter()

    frame_count = 0
    visible_vehicle_total = 0
    peak_visible_vehicles = 0

    try:

        while True:

            success, frame = cap.read()

            if not success:
                break

            # YOLO + ByteTrack
            results = detector.track(
                source=frame,
                persist=True,
                tracker="bytetrack.yaml",
                conf=CONFIDENCE,
                classes=VEHICLE_CLASSES,
                imgsz=IMAGE_SIZE,
                device="cpu",
                verbose=False
            )

            result = results[0]

            annotated_frame = result.plot()

            current_visible = 0

            if result.boxes is not None and result.boxes.id is not None:

                boxes = result.boxes

                track_ids = boxes.id.int().cpu().tolist()
                class_ids = boxes.cls.int().cpu().tolist()
                coordinates = boxes.xyxy.cpu().tolist()

                current_visible = len(track_ids)

                for track_id, class_id, box in zip(
                    track_ids,
                    class_ids,
                    coordinates
                ):

                    class_name = detector.names[class_id]

                    # Bounding box centre
                    x1, y1, x2, y2 = box

                    center_x = int((x1 + x2) / 2)
                    center_y = int((y1 + y2) / 2)

                    all_track_ids.add(track_id)

                    # Store previous position
                    previous_y = previous_positions.get(track_id)

                    # Count only when the vehicle crosses
                    # the virtual horizontal line.
                    if (
                        previous_y is not None
                        and track_id not in counted_ids
                    ):

                        direction = None

                        # Vehicle moving down
                        if previous_y < line_y <= center_y:
                            direction = "down"

                        # Vehicle moving up
                        elif previous_y > line_y >= center_y:
                            direction = "up"

                        if direction is not None:

                            counted_ids.add(track_id)

                            class_counts[class_name] += 1
                            direction_counts[direction] += 1

                    previous_positions[track_id] = center_y

                    # Show ID and class near the vehicle
                    cv2.putText(
                        annotated_frame,
                        f"ID: {track_id} {class_name}",
                        (center_x, max(center_y - 10, 20)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.5,
                        (0, 255, 255),
                        2
                    )

            # Current frame statistics
            visible_vehicle_total += current_visible

            peak_visible_vehicles = max(
                peak_visible_vehicles,
                current_visible
            )

            average_visible = (
                visible_vehicle_total / (frame_count + 1)
            )

            density = get_density(average_visible)

            # Draw counting line
            cv2.line(
                annotated_frame,
                (0, line_y),
                (width, line_y),
                (0, 0, 255),
                3
            )

            cv2.putText(
                annotated_frame,
                "COUNTING LINE",
                (20, max(line_y - 12, 25)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 0, 255),
                2
            )

            # Dashboard overlay
            cv2.rectangle(
                annotated_frame,
                (10, 10),
                (390, 155),
                (0, 0, 0),
                -1
            )

            cv2.putText(
                annotated_frame,
                f"Unique Count: {len(counted_ids)}",
                (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2
            )

            cv2.putText(
                annotated_frame,
                f"Visible Now: {current_visible}",
                (20, 75),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (255, 255, 255),
                2
            )

            cv2.putText(
                annotated_frame,
                f"Traffic Density: {density}",
                (20, 110),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 255),
                2
            )

            cv2.putText(
                annotated_frame,
                f"Down: {direction_counts['down']}  Up: {direction_counts['up']}",
                (20, 140),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (255, 255, 255),
                2
            )

            writer.write(annotated_frame)

            frame_count += 1

            if frame_count % 50 == 0:
                print(
                    f"Processed {frame_count}/{total_frames} frames | "
                    f"Counted: {len(counted_ids)}"
                )

    finally:
        cap.release()
        writer.release()

    average_visible = (
        visible_vehicle_total / frame_count
        if frame_count > 0 else 0
    )

    return {
        "frames_processed": frame_count,
        "total_frames": total_frames,

        "total_tracks_observed": len(all_track_ids),

        "total_unique_vehicles": len(counted_ids),

        "vehicles_by_class": dict(class_counts),

        "direction_counts": {
            "down": direction_counts["down"],
            "up": direction_counts["up"]
        },

        "average_visible_vehicles": round(average_visible, 2),

        "peak_visible_vehicles": peak_visible_vehicles,

        "traffic_density": get_density(average_visible),

        "video_fps": round(fps, 2),

        "resolution": f"{width}x{height}",

        "counting_line_position": LINE_POSITION
    }
