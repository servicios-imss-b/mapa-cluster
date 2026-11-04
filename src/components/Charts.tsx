import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Cross, Layers, MapPin, Search } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ClusterPoint, ClusterRoute } from '../types';

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function escapePopupText(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function HospitalIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size, color }}>
      <Building2 size={size} strokeWidth={2.1} aria-hidden="true" />
      <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full border border-white" style={{ backgroundColor: color }}>
        <Cross className="text-white" size={7} strokeWidth={3} aria-hidden="true" />
      </span>
    </span>
  );
}

function buildPopupHTML(point: ClusterPoint): string {
  const kind = point.tipo === 'ancla' ? 'Hospital ancla' : 'HBC';
  return `<div style="font-family:system-ui;padding:4px 0;min-width:190px">
    <div style="font-size:10px;font-weight:800;text-transform:uppercase;color:${escapePopupText(point.cluster_color)}">${kind} · Cluster ${escapePopupText(point.cluster_id)}</div>
    <div style="font-size:13px;font-weight:700;color:#111827;margin-top:5px">${escapePopupText(point.nombre || kind)}</div>
    <div style="font-size:11px;color:#4b5563;margin-top:3px">${escapePopupText(point.clues)}</div>
    ${point.entidad ? `<div style="font-size:10px;color:#9ca3af;margin-top:2px">${escapePopupText(point.entidad)}</div>` : ''}
    ${point.ancla_asociado ? `<div style="font-size:10px;color:#6b7280;margin-top:6px">Ancla asociada: ${escapePopupText(point.ancla_asociado)}</div>` : ''}
  </div>`;
}

