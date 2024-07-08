import React from 'react';
import MapComponent from './Components/MapComponent';
import './App.css';

const App = () => {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Parking Space Detector</h1>
      </header>
      <MapComponent apiKey="AIzaSyAID1oIv9wfHb7pzjmfHQmPdvLoRY5eDzo" />
    </div>
  );
}

export default App;
