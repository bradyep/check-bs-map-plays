import { Map } from './Map';

export interface Mapper {
    mapperId: number;
    mapperName: string;
    beatSaverMapperRating?: number; // might not use
    maps: Map[];
}
