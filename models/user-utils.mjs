function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w -]+/g, '')
    .replace(/ +/g, '-');
}

function toTitleCase(str) {
  if (typeof str !== 'string') {
    return str;
  }
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

function fullname(name) {
  const fullname = name.first || name.last ? `${name.first} ${name.last}` : '';

  return toTitleCase(fullname);
}

export default {
  slugify,
  toTitleCase,
  fullname,
};
