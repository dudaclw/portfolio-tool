import { QuadroDaSprint } from '@/componentes/QuadroDaSprint';

export default async function Quadro({
  params,
}: {
  params: Promise<{ id: string; sprintId: string }>;
}) {
  const { id, sprintId } = await params;
  return <QuadroDaSprint projetoId={id} sprintId={sprintId} />;
}
