/** Canonical Tutor Hunt service area, based on the Philippine PSGC hierarchy. */

export type ServiceProvince = 'Leyte' | 'Samar';

export interface TutorHuntLocation {
  city: string;
  province: ServiceProvince;
  barangays: string[];
}

const BARANGAYS_BY_CITY: Record<string, string[]> = {
  'Tacloban City': [
    'Barangay 100', 'Barangay 101', 'Barangay 102', 'Barangay 103', 'Barangay 103-A', 'Barangay 104', 'Barangay 105', 'Barangay 106', 'Barangay 107', 'Barangay 108', 'Barangay 109', 'Barangay 109-A', 'Barangay 110', 'Barangay 12', 'Barangay 13', 'Barangay 14', 'Barangay 15', 'Barangay 16', 'Barangay 17', 'Barangay 18', 'Barangay 19', 'Barangay 2', 'Barangay 20', 'Barangay 21', 'Barangay 21-A', 'Barangay 22', 'Barangay 23', 'Barangay 23-A', 'Barangay 24', 'Barangay 25', 'Barangay 26', 'Barangay 27', 'Barangay 28', 'Barangay 29', 'Barangay 30', 'Barangay 31', 'Barangay 32', 'Barangay 33', 'Barangay 34', 'Barangay 35', 'Barangay 35-A', 'Barangay 36', 'Barangay 36-A', 'Barangay 37', 'Barangay 37-A', 'Barangay 38', 'Barangay 39', 'Barangay 40', 'Barangay 41', 'Barangay 42', 'Barangay 42-A', 'Barangay 43', 'Barangay 43-A', 'Barangay 43-B', 'Barangay 44', 'Barangay 44-A', 'Barangay 45', 'Barangay 46', 'Barangay 47', 'Barangay 48', 'Barangay 48-A', 'Barangay 48-B', 'Barangay 49', 'Barangay 5', 'Barangay 5-A', 'Barangay 50', 'Barangay 50-A', 'Barangay 50-B', 'Barangay 51', 'Barangay 51-A', 'Barangay 52', 'Barangay 53', 'Barangay 54', 'Barangay 54-A', 'Barangay 56', 'Barangay 56-A', 'Barangay 57', 'Barangay 58', 'Barangay 59', 'Barangay 59-A', 'Barangay 59-B', 'Barangay 6', 'Barangay 6-A', 'Barangay 60', 'Barangay 60-A', 'Barangay 61', 'Barangay 62', 'Barangay 62-A', 'Barangay 62-B', 'Barangay 63', 'Barangay 64', 'Barangay 65', 'Barangay 66', 'Barangay 66-A', 'Barangay 67', 'Barangay 68', 'Barangay 69', 'Barangay 7', 'Barangay 70', 'Barangay 71', 'Barangay 72', 'Barangay 73', 'Barangay 74', 'Barangay 75', 'Barangay 76', 'Barangay 77', 'Barangay 78', 'Barangay 79', 'Barangay 8', 'Barangay 8-A', 'Barangay 80', 'Barangay 81', 'Barangay 82', 'Barangay 83', 'Barangay 83-A', 'Barangay 83-B', 'Barangay 83-C', 'Barangay 84', 'Barangay 85', 'Barangay 86', 'Barangay 87', 'Barangay 88', 'Barangay 89', 'Barangay 90', 'Barangay 91', 'Barangay 92', 'Barangay 93', 'Barangay 94', 'Barangay 94-A', 'Barangay 95', 'Barangay 95-A', 'Barangay 96', 'Barangay 97', 'Barangay 98', 'Barangay 99', 'El Reposo', 'Libertad', 'Nula-tula',
  ],
  Palo: ['Anahaway', 'Arado', 'Baras', 'Barayong', 'Buri', 'Cabarasan Daku', 'Cabarasan Guti', 'Campetik', 'Candahug', 'Cangumbang', 'Canhidoc', 'Capirawan', 'Castilla', 'Cavite East', 'Cavite West', 'Cogon', 'Gacao', 'Guindapunan', 'Libertad', 'Luntad', 'Naga-naga', 'Pawing', 'Salvacion', 'San Agustin', 'San Antonio', 'San Fernando', 'San Isidro', 'San Joaquin', 'San Jose', 'San Miguel', 'Santa Cruz', 'Tacuranga', 'Teraza'],
  Tanauan: ['Ada', 'Amanluran', 'Arado', 'Atipolo', 'Balud', 'Bangon', 'Bantagan', 'Baras', 'Binolo', 'Binongto-an', 'Bislig', 'Buntay', 'Cabalagnan', 'Cabarasan Guti', 'Cabonga-an', 'Cabuynan', 'Cahumayhumayan', 'Calogcog', 'Calsadahay', 'Camire', 'Canbalisara', 'Canramos', 'Catigbian', 'Catmon', 'Cogon', 'Guindag-an', 'Guingawan', 'Hilagpad', 'Kiling', 'Lapay', 'Licod', 'Limbuhan Daku', 'Limbuhan Guti', 'Linao', 'Magay', 'Maghulod', 'Malaguicay', 'Maribi', 'Mohon', 'Pago', 'Pasil', 'Pikas', 'Sacme', 'Salvador', 'San Isidro', 'San Miguel', 'San Roque', 'San Victor', 'Santa Cruz', 'Santa Elena', 'Santo Niño Pob.', 'Solano', 'Talolora', 'Tugop'],
  Tolosa: ['Burak', 'Canmogsay', 'Cantariwis', 'Capangihan', 'Doña Brigida', 'Imelda', 'Malbog', 'Olot', 'Opong', 'Poblacion', 'Quilao', 'San Roque', 'San Vicente', 'Tanghas', 'Telegrafo'],
  Alangalang: ['Aslum', 'Astorga', 'Bato', 'Binongto-an', 'Binotong', 'Blumentritt', 'Bobonon', 'Borseth', 'Buenavista', 'Bugho', 'Buri', 'Cabadsan', 'Calaasan', 'Cambahanon', 'Cambolao', 'Canvertudes', 'Capiz', 'Cavite', 'Cogon', 'Dapdap', 'Divisoria', 'Ekiran', 'Hinapolan', 'Holy Child I', 'Holy Child II', 'Hubang', 'Hupit', 'Langit', 'Lingayon', 'Lourdes', 'Lukay', 'Magsaysay', 'Milagrosa', 'Mudboron', 'P. Barrantes', 'Peñalosa', 'Pepita', 'Salvacion', 'Salvacion Poblacion', 'San Antonio', 'San Antonio Pob.', 'San Diego', 'San Francisco East', 'San Francisco West', 'San Isidro', 'San Pedro', 'San Roque', 'San Vicente', 'Santiago', 'Santo Niño', 'Santol', 'Tabangohay', 'Tombo', 'Veteranos'],
  Babatngon: ['Bacong', 'Bagong Silang', 'Biasong', 'Gov. E. Jaro', 'Guintigui-an', 'Lukay', 'Magcasuang', 'Malibago', 'Naga-asan', 'Pagsulhugon', 'Planza', 'Poblacion District I', 'Poblacion District II', 'Poblacion District III', 'Poblacion District IV', 'Rizal I', 'Rizal II', 'San Agustin', 'San Isidro', 'San Ricardo', 'Sangputan', 'Taguite', 'Uban', 'Victory', 'Villa Magsaysay'],
  'San Miguel': ['Bagacay', 'Bahay', 'Bairan', 'Cabatianuhan', 'Canap', 'Capilihan', 'Caraycaray', 'Cayare', 'Guinciaman', 'Impo', 'Kinalumsan', 'Libtong', 'Lukay', 'Malaguinabot', 'Malpag', 'Mawodpawod', 'Patong', 'Pinarigusan', 'San Andres', 'Santa Cruz', 'Santol'],
  'Santa Fe': ['Baculanad', 'Badiangay', 'Bulod', 'Catoogan', 'Cutay', 'Gapas', 'Katipunan', 'Milagrosa', 'Pilit', 'Pitogo', 'San Isidro', 'San Juan', 'San Miguelay', 'San Roque', 'Tibak', 'Victoria', 'Zone 1', 'Zone 2', 'Zone 3', 'Zone 4 Pob.'],
  'Santa Rita': ['Alegria', 'Anibongan', 'Aslum', 'Bagolibas', 'Binanalan', 'Bokinggan Pob.', 'Bougainvilla Pob.', 'Cabacungan', 'Cabunga-an', 'Camayse', 'Cansadong', 'Caticugan', 'Dampigan', 'Guinbalot-an', 'Gumamela Pob.', 'Hinangudtan', 'Igang-igang', 'La Paz', 'Lupig', 'Magsaysay', 'Maligaya', 'New Manunca', 'Old Manunca', 'Pagsulhugon', 'Rosal Pob.', 'Salvacion', 'San Eduardo', 'San Isidro', 'San Juan', 'San Pascual', 'San Pedro', 'San Roque', 'Santa Elena', 'Santan Pob.', 'Tagacay', 'Tominamos', 'Tulay', 'Union'],
  Basey: ['Amandayehan', 'Anglit', 'Bacubac', 'Balante', 'Baloog', 'Basiao', 'Baybay', 'Binongtu-an', 'Buenavista', 'Bulao', 'Burgos', 'Buscada', 'Cambayan', 'Can-abay', 'Cancaiyas', 'Canmanila', 'Catadman', 'Cogon', 'Del Pilar', 'Dolongan', 'Guintigui-an', 'Guirang', 'Iba', 'Inuntan', 'Lawa-an', 'Loog', 'Loyo', 'Mabini', 'Magallanes', 'Manlilinab', 'May-it', 'Mercado', 'Mongabong', 'New San Agustin', 'Nouvelas Occidental', 'Old San Agustin', 'Palaypay', 'Panugmonon', 'Pelit', 'Roxas', 'Salvacion', 'San Antonio', 'San Fernando', 'Sawa', 'Serum', 'Sugca', 'Sugponon', 'Sulod', 'Tinaogan', 'Tingib', 'Villa Aurora'],
};

