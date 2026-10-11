import { RevisaoDaSprint } from '@/componentes/RevisaoDaSprint';

export default async function Review({
  params,
}: {
  params: Promise<{ id: string; sprintId: string }>;
}) {
  const { id, sprintId } = await params;
  return <RevisaoDaSprint projetoId={id} sprintId={sprintId} />;
}
