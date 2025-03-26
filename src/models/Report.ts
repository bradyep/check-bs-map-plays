import { Mapper } from './Mapper';

export interface Report {
    generatedDate: number; // Unix time
    mapperIdsToTrack: number[]; // can manually set mapper ids in JSON to track
    mappers: Mapper[];
}
