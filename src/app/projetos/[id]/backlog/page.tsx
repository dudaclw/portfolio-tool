import { BacklogDoProjeto } from '@/componentes/BacklogDoProjeto';

export default async function Backlog({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BacklogDoProjeto projetoId={id} />;
}
