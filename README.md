Dynamic Map Screenshot and Image Processing Application
Table of Contents
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Setup and Installation](#setup-and-installation)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Server API](#server-api)
- [Client Code](#client-code)
- [Future Enhancements](#future-enhancements)
Features
- Dynamic capture of map screenshots based on the map component's size.
- Object detection using a Roboflow model.
- Display of detected objects with markers.
- Full-screen map component with control buttons.
- CORS enabled for cross-origin requests.
Technologies Used
- React
- Flask
- OpenCV
- Roboflow
- Google Maps API
- Axios
- Supervision
Setup and Installation
Prerequisites
- Node.js and npm
- Python 3.x
- Virtualenv (optional but recommended)
Clone the Repository
```bash
git clone https://github.com/your-repo-url/dynamic-map-screenshot.git
cd dynamic-map-screenshot
```
Backend (Flask)
1. Create a virtual environment (optional but recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables (if needed):
```bash
export ROBOFLOW_API_KEY="your_roboflow_api_key"
```

4. Run the Flask server:
```bash
python server.py
```
Frontend (React)
1. Navigate to the frontend directory:
```bash
cd client
```

2. Install npm dependencies:
```bash
npm install
```

3. Run the React development server:
```bash
npm start
```
Running the Application
1. Ensure the Flask server is running.
2. Start the React development server.
3. Open your browser and navigate to `http://localhost:3000`.
Project Structure
```
.
├── client                  # React frontend
│   ├── public
│   └── src
│       ├── components
│       └── App.js
├── server.py               # Flask backend
├── requirements.txt        # Python dependencies
└── README.md
```
Server API
Endpoint: `/process-image`
**Method:** `POST`

**Description:** Processes an image, detects objects using a Roboflow model, and returns the annotated image and marker coordinates.

**Request Body:**
```json
{
  "image": "data:image/png;base64,...",
  "subsection_id": "tile-0-0",
  "max_width": 500,
  "max_height": 500
}
```

**Response:**
```json
{
  "annotated_image": "data:image/png;base64,...",
  "incoming_image": "data:image/png;base64,...",
  "marker_coordinates": [
    {"x": 100, "y": 150},
    {"x": 200, "y": 250}
  ]
}
```
Client Code
The client code is implemented in React and uses the Google Maps API for rendering the map and capturing screenshots.

### MapComponent.jsx
See the code in the `client/src/components/MapComponent.jsx` file.
Future Enhancements
Here are some potential enhancements for the project:
- Implement authentication for secure access.
- Add more detailed error handling and user feedback.
- Improve the UI/UX for better user interaction.
- Expand functionality to support more complex image processing tasks.