function ClusterMapSection({ points, routes }: { points: ClusterPoint[]; routes: ClusterRoute[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [entityQuery, setEntityQuery] = useState('CHIAPAS');
  const [selectedEntity, setSelectedEntity] = useState('CHIAPAS');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setSelectedEntity(entityQuery), 250);
    return () => window.clearTimeout(timeoutId);
  }, [entityQuery]);

  const entities = useMemo(() => [...new Set(
    points.map((point) => point.entidad.trim()).filter(Boolean),
  )].sort((left, right) => left.localeCompare(right, 'es-MX')), [points]);

  const visiblePoints = useMemo(() => {
    const normalizedEntity = normalizeSearch(selectedEntity);
    if (!normalizedEntity) return points;
    return points.filter((point) => normalizeSearch(point.entidad).includes(normalizedEntity));
  }, [points, selectedEntity]);

  const visibleClues = useMemo(() => new Set(visiblePoints.map((point) => point.clues)), [visiblePoints]);
  const visibleRoutes = useMemo(() => routes.filter((route) => (
    visibleClues.has(route.clues_hbc) && visibleClues.has(route.clues_ancla)
  )), [routes, visibleClues]);

  const searchResults = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (normalizedQuery.length < 2) return [];
    return visiblePoints.filter((point) => normalizeSearch(
      `${point.clues} ${point.nombre} ${point.cluster_id} ${point.entidad}`,
    ).includes(normalizedQuery)).slice(0, 8);
  }, [visiblePoints, query]);

  const clusters = useMemo(() => {
    const colors = new Map<string, string>();
    visiblePoints.forEach((point) => colors.set(point.cluster_id, point.cluster_color));
    return [...colors.entries()].sort(([left], [right]) => left.localeCompare(right, 'es-MX'));
  }, [visiblePoints]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [-102, 23.5],
      zoom: 4.8,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    const addMarkers = () => {
      const clusterColors = new Map(visiblePoints.map((point) => [point.cluster_id, point.cluster_color]));
      const routeFeatures = visibleRoutes.flatMap((route) => {
        const color = clusterColors.get(route.cluster_id);
        if (!color) return [];

        return [{
          type: 'Feature' as const,
          properties: { color },
          geometry: {
            type: 'LineString' as const,
            coordinates: route.coordinates,
          },
        }];
      });

      if (routeFeatures.length) {
        map.addSource('cluster-routes', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: routeFeatures },
        });
        map.addLayer({
          id: 'cluster-routes',
          type: 'line',
          source: 'cluster-routes',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 1.5,
            'line-opacity': 0.72,
          },
        });
      }

      const markers = new Map<string, maplibregl.Marker>();
  visiblePoints.forEach((point) => {
        const element = document.createElement('span');
        element.setAttribute('aria-label', `${point.tipo}: ${point.nombre || point.clues}`);
        element.title = `${point.tipo === 'ancla' ? 'Ancla' : 'HBC'} · Cluster ${point.cluster_id}`;
        element.style.display = 'block';
        element.style.cursor = 'pointer';
        if (point.tipo === 'ancla') {
          element.style.width = '30px';
          element.style.height = '30px';
          element.style.display = 'grid';
          element.style.placeItems = 'center';
          element.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,.35))';
          element.innerHTML = renderToStaticMarkup(<HospitalIcon size={25} color={point.cluster_color} />);
        } else {
          element.style.width = '10px';
          element.style.height = '10px';
          element.style.backgroundColor = point.cluster_color;
          element.style.border = '2px solid #ffffff';
          element.style.borderRadius = '50%';
          element.style.boxShadow = '0 1px 5px rgba(0,0,0,.55)';
        }

        const popup = new maplibregl.Popup({ closeButton: false, offset: 12, maxWidth: '280px' })
          .setHTML(buildPopupHTML(point));
        const marker = new maplibregl.Marker({ element, anchor: 'center' })
          .setLngLat([point.lng, point.lat])
          .setPopup(popup)
          .addTo(map);
        markers.set(point.id, marker);
      });
      markersRef.current = markers;

      if (visiblePoints.length === 1) {
        map.jumpTo({ center: [visiblePoints[0].lng, visiblePoints[0].lat], zoom: 7 });
      } else if (visiblePoints.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        visiblePoints.forEach((point) => bounds.extend([point.lng, point.lat]));
        map.fitBounds(bounds, { padding: 56, maxZoom: 8 });
      }
    };

    if (map.isStyleLoaded()) addMarkers();
    else map.on('load', addMarkers);

    return () => {
      map.off('load', addMarkers);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      mapRef.current = null;
      map.remove();
    };
  }, [visiblePoints, visibleRoutes]);

  const hbcCount = visiblePoints.filter((point) => point.tipo === 'hbc').length;
  const anchorCount = visiblePoints.filter((point) => point.tipo === 'ancla').length;

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="stat-card border-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">HBC</p>
              <p className="text-3xl font-bold text-gray-900">{hbcCount.toLocaleString('es-MX')}</p>
            </div>
            <Building2 className="h-7 w-7 text-emerald-700" aria-hidden="true" />
          </div>
        </article>
        <article className="stat-card border-rose-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Anclas</p>
              <p className="text-3xl font-bold text-gray-900">{anchorCount.toLocaleString('es-MX')}</p>
            </div>
            <HospitalIcon size={28} color="#be123c" />
          </div>
        </article>
        <article className="stat-card border-amber-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Clusters</p>
              <p className="text-3xl font-bold text-gray-900">{clusters.length.toLocaleString('es-MX')}</p>
            </div>
            <Layers className="h-7 w-7 text-amber-700" aria-hidden="true" />
          </div>
        </article>
      </div>

      <div className="relative z-20 grid gap-3 sm:grid-cols-2">
        <label className="flex min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <MapPin className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            list="cluster-entities"
            value={entityQuery}
            onChange={(event) => setEntityQuery(event.target.value)}
            placeholder="Todas las entidades"
            aria-label="Buscar por entidad"
            className="w-full border-0 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
          />
          <datalist id="cluster-entities">
            {entities.map((entity) => <option key={entity} value={entity} />)}
          </datalist>
        </label>

        <div className="relative rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 shrink-0 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)}
              placeholder="Buscar CLUES, hospital o cluster"
              aria-label="Buscar HBC, ancla o cluster"
              className="w-full border-0 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
            />
          </div>
          {searchOpen && query.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full mt-2 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1.5 shadow-xl">
            {searchResults.length ? searchResults.map((point) => (
              <button
                key={point.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setQuery(`${point.clues} · ${point.nombre || point.tipo}`);
                  setSearchOpen(false);
                  mapRef.current?.flyTo({ center: [point.lng, point.lat], zoom: 11, speed: 1.2 });
                  const marker = markersRef.current.get(point.id);
                  if (marker && !marker.getPopup()?.isOpen()) marker.togglePopup();
                }}
                className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-left hover:bg-gray-50"
              >
                {point.tipo === 'ancla' ? (
                  <HospitalIcon size={20} color={point.cluster_color} />
                ) : (
                  <span className="h-3 w-3 shrink-0 rounded-full border-2 border-white shadow" style={{ backgroundColor: point.cluster_color }} />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-800">{point.nombre || point.clues}</span>
                  <span className="block truncate text-xs text-gray-500">{point.tipo.toUpperCase()} · {point.clues} · Cluster {point.cluster_id}</span>
                </span>
              </button>
            )) : <p className="px-3 py-4 text-center text-sm text-gray-500">Sin coincidencias</p>}
            </div>
          )}
          </div>
      </div>

      <section className="card flex w-full flex-col overflow-hidden" style={{ height: '72vh', minHeight: '560px', maxHeight: '760px' }}>
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <MapPin className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Clusters HBC y hospitales ancla</h2>
              <p className="mt-0.5 text-xs text-gray-500">Color por cluster · símbolo por tipo</p>
            </div>
          </div>
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div ref={mapContainerRef} className="absolute inset-0" />
        </div>
      </section>
    </>
  );
}

export function StatCards({ points = [], routes = [] }: { points?: ClusterPoint[]; routes?: ClusterRoute[] }) {
  return <ClusterMapSection points={points} routes={routes} />;
}