import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { StatCards } from './components/Charts';
import { cargarPuntosCluster, cargarRutasCluster } from './data';
import type { ClusterPoint, ClusterRoute } from './types';

export default function App() {
  const [points, setPoints] = useState<ClusterPoint[]>([]);
  const [routes, setRoutes] = useState<ClusterRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([cargarPuntosCluster(), cargarRutasCluster()])
      .then(([loadedPoints, loadedRoutes]) => {
        if (active) {
          setPoints(loadedPoints);
          setRoutes(loadedRoutes);
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los clusters.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="card p-10 text-center text-gray-500">Cargando clusters HBC y hospitales ancla...</div>
        ) : error ? (
          <div role="alert" className="card border-imss-wine/30 bg-imss-wine/5 p-8 text-imss-wine">{error}</div>
        ) : (
          <StatCards points={points} routes={routes} />
        )}
      </main>
    </div>
  );
}