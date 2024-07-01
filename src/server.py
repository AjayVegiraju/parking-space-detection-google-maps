import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import cv2
import numpy as np
from roboflow import Roboflow
import supervision as sv

app = Flask(__name__)
CORS(app)

# Initialize Roboflow
rf = Roboflow(api_key="rtLyMd4uL7EyKJ8SJEyv")
project = rf.workspace().project("parking_lot-famom")
model = project.version(6).model

def sharpen_image(image):
    kernel = np.array([[0, -1, 0],
                       [-1, 5,-1],
                       [0, -1, 0]])
    return cv2.filter2D(image, -1, kernel)

@app.route('/process-image', methods=['POST'])
def process_image():
    data = request.get_json()
    image_data = data['image'].split(",")[1]
    nparr = np.frombuffer(base64.b64decode(image_data), np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return jsonify({'error': 'Invalid image data'}), 400

    # Sharpen the image
    img = sharpen_image(img)

    # Save the incoming image for debugging
    incoming_image_path = "incoming_image.png"
    cv2.imwrite(incoming_image_path, img)

    # Get predictions
    result = model.predict(incoming_image_path, confidence=50, overlap=50).json()
    
    # Convert predictions to detections
    detections = sv.Detections.from_inference(result)

    # Annotate the image with markers at the center of bounding boxes
    marker_coordinates = []
    for bbox in detections.xyxy:
        x_min, y_min, x_max, y_max = bbox
        x_center = int((x_min + x_max) / 2)
        y_center = int((y_min + y_max) / 2)
        cv2.drawMarker(img, (x_center, y_center), color=(0, 255, 0), markerType=cv2.MARKER_CROSS, markerSize=20, thickness=2)
        marker_coordinates.append({'x': x_center, 'y': y_center})

    # Save the annotated image
    annotated_image_path = "annotated_image.png"
    cv2.imwrite(annotated_image_path, img)

    return jsonify({
        'annotated_image': 'data:image/png;base64,' + base64.b64encode(open(annotated_image_path, 'rb').read()).decode('utf-8'),
        'incoming_image': 'data:image/png;base64,' + base64.b64encode(open(incoming_image_path, 'rb').read()).decode('utf-8'),
        'marker_coordinates': marker_coordinates
    })

if __name__ == '__main__':
    app.run(port=5000)
