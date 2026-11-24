
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.live_detector import LiveVehicleTracker
import base64
import cv2
import numpy as np

router = APIRouter()


@router.websocket("/ws/live")
async def live_camera(websocket: WebSocket):
    await websocket.accept()

    try:
        tracker = LiveVehicleTracker()

        while True:
            message = await websocket.receive_json()
            frame_data = message.get("frame")

            if not frame_data:
                await websocket.send_json({
                    "error": "No camera frame received"
                })
                continue

            if "," in frame_data:
                frame_data = frame_data.split(",", 1)[1]

            image_bytes = base64.b64decode(frame_data)
            image_array = np.frombuffer(image_bytes, dtype=np.uint8)
            frame = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

            if frame is None:
                await websocket.send_json({
                    "error": "Invalid camera frame"
                })
                continue

            # Keep processing responsive on slower computers.
            height, width = frame.shape[:2]
            if width > 640:
                new_height = int(height * 640 / width)
                frame = cv2.resize(frame, (640, new_height))

            annotated_image, statistics = tracker.process_frame(frame)

            await websocket.send_json({
                "image": annotated_image,
                "statistics": statistics
            })

    except WebSocketDisconnect:
        print("Live camera disconnected")

    except Exception as error:
        print("Live camera error:", error)
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
