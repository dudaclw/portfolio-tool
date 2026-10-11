import { MetricasDoProjeto } from '@/componentes/MetricasDoProjeto';

export default async function Metricas({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MetricasDoProjeto projetoId={id} />;
}
