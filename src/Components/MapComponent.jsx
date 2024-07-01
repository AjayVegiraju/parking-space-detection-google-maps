import React, { useState, useEffect, useRef } from 'react';
import * as atlas from 'azure-maps-control';
import * as atlasRest from 'azure-maps-rest';
import axios from 'axios';

const MapComponent = ({ apiKey }) => {
    const mapRef = useRef(null);
    const [map, setMap] = useState(null);
    const [datasource, setDatasource] = useState(null);
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
            preserveDrawingBuffer: true
        });

        mapInstance.events.add('ready', () => {
            const datasourceInstance = new atlas.source.DataSource();
            mapInstance.sources.add(datasourceInstance);
            mapInstance.layers.add(new atlas.layer.SymbolLayer(datasourceInstance));
            setDatasource(datasourceInstance);
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

                const response = await axios.post('http://127.0.0.1:5000/process-image', { image: dataUri });
                setAnnotatedImage(response.data.annotated_image);
                setIncomingImage(response.data.incoming_image);

                clearMap(); // Clear the map before placing new markers
                const markerPositions = calculateMarkerPositions(response.data.marker_coordinates);
                placeMarkers(markerPositions);
            } catch (error) {
                console.error('Error capturing screenshot:', error);
            }
        }
    };

    const calculateMarkerPositions = (coordinates) => {
        const markerPositions = coordinates.map(coord => {
            const pixel = new atlas.Pixel(coord.x, coord.y);
            return map.pixelsToPositions([pixel])[0];
        });

        console.log('Calculated Marker Positions:', markerPositions);
        return markerPositions;
    };

    const placeMarkers = (markerPositions) => {
        if (datasource) {
            const features = markerPositions.map(position => new atlas.data.Feature(new atlas.data.Point([position[0], position[1]])));
            datasource.clear();
            datasource.add(new atlas.data.FeatureCollection(features));
        }
    };

    const clearMap = () => {
        if (datasource) {
            datasource.clear(); // Clear all features from the datasource
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
            <button onClick={clearMap}>Clear Map</button>
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
