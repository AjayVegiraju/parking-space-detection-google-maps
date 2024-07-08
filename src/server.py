from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import cv2
import numpy as np
from roboflow import Roboflow
import supervision as sv
import logging

app = Flask(__name__)
CORS(app)  # Ensure CORS is enabled

# Initialize logging
logging.basicConfig(level=logging.DEBUG)

# Initialize Roboflow
rf = Roboflow(api_key="rtLyMd4uL7EyKJ8SJEyv")
project = rf.workspace().project("parking_lot-famom")
model = project.version(7).model

def sharpen_image(image):
    kernel = np.array([[0, -1, 0],
                       [-1, 5,-1],
                       [0, -1, 0]])
    return cv2.filter2D(image, -1, kernel)

def resize_image(image, max_width, max_height):
    height, width = image.shape[:2]
    if width > max_width or height > max_height:
        scaling_factor = min(max_width / width, max_height / height)
        new_width = int(width * scaling_factor)
        new_height = int(height * scaling_factor)
        return cv2.resize(image, (new_width, new_height))
    return image

@app.route('/process-image', methods=['POST'])
def process_image():
    try:
        data = request.get_json()
        app.logger.debug(f"Received data: {data}")

        image_data = data['image'].split(",")[1]
        nparr = np.frombuffer(base64.b64decode(image_data), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            app.logger.error('Image decoding failed')
            return jsonify({'error': 'Invalid image data'}), 400

        app.logger.debug('Image decoded successfully')

        # Save each subsection image with a unique name
        subsection_id = data.get('subsection_id', 'unknown')
        subsection_image_path = f"subsection_{subsection_id}.png"
        cv2.imwrite(subsection_image_path, img)
        app.logger.debug(f'Subsection image saved at {subsection_image_path}')

        # Resize the image
        max_width = data.get('max_width', 640)
        max_height = data.get('max_height', 640)
        img = resize_image(img, max_width, max_height)
        app.logger.debug('Image resized successfully')

        # Sharpen the image
        img = sharpen_image(img)
        app.logger.debug('Image sharpened successfully')

        # Save the incoming image for debugging
        incoming_image_path = f"incoming_image_{subsection_id}.png"
        cv2.imwrite(incoming_image_path, img)
        app.logger.debug(f'Incoming image saved at {incoming_image_path}')

        # Get predictions
        try:
            result = model.predict(incoming_image_path, confidence=50, overlap=50).json()
            app.logger.debug(f'Prediction result: {result}')
        except Exception as e:
            app.logger.error(f'Error during prediction: {e}', exc_info=True)
            return jsonify({'error': 'Prediction failed'}), 500

        # Convert predictions to detections
        detections = sv.Detections.from_inference(result)
        app.logger.debug('Detections converted successfully')

        # Annotate the image with markers at the center of bounding boxes
        marker_coordinates = []
        for bbox in detections.xyxy:
            x_min, y_min, x_max, y_max = bbox
            x_center = int((x_min + x_max) / 2)
            y_center = int((y_min + y_max) / 2)
            cv2.drawMarker(img, (x_center, y_center), color=(0, 255, 0), markerType=cv2.MARKER_CROSS, markerSize=20, thickness=2)
            marker_coordinates.append({'x': x_center, 'y': y_center})

        # Save the annotated image
        annotated_image_path = f"annotated_image_{subsection_id}.png"
        cv2.imwrite(annotated_image_path, img)
        app.logger.debug(f'Annotated image saved at {annotated_image_path}')

        return jsonify({
            'annotated_image': 'data:image/png;base64,' + base64.b64encode(open(annotated_image_path, 'rb').read()).decode('utf-8'),
            'incoming_image': 'data:image/png;base64,' + base64.b64encode(open(incoming_image_path, 'rb').read()).decode('utf-8'),
            'marker_coordinates': marker_coordinates
        })
    except Exception as e:
        app.logger.error(f"Error processing image: {e}", exc_info=True)
        return jsonify({'error': 'An error occurred while processing the image'}), 500

if __name__ == '__main__':
    app.run(port=5000)
