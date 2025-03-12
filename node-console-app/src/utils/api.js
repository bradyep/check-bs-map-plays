const axios = require('axios');

async function fetchMapsByMapper(mapperId) {
    const response = await axios.get(`https://api.beatsaver.com/maps/uploader/${mapperId}`);
    return response.data.docs.map(map => ({
        id: map.id,
        name: map.name
    }));
}

async function fetchNewPlays(mapId, since) {
    const response = await axios.get(`https://api.beatleader.com/plays/${mapId}?since=${since}`);
    return response.data;
}

module.exports = {
    fetchMapsByMapper,
    fetchNewPlays
};