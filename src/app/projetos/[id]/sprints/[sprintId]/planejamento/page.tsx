import { PlanejamentoDaSprint } from '@/componentes/PlanejamentoDaSprint';

export default async function Planejamento({
  params,
}: {
  params: Promise<{ id: string; sprintId: string }>;
}) {
  const { id, sprintId } = await params;
  return <PlanejamentoDaSprint projetoId={id} sprintId={sprintId} />;
}
