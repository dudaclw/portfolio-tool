import { testarContratoDoBanco } from '../comum/suite-de-contrato';
import { BancoEmMemoria } from './banco-em-memoria';

testarContratoDoBanco('memória', () => new BancoEmMemoria());
