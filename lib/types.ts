export interface Suburb {
  name: string
  postcode: number
  state: {
    name: string
    abbreviation: string
  }
  locality: string
  latitude: number
  longitude: number
}

