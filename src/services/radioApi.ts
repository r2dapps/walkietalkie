export interface RadioStation {
  id: string;
  name: string;
  url: string;
  favicon: string;
  tags: string[];
  votes: number;
}

export class RadioApi {
  // We use de1.api.radio-browser.info as one of the many community endpoints
  private baseUrl = 'https://de1.api.radio-browser.info/json';

  async searchStations(options: { language?: string; tag?: string; name?: string; limit?: number } = {}): Promise<RadioStation[]> {
    try {
      const { language = 'telugu', tag = '', name = '', limit = 30 } = options;
      
      let url = `${this.baseUrl}/stations/search?limit=${limit}&hidebroken=true&order=clickcount&reverse=true`;
      if (language !== 'all') url += `&language=${encodeURIComponent(language)}`;
      if (tag) url += `&tag=${encodeURIComponent(tag)}`;
      if (name) url += `&name=${encodeURIComponent(name)}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch radio stations');
      }
      const data = await response.json();
      
      const uniqueStations: RadioStation[] = [];
      const seenUrls = new Set<string>();
      const seenNames = new Set<string>();
      
      data.forEach((station: any) => {
        const url = station.url_resolved || station.url;
        const name = station.name.trim();
        if (url && !seenUrls.has(url) && !seenNames.has(name)) {
          seenUrls.add(url);
          seenNames.add(name);
          uniqueStations.push({
            id: station.stationuuid,
            name: name,
            url: url,
            favicon: station.favicon,
            tags: station.tags ? station.tags.split(',').slice(0, 3) : [],
            votes: station.votes
          });
        }
      });
      
      return uniqueStations;
    } catch (error) {
      console.error('RadioAPI Error:', error);
      return [];
    }
  }
}

export const radioApi = new RadioApi();
