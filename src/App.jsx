import React from 'react';
import MapComponent from './Components/MapComponent';
import './App.css';

const App = () => {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Parking Space Detector</h1>
      </header>
      <MapComponent apiKey="6dqjUZBfABBAnsVwe9pKelPQfpe6ywKGarBr5xk6pg6WoP7pHFreJQQJ99AFAC8vTIn3kjgkAAAgAZMP18qH" />
    </div>
  );
}

export default App;
