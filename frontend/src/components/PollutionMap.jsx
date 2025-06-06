import PropTypes from 'prop-types';

import { useConfig } from '@/hooks/useConfig.js';

import { DataProvider } from '@/context/DataContext.jsx';
import { useDataContext } from '@/hooks/useDataContext';

import L from "leaflet";
import "leaflet.heat";

import { useEffect, useState, useRef } from 'react';

const PollutionMap = ({ groupId, deviceId }) => {
  const { config, configLoading, configError } = useConfig();

  if (configLoading) return <p>Cargando configuración...</p>;
  if (configError) return <p>Error al cargar configuración: {configError}</p>;
  if (!config) return <p>Configuración no disponible.</p>;

  const BASE = config.appConfig.endpoints.LOGIC_URL;
  const ENDPOINT = config.appConfig.endpoints.GET_DEVICE_POLLUTION_MAP;
  const endp = ENDPOINT
    .replace(':groupId', groupId)
    .replace(':deviceId', deviceId);

  const reqConfig = {
    baseUrl: `${BASE}${endp}`,
    params: {}
  };

  return (
    <DataProvider config={reqConfig}>
      <PollutionMapContent />
    </DataProvider>
  );
};

const PollutionMapContent = () => {
  const { config, configLoading, configError } = useConfig();
  const { data, dataLoading, dataError } = useDataContext();

  const mapRef = useRef(null);
  const voronoiLayerRef = useRef(null);
  const [showVoronoi, setShowVoronoi] = useState(false);

  useEffect(() => {
    if (!data || !config) return;

    const isToday = (timestamp) => {
      const today = new Date();
      const date = new Date(timestamp * 1000);
      return (
        today.getFullYear() === date.getFullYear() &&
        today.getMonth() === date.getMonth() &&
        today.getDate() === date.getDate()
      );
    };

    const mapContainer = document.getElementById("map");
    if (!mapContainer) return;

    const getFillColor = (feature) => {
      const index = feature.properties.groupId || Math.floor(Math.random() * 10);
      const colors = [
        "#EF5350", // rojo coral
        "#EC407A", // rosa fucsia
        "#AB47BC", // púrpura
        "#7E57C2", // violeta oscuro
        "#5C6BC0", // azul medio
        "#42A5F5", // azul claro
        "#29B6F6", // celeste intenso
        "#26C6DA", // azul verdoso
        "#26A69A", // verde azulado
        "#66BB6A", // verde hoja
        "#9CCC65", // verde lima
        "#D4E157", // lima amarillenta
        "#FFEE58", // amarillo mostaza
        "#FFCA28", // amarillo dorado
        "#FFA726", // naranja quemado
        "#FF7043", // naranja rojizo
        "#8D6E63", // marrón topo
        "#78909C"  // gris azulado
      ];


      return colors[index % colors.length];
    };


    const SEVILLA = config.userConfig.city;

    const map = L.map(mapContainer).setView(SEVILLA, 12);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const points = data
      .filter(p => isToday(p.timestamp))
      .map(p => [p.lat, p.lon, p.carbonMonoxide]);

    L.heatLayer(points, { radius: 25 }).addTo(map);

    fetch("/voronoi_sevilla_geovoronoi.geojson")
      .then(res => res.json())
      .then(geojson => {
        const voronoiLayer = L.geoJSON(geojson, {
          style: (feature) => ({
            color: "#007946",
            weight: 1.0,
            opacity: 0.8,
            fillOpacity: 0.3,
            fillColor: getFillColor(feature),
            dashArray: '5, 5'
          })

        });

        voronoiLayerRef.current = voronoiLayer;

        if (showVoronoi) {
          voronoiLayer.addTo(map);
        }
      })
      .catch(err => {
        console.error("Error cargando el GeoJSON:", err);
      });

    return () => {
      map.remove();
    };
  }, [data, config]);

  const toggleVoronoi = () => {
    const map = mapRef.current;
    const voronoiLayer = voronoiLayerRef.current;

    if (!map || !voronoiLayer) return;

    if (map.hasLayer(voronoiLayer)) {
      map.removeLayer(voronoiLayer);
      setShowVoronoi(false);
    } else {
      voronoiLayer.addTo(map);
      setShowVoronoi(true);
    }
  };

  if (configLoading) return <p>Cargando configuración...</p>;
  if (configError) return <p>Error al cargar configuración: {configError}</p>;
  if (!config) return <p>Configuración no disponible.</p>;

  if (dataLoading) return <p>Cargando datos...</p>;
  if (dataError) return <p>Error al cargar datos: {dataError}</p>;
  if (!data) return <p>Datos no disponibles.</p>;

  return (
    <div style={{ position: "relative" }}>
      <div id="map" className='rounded-4' style={{ height: "60vh" }}></div>
      <div
        style={{
          position: "absolute",
          top: "80px",
          left: "10px",
          zIndex: 1000,
          border: "2px solid rgba(0,0,0,0.2)",
          padding: "0",
          cursor: "pointer",
          backgroundColor: "transparent",
          borderRadius: "4px",
          backgroundClip: "padding-box",
        }}
      >
        <button
          onClick={toggleVoronoi}
          style={{

            zIndex: 1000,
            width: "30px",
            height: "30px",
            padding: "0",
            cursor: "pointer",
            backgroundColor: "#ffffff",
            borderRadius: "2px",
            border: "none",
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f4f4f4"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#ffffff"}
        >
          <img src='/images/voro.png' width={30} height={30} />
        </button>
      </div>
    </div>
  );
};

PollutionMap.propTypes = {
  groupId: PropTypes.number.isRequired,
  deviceId: PropTypes.number.isRequired
};

export default PollutionMap;