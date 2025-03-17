import { Mapper } from './Mapper';

export interface Report {
    mappers: Mapper[];
    generatedDate: number; // Unix time
}