export const TUTOR_HUNT_LOCATIONS: TutorHuntLocation[] = [
  { city: 'Tacloban City', province: 'Leyte', barangays: BARANGAYS_BY_CITY['Tacloban City'] },
  { city: 'Palo', province: 'Leyte', barangays: BARANGAYS_BY_CITY.Palo },
  { city: 'Tanauan', province: 'Leyte', barangays: BARANGAYS_BY_CITY.Tanauan },
  { city: 'Tolosa', province: 'Leyte', barangays: BARANGAYS_BY_CITY.Tolosa },
  { city: 'Alangalang', province: 'Leyte', barangays: BARANGAYS_BY_CITY.Alangalang },
  { city: 'Babatngon', province: 'Leyte', barangays: BARANGAYS_BY_CITY.Babatngon },
  { city: 'San Miguel', province: 'Leyte', barangays: BARANGAYS_BY_CITY['San Miguel'] },
  { city: 'Santa Fe', province: 'Leyte', barangays: BARANGAYS_BY_CITY['Santa Fe'] },
  { city: 'Santa Rita', province: 'Samar', barangays: BARANGAYS_BY_CITY['Santa Rita'] },
  { city: 'Basey', province: 'Samar', barangays: BARANGAYS_BY_CITY.Basey },
];

export const TUTOR_HUNT_CITIES = TUTOR_HUNT_LOCATIONS.map((location) => location.city);

export function locationForCity(city: string | null | undefined): TutorHuntLocation | null {
  return TUTOR_HUNT_LOCATIONS.find((location) => location.city === city) ?? null;
}
