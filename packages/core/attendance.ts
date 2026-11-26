export function assessLocation(location:{latitude:number;longitude:number;accuracy:number}, office:{latitude:number|null;longitude:number|null;radius_m:number}) {
  if (office.latitude === null || office.longitude === null) return {distance:null, review:'Area belum diatur'}
  const rad = (number:number) => number * Math.PI / 180
  const deltaLat = rad(office.latitude-location.latitude)
  const deltaLong = rad(office.longitude-location.longitude)
  const arc = Math.sin(deltaLat/2)**2 + Math.cos(rad(location.latitude))*Math.cos(rad(office.latitude))*Math.sin(deltaLong/2)**2
  const distance = Math.round(12_742_000 * Math.asin(Math.min(1,Math.sqrt(arc))))
  const review = location.accuracy > office.radius_m ? 'Lokasi kurang akurat' : distance > office.radius_m ? 'Di luar area' : 'Dalam area'
  return {distance,review}
}
