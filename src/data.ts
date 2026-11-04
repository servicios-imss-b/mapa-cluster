import type { ClusterPoint, ClusterRoute } from './types';

interface ClusterFeature {
  geometry?: { type?: string; coordinates?: unknown[] };
  properties?: Record<string, unknown>;
}

export async function cargarPuntosCluster(): Promise<ClusterPoint[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}cluster_hbc_anclas.geojson?_cb=${Date.now()}`);
  if (!response.ok) {
    throw new Error('No se encontró el GeoJSON de clusters. Ejecuta mapag.ipynb para generarlo.');
  }

  const payload = await response.json() as { features?: ClusterFeature[] };
  if (!Array.isArray(payload.features)) {
    throw new Error('El archivo de clusters no contiene una lista válida de puntos.');
  }

  return payload.features.flatMap((feature) => {
    const coordinates = feature.geometry?.coordinates;
    const properties = feature.properties;
    const lng = coordinates?.[0];
    const lat = coordinates?.[1];
    const tipo = properties?.tipo;
    const clues = String(properties?.clues ?? '').trim();
    const clusterId = String(properties?.cluster_id ?? '').trim();

    if (
      feature.geometry?.type !== 'Point'
      || typeof lng !== 'number'
      || typeof lat !== 'number'
      || !Number.isFinite(lng)
      || !Number.isFinite(lat)
      || (tipo !== 'hbc' && tipo !== 'ancla')
      || !clues
      || !clusterId
    ) return [];

    return [{
      id: String(properties?.id ?? `${tipo}-${clues}-${clusterId}`),
      tipo,
      clues,
      nombre: String(properties?.nombre ?? ''),
      entidad: String(properties?.entidad ?? ''),
      cluster_id: clusterId,
      cluster_color: String(properties?.cluster_color ?? '#6B7280'),
      ancla_asociado: String(properties?.ancla_asociado ?? ''),
      lat,
      lng,
    }];
  });
}

interface RouteFeature {
  geometry?: { type?: string; coordinates?: unknown[] };
  properties?: Record<string, unknown>;
}

export async function cargarRutasCluster(): Promise<ClusterRoute[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}cluster_rutas.geojson?_cb=${Date.now()}`);
  if (!response.ok) {
    throw new Error('No se encontró el GeoJSON de rutas de los clusters.');
  }

  const payload = await response.json() as { features?: RouteFeature[] };
  if (!Array.isArray(payload.features)) {
    throw new Error('El archivo de rutas no contiene una lista válida de geometrías.');
  }

  return payload.features.flatMap((feature) => {
    const properties = feature.properties;
    const rawCoordinates = feature.geometry?.coordinates;
    const cluesHbc = String(properties?.clues_imb_hbc ?? '').trim();
    const cluesAncla = String(properties?.clues_imb_ancla ?? '').trim();
    const clusterId = String(properties?.cluster_id ?? '').trim();
    if (
      feature.geometry?.type !== 'LineString'
      || !Array.isArray(rawCoordinates)
      || !cluesHbc
      || !cluesAncla
      || !clusterId
    ) return [];

    const coordinates = rawCoordinates.flatMap((coordinate) => {
      if (!Array.isArray(coordinate) || coordinate.length < 2) return [];
      const [lng, lat] = coordinate;
      if (typeof lng !== 'number' || typeof lat !== 'number' || !Number.isFinite(lng) || !Number.isFinite(lat)) return [];
      return [[lng, lat] as [number, number]];
    });
    if (coordinates.length < 2) return [];

    return [{
      id: `${cluesHbc}-${cluesAncla}-${clusterId}`,
      cluster_id: clusterId,
      clues_hbc: cluesHbc,
      clues_ancla: cluesAncla,
      coordinates,
    }];
  });
}