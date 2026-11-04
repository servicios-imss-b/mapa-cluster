export interface ClusterPoint {
  id: string;
  tipo: 'hbc' | 'ancla';
  clues: string;
  nombre: string;
  entidad: string;
  cluster_id: string;
  cluster_color: string;
  ancla_asociado: string;
  lat: number;
  lng: number;
}

export interface ClusterRoute {
  id: string;
  cluster_id: string;
  clues_hbc: string;
  clues_ancla: string;
  coordinates: [number, number][];
}