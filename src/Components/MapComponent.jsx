import React, { useState, useEffect, useRef } from 'react';
import * as atlas from 'azure-maps-control';
import * as atlasRest from 'azure-maps-rest';
import axios from 'axios';

const MapComponent = ({ apiKey }) => {
    const mapRef = useRef(null);
    const [map, setMap] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [annotatedImage, setAnnotatedImage] = useState(null);
    const [incomingImage, setIncomingImage] = useState(null);

    useEffect(() => {
        const mapInstance = new atlas.Map(mapRef.current, {
            center: [-122.18402494821507, 47.61373420362662],
            zoom: 18,
            style: 'satellite',
            language: 'en-US',
            authOptions: {
                authType: atlas.AuthenticationType.subscriptionKey,
                subscriptionKey: apiKey
            },
            preserveDrawingBuffer: true // Ensure the canvas can be exported
        });

        mapInstance.events.add('ready', () => {
            setMap(mapInstance);
        });

        return () => mapInstance.dispose();
    }, [apiKey]);

    const handleSearch = () => {
        if (map) {
            const pipeline = atlasRest.MapsURL.newPipeline(new atlasRest.SubscriptionKeyCredential(apiKey));
            const searchURL = new atlasRest.SearchURL(pipeline);
            searchURL.searchAddress(atlasRest.Aborter.timeout(10000), searchQuery).then(response => {
                const coordinates = response.geojson.getFeatures().features[0].geometry.coordinates;
                map.setCamera({ center: coordinates });
            }).catch(error => {
                console.error('Search error: ', error);
            });
        }
    };

    const captureScreenshot = async () => {
        if (map) {
            try {
                const canvas = map.getCanvas();
                const dataUri = canvas.toDataURL('image/png');

                // Get the bounds of the map
                const bounds = map.getCamera().bounds;
                const nw = [bounds[0][0], bounds[1][1]]; // Northwest corner [lng, lat]
                const se = [bounds[1][0], bounds[0][1]]; // Southeast corner [lng, lat]

                console.log('Map Bounds:', bounds);
                console.log('NW:', nw, 'SE:', se);
                console.log('Canvas Dimensions:', canvas.width, canvas.height);

                const response = await axios.post('http://127.0.0.1:5000/process-image', { image: dataUri });
                setAnnotatedImage(response.data.annotated_image);
                setIncomingImage(response.data.incoming_image);
                placeMarkers(response.data.marker_coordinates, nw, se, canvas.width, canvas.height);
            } catch (error) {
                console.error('Error capturing screenshot:', error);
            }
        }
    };

    const placeMarkers = (coordinates, nw, se, imgWidth, imgHeight) => {
        if (map) {
            const zoom = map.getCamera().zoom;
            const tileSize = 256;
            const mapSize = tileSize * Math.pow(2, zoom);
    
            coordinates.forEach(coord => {
                const globalX = coord.x / imgWidth * mapSize;
                const globalY = coord.y / imgHeight * mapSize;
    
                const lng = (globalX / mapSize) * 360 - 180;
                const lat = 90 - 360 * Math.atan(Math.exp(-(globalY / mapSize - 0.5) * 2 * Math.PI)) / Math.PI;
    
                console.log('Marker Position:', { lng, lat });
    
                if (!isNaN(lng) && !isNaN(lat)) {
                    const marker = new atlas.HtmlMarker({
                        position: [lng, lat],
                        color: 'red'
                    });
                    map.markers.add(marker);
                } else {
                    console.error('Invalid marker position calculated:', { lng, lat });
                }
            });
        }
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
        <div>
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter address"
            />
            <button onClick={handleSearch}>Search</button>
            <button onClick={captureScreenshot}>Capture Screenshot</button>
            <div id="mapContainer" ref={mapRef} style={{ height: '500px', width: '500px', margin: '0 auto' }}></div>
            {incomingImage && (
                <div>
                    <button onClick={() => downloadImage(incomingImage, 'incoming_image.png')}>Download Incoming Image</button>
                </div>
            )}
            {annotatedImage && (
                <div>
                    <button onClick={() => downloadImage(annotatedImage, 'annotated_image.png')}>Download Annotated Image</button>
                </div>
            )}
        </div>
    );
};

export default MapComponent;
