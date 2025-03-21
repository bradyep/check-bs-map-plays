import { Mapper } from './Mapper';

export interface Report {
    mapperIdsToTrack: number[]; // can manually set mapper ids in JSON to track
    mappers: Mapper[];
    generatedDate: number; // Unix time
}
