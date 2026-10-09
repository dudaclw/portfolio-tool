import { VisaoGeralDoProjeto } from '@/componentes/VisaoGeralDoProjeto';

export default async function VisaoGeral({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VisaoGeralDoProjeto projetoId={id} />;
}
