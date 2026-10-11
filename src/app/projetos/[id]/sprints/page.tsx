import { ListaDeSprints } from '@/componentes/ListaDeSprints';

export default async function Sprints({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ListaDeSprints projetoId={id} />;
}
