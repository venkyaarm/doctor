import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix Leaflet's default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Haversine formula for distance
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function HospitalsNearMe() {
  const [position, setPosition] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [route, setRoute] = useState([]);
  const [error, setError] = useState("");

  // Get user location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        console.error(err);
        setError("Location permission denied. Please enable GPS.");
      }
    );
  }, []);

  // Fetch nearby hospitals
  const fetchHospitals = async () => {
    if (!position) return;
    const [lat, lon] = position;
    const url = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:5000,${lat},${lon})[amenity=hospital];out;`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      let results = data.elements
        .map((el) => ({
          name: el.tags.name || "Unnamed Hospital",
          lat: el.lat,
          lon: el.lon,
          distance: getDistance(lat, lon, el.lat, el.lon),
        }))
        .sort((a, b) => a.distance - b.distance);

      setHospitals(results);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch hospitals.");
    }
  };

  // Get route
  const getDirections = async (lat, lon) => {
    if (!position) return;
    const url = `https://router.project-osrm.org/route/v1/driving/${position[1]},${position[0]};${lon},${lat}?overview=full&geometries=geojson`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        setRoute(data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch route.");
    }
  };

  return (
    <div style={styles.container}>
      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.mapWrapper}>
        {position ? (
          <MapContainer center={position} zoom={14} style={styles.map}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Marker position={position}>
              <Popup>You are here</Popup>
            </Marker>

            {hospitals.map((h, idx) => (
              <Marker
                key={idx}
                position={[h.lat, h.lon]}
                eventHandlers={{
                  click: () => getDirections(h.lat, h.lon),
                }}
              >
                <Popup>
                  <b>{h.name}</b>
                  <br />
                  Distance: {h.distance.toFixed(2)} km
                  <br />
                  <button
                    style={styles.popupBtn}
                    onClick={() => getDirections(h.lat, h.lon)}
                  >
                    Get Directions
                  </button>
                </Popup>
              </Marker>
            ))}

            {route.length > 0 && <Polyline positions={route} color="blue" />}
          </MapContainer>
        ) : (
          !error && <p style={{ padding: "20px" }}>Fetching your location...</p>
        )}
      </div>

      <div style={styles.bottomBar}>
        <button style={styles.nearMeBtn} onClick={fetchHospitals}>
          🚨 Near Me Now
        </button>
      </div>
    </div>
  );
}

// Inline styles
const styles = {
  container: {
    height: "calc(100vh - 64px)", // full height minus header
    width: "300%",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#ffffffff",
    color: "#fff",
  },
  error: {
    padding: "10px",
    color: "red",
    textAlign: "center",
  },
  mapWrapper: {
    flex: 1,
    width: "100%",
  },
  map: {
    width: "300%",
    height: "100%",
  },
  bottomBar: {
    padding: "10px",
    background: "#fffcfcff",
    textAlign: "center",
    borderTop: "1px solid #ffffffff",
  },
  nearMeBtn: {
    padding: "10px 150px",
    background: "#ff5252",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    fontSize: "16px",
    cursor: "pointer",
  },
  popupBtn: {
    marginTop: "5px",
    padding: "5px 10px",
    background: "#2196f3",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
};
