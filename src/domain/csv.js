export function celulaCsv(valor){
  if(valor === undefined || valor === null) return '';
  let texto = String(valor);
  if(typeof valor === 'string' && /^[\s]*[=+@\-\t\r]/.test(texto)) texto = "'" + texto;
  return '"' + texto.replace(/"/g,'""') + '"';
}
