import countriesDataUrl from "./countries.geo.json";
import subdivJapanDataUrl from "./japan.prefectures.geo.json";

const availableMaps = {
  countries: {
    name: "Countries",
    url: countriesDataUrl,
  },
  subdiv_japan: {
    name: "Japan/Prefectures",
    url: subdivJapanDataUrl,
  },
};

export function getMapUrl(mapType, defaultUrl) {
  return availableMaps[mapType] ? availableMaps[mapType].url : defaultUrl;
}

export default availableMaps;
