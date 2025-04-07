import { Mapper } from '../models/Mapper';

export function sortMapDifficulties(allMappersData: Mapper[]): void {
    const difficultyOrder = ["ExpertPlus", "Expert", "Hard", "Normal", "Easy"];
    for (const mapperData of allMappersData) {
        for (const map of mapperData.maps) {
            if (map.leaderboards) {
                map.leaderboards.sort((a, b) => {
                    const indexA = difficultyOrder.indexOf(a.difficultyName);
                    const indexB = difficultyOrder.indexOf(b.difficultyName);

                    // If difficultyName is not in the predefined order, place it after "Easy"
                    const adjustedIndexA = indexA === -1 ? difficultyOrder.length : indexA;
                    const adjustedIndexB = indexB === -1 ? difficultyOrder.length : indexB;

                    return adjustedIndexA - adjustedIndexB;
                });
            }
        }
    }
}
