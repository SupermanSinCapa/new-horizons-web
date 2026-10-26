// Datos del negocio compartidos por ambos idiomas.
// Si cambia el teléfono, la dirección o el horario, edítalo solo aquí.
module.exports = {
  name: 'New Horizons Insurance Inc.',
  url: 'https://newhorizonsinsurances.com',
  phone: { display: '(813) 644-6120', tel: '+18136446120' },
  // Número de WhatsApp en formato internacional, sin "+" ni espacios.
  whatsapp: '18136446120',
  email: 'info@newhorizonsinsurance.com',
  address: {
    street: '7730 Palm River Rd, Suite 200',
    city: 'Tampa',
    region: 'FL',
    zip: '33619',
    country: 'US',
  },
  maps: 'https://maps.app.goo.gl/z2sqSdu4RBfiGngS7',
  // Ficha de Google (Place ID) para el mapa y el botón "Dejar una reseña".
  placeId: 'ChIJUUsUzZ7PwogRn6dPpmrDlSU',
  mapQuery: 'NEW HORIZONS INSURANCE INC, 7730 Palm River Rd #200, Tampa, FL 33619',
  calendly: 'https://calendly.com/newhorizonsinsurance',
  social: {
    instagram: 'https://www.instagram.com/newhorizonsins/',
    facebook: 'https://www.facebook.com/share/17ZbBnvT87/',
  },
  // Actualizar a mano cuando cambie la ficha de Google.
  rating: { value: '4.9', count: 263 },
  instagram: {
    handle: 'newhorizonsins',
    url: 'https://www.instagram.com/newhorizonsins/',
    // Por defecto se muestra el perfil oficial de Instagram (los últimos posts se
    // actualizan solos). Opcional: para mostrarlos con el diseño del sitio, crear un
    // feed gratis en https://behold.so y pegar aquí su URL JSON.
    feedUrl: '',
  },
  hours: [
    { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '17:00' },
    { days: ['Saturday'], opens: '09:00', closes: '12:00' },
  ],
  // Aseguradoras con las que trabaja la agencia (logos en assets/img/carriers/).
  carriers: [
    { name: 'American Traditions (ATIC)', logo: 'american-traditions.jpg', zoom: 1.7 },
    { name: 'Ascendant', logo: 'ascendant.png' },
    { name: 'AssuranceAmerica', logo: 'assurance-america.png', zoom: 1.7 },
    { name: 'Assurant', logo: 'assurant.png' },
    { name: 'Attune', logo: 'attune.png' },
    { name: 'Bass Underwriters', logo: 'bass-underwriters.webp' },
    { name: 'Bristol West', logo: 'bristol-west.png' },
    { name: 'Burns & Wilcox', logo: 'burns-wilcox.png', zoom: 1.2 },
    { name: 'Dairyland', logo: 'dairyland.png' },
    { name: 'Edison', logo: 'edison.png' },
    { name: 'Embark', logo: 'embark.jpg' },
    { name: 'First Acceptance', logo: 'first-acceptance.png' },
    { name: 'Florida Peninsula', logo: 'florida-peninsula.png' },
    { name: 'Foremost', logo: 'foremost.jpg' },
    { name: 'GEICO', logo: 'geico.webp' },
    { name: 'Granada', logo: 'granada.png' },
    { name: 'Heritage', logo: 'heritage.png', zoom: 1.5 },
    { name: 'Kemper', logo: 'kemper.jpg' },
    { name: 'Monarch', logo: 'monarch.png', zoom: 1.25 },
    { name: 'National General', logo: 'national-general.webp', zoom: 1.3 },
    { name: 'Neptune Flood', logo: 'neptune-flood.png', zoom: 1.15 },
    { name: 'Ovation', logo: 'ovation.png' },
    { name: 'Patriot Select', logo: 'patriot-select.png', zoom: 1.6 },
    { name: 'Pearl Holding Group', logo: 'pearl-holding.png', zoom: 1.4 },
    { name: "People's Trust", logo: 'peoples-trust.png' },
    { name: 'Progressive', logo: 'progressive.png' },
    { name: 'Slide', logo: 'slide.png' },
    { name: 'Southern Insurance Underwriters', logo: 'southern-insurance-underwriters.png' },
    { name: 'Tailrow', logo: 'tailrow.png' },
    { name: 'TAPCO', logo: 'tapco.avif' },
    { name: 'Trident Reciprocal', logo: 'trident-reciprocal.png' },
    { name: 'United Auto Insurance', logo: 'united-auto.webp', zoom: 1.35 },
    { name: 'Universal North America', logo: 'universal-north-america.jpg', zoom: 1.4 },
    { name: 'Universal Property', logo: 'universal-property.png' },
    { name: 'Wright Flood', logo: 'wright-flood.png' },
  ],
  // Equipo. Fotos en assets/img/team/ con el nombre de `photo`; si la foto no
  // existe, se muestra un espacio con las iniciales. Textos en content/*.js.
  team: [
    { id: 'maria', name: 'María González', photo: 'maria-gonzalez.jpg' },
    { id: 'michel', name: 'Michel', photo: 'michel.jpg' },
    { id: 'nory', name: 'Nory', photo: 'nory.jpg' },
  ],
  groupPhoto: 'equipo.jpg',
  // Fotos gratuitas de Unsplash (licencia libre para uso comercial): id de cada foto.
  photos: {
    hero: 'photo-1561063139-e183e66909c4',
    about: 'photo-1609964956781-519678450be5',
    auto: { card: 'photo-1668966643905-bf39ebd0577b', hero: 'photo-1701688734887-f9e0e5be31dd' },
    commercial: { card: 'photo-1778103617525-76877c583fa5', hero: 'photo-1766785368863-f2188a8c8b32' },
    property: { card: 'photo-1583608205776-bfd35f0d9f83', hero: 'photo-1693837851506-93d3d01d4f44' },
    sr22: 'photo-1791268734854-aa1ec3b79e09',
    hurricane: 'photo-1500056363169-ebc595d60d0f',
  },
};
