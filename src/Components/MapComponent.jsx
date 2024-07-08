import React, { useState, useRef, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, StandaloneSearchBox } from '@react-google-maps/api';
import axios from 'axios';

const containerStyle = {
  width: '100%',
  height: '100vh',
  margin: '0 auto',
  position: 'relative'
};

const buttonStyle = {
  position: 'absolute',
  top: '10px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 10,
  padding: '10px 20px',
  backgroundColor: '#fff',
  border: '1px solid #ccc',
  borderRadius: '5px',
  cursor: 'pointer'
};

const center = {
  lat: 47.61373420362662,
  lng: -122.18402494821507
};

const MapComponent = ({ apiKey }) => {
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [annotatedImages, setAnnotatedImages] = useState([]);
  const [incomingImages, setIncomingImages] = useState([]);
  const mapContainerRef = useRef(null);
  const searchBoxRef = useRef(null);
  const [searchBox, setSearchBox] = useState(null);

  const onLoad = mapInstance => {
    setMap(mapInstance);
  };

  const onSearchBoxLoad = ref => {
    searchBoxRef.current = ref;
    setSearchBox(ref);
  };

  const onPlacesChanged = () => {
    const places = searchBox.getPlaces();
    if (places.length > 0) {
      const place = places[0];
      const location = place.geometry.location;
      map.panTo({ lat: location.lat(), lng: location.lng() });
    }
  };

  const captureScreenshots = async () => {
    if (map) {
      const bounds = map.getBounds();
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const zoom = map.getZoom();

      const containerWidth = mapContainerRef.current.clientWidth;
      const containerHeight = mapContainerRef.current.clientHeight;

      const numCols = Math.ceil(containerWidth / 640);
      const numRows = Math.ceil(containerHeight / 640);
      const tileWidth = Math.ceil(containerWidth / numCols);
      const tileHeight = Math.ceil(containerHeight / numRows);

      const latStep = (ne.lat() - sw.lat()) / numRows;
      const lngStep = (ne.lng() - sw.lng()) / numCols;

      const centers = [];
      for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
          centers.push({
            lat: ne.lat() - latStep * (row + 0.5),
            lng: sw.lng() + lngStep * (col + 0.5),
            id: `tile-${row}-${col}`
          });
        }
      }

      const tilePromises = centers.map(async (center) => {
        const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=${zoom}&size=${tileWidth}x${tileHeight}&maptype=satellite&key=${apiKey}`;
        const response = await axios.get(staticMapUrl, { responseType: 'arraybuffer' });
        return { image: arrayBufferToBase64(response.data), id: center.id };
      });

      const tileImages = await Promise.all(tilePromises);

      const processedImages = await Promise.all(
        tileImages.map(async (tile) => {
          try {
            const processResponse = await axios.post('http://127.0.0.1:5000/process-image', { image: `data:image/png;base64,${tile.image}`, subsection_id: tile.id });
            return { ...processResponse.data, id: tile.id };
          } catch (error) {
            console.error('Error processing image:', error);
            if (error.response) {
              console.error('Error response data:', error.response.data);
            }
            return null;
          }
        })
      );

      const validProcessedImages = processedImages.filter(image => image !== null);

      const markerPositions = calculateMarkerPositions(validProcessedImages, bounds, containerWidth, containerHeight, numCols, numRows);
      setMarkers(markerPositions);

      // Save incoming and annotated images
      setIncomingImages(validProcessedImages.map(img => ({ id: img.id, src: img.incoming_image })));
      setAnnotatedImages(validProcessedImages.map(img => ({ id: img.id, src: img.annotated_image })));
    }
  };

  const arrayBufferToBase64 = buffer => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const calculateMarkerPositions = (processedImages, bounds, containerWidth, containerHeight, numCols, numRows) => {
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    const lngDiff = ne.lng() - sw.lng();
    const latDiff = ne.lat() - sw.lat();

    const markerPositions = [];

    processedImages.forEach((processedImage, index) => {
      const { marker_coordinates } = processedImage;
      const row = Math.floor(index / numCols);
      const col = index % numCols;

      const tileOffsetX = col * (containerWidth / numCols);
      const tileOffsetY = row * (containerHeight / numRows);

      marker_coordinates.forEach(coord => {
        const lngRatio = (tileOffsetX + coord.x) / containerWidth;
        const latRatio = 1 - (tileOffsetY + coord.y) / containerHeight; // Invert Y-axis

        const lng = sw.lng() + (lngRatio * lngDiff);
        const lat = sw.lat() + (latRatio * latDiff);

        markerPositions.push({ lat, lng });
      });
    });

    console.log('Calculated Marker Positions:', markerPositions);
    return markerPositions;
  };

  const clearMap = () => {
    setMarkers([]);
    setIncomingImages([]);
    setAnnotatedImages([]);
  };

  const downloadImage = (imageData, filename) => {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div ref={mapContainerRef} style={containerStyle}>
      <LoadScript googleMapsApiKey={apiKey} libraries={["places"]}>
        <StandaloneSearchBox
          onLoad={onSearchBoxLoad}
          onPlacesChanged={onPlacesChanged}
        >
          <input
            type="text"
            placeholder="Search for places"
            style={{
              boxSizing: `border-box`,
              border: `1px solid transparent`,
              width: `240px`,
              height: `32px`,
              marginTop: `10px`,
              padding: `0 12px`,
              borderRadius: `3px`,
              boxShadow: `0 2px 6px rgba(0, 0, 0, 0.3)`,
              fontSize: `14px`,
              outline: `none`,
              textOverflow: `ellipses`,
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: "10"
            }}
          />
        </StandaloneSearchBox>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={18}
          onLoad={onLoad}
          mapTypeId="satellite"
        >
          {markers.map((position, index) => (
            <Marker key={index} position={position} />
          ))}
        </GoogleMap>
      </LoadScript>
      <button style={buttonStyle} onClick={captureScreenshots}>Detect Parking Spaces</button>
      <button style={buttonStyle} onClick={clearMap}>Clear Map</button>
      <div style={{ textAlign: 'center', marginTop: '10px' }}>
        {incomingImages.map((img, index) => (
          <div key={index}>
            <button onClick={() => downloadImage(img.src, `incoming_image_${img.id}.png`)}>Download Incoming Image {img.id}</button>
          </div>
        ))}
        {annotatedImages.map((img, index) => (
          <div key={index}>
            <button onClick={() => downloadImage(img.src, `annotated_image_${img.id}.png`)}>Download Annotated Image {img.id}</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MapComponent;
